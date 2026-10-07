const { HttpError } = require('../lib/httpError');

const FINDING_RETEST_PURPOSE = 'finding_retest';

function requireNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new HttpError(500, `Finding re-test payload is missing ${label}.`, 'INVALID_FINDING_RETEST_PAYLOAD');
  }
  return value.trim();
}

function buildFindingRetestJobPayload(finding) {
  if (!finding || typeof finding !== 'object') {
    throw new TypeError('Finding re-test payload requires a finding.');
  }

  return {
    purpose: FINDING_RETEST_PURPOSE,
    findingId: requireNonEmptyString(finding.id, 'findingId'),
    findingFingerprint: requireNonEmptyString(finding.fingerprint, 'findingFingerprint'),
    detectorId: requireNonEmptyString(finding.latestDetectorId, 'detectorId'),
  };
}

function parseFindingRetestJobPayload(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (value.purpose !== FINDING_RETEST_PURPOSE) return null;

  return {
    purpose: FINDING_RETEST_PURPOSE,
    findingId: requireNonEmptyString(value.findingId, 'findingId'),
    findingFingerprint: requireNonEmptyString(value.findingFingerprint, 'findingFingerprint'),
    detectorId: requireNonEmptyString(value.detectorId, 'detectorId'),
  };
}

function evaluateFindingRetest({ payload, detectorId, assessmentState, detectedFingerprints }) {
  const retest = parseFindingRetestJobPayload(payload);
  if (!retest) return null;

  if (assessmentState !== 'assessed') {
    throw new HttpError(
      409,
      'Finding re-test cannot verify resolution from an unassessed detector result.',
      'FINDING_RETEST_NOT_ASSESSED',
    );
  }

  if (retest.detectorId !== detectorId) {
    throw new HttpError(
      409,
      'Finding re-test detector does not match the detector that created the finding.',
      'FINDING_RETEST_DETECTOR_MISMATCH',
      { expectedDetectorId: retest.detectorId, actualDetectorId: detectorId },
    );
  }

  const fingerprints = detectedFingerprints instanceof Set
    ? detectedFingerprints
    : new Set(detectedFingerprints || []);

  return {
    ...retest,
    outcome: fingerprints.has(retest.findingFingerprint) ? 'still_present' : 'verified_resolved',
  };
}

module.exports = {
  buildFindingRetestJobPayload,
  evaluateFindingRetest,
  FINDING_RETEST_PURPOSE,
  parseFindingRetestJobPayload,
};
