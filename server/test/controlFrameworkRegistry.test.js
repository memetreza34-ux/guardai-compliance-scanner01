const test = require('node:test');
const assert = require('node:assert/strict');
const securityRuleset = require('../../shared/rules/security-baseline.json');
const repositoryRuleset = require('../../shared/rules/repository-baseline.json');
const catalog = require('../../shared/governance/guardai-security-baseline.json');
const {
  getControl,
  getFramework,
  getGovernanceCatalogMetadata,
  listControls,
  listFrameworks,
  validateCatalog,
} = require('../governance/controlFrameworkRegistry');

const knownRuleIds = new Set([
  ...securityRuleset.rules.map((rule) => rule.id),
  ...repositoryRuleset.rules.map((rule) => rule.id),
]);

test('canonical GuardAI technical governance catalog has stable structure', () => {
  assert.deepEqual(getGovernanceCatalogMetadata(), {
    schemaVersion: 1,
    frameworkCount: 1,
    controlCount: 4,
    requirementCount: 7,
    externalMappingCount: 0,
  });

  const frameworks = listFrameworks();
  assert.equal(frameworks[0].id, 'guardai-security-baseline');
  assert.equal(frameworks[0].version, 1);
  assert.equal(frameworks[0].externalMappingCount, 0);

  const controls = listControls();
  assert.deepEqual(
    controls.map((control) => control.id),
    ['GA-SEC-01', 'GA-SEC-02', 'GA-SEC-03', 'GA-SEC-04'],
  );
});

test('framework and control reads preserve requirement and Rule mappings', () => {
  const framework = getFramework('guardai-security-baseline');
  assert.equal(framework.controls.length, 4);
  assert.equal(framework.requirements.length, 7);
  assert.match(framework.claimBoundary, /not an auditor opinion/i);

  const control = getControl('GA-SEC-01');
  assert.deepEqual(control.mappedRuleIds, [
    'security.https_transport',
    'security.strict_transport_security',
  ]);
  assert.deepEqual(
    control.requirements.map((requirement) => requirement.id),
    ['GA-SEC-01.1', 'GA-SEC-01.2'],
  );
});

test('catalog validation rejects unknown Rule mappings', () => {
  const clone = structuredClone(catalog);
  clone.controls[0].mappedRuleIds.push('security.unknown_rule');

  assert.throws(
    () => validateCatalog(clone, knownRuleIds),
    /unknown Rule security\.unknown_rule/,
  );
});

test('catalog validation rejects broken Control to Requirement references', () => {
  const clone = structuredClone(catalog);
  clone.controls[0].requirementIds.push('GA-SEC-99.9');

  assert.throws(
    () => validateCatalog(clone, knownRuleIds),
    /unknown Requirement GA-SEC-99\.9/,
  );
});

test('catalog validation rejects duplicate ids', () => {
  const clone = structuredClone(catalog);
  clone.controls.push(structuredClone(clone.controls[0]));

  assert.throws(
    () => validateCatalog(clone, knownRuleIds),
    /duplicate ids/,
  );
});
