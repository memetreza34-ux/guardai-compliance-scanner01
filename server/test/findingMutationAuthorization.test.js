const test = require('node:test');
const assert = require('node:assert/strict');
const { createOrganizationAuthorizationService } = require('../services/organizationAuthorization');
const { createFindingService } = require('../services/findingService');

function createHarness({ findingStatus = 'open', findingExists = true } = {}) {
  const calls = [];
  const memberships = [
    { organizationId: 'org-a', userId: 'owner-a', role: 'owner' },
    { organizationId: 'org-a', userId: 'admin-a', role: 'admin' },
    { organizationId: 'org-a', userId: 'member-a', role: 'member' },
    { organizationId: 'org-a', userId: 'viewer-a', role: 'viewer' },
    { organizationId: 'org-b', userId: 'owner-b', role: 'owner' },
  ];

  const authorization = createOrganizationAuthorizationService({
    async getMembership(organizationId, userId) {
      calls.push(['membership', organizationId, userId]);
      return memberships.find(entry => entry.organizationId === organizationId && entry.userId === userId) || null;
    },
  });
  const service = createFindingService({
    organizationAuthorization: authorization,
    findingRepository: {
      async getFinding(organizationId, findingId) {
        calls.push(['finding-read', organizationId, findingId]);
        if (!findingExists || organizationId !== 'org-a' || findingId !== 'finding-a') return null;
        return {
          id: 'finding-a',
          organizationId: 'org-a',
          status: findingStatus,
        };
      },
      async transitionStatus(input) {
        calls.push(['finding-write', input]);
        findingStatus = input.nextStatus;
        return { id: input.findingId, status: input.nextStatus };
      },
    },
  });
  return { calls, memberships, service };
}

const request = (userId, status = 'resolved') => ({
  organizationId: 'org-a',
  userId,
  findingId: 'finding-a',
  status,
  reason: status === 'accepted_risk'
    ? 'Security owner accepts this risk until the next release.'
    : 'Fixed in deployment.',
});

function expectNoFindingReads(calls) {
  assert.equal(calls.filter(call => call[0] === 'finding-read').length, 0);
  assert.equal(calls.filter(call => call[0] === 'finding-write').length, 0);
}

test('foreign Organization owner cannot probe known or missing Findings before authorization', async () => {
  for (const findingExists of [true, false]) {
    const h = createHarness({ findingExists });
    await assert.rejects(
      () => h.service.updateStatus(request('owner-b')),
      error => error.statusCode === 403,
    );
    expectNoFindingReads(h.calls);
  }
});

test('unauthorized status validation and accepted-risk probes cannot reveal Finding state', async () => {
  const h = createHarness({ findingStatus: 'accepted_risk' });
  await assert.rejects(
    () => h.service.updateStatus(request('owner-b', 'garbage-status')),
    error => error.statusCode === 403,
  );
  await assert.rejects(
    () => h.service.updateStatus(request('owner-b', 'accepted_risk')),
    error => error.statusCode === 403,
  );
  expectNoFindingReads(h.calls);
});

test('Viewer can never mutate or discover Finding state through write routes', async () => {
  const h = createHarness();
  await assert.rejects(
    () => h.service.updateStatus(request('viewer-a', 'resolved')),
    error => error.statusCode === 403,
  );
  await assert.rejects(
    () => h.service.updateStatus(request('viewer-a', 'accepted_risk')),
    error => error.statusCode === 403,
  );
  expectNoFindingReads(h.calls);
});

test('Member can mark fixed but cannot accept risk, even if Finding exists', async () => {
  const h = createHarness();
  const resolved = await h.service.updateStatus(request('member-a'));
  assert.equal(resolved.status, 'resolved');
  const previousReads = h.calls.filter(call => call[0] === 'finding-read').length;
  const previousWrites = h.calls.filter(call => call[0] === 'finding-write').length;

  await assert.rejects(
    () => h.service.updateStatus(request('member-a', 'accepted_risk')),
    error => error.statusCode === 403,
  );
  assert.equal(h.calls.filter(call => call[0] === 'finding-read').length, previousReads);
  assert.equal(h.calls.filter(call => call[0] === 'finding-write').length, previousWrites);
});

test('Accepted-risk withdrawal still requires Admin after reading the authorized state', async () => {
  const h = createHarness({ findingStatus: 'accepted_risk' });
  await assert.rejects(
    () => h.service.updateStatus(request('member-a', 'open')),
    error => error.statusCode === 403,
  );
  assert.equal(h.calls.filter(call => call[0] === 'finding-read').length, 1);
  assert.equal(h.calls.filter(call => call[0] === 'finding-write').length, 0);
  const success = await h.service.updateStatus(request('admin-a', 'open'));
  assert.equal(success.status, 'open');
});

test('Admin can accept risk with a valid reason; malformed reasons fail without writing', async () => {
  const h = createHarness();
  await assert.rejects(
    () => h.service.updateStatus({ ...request('admin-a', 'accepted_risk'), reason: 'short' }),
    error => error.statusCode === 400,
  );
  assert.equal(h.calls.filter(call => call[0] === 'finding-write').length, 0);
  const result = await h.service.updateStatus(request('admin-a', 'accepted_risk'));
  assert.equal(result.status, 'accepted_risk');
  assert.equal(h.calls.filter(call => call[0] === 'finding-write').length, 1);
});

test('Authorized missing Finding reports 404 only after membership verification', async () => {
  const h = createHarness({ findingExists: false });
  await assert.rejects(
    () => h.service.updateStatus(request('member-a')),
    error => error.statusCode === 404 && error.code === 'FINDING_NOT_FOUND',
  );
  assert.deepEqual(h.calls.map(call => call[0]), ['membership', 'finding-read']);
});

test('Role revocation is enforced before a second mutation attempt', async () => {
  const h = createHarness();
  await h.service.updateStatus(request('member-a'));
  h.memberships.find(entry => entry.userId === 'member-a').role = 'viewer';
  const before = h.calls.length;
  await assert.rejects(
    () => h.service.updateStatus(request('member-a')),
    error => error.statusCode === 403,
  );
  assert.deepEqual(h.calls.slice(before).map(call => call[0]), ['membership']);
});

test('role revoked while Finding is loading prevents the pending status transition', async () => {
  let role = 'member';
  let authCalls = 0;
  let writes = 0;
  const service = createFindingService({
    organizationAuthorization: {
      async requireRole() {
        authCalls += 1;
        if (role !== 'member') {
          const error = new Error('Role revoked');
          error.statusCode = 403;
          throw error;
        }
      },
    },
    findingRepository: {
      async getFinding() {
        role = 'viewer';
        return { id: 'finding-a', organizationId: 'org-a', status: 'open' };
      },
      async transitionStatus() { writes += 1; throw new Error('Never mutate after revocation'); },
    },
  });
  await assert.rejects(() => service.updateStatus(request('member-a')), error => error.statusCode === 403);
  assert.equal(authCalls, 2);
  assert.equal(writes, 0);
});

test('role revoked while Finding is loading prevents a pending verification re-test', async () => {
  let role = 'member';
  let authCalls = 0;
  let queued = 0;
  const service = createFindingService({
    organizationAuthorization: {
      async requireRole() {
        authCalls += 1;
        if (role !== 'member') {
          const error = new Error('Role revoked');
          error.statusCode = 403;
          throw error;
        }
      },
    },
    findingRepository: {
      async getFinding() {
        role = 'viewer';
        return {
          id: 'finding-a', organizationId: 'org-a', targetId: 'target-a',
          status: 'open', ruleId: 'security.content_security_policy',
          latestDetectorId: 'security.headers',
        };
      },
    },
    scanSubmission: {
      async submit() { queued += 1; throw new Error('Never queue after revocation'); },
    },
  });
  await assert.rejects(() => service.requestRetest({
    organizationId: 'org-a', userId: 'member-a', findingId: 'finding-a',
  }), error => error.statusCode === 403);
  assert.equal(authCalls, 2);
  assert.equal(queued, 0);
});
