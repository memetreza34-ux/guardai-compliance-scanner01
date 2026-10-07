import { createAuthenticatedApiClient, GuardApiError, type AccessTokenProvider } from './apiClient';
import type { RiskInput, WorkspaceRisk } from '../types/risk';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new GuardApiError(`${label} response is invalid.`, 'INVALID_API_RESPONSE', 200);
  return value;
}

function requireArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new GuardApiError(`${label} response is invalid.`, 'INVALID_API_RESPONSE', 200);
  return value;
}

export function createRiskApi(getAccessToken: AccessTokenProvider) {
  const client = createAuthenticatedApiClient(getAccessToken);

  async function listRisks(organizationId: string): Promise<WorkspaceRisk[]> {
    const payload = requireRecord(
      await client.request(`/organizations/${encodeURIComponent(organizationId)}/risks`),
      'Risk list',
    );
    return requireArray(payload.risks, 'Risk list') as WorkspaceRisk[];
  }

  async function createRisk(organizationId: string, input: RiskInput): Promise<WorkspaceRisk> {
    const payload = requireRecord(
      await client.request(`/organizations/${encodeURIComponent(organizationId)}/risks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
      'Risk create',
    );
    return requireRecord(payload.risk, 'Risk') as unknown as WorkspaceRisk;
  }

  async function updateRisk(
    organizationId: string,
    riskId: string,
    patch: Partial<RiskInput>,
  ): Promise<WorkspaceRisk> {
    const payload = requireRecord(
      await client.request(
        `/organizations/${encodeURIComponent(organizationId)}/risks/${encodeURIComponent(riskId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        },
      ),
      'Risk update',
    );
    return requireRecord(payload.risk, 'Risk') as unknown as WorkspaceRisk;
  }

  return { createRisk, listRisks, updateRisk };
}

export type RiskApi = ReturnType<typeof createRiskApi>;
