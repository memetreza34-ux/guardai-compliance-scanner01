const { HttpError } = require('../lib/httpError');

function mapMember(row) {
  return {
    userId: row.user_id,
    role: row.role,
    displayName: row.display_name || null,
    joinedAt: row.created_at,
  };
}

function mapInvitation(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    email: row.email_normalized,
    role: row.invited_role,
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at,
    revokedAt: row.revoked_at,
  };
}

function assertActorMayManage(actorRole, targetRole) {
  if (actorRole === 'owner' && ['admin', 'member', 'viewer'].includes(targetRole)) return;
  if (actorRole === 'admin' && ['member', 'viewer'].includes(targetRole)) return;
  throw new HttpError(403, 'This role change requires higher organization privileges.', 'TEAM_ROLE_FORBIDDEN');
}

async function lockedActor(client, organizationId, actorId) {
  const result = await client.query(
    `select role from public.memberships
      where organization_id = $1 and user_id = $2 for update`,
    [organizationId, actorId],
  );
  const role = result.rows[0]?.role;
  if (!role || !['owner', 'admin'].includes(role)) {
    throw new HttpError(403, 'Organization Admin or Owner is required.', 'TEAM_ACCESS_FORBIDDEN');
  }
  return role;
}

async function audit(client, organizationId, actorId, action, targetId, metadata = {}) {
  await client.query(
    `insert into public.audit_events
        (organization_id, actor_id, action, target_type, target_id, metadata)
      values ($1, $2, $3, 'team', $4, $5::jsonb)`,
    [organizationId, actorId, action, targetId, JSON.stringify(metadata)],
  );
}

async function inTransaction(pool, work) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await work(client);
    await client.query('commit');
    return result;
  } catch (error) {
    try { await client.query('rollback'); } catch (rollbackError) {
      console.error('[Team] Transaction rollback failed:', rollbackError?.code || 'UNKNOWN');
    }
    throw error;
  } finally {
    client.release();
  }
}

function createTeamRepository(pool) {
  if (!pool || typeof pool.connect !== 'function' || typeof pool.query !== 'function') {
    throw new TypeError('Team repository requires PostgreSQL pool.');
  }

  async function listMembers(organizationId) {
    const result = await pool.query(
      `select m.user_id, m.role, m.created_at, p.display_name
        from public.memberships m
        left join public.profiles p on p.user_id = m.user_id
       where m.organization_id = $1
       order by case m.role when 'owner' then 0 when 'admin' then 1 when 'member' then 2 else 3 end,
                m.created_at asc, m.user_id asc
       limit 500`,
      [organizationId],
    );
    return result.rows.map(mapMember);
  }

  async function listInvitations(organizationId) {
    const result = await pool.query(
      `select id, organization_id, email_normalized, invited_role, status,
              expires_at, created_at, accepted_at, revoked_at
         from public.team_invitations where organization_id = $1
         order by created_at desc, id desc limit 100`,
      [organizationId],
    );
    return result.rows.map(mapInvitation);
  }

  async function createInvitation({ organizationId, actorId, email, role, tokenHash, expiresAt }) {
    return inTransaction(pool, async client => {
      const actorRole = await lockedActor(client, organizationId, actorId);
      assertActorMayManage(actorRole, role);
      await client.query(
        `update public.team_invitations set status='revoked', revoked_at=now()
          where organization_id=$1 and email_normalized=$2 and status='pending'`,
        [organizationId, email],
      );
      const result = await client.query(
        `insert into public.team_invitations
          (organization_id, email_normalized, invited_role, token_hash, expires_at, created_by)
          values ($1,$2,$3,$4,$5,$6)
          returning id, organization_id, email_normalized, invited_role, status,
                    expires_at, created_at, accepted_at, revoked_at`,
        [organizationId, email, role, tokenHash, expiresAt, actorId],
      );
      const invitation = mapInvitation(result.rows[0]);
      await audit(client, organizationId, actorId, 'team.invitation_created', invitation.id,
        { invitedRole: role });
      return invitation;
    });
  }

  async function revokeInvitation({ organizationId, actorId, invitationId }) {
    return inTransaction(pool, async client => {
      const actorRole = await lockedActor(client, organizationId, actorId);
      const selected = await client.query(
        `select id, invited_role, status from public.team_invitations
          where organization_id=$1 and id=$2 for update`,
        [organizationId, invitationId],
      );
      const item = selected.rows[0];
      if (!item) throw new HttpError(404, 'Invitation not found.', 'TEAM_INVITATION_NOT_FOUND');
      assertActorMayManage(actorRole, item.invited_role);
      if (item.status !== 'pending') throw new HttpError(409, 'Invitation is no longer pending.', 'TEAM_INVITATION_NOT_PENDING');
      const changed = await client.query(
        `update public.team_invitations set status='revoked', revoked_at=now()
          where organization_id=$1 and id=$2
          returning id, organization_id, email_normalized, invited_role, status,
                    expires_at, created_at, accepted_at, revoked_at`,
        [organizationId, invitationId],
      );
      await audit(client, organizationId, actorId, 'team.invitation_revoked', invitationId);
      return mapInvitation(changed.rows[0]);
    });
  }

  async function acceptInvitation({ tokenHash, actorId, email }) {
    return inTransaction(pool, async client => {
      const selected = await client.query(
        `select id, organization_id, email_normalized, invited_role
           from public.team_invitations
          where token_hash=$1 and status='pending' and expires_at>now()
          for update`,
        [tokenHash],
      );
      const invitation = selected.rows[0];
      // Intentionally identical response for nonexistent, expired and consumed tokens.
      if (!invitation || invitation.email_normalized !== email) {
        throw new HttpError(404, 'Invitation is invalid or unavailable.', 'TEAM_INVITATION_UNAVAILABLE');
      }
      const membership = await client.query(
        `insert into public.memberships (organization_id, user_id, role)
          values ($1,$2,$3)
          on conflict (organization_id, user_id) do nothing
          returning organization_id, user_id, role`,
        [invitation.organization_id, actorId, invitation.invited_role],
      );
      if (!membership.rowCount) {
        throw new HttpError(409, 'This user already belongs to the organization.', 'TEAM_ALREADY_MEMBER');
      }
      await client.query(
        `update public.team_invitations set status='accepted', accepted_at=now(), accepted_by=$2
          where id=$1`,
        [invitation.id, actorId],
      );
      await audit(client, invitation.organization_id, actorId, 'team.invitation_accepted',
        invitation.id, { role: invitation.invited_role });
      return { organizationId: invitation.organization_id, role: invitation.invited_role };
    });
  }

  async function updateMember({ organizationId, actorId, targetUserId, role }) {
    return inTransaction(pool, async client => {
      const actorRole = await lockedActor(client, organizationId, actorId);
      const selected = await client.query(
        `select role from public.memberships where organization_id=$1 and user_id=$2 for update`,
        [organizationId, targetUserId],
      );
      const current = selected.rows[0]?.role;
      if (!current) throw new HttpError(404, 'Member not found.', 'TEAM_MEMBER_NOT_FOUND');
      if (actorId === targetUserId) throw new HttpError(403, 'Self-role changes are not allowed.', 'TEAM_SELF_CHANGE_FORBIDDEN');
      assertActorMayManage(actorRole, current);
      assertActorMayManage(actorRole, role);
      const result = await client.query(
        `update public.memberships set role=$3
           where organization_id=$1 and user_id=$2 returning role`,
        [organizationId, targetUserId, role],
      );
      await audit(client, organizationId, actorId, 'team.member_role_changed', targetUserId,
        { fromRole: current, toRole: role });
      return { userId: targetUserId, role: result.rows[0].role };
    });
  }

  async function removeMember({ organizationId, actorId, targetUserId }) {
    return inTransaction(pool, async client => {
      const actorRole = await lockedActor(client, organizationId, actorId);
      const selected = await client.query(
        `select role from public.memberships where organization_id=$1 and user_id=$2 for update`,
        [organizationId, targetUserId],
      );
      const role = selected.rows[0]?.role;
      if (!role) throw new HttpError(404, 'Member not found.', 'TEAM_MEMBER_NOT_FOUND');
      if (actorId === targetUserId) throw new HttpError(403, 'Self-removal is not allowed.', 'TEAM_SELF_CHANGE_FORBIDDEN');
      assertActorMayManage(actorRole, role);
      await client.query(
        `delete from public.memberships where organization_id=$1 and user_id=$2`,
        [organizationId, targetUserId],
      );
      await audit(client, organizationId, actorId, 'team.member_removed', targetUserId, { previousRole: role });
      return { removed: true };
    });
  }

  return { listMembers, listInvitations, createInvitation, revokeInvitation, acceptInvitation,
    updateMember, removeMember };
}

module.exports = { assertActorMayManage, createTeamRepository, mapMember, mapInvitation };
