const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildFindingRetestJobPayload,
  evaluateFindingRetest,
  parseFindingRetestJobPayload,
} = require('../domain/findingRetest');

const finding = {
  id: '22222222-2222-4222-8222-222222222222',
  fingerprint: 'finding-fingerprint',
  latestDetectorId: 'security-headers',
};

test('finding re-test payload is minimal and deterministic', () => {
  assert.deepEqual(buildFindingRetestJobPayload(finding), {
    purpose: 'finding_retest',
    findingId: finding.id,
    findingFingerprint: finding.fingerprint,
    detectorId: finding.latestDetectorId,
  });
});

test('re-test verifies resolution only when the exact fingerprint disappears', () => {
  const payload = buildFindingRetestJobPayload(finding);

  assert.equal(evaluateFindingRetest({
    payload,
    detectorId: 'security-headers',
    assessmentState: 'assessed',
    detectedFingerprints: new Set(['other-fingerprint']),
  }).outcome, 'verified_resolved');

  assert.equal(evaluateFindingRetest({
    payload,
    detectorId: 'security-headers',
    assessmentState: 'assessed',
    detectedFingerprints: new Set(['finding-fingerprint']),
  }).outcome, 'still_present');
});

test('re-test fails closed on detector mismatch or unassessed result', () => {
  const payload = buildFindingRetestJobPayload(finding);
  assert.throws(
    () => evaluateFindingRetest({
      payload,
      detectorId: 'different-detector',
      assessmentState: 'assessed',
      detectedFingerprints: new Set(),
    }),
    (error) => error.code === 'FINDING_RETEST_DETECTOR_MISMATCH',
  );
  assert.throws(
    () => evaluateFindingRetest({
      payload,
      detectorId: 'security-headers',
      assessmentState: 'observed',
      detectedFingerprints: new Set(),
    }),
    (error) => error.code === 'FINDING_RETEST_NOT_ASSESSED',
  );
});

test('non re-test job payload is ignored', () => {
  assert.equal(parseFindingRetestJobPayload({ purpose: 'scheduled_monitor' }), null);
});
