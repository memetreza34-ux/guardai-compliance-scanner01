const test = require('node:test');
const assert = require('node:assert/strict');
const {
  mapMonitorRunRow,
  normalizeMonitorRunLimit,
} = require('../repositories/monitorRepository');

test('monitor run history limit is bounded', () => {
  assert.equal(normalizeMonitorRunLimit(undefined), 20);
  assert.equal(normalizeMonitorRunLimit(1), 1);
  assert.equal(normalizeMonitorRunLimit(100), 100);
  assert.throws(
    () => normalizeMonitorRunLimit(101),
    (error) => error.code === 'INVALID_MONITOR_RUN_LIMIT',
  );
});

test('monitor run projection includes linked scan state without inventing it', () => {
  assert.deepEqual(mapMonitorRunRow({
    id: 'run-a',
    organization_id: 'org-a',
    monitor_id: 'monitor-a',
    scheduled_for: '2026-10-07T12:00:00.000Z',
    scan_id: 'scan-a',
    scan_status: 'completed',
    scan_completed_at: '2026-10-07T12:01:00.000Z',
    scan_failed_at: null,
    created_at: '2026-10-07T12:00:01.000Z',
  }), {
    id: 'run-a',
    organizationId: 'org-a',
    monitorId: 'monitor-a',
    scheduledFor: '2026-10-07T12:00:00.000Z',
    scanId: 'scan-a',
    scanStatus: 'completed',
    scanCompletedAt: '2026-10-07T12:01:00.000Z',
    scanFailedAt: null,
    createdAt: '2026-10-07T12:00:01.000Z',
  });
});
