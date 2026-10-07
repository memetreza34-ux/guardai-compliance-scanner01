const test = require('node:test');
const assert = require('node:assert/strict');
const {
  collectionHealthForScanStatus,
  mapEvidenceExplorerRow,
  normalizeEvidenceFilterText,
  normalizeEvidenceLimit,
} = require('../repositories/evidenceRepository');


test('evidence limit defaults and remains bounded', () => {
  assert.equal(normalizeEvidenceLimit(undefined), 50);
  assert.equal(normalizeEvidenceLimit('1'), 1);
  assert.equal(normalizeEvidenceLimit('100'), 100);
  assert.throws(
    () => normalizeEvidenceLimit('101'),
    (error) => error.code === 'INVALID_EVIDENCE_LIMIT',
  );
});


test('evidence text filters are normalized and bounded', () => {
  assert.equal(normalizeEvidenceFilterText(' security.headers ', 'detectorId', 120), 'security.headers');
  assert.equal(normalizeEvidenceFilterText('', 'type', 120), null);
  assert.throws(
    () => normalizeEvidenceFilterText('x'.repeat(121), 'type', 120),
    (error) => error.code === 'INVALID_EVIDENCE_FILTER',
  );
});

test('evidence collection health is derived from source scan state', () => {
  assert.equal(collectionHealthForScanStatus('completed'), 'healthy');
  assert.equal(collectionHealthForScanStatus('failed'), 'collection_error');
  assert.equal(collectionHealthForScanStatus('cancelled'), 'cancelled');
  assert.equal(collectionHealthForScanStatus('queued'), 'pending');
  assert.equal(collectionHealthForScanStatus('running'), 'pending');
  assert.equal(collectionHealthForScanStatus('unexpected'), 'unknown');
});

test('evidence projection distinguishes current from superseded history', () => {
  const base = {
    id: 'e-1',
    organization_id: 'org-1',
    scan_id: 'scan-1',
    target_id: 'target-1',
    target_display_name: 'Example',
    detector_id: 'security.headers',
    detector_version: '3',
    type: 'http_headers',
    source: 'https://example.com',
    normalized_data: {},
    content_hash: 'hash',
    captured_at: '2026-10-07T12:00:00Z',
    created_at: '2026-10-07T12:00:01Z',
    source_scan_status: 'completed',
    source_scan_completed_at: '2026-10-07T12:00:02Z',
  };

  const current = mapEvidenceExplorerRow({ ...base, is_superseded: false });
  const historical = mapEvidenceExplorerRow({ ...base, is_superseded: true });

  assert.equal(current.freshnessState, 'current');
  assert.equal(current.collectionHealth, 'healthy');
  assert.equal(historical.freshnessState, 'superseded');
});
