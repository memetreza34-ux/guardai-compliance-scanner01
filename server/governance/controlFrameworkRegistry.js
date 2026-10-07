const catalog = require('../../shared/governance/guardai-security-baseline.json');
const securityRuleset = require('../../shared/rules/security-baseline.json');
const repositoryRuleset = require('../../shared/rules/repository-baseline.json');
const { HttpError } = require('../lib/httpError');

function assertUnique(items, label) {
  const ids = items.map((item) => item?.id);
  if (ids.some((id) => typeof id !== 'string' || id.length === 0)) {
    throw new TypeError(`${label} contains an invalid id.`);
  }
  if (new Set(ids).size !== ids.length) {
    throw new TypeError(`${label} contains duplicate ids.`);
  }
}

function validateCatalog(input, knownRuleIds) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Governance catalog must be an object.');
  }
  if (!Number.isInteger(input.schemaVersion) || input.schemaVersion < 1) {
    throw new TypeError('Governance catalog schemaVersion must be a positive integer.');
  }
  if (!Array.isArray(input.frameworks) || !Array.isArray(input.controls) || !Array.isArray(input.requirements)) {
    throw new TypeError('Governance catalog must define frameworks, controls and requirements.');
  }

  assertUnique(input.frameworks, 'Framework catalog');
  assertUnique(input.controls, 'Control catalog');
  assertUnique(input.requirements, 'Requirement catalog');

  const controlIds = new Set(input.controls.map((item) => item.id));
  const requirementIds = new Set(input.requirements.map((item) => item.id));

  for (const framework of input.frameworks) {
    if (!Number.isInteger(framework.version) || framework.version < 1) {
      throw new TypeError(`Framework ${framework.id} has an invalid version.`);
    }
    if (framework.kind !== 'technical_internal') {
      throw new TypeError(`Framework ${framework.id} must declare a supported kind.`);
    }
    if (typeof framework.claimBoundary !== 'string' || framework.claimBoundary.trim().length === 0) {
      throw new TypeError(`Framework ${framework.id} must declare a claim boundary.`);
    }
    for (const controlId of framework.controlIds || []) {
      if (!controlIds.has(controlId)) {
        throw new TypeError(`Framework ${framework.id} references unknown Control ${controlId}.`);
      }
    }
    for (const requirementId of framework.requirementIds || []) {
      if (!requirementIds.has(requirementId)) {
        throw new TypeError(`Framework ${framework.id} references unknown Requirement ${requirementId}.`);
      }
    }
  }

  for (const control of input.controls) {
    for (const requirementId of control.requirementIds || []) {
      if (!requirementIds.has(requirementId)) {
        throw new TypeError(`Control ${control.id} references unknown Requirement ${requirementId}.`);
      }
    }
    for (const ruleId of control.mappedRuleIds || []) {
      if (!knownRuleIds.has(ruleId)) {
        throw new TypeError(`Control ${control.id} references unknown Rule ${ruleId}.`);
      }
    }
  }

  for (const requirement of input.requirements) {
    if (!controlIds.has(requirement.controlId)) {
      throw new TypeError(`Requirement ${requirement.id} references unknown Control ${requirement.controlId}.`);
    }
    if (requirement.assessmentType !== 'automated_technical') {
      throw new TypeError(`Requirement ${requirement.id} uses an unsupported assessment type.`);
    }
    if (typeof requirement.scopeBoundary !== 'string' || requirement.scopeBoundary.trim().length === 0) {
      throw new TypeError(`Requirement ${requirement.id} must declare a scope boundary.`);
    }
    for (const ruleId of requirement.mappedRuleIds || []) {
      if (!knownRuleIds.has(ruleId)) {
        throw new TypeError(`Requirement ${requirement.id} references unknown Rule ${ruleId}.`);
      }
    }
  }

  if (!Array.isArray(input.externalMappings)) {
    throw new TypeError('Governance catalog externalMappings must be an array.');
  }

  return input;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
}

const knownRuleIds = new Set([
  ...securityRuleset.rules.map((rule) => rule.id),
  ...repositoryRuleset.rules.map((rule) => rule.id),
]);

const validatedCatalog = deepFreeze(validateCatalog(catalog, knownRuleIds));
const frameworkById = new Map(validatedCatalog.frameworks.map((item) => [item.id, item]));
const controlById = new Map(validatedCatalog.controls.map((item) => [item.id, item]));
const requirementById = new Map(validatedCatalog.requirements.map((item) => [item.id, item]));

function frameworkSummary(framework) {
  return {
    ...framework,
    controlCount: framework.controlIds.length,
    requirementCount: framework.requirementIds.length,
    externalMappingCount: validatedCatalog.externalMappings.filter(
      (mapping) => mapping.frameworkId === framework.id,
    ).length,
  };
}

function listFrameworks() {
  return validatedCatalog.frameworks.map(frameworkSummary);
}

function getFramework(frameworkId) {
  const framework = frameworkById.get(frameworkId);
  if (!framework) {
    throw new HttpError(404, 'Framework was not found.', 'FRAMEWORK_NOT_FOUND');
  }
  return {
    ...frameworkSummary(framework),
    controls: framework.controlIds.map((id) => controlById.get(id)),
    requirements: framework.requirementIds.map((id) => requirementById.get(id)),
    externalMappings: validatedCatalog.externalMappings.filter(
      (mapping) => mapping.frameworkId === framework.id,
    ),
  };
}

function listControls() {
  return validatedCatalog.controls.map((control) => ({
    ...control,
    requirements: control.requirementIds.map((id) => requirementById.get(id)),
  }));
}

function getControl(controlId) {
  const control = controlById.get(controlId);
  if (!control) {
    throw new HttpError(404, 'Control was not found.', 'CONTROL_NOT_FOUND');
  }
  const frameworks = validatedCatalog.frameworks
    .filter((framework) => framework.controlIds.includes(control.id))
    .map(frameworkSummary);

  return {
    ...control,
    requirements: control.requirementIds.map((id) => requirementById.get(id)),
    frameworks,
  };
}

function getGovernanceCatalogMetadata() {
  return {
    schemaVersion: validatedCatalog.schemaVersion,
    frameworkCount: validatedCatalog.frameworks.length,
    controlCount: validatedCatalog.controls.length,
    requirementCount: validatedCatalog.requirements.length,
    externalMappingCount: validatedCatalog.externalMappings.length,
  };
}

module.exports = {
  getControl,
  getFramework,
  getGovernanceCatalogMetadata,
  listControls,
  listFrameworks,
  validateCatalog,
};
