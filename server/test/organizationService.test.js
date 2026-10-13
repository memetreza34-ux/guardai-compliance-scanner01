const test = require('node:test');
const assert = require('node:assert/strict');
const { createOrganizationService } = require('../services/organizationService');


test('organization service creates an owner workspace with normalized name', async () => {
  const calls = [];
  const service = createOrganizationService({
    organizationRepository: {
      async createOrganizationWithOwner(input) {
        calls.push(input);
        return { id: 'org-1', name: input.name, slug: input.slug, role: 'owner' };
      },
      async listOrganizationsForUser() {
        return [];
      },
    },
  });

  const result = await service.create({ userId: 'user-1', name: '  GuardAI   Team ' });
  assert.equal(result.name, 'GuardAI Team');
  assert.equal(result.role, 'owner');
  assert.equal(calls[0].userId, 'user-1');
  assert.match(calls[0].slug, /^guardai-team-[a-f0-9]{8}$/);
});


test('organization service retries slug collisions only', async () => {
  let attempts = 0;
  const service = createOrganizationService({
    organizationRepository: {
      async createOrganizationWithOwner(input) {
        attempts += 1;
        if (attempts < 3) {
          const error = new Error('collision');
          error.code = 'ORGANIZATION_SLUG_COLLISION';
          throw error;
        }
        return { id: 'org-1', name: input.name, slug: input.slug, role: 'owner' };
      },
      async listOrganizationsForUser() {
        return [];
      },
    },
  });

  await service.create({ userId: 'user-1', name: 'GuardAI' });
  assert.equal(attempts, 3);
});


test('organization service updateName enforces admin role and normalizes name', async () => {
  const authChecks = [];
  const repoCalls = [];

  const service = createOrganizationService({
    organizationRepository: {
      async updateOrganizationName(organizationId, name, userId) {
        repoCalls.push({ organizationId, name, userId });
        return { id: organizationId, name, slug: 'guardai-team-12345678', role: 'admin' };
      },
    },
    organizationAuthorization: {
      async requireRole(orgId, userId, role) {
        authChecks.push({ orgId, userId, role });
      },
    },
  });

  const updated = await service.updateName({
    organizationId: 'org-test-1',
    userId: 'admin-user-1',
    name: '  New   Workspace Name  ',
  });

  assert.equal(updated.name, 'New Workspace Name');
  assert.deepEqual(authChecks, [{ orgId: 'org-test-1', userId: 'admin-user-1', role: 'admin' }]);
  assert.deepEqual(repoCalls, [{
    organizationId: 'org-test-1',
    name: 'New Workspace Name',
    userId: 'admin-user-1',
  }]);
});


test('organization service updateName fails closed without authentication or org id', async () => {
  const service = createOrganizationService({
    organizationRepository: {},
  });

  await assert.rejects(
    () => service.updateName({ organizationId: 'org-1', userId: null, name: 'Name' }),
    (error) => error.statusCode === 401 && error.code === 'UNAUTHORIZED',
  );

  await assert.rejects(
    () => service.updateName({ organizationId: null, userId: 'user-1', name: 'Name' }),
    (error) => error.statusCode === 400 && error.code === 'INVALID_ORGANIZATION_ID',
  );
});