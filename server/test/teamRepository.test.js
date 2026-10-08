const test = require('node:test');
const assert = require('node:assert/strict');
const { createTeamRepository, assertActorMayManage } = require('../repositories/teamRepository');

test('Owner management is impossible via Admin or Owner role editing', () => {
  assert.doesNotThrow(() => assertActorMayManage('owner', 'admin'));
  assert.doesNotThrow(() => assertActorMayManage('admin', 'member'));
  for (const [actor, target] of [
    ['owner', 'owner'], ['admin', 'admin'], ['admin', 'owner'],
    ['admin', 'superadmin'], ['member', 'viewer'], ['viewer', 'member'],
  ]) {
    assert.throws(() => assertActorMayManage(actor, target),
      error => error.code === 'TEAM_ROLE_FORBIDDEN');
  }
});

function makePool(actorRole, targetRole) {
  const statements = [];
  const client = {
    async query(sql, params) {
      statements.push({ sql, params });
      if (sql === 'begin' || sql === 'commit' || sql === 'rollback') return { rowCount: 0, rows: [] };
      if (/^select role from public.memberships/.test(sql)) {
        return { rowCount: 1, rows: [{ role: params[1] === 'actor' ? actorRole : targetRole }] };
      }
      if (/^select id, invited_role, status from public.team_invitations/.test(sql)) {
        return { rowCount: 1, rows: [{ id: params[1], invited_role: 'admin', status: 'pending' }] };
      }
      if (/^select id, organization_id, email_normalized, invited_role/.test(sql)) {
        return { rowCount: 0, rows: [] };
      }
      return { rowCount: 1, rows: [{ role: 'viewer' }] };
    },
    release() { statements.push({ sql: 'release' }); },
  };
  const pool = { async connect() { return client; }, async query() { return { rowCount: 0, rows: [] }; } };
  return { repository: createTeamRepository(pool), statements };
}

test('Admin cannot downgrade or remove an Admin member; transaction rolls back without update', async () => {
  const { repository, statements } = makePool('admin', 'admin');
  await assert.rejects(
    () => repository.updateMember({
      organizationId: 'org', actorId: 'actor', targetUserId: 'target', role: 'viewer',
    }),
    error => error.code === 'TEAM_ROLE_FORBIDDEN',
  );
  assert.ok(statements.some(x => x.sql === 'rollback'));
  assert.equal(statements.some(x => x.sql.startsWith('update public.memberships')), false);
});

test('Owner can never be removed, even by another Owner', async () => {
  const { repository, statements } = makePool('owner', 'owner');
  await assert.rejects(
    () => repository.removeMember({
      organizationId: 'org', actorId: 'actor', targetUserId: 'target',
    }),
    error => error.code === 'TEAM_ROLE_FORBIDDEN',
  );
  assert.ok(statements.some(x => x.sql === 'rollback'));
  assert.equal(statements.some(x => x.sql.startsWith('delete from public.memberships')), false);
});

test('Self-removal is not permitted', async () => {
  const { repository } = makePool('admin', 'admin');
  await assert.rejects(
    () => repository.removeMember({
      organizationId: 'org', actorId: 'actor', targetUserId: 'actor',
    }),
    error => error.code === 'TEAM_SELF_CHANGE_FORBIDDEN',
  );
});

test('expired/consumed/invalid invitation token cannot add a member', async () => {
  const { repository, statements } = makePool('admin', 'viewer');
  await assert.rejects(
    () => repository.acceptInvitation({
      tokenHash: 'f'.repeat(64), actorId: 'user1', email: 'recipient@example.com',
    }),
    error => error.code === 'TEAM_INVITATION_UNAVAILABLE' && error.statusCode === 404,
  );
  assert.ok(statements.some(x => x.sql === 'rollback'));
  assert.equal(statements.some(x => x.sql.startsWith('insert into public.memberships')), false);
});

test('admin cannot revoke an Owner-issued Admin invitation', async () => {
  const { repository, statements } = makePool('admin', 'viewer');
  await assert.rejects(
    () => repository.revokeInvitation({ organizationId: 'org', actorId: 'actor', invitationId: 'i1' }),
    error => error.code === 'TEAM_ROLE_FORBIDDEN',
  );
  assert.equal(statements.some(x => x.sql.startsWith('update public.team_invitations')), false);
});
