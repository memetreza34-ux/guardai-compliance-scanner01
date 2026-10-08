#!/usr/bin/env node
'use strict';

// Static *source* gate only. Never connects to, modifies, or provisions a database.
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_ROOT = path.resolve(__dirname, '../../database');
const DRAFT_PATTERN = /^(\d{3})_[a-z0-9_]+_draft\.sql$/;
const BANNED_SQL = [
  { id: 'DROP_TABLE', expression: /\bdrop\s+table\b/i },
  { id: 'DROP_SCHEMA', expression: /\bdrop\s+schema\b/i },
  { id: 'TRUNCATE_TABLE', expression: /\btruncate\s+(?:table\s+)?(?:public\.)?/i },
  { id: 'DISABLE_RLS', expression: /\balter\s+table\s+(?:if\s+exists\s+)?(?:public\.)?[a-z_][\w]*\s+disable\s+row\s+level\s+security\b/i },
  { id: 'ANON_WRITE_GRANT', expression: /\bgrant\s+(?:all(?:\s+privileges)?|insert|update|delete)\b[\s\S]{0,500}?\bto\s+anon\b/i },
];
const SECRET_MARKERS = [
  /\bpostgres(?:ql)?:\/\/[^\s'";]+/i,
  /\bsk_live_[a-z0-9]+/i,
  /\bgh[pousr]_[a-z0-9]{20,}/i,
];

function stripSqlComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\r\n]*/g, '');
}

function inspectDraft(name, sql) {
  const issues = [];
  if (!DRAFT_PATTERN.test(name)) issues.push({ code: 'INVALID_FILENAME', file: name });
  const normalized = stripSqlComments(sql);
  if (!/^\s*begin\s*;/i.test(normalized)) issues.push({ code: 'MISSING_BEGIN', file: name });
  if (!/commit\s*;\s*$/i.test(normalized)) issues.push({ code: 'MISSING_COMMIT', file: name });
  if (/\brollback\s*;\s*$/i.test(normalized)) issues.push({ code: 'ROLLBACK_AT_END', file: name });
  for (const rule of BANNED_SQL) {
    if (rule.expression.test(normalized)) issues.push({ code: rule.id, file: name });
  }
  for (const regex of SECRET_MARKERS) {
    if (regex.test(normalized)) issues.push({ code: 'POSSIBLE_SECRET', file: name });
  }
  const created = [...normalized.matchAll(/\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z_][a-z_0-9]*)\b/gi)]
    .map(match => match[1].toLowerCase());
  for (const table of created) {
    const rls = new RegExp('\\balter\\s+table\\s+public\\.' + table + '\\s+enable\\s+row\\s+level\\s+security\\b', 'i');
    if (!rls.test(normalized)) issues.push({ code: 'MISSING_RLS', file: name, table });
  }
  return { issues, createdTableCount: created.length };
}

function inspectDirectory(directory = DEFAULT_ROOT, expectedCount = 33) {
  const files = fs.readdirSync(directory).filter(name => DRAFT_PATTERN.test(name)).sort();
  const issues = [];
  if (files.length !== expectedCount) {
    issues.push({ code: 'DRAFT_COUNT_CHANGED', expected: expectedCount, actual: files.length });
  }
  files.forEach((name, position) => {
    const ordinal = Number(name.slice(0, 3));
    if (ordinal !== position + 1) {
      issues.push({ code: 'NONCONTIGUOUS_ORDINAL', file: name, expected: position + 1, actual: ordinal });
    }
  });
  let tableCount = 0;
  for (const name of files) {
    const result = inspectDraft(name, fs.readFileSync(path.join(directory, name), 'utf8'));
    issues.push(...result.issues);
    tableCount += result.createdTableCount;
  }
  return { passed: issues.length === 0, directory, draftCount: files.length, createdTableCount: tableCount, issues };
}

function main() {
  const report = inspectDirectory();
  if (process.argv.includes('--json')) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    process.stdout.write('GuardAI SQL draft source gate: ' + (report.passed ? 'PASS' : 'FAIL') + ' (' + report.draftCount + ' files, ' + report.createdTableCount + ' created public tables)\n');
    for (const issue of report.issues) {
      process.stderr.write('- ' + issue.code + ': ' + (issue.file || 'database/') + (issue.table ? ' [' + issue.table + ']' : '') + '\n');
    }
    process.stdout.write('Static source checks only; dedicated GuardAI staging constraints and RLS still require runtime proof.\n');
  }
  process.exitCode = report.passed ? 0 : 1;
}

if (require.main === module) main();
module.exports = { inspectDraft, inspectDirectory, stripSqlComments, DEFAULT_ROOT };
