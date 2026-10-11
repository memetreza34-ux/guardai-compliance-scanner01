const test = require('node:test');
const assert = require('node:assert/strict');
const { createJobRepository } = require('../repositories/jobRepository');

const ORG = '11111111-1111-4111-8111-111111111111';
const SCAN = '22222222-2222-4222-8222-222222222222';
const JOB = '33333333-3333-4333-8333-333333333333';

const exhausted = {
  id: JOB,
  organization_id: ORG,
  scan_id: SCAN,
  job_type: 'security',
  status: 'running',
  worker_id: 'old-worker',
  attempt_count: 3,
  max_attempts: 3,
};

function harness({ expiredRow = null, candidateRow = null, throwOnScanUpdate = false } = {}) {
  const statements = [];
  let released = 0;
  const client = {
    async query(sql, params) {
      statements.push({ sql, params });
      if (sql === 'begin' || sql === 'commit' || sql === 'rollback') {
        return { rowCount: 0, rows: [] };
      }
      if (sql.includes('j.attempt_count >= j.max_attempts')) {
        return expiredRow ? { rowCount: 1, rows: [expiredRow] } : { rowCount: 0, rows: [] };
      }
      if (sql.includes('j.attempt_count < j.max_attempts')) {
        return candidateRow ? { rowCount: 1, rows: [candidateRow] } : { rowCount: 0, rows: [] };
      }
      if (throwOnScanUpdate && /^update public.scans/.test(sql.trim())) {
        throw new Error('Simulated database failure');
      }
      if (/^update public.scan_jobs/.test(sql.trim())) {
        return { rowCount: 1, rows: [candidateRow || {}] };
      }
      if (/^update public.scans/.test(sql.trim())) {
        return { rowCount: 1, rows: [] };
      }
      throw new Error('Unexpected SQL: ' + sql);
    },
    release() { released += 1; },
  };

  const repository = createJobRepository({
    async connect() { return client; },
    async query() { throw new Error('Unexpected non-transactional query'); },
  });
  return { repository, statements, get released() { return released; } };
}

function mutations(statements) {
  return statements.filter(entry => /^update public\./.test(entry.sql.trim()));
}

test('expired last-attempt lease is terminalized, with all mutations scoped to its org', async () => {
  const h = harness({ expiredRow: exhausted });
  const result = await h.repository.claimNextJob({
    workerId: 'new-worker', jobTypes: ['security'], leaseSeconds: 60,
  });
  assert.equal(result, null, 'reaper performs one bounded repair then returns idle');
  assert.deepEqual(h.statements.map(x => x.sql === 'begin' ? 'begin' : x.sql === 'commit' ? 'commit' : x.sql === 'release' ? 'release' : 'sql').slice(-1), ['commit']);
  assert.equal(h.released, 1);
  assert.equal(h.statements.some(x => x.sql.includes('j.attempt_count < j.max_attempts')), false);
  const writes = mutations(h.statements);
  assert.equal(writes.length, 3);

  assert.match(writes[0].sql, /set status = 'failed'/);
  assert.match(writes[0].sql, /organization_id = \$2/);
  assert.deepEqual(writes[0].params.slice(0, 2), [JOB, ORG]);
  const summary = JSON.parse(writes[0].params[2]);
  assert.equal(summary.state, 'error');
  assert.equal(summary.errorCode, 'JOB_LEASE_EXHAUSTED');
  assert.equal(summary.attemptCount, 3);
  assert.equal(summary.maxAttempts, 3);
  assert.equal(summary.retryable, false);

  assert.match(writes[1].sql, /set status = 'cancelled'/);
  assert.match(writes[1].sql, /organization_id = \$2/);
  assert.deepEqual(writes[1].params, [SCAN, ORG, JOB]);

  assert.match(writes[2].sql, /set status = 'failed'/);
  assert.match(writes[2].sql, /overall_score = null/);
  assert.match(writes[2].sql, /organization_id = \$2/);
  assert.deepEqual(writes[2].params.slice(0, 2), [SCAN, ORG]);
  assert.equal(writes[2].params[2], 'JOB_LEASE_EXHAUSTED');
  assert.equal(writes[2].params[4], 'security');
});

test('recovery query is bounded, skip-locked and only sees expired exhausted jobs in eligible scans', async () => {
  const h = harness();
  await h.repository.claimNextJob({ workerId: 'new-worker', jobTypes: ['security'], leaseSeconds: 60 });
  const sql = h.statements.find(x => x.sql.includes('j.attempt_count >= j.max_attempts'));
  assert.ok(sql);
  assert.deepEqual(sql.params, [['security']]);
  assert.match(sql.sql, /j\.status = 'running'/);
  assert.match(sql.sql, /j\.lease_expires_at <= now\(\)/);
  assert.match(sql.sql, /s\.status in \('queued', 'running'\)/);
  assert.match(sql.sql, /j\.job_type = any\(\$1::text\[\]\)/);
  assert.match(sql.sql, /for update of j, s skip locked\s+limit 1/i);
});

test('normal empty work queue returns idle without making any mutation', async () => {
  const h = harness();
  const result = await h.repository.claimNextJob({ workerId: 'worker-1', jobTypes: ['security'], leaseSeconds: 60 });
  assert.equal(result, null);
  assert.equal(mutations(h.statements).length, 0);
  assert.equal(h.statements.filter(x => x.sql === 'commit').length, 1);
  assert.equal(h.released, 1);
});

test('normal queued claim is unchanged if no exhausted lease is found', async () => {
  const candidate = { ...exhausted, status: 'queued', attempt_count: 0, max_attempts: 3 };
  const h = harness({ candidateRow: candidate });
  const result = await h.repository.claimNextJob({ workerId: 'worker-2', jobTypes: ['security'], leaseSeconds: 60 });
  assert.equal(result.id, JOB);
  const writes = mutations(h.statements);
  assert.equal(writes.length, 2, 'job lease and parent scan are the only normal claim writes');
  assert.match(writes[0].sql, /attempt_count = attempt_count \+ 1/);
  assert.match(writes[1].sql, /where id = \$1/);
  assert.equal(h.statements.some(x => x.sql === 'commit'), true);
});

test('failing any reaper write rolls back the complete repair transaction', async () => {
  const h = harness({ expiredRow: exhausted, throwOnScanUpdate: true });
  await assert.rejects(
    () => h.repository.claimNextJob({ workerId: 'worker-3', jobTypes: ['security'], leaseSeconds: 60 }),
    /Simulated database failure/,
  );
  assert.equal(h.statements.some(x => x.sql === 'rollback'), true);
  assert.equal(h.statements.some(x => x.sql === 'commit'), false);
  assert.equal(h.released, 1);
});

test('invalid worker id and invalid lease duration fail before the recovery query', async () => {
  const h = harness({ expiredRow: exhausted });
  await assert.rejects(
    () => h.repository.claimNextJob({ workerId: '', jobTypes: ['security'], leaseSeconds: 60 }),
    error => error.code === 'INVALID_WORKER_ID',
  );
  await assert.rejects(
    () => h.repository.claimNextJob({ workerId: 'worker-1', jobTypes: ['security'], leaseSeconds: 1 }),
    error => error.code === 'INVALID_JOB_LEASE',
  );
  assert.equal(h.statements.length, 0);
  assert.equal(h.released, 0);
});
