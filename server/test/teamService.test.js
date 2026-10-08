const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createTeamService, normalizeEmail } = require('../services/teamService');

function serviceHarness() {
  const calls = [];
  const repository = {
    async listMembers(id) { calls.push(['members', id]); return [{ userId: 'u1' }]; },
    async listInvitations(id) { calls.push(['invitations', id]); return []; },
    async createInvitation(input) {
      calls.push(['invite', input]);
      return {
        id: 'inv-1', organizationId: input.organizationId,
        email: input.email, role: input.role, status: 'pending',
        expiresAt: input.expiresAt,
      };
    },
    async revokeInvitation(input) { calls.push(['revoke', input]); return { id: input.invitationId }; },
    async acceptInvitation(input) { calls.push(['accept', input]); return { organizationId: 'org1', role: 'viewer' }; },
    async updateMember(input) { calls.push(['change', input]); return { userId: input.targetUserId, role: input.role }; },
    async removeMember(input) { calls.push(['remove', input]); return { removed: true }; },
  };
  const auth = {
    async requireRole(orgId, userId, role) { calls.push(['role', orgId, userId, role]); },
  };
  return { calls, service: createTeamService({ organizationAuthorization: auth, teamRepository: repository }) };
}

test('Team listing enforces viewer and invitation listing enforces admin', async () => {
  const { calls, service } = serviceHarness();
  await service.members({ organizationId: 'org1', actorId: 'u1' });
  await service.invitations({ organizationId: 'org1', actorId: 'u1' });
  assert.deepEqual(calls.filter(x => x[0] === 'role'), [
    ['role', 'org1', 'u1', 'viewer'],
    ['role', 'org1', 'u1', 'admin'],
  ]);
});

test('invitation generates cryptographic one-time token, only SHA-256 goes to repository', async () => {
  const { calls, service } = serviceHarness();
  const created = await service.invite({
    organizationId: 'org1', actorId: 'admin1', email: '  Alice@Example.COM ', role: 'member',
  });
  assert.match(created.token, /^[a-zA-Z0-9_-]{43}$/);
  assert.equal(created.invitation.email, 'alice@example.com');
  const input = calls.find(item => item[0] === 'invite')[1];
  assert.equal(input.token, undefined);
  assert.equal(input.tokenHash, crypto.createHash('sha256').update(created.token).digest('hex'));
  assert.equal(input.email, 'alice@example.com');
  assert.equal(Date.parse(input.expiresAt) > Date.now(), true);
  assert.deepEqual(calls.find(item => item[0] === 'role'), ['role', 'org1', 'admin1', 'admin']);
});

test('admin invitations require Owner, and Owner invitations are forbidden', async () => {
  const { calls, service } = serviceHarness();
  await service.invite({ organizationId: 'org1', actorId: 'u1', email: 'a@example.com', role: 'admin' });
  assert.deepEqual(calls.find(item => item[0] === 'role'), ['role', 'org1', 'u1', 'owner']);
  await assert.rejects(
    () => service.invite({ organizationId: 'org1', actorId: 'u1', email: 'a@example.com', role: 'owner' }),
    error => error.code === 'TEAM_ROLE_INVALID',
  );
});

test('invitation acceptance requires verified account email and correct token shape', async () => {
  const { calls, service } = serviceHarness();
  const token = crypto.randomBytes(32).toString('base64url');
  await assert.rejects(
    () => service.accept({ actorId: 'u1', email: 'a@example.com', emailVerified: false, token }),
    error => error.code === 'TEAM_VERIFIED_EMAIL_REQUIRED',
  );
  await assert.rejects(
    () => service.accept({ actorId: 'u1', email: 'a@example.com', emailVerified: true, token: 'short' }),
    error => error.code === 'TEAM_INVITATION_UNAVAILABLE',
  );
  const accepted = await service.accept({
    actorId: 'u1', email: ' Alice@Example.com ', emailVerified: true, token,
  });
  assert.equal(accepted.organizationId, 'org1');
  const input = calls.find(item => item[0] === 'accept')[1];
  assert.equal(input.email, 'alice@example.com');
  assert.equal(input.tokenHash, crypto.createHash('sha256').update(token).digest('hex'));
  assert.equal(input.token, undefined);
});

test('Team role changes and removals need admin, invalid target roles rejected', async () => {
  const { calls, service } = serviceHarness();
  await service.changeRole({ organizationId: 'org1', actorId: 'a1', targetUserId: 'u2', role: 'viewer' });
  await service.remove({ organizationId: 'org1', actorId: 'a1', targetUserId: 'u2' });
  assert.equal(calls.filter(item => item[0] === 'role' && item[3] === 'admin').length, 2);
  await assert.rejects(
    () => service.changeRole({ organizationId: 'org1', actorId: 'a1', targetUserId: 'u2', role: 'owner' }),
    error => error.code === 'TEAM_ROLE_INVALID',
  );
});

test('email normalization rejects malformed or oversized addresses', () => {
  assert.equal(normalizeEmail(' Name@Example.org '), 'name@example.org');
  for (const input of ['', 'no-at', 'a@@b.com', 'a@b', 'x'.repeat(255) + '@example.com']) {
    assert.throws(() => normalizeEmail(input), error => error.code === 'TEAM_EMAIL_INVALID');
  }
});
