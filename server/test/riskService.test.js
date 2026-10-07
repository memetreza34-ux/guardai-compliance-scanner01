const test = require('node:test');
const assert = require('node:assert/strict');
const { createRiskService } = require('../services/riskService');

function baseInput(overrides = {}) {
  return {
    title: 'Credential exposure risk',
    likelihood: 3,
    impact: 5,
    treatment: 'mitigate',
    targetIds: [],
    findingIds: [],
    controlIds: [],
    ...overrides,
  };
}

test('Risk reads require viewer role and create requires member role', async () => {
  const calls = [];
  const service = createRiskService({
    organizationAuthorization: {
      async requireRole(org, user, role) { calls.push([org, user, role]); },
    },
    membershipRepository: { async getMembership() { return { role: 'member' }; } },
    riskRepository: {
      async listRisks() { return []; },
      async getRisk() { return null; },
      async createRisk({ risk }) { return { id: 'risk-1', ...risk }; },
      async updateRisk() { throw new Error('unused'); },
    },
  });

  await service.list({ organizationId: 'org-1', userId: 'user-1' });
  await service.create({ organizationId: 'org-1', userId: 'user-1', input: baseInput() });

  assert.deepEqual(calls[0], ['org-1', 'user-1', 'viewer']);
  assert.deepEqual(calls[1], ['org-1', 'user-1', 'member']);
});

test('Accepted Risk decision requires admin role', async () => {
  const calls = [];
  const service = createRiskService({
    organizationAuthorization: {
      async requireRole(org, user, role) { calls.push(role); },
    },
    membershipRepository: { async getMembership() { return { role: 'admin' }; } },
    riskRepository: {
      async listRisks() { return []; },
      async getRisk() { return null; },
      async createRisk({ risk }) { return { id: 'risk-1', ...risk }; },
      async updateRisk() { throw new Error('unused'); },
    },
  });

  await service.create({
    organizationId: 'org-1',
    userId: 'admin-1',
    input: baseInput({ status: 'accepted', treatment: 'accept' }),
  });

  assert.deepEqual(calls, ['admin']);
});
