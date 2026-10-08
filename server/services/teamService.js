const crypto = require('node:crypto');
const { HttpError } = require('../lib/httpError');

const INVITATION_TTL_DAYS = 7;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function normalizeEmail(email) {
  if (typeof email !== 'string') throw new HttpError(400, 'A valid email is required.', 'TEAM_EMAIL_INVALID');
  const normalized = email.trim().toLowerCase();
  if (normalized.length < 3 || normalized.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new HttpError(400, 'A valid email is required.', 'TEAM_EMAIL_INVALID');
  }
  return normalized;
}

function assertInviteRole(role) {
  if (!['admin', 'member', 'viewer'].includes(role)) {
    throw new HttpError(400, 'Invitations must use Admin, Member or Viewer.', 'TEAM_ROLE_INVALID');
  }
}

function createTeamService({ organizationAuthorization, teamRepository }) {
  if (!organizationAuthorization || !teamRepository) throw new TypeError('Team dependencies required.');

  async function members({ organizationId, actorId }) {
    await organizationAuthorization.requireRole(organizationId, actorId, 'viewer');
    return teamRepository.listMembers(organizationId);
  }

  async function invitations({ organizationId, actorId }) {
    await organizationAuthorization.requireRole(organizationId, actorId, 'admin');
    return teamRepository.listInvitations(organizationId);
  }

  async function invite({ organizationId, actorId, email, role }) {
    assertInviteRole(role);
    const normalizedEmail = normalizeEmail(email);
    await organizationAuthorization.requireRole(organizationId, actorId, role === 'admin' ? 'owner' : 'admin');
    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const invitation = await teamRepository.createInvitation({
      organizationId, actorId, email: normalizedEmail, role, tokenHash,
      expiresAt: new Date(Date.now() + INVITATION_TTL_DAYS * 86400000).toISOString(),
    });
    // Plaintext invite secret is returned once; never persisted or included in list/logs.
    return { invitation, token };
  }

  async function revoke({ organizationId, actorId, invitationId }) {
    await organizationAuthorization.requireRole(organizationId, actorId, 'admin');
    return teamRepository.revokeInvitation({ organizationId, actorId, invitationId });
  }

  async function accept({ actorId, email, emailVerified, token }) {
    if (!emailVerified || !email) {
      throw new HttpError(403, 'A verified account email is required to accept an invitation.', 'TEAM_VERIFIED_EMAIL_REQUIRED');
    }
    if (typeof token !== 'string' || !TOKEN_PATTERN.test(token)) {
      throw new HttpError(404, 'Invitation is invalid or unavailable.', 'TEAM_INVITATION_UNAVAILABLE');
    }
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    return teamRepository.acceptInvitation({ actorId, email: normalizeEmail(email), tokenHash });
  }

  async function changeRole({ organizationId, actorId, targetUserId, role }) {
    assertInviteRole(role);
    await organizationAuthorization.requireRole(organizationId, actorId, 'admin');
    return teamRepository.updateMember({ organizationId, actorId, targetUserId, role });
  }

  async function remove({ organizationId, actorId, targetUserId }) {
    await organizationAuthorization.requireRole(organizationId, actorId, 'admin');
    return teamRepository.removeMember({ organizationId, actorId, targetUserId });
  }

  return { members, invitations, invite, revoke, accept, changeRole, remove };
}

module.exports = { createTeamService, normalizeEmail, assertInviteRole, INVITATION_TTL_DAYS };
