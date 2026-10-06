const test = require('node:test');
const assert = require('node:assert/strict');
const { createFindingRepository } = require('../repositories/findingRepository');

test('finding list includes the newest technical observation without weakening tenant scope', async () => {
  const organizationId = '11111111-1111-4111-8111-111111111111';
  let capturedSql = '';
  let capturedParams = null;

  const pool = {
    connect() {
      throw new Error('connect should not be used for a read-only list test');
    },
    async query(sql, params) {
      capturedSql = sql;
      capturedParams = params;
      return {
        rows: [{
          id: '22222222-2222-4222-8222-222222222222',
          organization_id: organizationId,
          target_id: '33333333-3333-4333-8333-333333333333',
          rule_id: 'security.hsts',
          rule_title: 'HSTS is missing',
          fingerprint: 'fingerprint',
          status: 'open',
          status_reason: 'First observed by scanner',
          status_updated_at: '2026-10-06T13:00:00Z',
          status_updated_by: null,
          first_seen_at: '2026-10-06T13:00:00Z',
          last_seen_at: '2026-10-06T13:00:00Z',
          created_at: '2026-10-06T13:00:00Z',
          updated_at: '2026-10-06T13:00:00Z',
          latest_scan_id: '44444444-4444-4444-8444-444444444444',
          rule_version: '3',
          rule_definition_hash: 'rule-hash',
          severity: 'warning',
          confidence: null,
          evidence_ids: ['55555555-5555-4555-8555-555555555555'],
          message: 'Strict-Transport-Security was not observed.',
          remediation: 'Enable HSTS after validating HTTPS coverage.',
          latest_observed_at: '2026-10-06T13:00:01Z',
        }],
      };
    },
  };

  const repository = createFindingRepository(pool);
  const page = await repository.listFindings({ organizationId, limit: 50 });

  assert.match(capturedSql, /f\.organization_id = \$1/);
  assert.match(capturedSql, /left join lateral/i);
  assert.deepEqual(capturedParams, [organizationId, 51]);
  assert.equal(page.findings.length, 1);
  assert.equal(page.findings[0].organizationId, organizationId);
  assert.equal(page.findings[0].severity, 'warning');
  assert.equal(page.findings[0].ruleVersion, '3');
  assert.equal(page.findings[0].latestScanId, '44444444-4444-4444-8444-444444444444');
  assert.deepEqual(page.findings[0].evidenceIds, ['55555555-5555-4555-8555-555555555555']);
});
