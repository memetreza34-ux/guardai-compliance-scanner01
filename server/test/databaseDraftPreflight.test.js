const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { inspectDraft, inspectDirectory } = require('../scripts/checkDatabaseDrafts');

const good = '-- DRAFT ONLY\nbegin;\ncreate table public.audit_sample (id uuid primary key);\nalter table public.audit_sample enable row level security;\nrevoke all on public.audit_sample from anon;\ncommit;\n';

test('accepts bounded SQL draft source with explicit RLS', () => {
  const result = inspectDraft('001_audit_sample_draft.sql', good);
  assert.deepEqual(result.issues, []);
  assert.equal(result.createdTableCount, 1);
});

test('rejects unsafe DDL, missing RLS and anonymous write grants', () => {
  const sql = 'begin; create table public.leaks (id uuid); grant insert on public.leaks to anon; drop table public.leaks; commit;';
  const codes = inspectDraft('001_bad_draft.sql', sql).issues.map(item => item.code);
  for (const required of ['MISSING_RLS', 'ANON_WRITE_GRANT', 'DROP_TABLE']) {
    assert.ok(codes.includes(required), required);
  }
});

test('rejects a source missing its transactional envelope', () => {
  const codes = inspectDraft('001_bad_draft.sql', 'create table public.x (id int);').issues.map(item => item.code);
  assert.deepEqual(codes, ['MISSING_BEGIN', 'MISSING_COMMIT', 'MISSING_RLS']);
});

test('ignores commented-out dangerous SQL statements', () => {
  assert.deepEqual(inspectDraft('001_audit_sample_draft.sql', '-- drop table public.audit_sample;\n' + good).issues, []);
});

test('reports missing/renumbered SQL drafts', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'guardai-sql-preflight-'));
  try {
    fs.writeFileSync(path.join(directory, '001_base_draft.sql'), good);
    fs.writeFileSync(path.join(directory, '003_next_draft.sql'), good);
    const issues = inspectDirectory(directory, 3).issues.map(item => item.code);
    assert.ok(issues.includes('DRAFT_COUNT_CHANGED'));
    assert.ok(issues.includes('NONCONTIGUOUS_ORDINAL'));
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
