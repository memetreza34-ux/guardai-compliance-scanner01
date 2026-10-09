#!/usr/bin/env node
'use strict';

// Read-only source inventory. NOT a PostgreSQL parser, migration or deployment.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const DEFAULT_ROOT = path.resolve(__dirname, '../../database');
const FILE_PATTERN = /^\d{3}_[a-z0-9_]+_draft\.sql$/;

function unique(items) { return [...new Set(items)].sort(); }
function matches(source, regex, group = 1) {
  return unique([...source.matchAll(regex)].map(match => match[group].toLowerCase()));
}
function withoutComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\r\n]*/g, '');
}
function inspectSource(name, sql) {
  const source = withoutComments(sql);
  return {
    file: name,
    sha256: crypto.createHash('sha256').update(sql, 'utf8').digest('hex'),
    lines: sql.split(/\r?\n/).length,
    begin: /^\s*begin\s*;/i.test(source),
    commit: /commit\s*;\s*$/i.test(source),
    tables: matches(source, /\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z_][a-z0-9_]*)\b/gi),
    types: matches(source, /\bcreate\s+type\s+public\.([a-z_][a-z0-9_]*)\b/gi),
    functions: matches(source, /\bcreate\s+(?:or\s+replace\s+)?function\s+((?:public|private)\.[a-z_][a-z0-9_]*)\s*\(/gi),
    references: matches(source, /\breferences\s+public\.([a-z_][a-z0-9_]*)\b/gi),
    systemReferences: matches(source, /\breferences\s+auth\.([a-z_][a-z0-9_]*)\b/gi),
    alters: matches(source, /\balter\s+table\s+(?:if\s+exists\s+)?public\.([a-z_][a-z0-9_]*)\b/gi),
    indexesOn: matches(source, /\bcreate\s+(?:unique\s+)?index\s+(?:if\s+not\s+exists\s+)?[a-z_][a-z0-9_]*\s+on\s+public\.([a-z_][a-z0-9_]*)\b/gi),
    policiesOn: matches(source, /\bcreate\s+policy\s+[a-z_][a-z0-9_]*\s+on\s+public\.([a-z_][a-z0-9_]*)\b/gi),
    triggersOn: matches(source, /\bcreate\s+(?:or\s+replace\s+)?trigger\s+[a-z_][a-z0-9_]*[\s\S]{0,250}?\bon\s+public\.([a-z_][a-z0-9_]*)\b/gi),
    triggerFunctions: matches(source, /\bexecute\s+function\s+((?:public|private)\.[a-z_][a-z0-9_]*)\s*\(/gi),
    insertsInto: matches(source, /\binsert\s+into\s+public\.([a-z_][a-z0-9_]*)\b/gi),
    rlsEnabled: matches(source, /\balter\s+table\s+public\.([a-z_][a-z0-9_]*)\s+enable\s+row\s+level\s+security\b/gi),
  };
}
function buildInventory(root = DEFAULT_ROOT) {
  const names = fs.readdirSync(root).filter(file => FILE_PATTERN.test(file)).sort();
  const drafts = names.map(name => inspectSource(name, fs.readFileSync(path.join(root, name), 'utf8')));
  const createdBy = new Map();
  const issues = [];
  const warnings = [];
  for (const item of drafts) {
    for (const [kind, resources] of [
      ['table', item.tables], ['type', item.types], ['function', item.functions],
    ]) {
      for (const resource of resources) {
        const key = kind + ':' + resource;
        if (createdBy.has(key)) {
          issues.push({ code: 'DUPLICATE_DEFINITION', file: item.file, resource: key, previous: createdBy.get(key) });
        } else createdBy.set(key, item.file);
      }
    }
  }
  for (const item of drafts) {
    const requiredTables = unique([
      ...item.references, ...item.alters, ...item.indexesOn,
      ...item.policiesOn, ...item.triggersOn, ...item.insertsInto,
    ]);
    const requirements = [
      ...requiredTables.map(resource => ({ kind: 'table', resource })),
      ...item.triggerFunctions.map(resource => ({ kind: 'function', resource })),
    ];
    const deps = new Set();
    const forward = [];
    const missing = [];
    for (const requirement of requirements) {
      const key = requirement.kind + ':' + requirement.resource;
      const creator = createdBy.get(key);
      if (!creator) {
        missing.push(key);
        issues.push({ code: 'UNRESOLVED_PUBLIC_REFERENCE', file: item.file, resource: key });
      } else if (creator !== item.file) {
        deps.add(creator);
        if (creator > item.file) {
          forward.push({ resource: key, definedIn: creator });
          issues.push({ code: 'FORWARD_DEPENDENCY', file: item.file, resource: key, definedIn: creator });
        }
      }
    }
    item.dependencies = [...deps].sort();
    item.forwardDependencies = forward;
    item.missingReferences = unique(missing);
    if (!item.begin || !item.commit) issues.push({ code: 'TRANSACTION_ENVELOPE', file: item.file });
    for (const table of item.tables) {
      if (!item.rlsEnabled.includes(table)) {
        issues.push({ code: 'NEW_TABLE_WITHOUT_RLS', file: item.file, resource: 'table:' + table });
      }
    }
    if (item.insertsInto.length) warnings.push({
      code: 'MANUAL_SEED_OR_DML_REVIEW', file: item.file, tables: item.insertsInto,
    });
    if (item.systemReferences.some(table => table !== 'users')) {
      warnings.push({ code: 'NONSTANDARD_AUTH_REFERENCE', file: item.file, tables: item.systemReferences });
    }
  }
  return {
    status: issues.length ? 'REQUIRES_REVIEW' : 'SOURCE_ORDER_PLAUSIBLE',
    sourceOnly: true,
    databaseConnectionUsed: false,
    counts: {
      drafts: drafts.length,
      publicTables: [...createdBy.keys()].filter(key => key.startsWith('table:')).length,
      publicTypes: [...createdBy.keys()].filter(key => key.startsWith('type:')).length,
      functions: [...createdBy.keys()].filter(key => key.startsWith('function:')).length,
      issues: issues.length,
      warnings: warnings.length,
    },
    drafts, issues, warnings,
  };
}
function renderMarkdown(report) {
  const tick = String.fromCharCode(96);
  const escapeCell = value => String(value || '—').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
  const lines = [
    '# GuardAI SQL Draft Inventory (generated)',
    '',
    '> READ-ONLY source scan. Heuristic only; no PostgreSQL syntax, RLS runtime or migration validity is proved.',
    '',
    'Status: **' + report.status + '**; files: ' + report.counts.drafts
      + '; public tables: ' + report.counts.publicTables + '; static issues: ' + report.counts.issues,
    '',
    '| Source file | SHA-256 prefix | Creates tables | Dependencies | Forward references | DML destinations |',
    '| --- | --- | --- | --- | --- | --- |',
  ];
  for (const d of report.drafts) {
    lines.push('| ' + escapeCell(d.file) + ' | ' + tick + d.sha256.slice(0, 12) + tick
      + ' | ' + escapeCell(d.tables.join(', ')) + ' | ' + escapeCell(d.dependencies.join(', '))
      + ' | ' + escapeCell(d.forwardDependencies.map(x => x.resource + ' → ' + x.definedIn).join(', '))
      + ' | ' + escapeCell(d.insertsInto.join(', ')) + ' |');
  }
  lines.push('', '## Review findings', '');
  if (!report.issues.length) lines.push('- No flags from this limited scanner. This does not prove the SQL is safe or valid.');
  for (const issue of report.issues) {
    lines.push('- **' + issue.code + '**: ' + issue.file +
      (issue.resource ? ' (' + issue.resource + ')' : '') +
      (issue.definedIn ? ' defined in ' + issue.definedIn : ''));
  }
  lines.push('', '## Seed / DML review', '');
  for (const warning of report.warnings) {
    lines.push('- ' + warning.code + ': ' + warning.file +
      (warning.tables ? ' (' + warning.tables.join(', ') + ')' : ''));
  }
  lines.push('', '## Manual gates before any database write', '');
  lines.push('1. Match the exact GuardAI-only staging project ref; verify backup and restore.');
  lines.push('2. Review all flagged references, functions, triggers, types, policies, grants and data changes in real PostgreSQL.');
  lines.push('3. Promote reviewed SQL to versioned migrations; generate canonical Rule/Scoring seeds from shared source JSON, never copy historical hand-seeded rules.');
  lines.push('4. Test fresh installation, idempotence/forward fixes, two-org tenant isolation, worker leases and signed webhook behavior.');
  lines.push('5. Release only with executed green CI, staging proof and explicit production approval.');
  return lines.join('\n') + '\n';
}
function main() {
  const report = buildInventory();
  process.stdout.write(process.argv.includes('--json') ? JSON.stringify(report, null, 2) + '\n' : renderMarkdown(report));
  if (process.argv.includes('--check') && report.issues.length) process.exitCode = 1;
}
if (require.main === module) main();
module.exports = { buildInventory, inspectSource, renderMarkdown, withoutComments };
