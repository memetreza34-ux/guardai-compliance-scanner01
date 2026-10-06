const test = require('node:test');
const assert = require('node:assert/strict');
const { createScanReadRepository } = require('../repositories/scanReadRepository');

test('listScans scopes reads to the organization and maps rows', async () => {
  const organizationId = '11111111-1111-4111-8111-111111111111';
  let seenSql = '';
  let seenParams = null;

  const pool = {
    async query(sql, params) {
      seenSql = sql;
      seenParams = params;
      return {
        rows: [{
          id: '22222222-2222-4222-8222-222222222222',
          organization_id: organizationId,
          target_id: '33333333-3333-4333-8333-333333333333',
          requested_by: '44444444-4444-4444-8444-444444444444',
          status: 'completed',
          scanner_version: '1.0.0',
          contract_version: '0.3.0',
          requested_modules: ['security'],
          scoring_profile_id: 'security-baseline',
          scoring_profile_version: '1',
          scoring_profile_definition_hash: 'hash',
          target_snapshot: { displayName: 'Example' },
          overall_score: 80,
          coverage: { security: { state: 'assessed' } },
          notices: [],
          started_at: '2026-10-06T10:00:00Z',
          completed_at: '2026-10-06T10:00:02Z',
          failed_at: null,
          error_code: null,
          error_message: null,
          created_at: '2026-10-06T10:00:00Z',
          updated_at: '2026-10-06T10:00:02Z',
        }],
      };
    },
  };

  const repository = createScanReadRepository(pool);
  const scans = await repository.listScans(organizationId, { limit: 25 });

  assert.match(seenSql, /where organization_id = \$1/);
  assert.deepEqual(seenParams, [organizationId, 25]);
  assert.equal(scans.length, 1);
  assert.equal(scans[0].organizationId, organizationId);
  assert.equal(scans[0].status, 'completed');
  assert.deepEqual(scans[0].requestedModules, ['security']);
});

test('listScans clamps an excessive limit', async () => {
  let seenParams = null;
  const pool = {
    async query(_sql, params) {
      seenParams = params;
      return { rows: [] };
    },
  };

  const repository = createScanReadRepository(pool);
  await repository.listScans('11111111-1111-4111-8111-111111111111', { limit: 500 });

  assert.equal(seenParams[1], 100);
});
