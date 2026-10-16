const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildInventory, inspectSource, renderMarkdown } = require('../scripts/inventoryDatabaseDrafts');

const makeDraft = (statements) => 'begin;\n' + statements + '\ncommit;\n';
const defineTable = (name, extras = '') =>
  'create table public.' + name + ' (id uuid primary key' + extras + ');\n' +
  'alter table public.' + name + ' enable row level security;';

function withDrafts(files, run) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'guardai-migrations-'));
  try {
    for (const [name, sql] of Object.entries(files)) {
      fs.writeFileSync(path.join(directory, name), sql, 'utf8');
    }
    return run(directory);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

test('inventory includes SHA-256 and table/RLS names; ignores comments', () => {
  const sql = makeDraft('-- references public.ignored\n' +
    defineTable('records', ', user_id uuid references auth.users(id)'));
  const item = inspectSource('001_base_draft.sql', sql);
  assert.deepEqual(item.tables, ['records']);
  assert.deepEqual(item.rlsEnabled, ['records']);
  assert.deepEqual(item.references, []);
  assert.deepEqual(item.systemReferences, ['users']);
  assert.match(item.sha256, /^[a-f0-9]{64}$/);
  assert.equal(item.begin, true);
  assert.equal(item.commit, true);
});

test('forward foreign keys are flagged without modifying database or disk', () => {
  withDrafts({
    '001_base_draft.sql': makeDraft(defineTable('parent', ', child_id uuid references public.child(id)')),
    '002_child_draft.sql': makeDraft(defineTable('child')),
  }, directory => {
    const report = buildInventory(directory);
    assert.equal(report.databaseConnectionUsed, false);
    assert.equal(report.status, 'REQUIRES_REVIEW');
    assert.equal(report.counts.drafts, 2);
    const issue = report.issues.find(item => item.code === 'FORWARD_DEPENDENCY');
    assert.deepEqual({
      file: issue.file, resource: issue.resource, definedIn: issue.definedIn,
    }, {
      file: '001_base_draft.sql',
      resource: 'table:child',
      definedIn: '002_child_draft.sql',
    });
    assert.deepEqual(report.drafts[0].dependencies, ['002_child_draft.sql']);
  });
});

test('detects unknown public reference and does not flag legitimate auth.users', () => {
  withDrafts({
    '001_base_draft.sql': makeDraft(
      defineTable('records', ', owner_id uuid references auth.users(id), missing_id uuid references public.missing(id)'),
    ),
  }, directory => {
    const report = buildInventory(directory);
    assert.deepEqual(
      report.issues.filter(item => item.code === 'UNRESOLVED_PUBLIC_REFERENCE')
        .map(item => item.resource),
      ['table:missing'],
    );
    assert.equal(report.counts.publicTables, 1);
  });
});

test('detects later use of already-created table and trigger function', () => {
  const first = makeDraft(
    defineTable('records') +
    '\ncreate or replace function private.touch() returns trigger language plpgsql as $$ begin return new; end $$;',
  );
  const second = makeDraft(
    'alter table public.records add column comment text;\n' +
    'create trigger records_touch before update on public.records for each row execute function private.touch();',
  );
  withDrafts({
    '001_base_draft.sql': first,
    '002_changes_draft.sql': second,
  }, directory => {
    const report = buildInventory(directory);
    assert.deepEqual(report.drafts[1].dependencies, ['001_base_draft.sql']);
    assert.deepEqual(report.drafts[1].forwardDependencies, []);
    assert.equal(report.issues.length, 0);
  });
});

test('RLS omissions and historical hand-maintained seed DML remain visible', () => {
  withDrafts({
    '001_base_draft.sql': makeDraft(
      'create table public.rules (id text primary key);\n' +
      "insert into public.rules(id) values ('demo');",
    ),
  }, directory => {
    const report = buildInventory(directory);
    assert.equal(report.issues[0].code, 'NEW_TABLE_WITHOUT_RLS');
    assert.deepEqual(report.warnings[0].tables, ['rules']);
    const markdown = renderMarkdown(report);
    assert.match(markdown, /READ-ONLY source scan/);
    assert.match(markdown, /MANUAL_SEED_OR_DML_REVIEW/);
    assert.match(markdown, /GuardAI-only staging project ref/);
  });
});

test('inventory stable ordering excludes non-draft/hidden unrelated files', () => {
  withDrafts({
    '002_other_draft.sql': makeDraft(defineTable('second')),
    '001_base_draft.sql': makeDraft(defineTable('first')),
    'README.md': 'not SQL',
    '003_non_matching.sql': 'not draft',
  }, directory => {
    const report = buildInventory(directory);
    assert.deepEqual(report.drafts.map(draft => draft.file),
      ['001_base_draft.sql', '002_other_draft.sql']);
    assert.equal(report.counts.drafts, 2);
    assert.equal(report.status, 'SOURCE_ORDER_PLAUSIBLE');
  });
});
