const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeRiskState, scoreRisk } = require('../domain/risk');

test('Risk score is likelihood multiplied by impact', () => {
  assert.equal(scoreRisk(4, 5), 20);
});

test('Risk requires residual likelihood and impact together', () => {
  assert.throws(
    () => normalizeRiskState({
      title: 'Example',
      likelihood: 3,
      impact: 4,
      residualLikelihood: 2,
    }),
    (error) => error.code === 'INVALID_RISK_INPUT',
  );
});

test('Accepted Risk requires accept treatment', () => {
  assert.throws(
    () => normalizeRiskState({
      title: 'Example',
      status: 'accepted',
      treatment: 'mitigate',
      likelihood: 3,
      impact: 4,
    }),
    (error) => error.code === 'INVALID_RISK_INPUT',
  );
});
