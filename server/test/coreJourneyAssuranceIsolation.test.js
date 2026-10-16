const test = require('node:test');
const assert = require('node:assert/strict');
const { createOrganizationAuthorizationService } = require('../services/organizationAuthorization');
const { createFindingService } = require('../services/findingService');
const { createReportService } = require('../services/reportService');

function createAssuranceHarness() {
  const memberships = [
    { organizationId: 'org-a', userId: 'owner-a', role: 'owner' },
    { organizationId: 'org-a', userId: 'member-a', role: 'member' },
    { organizationId: 'org-a', userId: 'viewer-a', role: 'viewer' },
    { organizationId: 'org-b', userId: 'owner-b', role: 'owner' },
  ];
  const authorization = createOrganizationAuthorizationService({
    async getMembership(organizationId, userId) {
      return memberships.find(m => m.organizationId === organizationId && m.userId === userId) || null;
    },
  });
  const findings = [
    { id: 'finding-a', organizationId: 'org-a', targetId: 'target-a', status: 'open',
      fingerprint: 'f'.repeat(64), ruleId: 'security.hsts', latestDetectorId: 'security-headers' },
    { id: 'finding-b', organizationId: 'org-b', targetId: 'target-b', status: 'accepted_risk',
      fingerprint: 'b'.repeat(64), ruleId: 'security.hsts', latestDetectorId: 'security-headers' },
  ];
  const calls = { reads: 0, statusWrites: 0, retests: [], reportReads: 0, reportWrites: 0 };

  const findingRepository = {
    async listFindings({ organizationId, status }) {
      calls.reads += 1;
      return { findings: findings.filter(f => f.organizationId === organizationId && (!status || f.status === status)), nextCursor: null };
    },
    async getFinding(organizationId, id) {
      calls.reads += 1;
      return findings.find(f => f.organizationId === organizationId && f.id === id) || null;
    },
    async transitionStatus(input) {
      calls.statusWrites += 1;
      const finding = findings.find(f => f.organizationId === input.organizationId && f.id === input.findingId);
      if (finding) finding.status = input.nextStatus;
      return finding;
    },
  };

  const findingService = createFindingService({
    organizationAuthorization: authorization,
    findingRepository,
    scanSubmission: {
      async submit(input) {
        calls.retests.push(input);
        return { created: true, scan: { id: 'retest-scan', status: 'queued' }, jobs: [] };
      },
    },
  });

  const reportService = createReportService({
    organizationAuthorization: authorization,
    scanReadRepository: {
      async getScanWithJobs(organizationId, scanId) {
        calls.reportReads += 1;
        if (organizationId !== 'org-a' || scanId !== 'scan-a') return null;
        // A queued scan is deliberately NOT reportable.
        return { scan: { id: 'scan-a', organizationId, status: 'queued' }, jobs: [], evidence: [], findings: [] };
      },
    },
    reportRepository: {
      async createSnapshot() {
        calls.reportWrites += 1;
        throw new Error('Non-reportable scan should never reach persistence');
      },
      async getSnapshot() {
        calls.reportReads += 1;
        return null;
      },
      async listSnapshots() {
        calls.reportReads += 1;
        return { reports: [], nextCursor: null };
      },
    },
  });

  return { memberships, findings, calls, findingService, reportService };
}

const forbidden = error => error.statusCode === 403;

test('non-members cannot list, get, retest or mutate another organization Findings', async () => {
  const h = createAssuranceHarness();
  const foreign = { organizationId: 'org-a', userId: 'owner-b', findingId: 'finding-a' };
  await assert.rejects(() => h.findingService.list(foreign), forbidden);
  await assert.rejects(() => h.findingService.get(foreign), forbidden);
  await assert.rejects(() => h.findingService.requestRetest(foreign), forbidden);
  await assert.rejects(() => h.findingService.updateStatus({
    ...foreign, status: 'resolved', reason: 'Attempted cross-tenant mutation.',
  }), forbidden);
  assert.equal(h.calls.statusWrites, 0);
  assert.equal(h.calls.retests.length, 0);
  assert.equal(h.findings[0].status, 'open');
});

test('viewer can read the current org Finding but cannot fix or request re-test', async () => {
  const h = createAssuranceHarness();
  const query = { organizationId: 'org-a', userId: 'viewer-a', findingId: 'finding-a' };
  assert.equal((await h.findingService.list(query)).findings.length, 1);
  assert.equal((await h.findingService.get(query)).id, 'finding-a');
  await assert.rejects(() => h.findingService.updateStatus({
    ...query, status: 'resolved', reason: 'User says fixed.',
  }), forbidden);
  await assert.rejects(() => h.findingService.requestRetest(query), forbidden);
  assert.equal(h.calls.statusWrites, 0);
  assert.equal(h.calls.retests.length, 0);
});

test('member resolution is a workflow change, not verified by scanning', async () => {
  const h = createAssuranceHarness();
  const result = await h.findingService.updateStatus({
    organizationId: 'org-a', userId: 'member-a',
    findingId: 'finding-a', status: 'resolved', reason: 'Applied a proposed fix.',
  });
  assert.equal(result.status, 'resolved');
  assert.equal(result.resolutionVerification, undefined);
  assert.equal(h.calls.statusWrites, 1);
  assert.equal(h.calls.retests.length, 0, 'mark fixed must never silently trigger re-test or set verification');
});

test('member re-test remains bound to the original authorized Finding target and security worker', async () => {
  const h = createAssuranceHarness();
  const r = await h.findingService.requestRetest({
    organizationId: 'org-a', userId: 'member-a', findingId: 'finding-a', idempotencyKey: 'retest-id-123456',
  });
  assert.equal(r.scan.status, 'queued');
  assert.equal(h.calls.retests.length, 1);
  const job = h.calls.retests[0];
  assert.equal(job.organizationId, 'org-a');
  assert.equal(job.targetId, 'target-a');
  assert.deepEqual(job.requestedModules, ['security']);
  assert.equal(job.jobPayloadByModule.security.purpose, 'finding_retest');
  assert.equal(job.jobPayloadByModule.security.findingId, 'finding-a');
});

test('accepted-risk Finding cannot be re-tested without prior risk withdrawal', async () => {
  const h = createAssuranceHarness();
  await assert.rejects(() => h.findingService.requestRetest({
    organizationId: 'org-b', userId: 'owner-b', findingId: 'finding-b',
  }), error => error.statusCode === 409 && error.code === 'FINDING_RETEST_ACCEPTED_RISK_BLOCKED');
  assert.equal(h.calls.retests.length, 0);
});

test('report creation fails closed for other-tenant users, viewers, foreign scans and incomplete runs', async () => {
  const h = createAssuranceHarness();
  await assert.rejects(() => h.reportService.create({
    organizationId: 'org-a', userId: 'owner-b', scanId: 'scan-a',
  }), forbidden);
  await assert.rejects(() => h.reportService.create({
    organizationId: 'org-a', userId: 'viewer-a', scanId: 'scan-a',
  }), forbidden);
  assert.equal(h.calls.reportReads, 0);

  await assert.rejects(() => h.reportService.create({
    organizationId: 'org-b', userId: 'owner-b', scanId: 'scan-a',
  }), error => error.statusCode === 404 && error.code === 'SCAN_NOT_FOUND');

  await assert.rejects(() => h.reportService.create({
    organizationId: 'org-a', userId: 'member-a', scanId: 'scan-a',
  }), error => error.statusCode === 409 && error.code === 'SCAN_NOT_REPORTABLE');
  assert.equal(h.calls.reportWrites, 0);
});

test('foreign user is denied report lists and reads before touching the report store', async () => {
  const h = createAssuranceHarness();
  await assert.rejects(() => h.reportService.list({
    organizationId: 'org-a', userId: 'owner-b',
  }), forbidden);
  await assert.rejects(() => h.reportService.get({
    organizationId: 'org-a', userId: 'owner-b', reportId: 'report-a',
  }), forbidden);
  assert.equal(h.calls.reportReads, 0);
});
