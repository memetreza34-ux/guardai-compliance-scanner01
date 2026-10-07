const test = require('node:test');
const assert = require('node:assert/strict');
const {
  driftStorageError,
  mapDriftRow,
  normalizeDriftLimit,
} = require('../repositories/driftRepository');

test('Drift pagination limit is bounded', () => {
  assert.equal(normalizeDriftLimit(undefined), 50);
  assert.equal(normalizeDriftLimit(25), 25);
  assert.throws(() => normalizeDriftLimit(0), (error) => error.code === 'INVALID_DRIFT_LIMIT');
  assert.throws(() => normalizeDriftLimit(101), (error) => error.code === 'INVALID_DRIFT_LIMIT');
});

test('scanner status projection classifies introduced and reappeared Drift', () => {
  const base = {
    id: '11111111-1111-4111-8111-111111111111',
    organization_id: '22222222-2222-4222-8222-222222222222',
    finding_id: '33333333-3333-4333-8333-333333333333',
    scan_id: '44444444-4444-4444-8444-444444444444',
    to_status: 'open',
    created_at: '2026-10-07T16:00:00Z',
    monitor_run_id: '55555555-5555-4555-8555-555555555555',
    monitor_id: '66666666-6666-4666-8666-666666666666',
    scheduled_for: '2026-10-07T16:00:00Z',
    target_id: '77777777-7777-4777-8777-777777777777',
    target_display_name: 'Example',
    rule_id: 'security.hsts',
    rule_title: 'HSTS missing',
    rule_version: '3',
    severity: 'warning',
    message: 'HSTS was not observed.',
    evidence_ids: ['88888888-8888-4888-8888-888888888888'],
  };

  assert.equal(mapDriftRow({ ...base, from_status: null }).type, 'finding_introduced');
  assert.equal(mapDriftRow({ ...base, from_status: 'resolved' }).type, 'finding_reappeared');
});

test('missing Drift provenance tables map to a stable readiness error', () => {
  const mapped = driftStorageError({ code: '42P01' });
  assert.equal(mapped.statusCode, 503);
  assert.equal(mapped.code, 'DRIFT_STORAGE_NOT_READY');
});
