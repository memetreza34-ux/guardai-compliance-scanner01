const test = require('node:test');
const assert = require('node:assert/strict');
const { createFindingRepository } = require('../repositories/findingRepository');
const { createEvidenceRepository } = require('../repositories/evidenceRepository');
const { encodeTimestampIdCursor, decodeTimestampIdCursor } = require('../lib/paginationCursor');

const ORG_A = '11111111-1111-4111-8111-111111111111';
const ORG_B = '22222222-2222-4222-8222-222222222222';
const TARGET = '33333333-3333-4333-8333-333333333333';
const SCAN = '44444444-4444-4444-8444-444444444444';
const ROW_A = '55555555-5555-4555-8555-555555555555';
const ROW_B = '66666666-6666-4666-8666-666666666666';
const ROW_C = '77777777-7777-4777-8777-777777777777';
const TIME = '2026-10-11T09:00:00.000Z';
const CURSOR = encodeTimestampIdCursor(TIME, ROW_A);

// This instrumented pool rejects the exact prior bug: passing two or more bind
// values to a query with only $1 because LIMIT used a literal JS index.
function inspectBoundQuery(sql, params) {
  assert.ok(Array.isArray(params), 'list queries must bind values');
  assert.match(sql, /organization_id = \$1/, 'tenant ID must be scoped in SQL');
  assert.match(sql, /limit \$\d+\s*$/i, 'LIMIT must be a bind placeholder, not an inline number');

  const positions = [...sql.matchAll(/\$(\d+)/g)].map(match => Number(match[1]));
  const distinct = [...new Set(positions)].sort((a, b) => a - b);
  assert.deepEqual(distinct, Array.from({ length: params.length }, (_, index) => index + 1),
    'all bind parameters must be present and indexes must be contiguous');

  const limitPosition = Number(sql.match(/limit \$(\d+)\s*$/i)[1]);
  assert.equal(limitPosition, params.length, 'LIMIT must use the last bound value');
  assert.equal(typeof params.at(-1), 'number', 'LIMIT must bind an integer');
  assert.ok(params.at(-1) >= 2 && params.at(-1) <= 101);
}

function makePool(rows = []) {
  const calls = [];
  const pool = {
    async query(sql, params) {
      inspectBoundQuery(sql, params);
      calls.push({ sql, params });
      return { rows, rowCount: rows.length };
    },
    async connect() {
      throw new Error('Read-only query must not open a write transaction');
    },
  };
  return { pool, calls };
}

test('Finding list binds requested page size and scopes query to Org A', async () => {
  const { pool, calls } = makePool();
  const result = await createFindingRepository(pool).listFindings({ organizationId: ORG_A, limit: 25 });
  assert.deepEqual(calls[0].params, [ORG_A, 26]);
  assert.equal(result.findings.length, 0);
  assert.equal(result.nextCursor, null);
});

test('Finding status, Target and cursor filters retain contiguous SQL placeholders', async () => {
  const { pool, calls } = makePool();
  await createFindingRepository(pool).listFindings({
    organizationId: ORG_B, status: 'open', targetId: TARGET, cursor: CURSOR, limit: 2,
  });
  const { sql, params } = calls[0];
  assert.equal(params[0], ORG_B);
  assert.deepEqual(params, [ORG_B, 'open', TARGET, TIME, ROW_A, 3]);
  assert.match(sql, /f\.status = \$2/);
  assert.match(sql, /f\.target_id = \$3/);
  assert.match(sql, /\(f\.status_updated_at, f\.id\) < \(\$4::timestamptz, \$5::uuid\)/);
});

test('Finding pagination returns only requested rows and a stable next cursor', async () => {
  const rows = [ROW_A, ROW_B, ROW_C].map(id => ({
    id, organization_id: ORG_A, status: 'open', status_updated_at: TIME,
  }));
  const { pool } = makePool(rows);
  const result = await createFindingRepository(pool).listFindings({ organizationId: ORG_A, limit: 2 });
  assert.deepEqual(result.findings.map(row => row.id), [ROW_A, ROW_B]);
  assert.deepEqual(decodeTimestampIdCursor(result.nextCursor), { createdAt: TIME, id: ROW_B });
});

test('Evidence list binds requested limit without exposing another Organization', async () => {
  const { pool, calls } = makePool();
  const result = await createEvidenceRepository(pool).listEvidence({ organizationId: ORG_A, limit: 50 });
  assert.deepEqual(calls[0].params, [ORG_A, 51]);
  assert.equal(result.evidence.length, 0);
  assert.equal(result.nextCursor, null);
});

test('Evidence Target, Scan, Detector, Type and cursor filters retain bind indexes', async () => {
  const { pool, calls } = makePool();
  await createEvidenceRepository(pool).listEvidence({
    organizationId: ORG_B,
    targetId: TARGET,
    scanId: SCAN,
    detectorId: 'security.headers',
    type: 'response_headers',
    cursor: CURSOR,
    limit: 5,
  });
  const { sql, params } = calls[0];
  assert.deepEqual(params, [ORG_B, TARGET, SCAN, 'security.headers', 'response_headers', TIME, ROW_A, 6]);
  assert.match(sql, /s\.target_id = \$2/);
  assert.match(sql, /e\.scan_id = \$3/);
  assert.match(sql, /e\.detector_id = \$4/);
  assert.match(sql, /e\.type = \$5/);
  assert.match(sql, /\(e\.captured_at, e\.id\) < \(\$6::timestamptz, \$7::uuid\)/);
});

test('Evidence pagination uses capturedAt + ID and does not invent a full count', async () => {
  const rows = [ROW_A, ROW_B, ROW_C].map(id => ({
    id, organization_id: ORG_B, captured_at: TIME, source_scan_status: 'completed', is_superseded: false,
  }));
  const { pool } = makePool(rows);
  const result = await createEvidenceRepository(pool).listEvidence({ organizationId: ORG_B, limit: 2 });
  assert.equal(result.evidence.length, 2);
  assert.deepEqual(result.evidence.map(x => x.id), [ROW_A, ROW_B]);
  assert.deepEqual(decodeTimestampIdCursor(result.nextCursor), { createdAt: TIME, id: ROW_B });
  assert.equal(result.evidence[0].collectionHealth, 'healthy');
});

test('invalid page sizes reject before any database query', async () => {
  const { pool, calls } = makePool();
  await assert.rejects(
    () => createFindingRepository(pool).listFindings({ organizationId: ORG_A, limit: '101' }),
    error => error.code === 'INVALID_FINDING_LIMIT',
  );
  await assert.rejects(
    () => createEvidenceRepository(pool).listEvidence({ organizationId: ORG_A, limit: '0' }),
    error => error.code === 'INVALID_EVIDENCE_LIMIT',
  );
  assert.equal(calls.length, 0);
});
