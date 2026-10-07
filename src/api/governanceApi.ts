import { createAuthenticatedApiClient, GuardApiError, type AccessTokenProvider } from './apiClient';
import type {
  GovernanceCatalogMetadata,
  GovernanceControl,
  GovernanceFrameworkDetail,
  GovernanceFrameworkSummary,
  GovernanceRequirement,
} from '../types/governance';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalid(label: string): never {
  throw new GuardApiError(`${label} response is invalid.`, 'INVALID_API_RESPONSE', 200);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  return isRecord(value) ? value : invalid(label);
}

function requireArray(value: unknown, label: string): unknown[] {
  return Array.isArray(value) ? value : invalid(label);
}

function requireStringArray(value: unknown, label: string): string[] {
  const list = requireArray(value, label);
  if (!list.every((entry) => typeof entry === 'string')) invalid(label);
  return list as string[];
}

function parseRequirement(value: unknown): GovernanceRequirement {
  const item = requireRecord(value, 'Governance requirement');
  if (
    typeof item.id !== 'string' ||
    typeof item.controlId !== 'string' ||
    typeof item.title !== 'string' ||
    item.assessmentType !== 'automated_technical' ||
    typeof item.scopeBoundary !== 'string'
  ) invalid('Governance requirement');

  return {
    id: item.id,
    controlId: item.controlId,
    title: item.title,
    assessmentType: 'automated_technical',
    mappedRuleIds: requireStringArray(item.mappedRuleIds, 'Governance requirement rules'),
    scopeBoundary: item.scopeBoundary,
  };
}

function parseControl(value: unknown): GovernanceControl {
  const item = requireRecord(value, 'Governance control');
  if (
    typeof item.id !== 'string' ||
    typeof item.title !== 'string' ||
    typeof item.category !== 'string' ||
    typeof item.description !== 'string'
  ) invalid('Governance control');

  return {
    id: item.id,
    title: item.title,
    category: item.category,
    description: item.description,
    requirementIds: requireStringArray(item.requirementIds, 'Governance control requirements'),
    mappedRuleIds: requireStringArray(item.mappedRuleIds, 'Governance control rules'),
    requirements: requireArray(item.requirements, 'Governance control requirements').map(parseRequirement),
  };
}

function parseFrameworkSummary(value: unknown): GovernanceFrameworkSummary {
  const item = requireRecord(value, 'Governance framework');
  if (
    typeof item.id !== 'string' ||
    !Number.isInteger(item.version) ||
    typeof item.title !== 'string' ||
    typeof item.description !== 'string' ||
    item.kind !== 'technical_internal' ||
    typeof item.claimBoundary !== 'string' ||
    !Number.isInteger(item.controlCount) ||
    !Number.isInteger(item.requirementCount) ||
    !Number.isInteger(item.externalMappingCount)
  ) invalid('Governance framework');

  return {
    id: item.id,
    version: item.version as number,
    title: item.title,
    description: item.description,
    kind: 'technical_internal',
    claimBoundary: item.claimBoundary,
    controlIds: requireStringArray(item.controlIds, 'Governance framework controls'),
    requirementIds: requireStringArray(item.requirementIds, 'Governance framework requirements'),
    controlCount: item.controlCount as number,
    requirementCount: item.requirementCount as number,
    externalMappingCount: item.externalMappingCount as number,
  };
}

function parseFrameworkDetail(value: unknown): GovernanceFrameworkDetail {
  const item = requireRecord(value, 'Governance framework');
  const summary = parseFrameworkSummary(item);
  return {
    ...summary,
    controls: requireArray(item.controls, 'Governance framework controls').map((control) => {
      const parsed = requireRecord(control, 'Governance framework control');
      return {
        id: String(parsed.id),
        title: String(parsed.title),
        category: String(parsed.category),
        description: String(parsed.description),
        requirementIds: requireStringArray(parsed.requirementIds, 'Governance control requirements'),
        mappedRuleIds: requireStringArray(parsed.mappedRuleIds, 'Governance control rules'),
      };
    }),
    requirements: requireArray(item.requirements, 'Governance framework requirements').map(parseRequirement),
    externalMappings: requireArray(item.externalMappings, 'Governance external mappings'),
  };
}

export function createGovernanceApi(getAccessToken: AccessTokenProvider) {
  const client = createAuthenticatedApiClient(getAccessToken);

  async function getMetadata(): Promise<GovernanceCatalogMetadata> {
    const item = requireRecord(await client.request('/governance'), 'Governance metadata');
    if (
      !Number.isInteger(item.schemaVersion) ||
      !Number.isInteger(item.frameworkCount) ||
      !Number.isInteger(item.controlCount) ||
      !Number.isInteger(item.requirementCount) ||
      !Number.isInteger(item.externalMappingCount)
    ) invalid('Governance metadata');
    return item as unknown as GovernanceCatalogMetadata;
  }

  async function listFrameworks(): Promise<GovernanceFrameworkSummary[]> {
    const payload = requireRecord(await client.request('/governance/frameworks'), 'Framework list');
    return requireArray(payload.frameworks, 'Framework list').map(parseFrameworkSummary);
  }

  async function getFramework(frameworkId: string): Promise<GovernanceFrameworkDetail> {
    const payload = requireRecord(
      await client.request(`/governance/frameworks/${encodeURIComponent(frameworkId)}`),
      'Framework read',
    );
    return parseFrameworkDetail(payload.framework);
  }

  async function listControls(): Promise<GovernanceControl[]> {
    const payload = requireRecord(await client.request('/governance/controls'), 'Control list');
    return requireArray(payload.controls, 'Control list').map(parseControl);
  }

  async function getControl(controlId: string): Promise<GovernanceControl> {
    const payload = requireRecord(
      await client.request(`/governance/controls/${encodeURIComponent(controlId)}`),
      'Control read',
    );
    return parseControl(payload.control);
  }

  return { getControl, getFramework, getMetadata, listControls, listFrameworks };
}

export type GovernanceApi = ReturnType<typeof createGovernanceApi>;
