const { HttpError } = require('../lib/httpError');

const RISK_STATUSES = Object.freeze(['open', 'mitigating', 'accepted', 'closed']);
const RISK_TREATMENTS = Object.freeze(['mitigate', 'accept', 'avoid', 'transfer', 'monitor']);

function normalizeText(value, field, { required = false, maxLength }) {
  if (value === undefined || value === null) {
    if (required) throw new HttpError(400, `${field} is required.`, 'INVALID_RISK_INPUT');
    return null;
  }
  if (typeof value !== 'string') {
    throw new HttpError(400, `${field} is invalid.`, 'INVALID_RISK_INPUT');
  }
  const normalized = value.trim();
  if (required && normalized.length === 0) {
    throw new HttpError(400, `${field} is required.`, 'INVALID_RISK_INPUT');
  }
  if (normalized.length > maxLength) {
    throw new HttpError(400, `${field} is too long.`, 'INVALID_RISK_INPUT');
  }
  return normalized.length === 0 ? null : normalized;
}

function normalizeScore(value, field, { optional = false } = {}) {
  if ((value === undefined || value === null) && optional) return null;
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw new HttpError(400, `${field} must be an integer from 1 to 5.`, 'INVALID_RISK_INPUT');
  }
  return value;
}

function normalizeStatus(value) {
  if (!RISK_STATUSES.includes(value)) {
    throw new HttpError(400, 'Risk status is invalid.', 'INVALID_RISK_INPUT');
  }
  return value;
}

function normalizeTreatment(value) {
  if (!RISK_TREATMENTS.includes(value)) {
    throw new HttpError(400, 'Risk treatment is invalid.', 'INVALID_RISK_INPUT');
  }
  return value;
}

function normalizeReviewDueAt(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw new HttpError(400, 'Risk review date is invalid.', 'INVALID_RISK_INPUT');
  }
  return new Date(value).toISOString();
}

function normalizeIdList(value, field, max = 100) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > max || value.some((item) => typeof item !== 'string')) {
    throw new HttpError(400, `${field} is invalid.`, 'INVALID_RISK_INPUT');
  }
  return [...new Set(value)];
}

function scoreRisk(likelihood, impact) {
  return likelihood * impact;
}

function normalizeRiskState(input) {
  const status = normalizeStatus(input.status ?? 'open');
  const treatment = normalizeTreatment(input.treatment ?? 'mitigate');
  const likelihood = normalizeScore(input.likelihood, 'likelihood');
  const impact = normalizeScore(input.impact, 'impact');
  const residualLikelihood = normalizeScore(input.residualLikelihood, 'residualLikelihood', { optional: true });
  const residualImpact = normalizeScore(input.residualImpact, 'residualImpact', { optional: true });

  if ((residualLikelihood === null) !== (residualImpact === null)) {
    throw new HttpError(
      400,
      'Residual likelihood and impact must be supplied together.',
      'INVALID_RISK_INPUT',
    );
  }
  if (status === 'accepted' && treatment !== 'accept') {
    throw new HttpError(400, 'Accepted Risk status requires accept treatment.', 'INVALID_RISK_INPUT');
  }

  return {
    title: normalizeText(input.title, 'title', { required: true, maxLength: 200 }),
    description: normalizeText(input.description, 'description', { maxLength: 5000 }),
    status,
    treatment,
    likelihood,
    impact,
    residualLikelihood,
    residualImpact,
    ownerUserId: input.ownerUserId ?? null,
    reviewDueAt: normalizeReviewDueAt(input.reviewDueAt),
    targetIds: normalizeIdList(input.targetIds, 'targetIds'),
    findingIds: normalizeIdList(input.findingIds, 'findingIds'),
    controlIds: normalizeIdList(input.controlIds, 'controlIds'),
  };
}

module.exports = {
  normalizeRiskState,
  RISK_STATUSES,
  RISK_TREATMENTS,
  scoreRisk,
};
