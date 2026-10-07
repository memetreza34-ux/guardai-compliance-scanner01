const test = require('node:test');
const assert = require('node:assert/strict');
const { createFindingService } = require('../services/findingService');

function createHarness(currentStatus = 'open') {
  const calls = [];
  const current = {
    id: 'finding-1',
    organizationId: 'org-1',
    status: currentStatus,
  };
  const service = createFindingService({
    organizationAuthorization: {
      async requireRole(organizationId, userId, role) {
        calls.push(['auth', organizationId, userId, role]);
      },
    },
    findingRepository: {
      async getFinding() {
        return {
          ...current,
          targetId: 'target-1',
          ruleId: 'security.hsts',
          fingerprint: 'fingerprint-1',
          latestDetectorId: 'security-headers',
        };
      },
      async listFindings(input) {
        calls.push(['list', input]);
        return { findings: [], nextCursor: null };
      },
      async listStatusHistory(input) {
        calls.push(['history', input]);
        return { events: [], nextCursor: null };
      },
      async transitionStatus(input) {
        calls.push(['transition', input]);
        return { ...current, status: input.nextStatus, statusReason: input.reason };
      },
    },
    scanSubmission: {
      async submit(input) {
        calls.push(['scan-submit', input]);
        return {
          created: true,
          scan: { id: 'scan-1', status: 'queued' },
          jobs: [{ id: 'job-1', jobType: 'security', status: 'queued' }],
        };
      },
    },
  });
  return { calls, service };
}


test('finding list and history require viewer role', async () => {
  const harness = createHarness();
  await harness.service.list({ organizationId: 'org-1', userId: 'user-1' });
  await harness.service.history({ organizationId: 'org-1', userId: 'user-1', findingId: 'finding-1' });
  assert.deepEqual(harness.calls[0], ['auth', 'org-1', 'user-1', 'viewer']);
  assert.deepEqual(harness.calls[2], ['auth', 'org-1', 'user-1', 'viewer']);
});


test('resolving an open finding requires member role', async () => {
  const harness = createHarness('open');
  const result = await harness.service.updateStatus({
    organizationId: 'org-1',
    userId: 'user-1',
    findingId: 'finding-1',
    status: 'resolved',
    reason: 'Fixed in deployment.',
  });

  assert.deepEqual(harness.calls[0], ['auth', 'org-1', 'user-1', 'member']);
  assert.equal(result.status, 'resolved');
});


test('accepting risk requires admin role and meaningful reason', async () => {
  const harness = createHarness('open');
  await harness.service.updateStatus({
    organizationId: 'org-1',
    userId: 'user-1',
    findingId: 'finding-1',
    status: 'accepted_risk',
    reason: 'Reviewed by security owner; accepted until the planned migration is complete.',
  });

  assert.deepEqual(harness.calls[0], ['auth', 'org-1', 'user-1', 'admin']);
});


test('same-status PATCH is still a member mutation, not viewer-only', async () => {
  const harness = createHarness('resolved');
  await harness.service.updateStatus({
    organizationId: 'org-1',
    userId: 'user-1',
    findingId: 'finding-1',
    status: 'resolved',
  });
  assert.deepEqual(harness.calls[0], ['auth', 'org-1', 'user-1', 'member']);
});

test('finding re-test requires member role and reuses the persistent security scan pipeline', async () => {
  const harness = createHarness('resolved');
  const result = await harness.service.requestRetest({
    organizationId: 'org-1',
    userId: 'user-1',
    findingId: 'finding-1',
    idempotencyKey: 'retest-request-123',
  });

  assert.equal(result.scan.id, 'scan-1');
  assert.deepEqual(harness.calls[0], ['auth', 'org-1', 'user-1', 'member']);
  const submission = harness.calls.find((call) => call[0] === 'scan-submit')[1];
  assert.equal(submission.targetId, 'target-1');
  assert.deepEqual(submission.requestedModules, ['security']);
  assert.equal(submission.jobPayloadByModule.security.purpose, 'finding_retest');
  assert.equal(submission.jobPayloadByModule.security.findingId, 'finding-1');
});

test('accepted-risk finding must be reopened before re-test', async () => {
  const harness = createHarness('accepted_risk');
  await assert.rejects(
    () => harness.service.requestRetest({
      organizationId: 'org-1',
      userId: 'user-1',
      findingId: 'finding-1',
      idempotencyKey: 'retest-request-456',
    }),
    (error) => error.code === 'FINDING_RETEST_ACCEPTED_RISK_BLOCKED',
  );
});
