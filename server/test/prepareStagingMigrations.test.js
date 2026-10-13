const test = require('node:test');
const assert = require('node:assert/strict');
const {
  generatePlanEntitlementsSql,
  prepareStagingBundle,
} = require('../scripts/prepareStagingMigrations');

test('generatePlanEntitlementsSql generates valid idempotent SQL inserts for all canonical plans', () => {
  const sql = generatePlanEntitlementsSql();
  assert.equal(typeof sql, 'string');
  assert.ok(sql.includes("insert into public.plan_entitlements (plan, capability, enabled, monthly_limit, metadata) values ('free', 'security_scan', true, 50,"));
  assert.ok(sql.includes("values ('starter', 'security_scan', true, 500,"));
  assert.ok(sql.includes("values ('growth', 'security_scan', true, 2500,"));
  assert.ok(sql.includes("values ('growth', 'repository_scan', true, null,"));
  assert.ok(sql.includes("values ('business', 'security_scan', true, null,"));
  assert.ok(sql.includes("values ('business', 'ai_screening', true, null,"));
  assert.ok(sql.includes("on conflict (plan, capability) do update set"));
});

test('prepareStagingBundle consolidates all 33 draft files and embeds canonical seeds', () => {
  const bundle = prepareStagingBundle();
  assert.equal(bundle.fileCount, 33);
  assert.equal(bundle.inspection.passed, true);
  assert.equal(typeof bundle.bundleSql, 'string');

  assert.ok(bundle.bundleSql.includes('001_guardai_core_schema_draft.sql'));
  assert.ok(bundle.bundleSql.includes('033_team_invitations_draft.sql'));
  assert.ok(bundle.bundleSql.includes('Canonical Plan Entitlements Seed'));
  assert.ok(bundle.bundleSql.includes('Canonical Versioned Rules Seed'));
  assert.ok(bundle.bundleSql.includes('Canonical Versioned Scoring Profiles Seed'));

  // Ensure no banned destructive commands in bundle
  assert.equal(/\bdrop\s+table\b/i.test(bundle.bundleSql), false);
  assert.equal(/\bdrop\s+schema\b/i.test(bundle.bundleSql), false);
  assert.equal(/\btruncate\s+(?:table\s+)?(?:public\.)?/i.test(bundle.bundleSql), false);
});
