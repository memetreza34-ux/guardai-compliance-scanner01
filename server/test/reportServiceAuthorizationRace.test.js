const test = require('node:test');
const assert = require('node:assert/strict');
const { createReportService } = require('../services/reportService');
const { calculateReportSnapshotHash } = require('../domain/reportSnapshot');

const org = '11111111-1111-4111-8111-111111111111';
const user = '22222222-2222-4222-8222-222222222222';
const scanId = '33333333-3333-4333-8333-333333333333';

function revocableAuthorization() {
  let allowed = true;
  const calls = [];
  return {
    calls,
    revoke() { allowed = false; },
    async requireRole(organizationId, userId, minimumRole) {
      calls.push({ organizationId, userId, minimumRole });
      if (!allowed) {
        const error = new Error('Membership revoked while the request was pending');
        error.statusCode = 403;
        error.code = 'INSUFFICIENT_ORGANIZATION_ROLE';
        throw error;
      }
    },
  };
}

function historicalReport() {
  const snapshot = {
    schemaVersion: 2,
    reportType: 'technical-screening',
    scan: { id: scanId, organizationId: org, targetId: 'target-a' },
    findings: [],
    evidence: [],
    modules: [],
    limitations: [],
  };
  return {
    id: 'report-a',
    organizationId: org,
    schemaVersion: 2,
    reportType: 'technical-screening',
    snapshot,
    snapshotHash: calculateReportSnapshotHash(snapshot),
  };
}

test('revoked role during Scan read prevents immutable report creation', async () => {
  const authorization = revocableAuthorization();
  let inserted = 0;
  const service = createReportService({
    organizationAuthorization: authorization,
    scanReadRepository: {
      async getScanWithJobs() {
        authorization.revoke();
        return { scan: { status: 'completed' } };
      },
    },
    reportRepository: {
      async createSnapshot() { inserted += 1; throw new Error('must not persist'); },
    },
  });

  await assert.rejects(
    service.create({ organizationId: org, userId: user, scanId }),
    (error) => error.statusCode === 403 && /revoked/.test(error.message),
  );
  assert.equal(inserted, 0);
  assert.deepEqual(authorization.calls.map(call => call.minimumRole), ['member', 'member']);
});

test('revoked role during report get prevents returning stored report', async () => {
  const authorization = revocableAuthorization();
  const service = createReportService({
    organizationAuthorization: authorization,
    scanReadRepository: { async getScanWithJobs() { throw new Error('unused'); } },
    reportRepository: {
      async getSnapshot() {
        authorization.revoke();
        return historicalReport();
      },
    },
  });

  await assert.rejects(
    service.get({ organizationId: org, userId: user, reportId: 'report-a' }),
    (error) => error.statusCode === 403,
  );
  assert.deepEqual(authorization.calls.map(call => call.minimumRole), ['viewer', 'viewer']);
});

test('revoked role during report pagination prevents returning buffered list', async () => {
  const authorization = revocableAuthorization();
  const service = createReportService({
    organizationAuthorization: authorization,
    scanReadRepository: { async getScanWithJobs() { throw new Error('unused'); } },
    reportRepository: {
      async listSnapshots() {
        authorization.revoke();
        return { reports: [historicalReport()], nextCursor: null };
      },
    },
  });

  await assert.rejects(
    service.list({ organizationId: org, userId: user, limit: 25 }),
    (error) => error.statusCode === 403,
  );
  assert.deepEqual(authorization.calls.map(call => call.minimumRole), ['viewer', 'viewer']);
});

test('permitted report reads still return verified immutable report records', async () => {
  const authorization = revocableAuthorization();
  const service = createReportService({
    organizationAuthorization: authorization,
    scanReadRepository: { async getScanWithJobs() { throw new Error('unused'); } },
    reportRepository: {
      async getSnapshot() { return historicalReport(); },
      async listSnapshots() { return { reports: [historicalReport()], nextCursor: null }; },
    },
  });

  const detail = await service.get({ organizationId: org, userId: user, reportId: 'report-a' });
  const listing = await service.list({ organizationId: org, userId: user, limit: 25 });
  assert.equal(detail.id, 'report-a');
  assert.equal(listing.reports.length, 1);
  assert.equal(listing.reports[0].id, 'report-a');
  assert.equal(authorization.calls.length, 4);
});
