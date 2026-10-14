import scanContract from '../../shared/scan-contract.json';
import type {
  PersistentModuleId,
  PersistentScan,
  PersistentScanList,
  PersistentScanResult,
  PersistentScanSubmission,
  TargetVerificationChallenge,
  TargetVerificationCheck,
  WorkspaceAuditPage,
  WorkspaceOrganization,
  WorkspaceTarget,
} from '../types/workspace';
import {
  createAuthenticatedApiClient,
  GuardApiError,
  type AccessTokenProvider,
} from './apiClient';

const EXPECTED_CONTRACT_VERSION = scanContract.version;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new GuardApiError(`${label} response is invalid.`, 'INVALID_API_RESPONSE', 200);
  }
  return value;
}

function requireArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new GuardApiError(`${label} response is invalid.`, 'INVALID_API_RESPONSE', 200);
  }
  return value;
}

function assertPersistentContract(payload: Record<string, unknown>): void {
  if (payload.contractVersion !== EXPECTED_CONTRACT_VERSION) {
    throw new GuardApiError(
      'GuardAI persistent scan contract is incompatible with this frontend.',
      'INCOMPATIBLE_SCAN_CONTRACT',
      200,
    );
  }
}

// Local Dev In-Memory / LocalStorage State for offline preview without Supabase
const DEV_DEFAULT_ORG: WorkspaceOrganization = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'GuardAI Demo Workspace',
  slug: 'demo-workspace',
  role: 'owner',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function getDevStorageTargets(): WorkspaceTarget[] {
  try {
    const raw = localStorage.getItem('guardai_dev_targets');
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return [
    {
      id: 'target-001',
      organizationId: '00000000-0000-4000-8000-000000000001',
      type: 'website',
      displayName: 'Haupt-Onlineshop',
      canonicalUrl: 'https://shop.guardai-demo.de',
      provider: null,
      verificationState: 'verified',
      verificationMetadata: {},
      createdBy: '00000000-0000-4000-8000-000000000001',
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      id: 'target-002',
      organizationId: '00000000-0000-4000-8000-000000000001',
      type: 'website',
      displayName: 'Kundenportal (SaaS)',
      canonicalUrl: 'https://portal.guardai-demo.de',
      provider: null,
      verificationState: 'verified',
      verificationMetadata: {},
      createdBy: '00000000-0000-4000-8000-000000000001',
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    },
    {
      id: 'target-003',
      organizationId: '00000000-0000-4000-8000-000000000001',
      type: 'website',
      displayName: 'Marketing Landingpage',
      canonicalUrl: 'https://guardai-demo.de',
      provider: null,
      verificationState: 'pending',
      verificationMetadata: {},
      createdBy: '00000000-0000-4000-8000-000000000001',
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
  ];
}

function saveDevStorageTargets(targets: WorkspaceTarget[]): void {
  try {
    localStorage.setItem('guardai_dev_targets', JSON.stringify(targets));
  } catch {
    // ignore
  }
}

function getDevStorageScans(): PersistentScan[] {
  try {
    const raw = localStorage.getItem('guardai_dev_scans');
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return [
    {
      id: 'scan-001',
      organizationId: '00000000-0000-4000-8000-000000000001',
      targetId: 'target-001',
      requestedBy: '00000000-0000-4000-8000-000000000001',
      status: 'completed',
      scannerVersion: '0.1.0',
      contractVersion: EXPECTED_CONTRACT_VERSION,
      requestedModules: ['security'],
      overallScore: 92,
      coverage: { security: { state: 'assessed', score: 92 } },
      createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      completedAt: new Date(Date.now() - 2 * 3600000 + 35000).toISOString(),
    },
    {
      id: 'scan-002',
      organizationId: '00000000-0000-4000-8000-000000000001',
      targetId: 'target-002',
      requestedBy: '00000000-0000-4000-8000-000000000001',
      status: 'completed',
      scannerVersion: '0.1.0',
      contractVersion: EXPECTED_CONTRACT_VERSION,
      requestedModules: ['security'],
      overallScore: 85,
      coverage: { security: { state: 'assessed', score: 85 } },
      createdAt: new Date(Date.now() - 18 * 3600000).toISOString(),
      completedAt: new Date(Date.now() - 18 * 3600000 + 42000).toISOString(),
    },
  ];
}

function saveDevStorageScans(scans: PersistentScan[]): void {
  try {
    localStorage.setItem('guardai_dev_scans', JSON.stringify(scans));
  } catch {
    // ignore
  }
}

export function createWorkspaceApi(getAccessToken: AccessTokenProvider) {
  const client = createAuthenticatedApiClient(getAccessToken);

  async function listOrganizations(): Promise<WorkspaceOrganization[]> {
    try {
      const payload = requireRecord(await client.request('/organizations'), 'Organization list');
      return requireArray(payload.organizations, 'Organization list') as WorkspaceOrganization[];
    } catch (err) {
      if (import.meta.env.DEV) return [DEV_DEFAULT_ORG];
      throw err;
    }
  }

  async function createOrganization(name: string): Promise<WorkspaceOrganization> {
    try {
      const payload = requireRecord(await client.request('/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      }), 'Organization create');
      return requireRecord(payload.organization, 'Organization') as unknown as WorkspaceOrganization;
    } catch (err) {
      if (import.meta.env.DEV) {
        return {
          id: `org-${Date.now()}`,
          name,
          slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          role: 'owner',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      throw err;
    }
  }

  async function updateOrganization(
    organizationId: string,
    name: string,
  ): Promise<WorkspaceOrganization> {
    try {
      const payload = requireRecord(
        await client.request(`/organizations/${encodeURIComponent(organizationId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        }),
        'Organization update',
      );
      return requireRecord(payload.organization, 'Organization') as unknown as WorkspaceOrganization;
    } catch (err) {
      if (import.meta.env.DEV) {
        return {
          id: organizationId,
          name,
          slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          role: 'owner',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      throw err;
    }
  }

  async function listTargets(organizationId: string): Promise<WorkspaceTarget[]> {
    try {
      const payload = requireRecord(
        await client.request(`/organizations/${encodeURIComponent(organizationId)}/targets`),
        'Target list',
      );
      return requireArray(payload.targets, 'Target list') as WorkspaceTarget[];
    } catch (err) {
      if (import.meta.env.DEV) return getDevStorageTargets();
      throw err;
    }
  }

  async function getTarget(organizationId: string, targetId: string): Promise<WorkspaceTarget> {
    try {
      const payload = requireRecord(
        await client.request(
          `/organizations/${encodeURIComponent(organizationId)}/targets/${encodeURIComponent(targetId)}`,
        ),
        'Target read',
      );
      return requireRecord(payload.target, 'Target') as unknown as WorkspaceTarget;
    } catch (err) {
      if (import.meta.env.DEV) {
        const found = getDevStorageTargets().find(t => t.id === targetId);
        if (found) return found;
      }
      throw err;
    }
  }

  async function createWebsiteTarget(
    organizationId: string,
    input: { url: string; displayName?: string },
  ): Promise<WorkspaceTarget> {
    try {
      const payload = requireRecord(
        await client.request(`/organizations/${encodeURIComponent(organizationId)}/targets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'website', ...input }),
        }),
        'Target create',
      );
      return requireRecord(payload.target, 'Target') as unknown as WorkspaceTarget;
    } catch (err) {
      if (import.meta.env.DEV) {
        const targets = getDevStorageTargets();
        const newTarget: WorkspaceTarget = {
          id: `target-${Date.now()}`,
          organizationId,
          type: 'website',
          displayName: input.displayName || input.url,
          canonicalUrl: input.url.startsWith('http') ? input.url : `https://${input.url}`,
          provider: null,
          verificationState: 'verified',
          verificationMetadata: {},
          createdBy: '00000000-0000-4000-8000-000000000001',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        targets.unshift(newTarget);
        saveDevStorageTargets(targets);
        return newTarget;
      }
      throw err;
    }
  }

  async function startTargetVerification(
    organizationId: string,
    targetId: string,
  ): Promise<TargetVerificationChallenge> {
    try {
      const payload = requireRecord(
        await client.request(
          `/organizations/${encodeURIComponent(organizationId)}/targets/${encodeURIComponent(targetId)}/verification-challenges`,
          { method: 'POST' },
        ),
        'Target verification challenge',
      );
      return requireRecord(payload.challenge, 'Target verification challenge') as unknown as TargetVerificationChallenge;
    } catch (err) {
      if (import.meta.env.DEV) {
        return {
          challengeId: `ch-${Date.now()}`,
          method: 'dns_txt',
          status: 'pending',
          dnsRecordName: '_guardai-challenge.example.com',
          dnsRecordType: 'TXT',
          dnsRecordValue: 'guardai-challenge-demo-value-xyz123',
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        };
      }
      throw err;
    }
  }

  async function checkTargetVerification(
    organizationId: string,
    targetId: string,
  ): Promise<TargetVerificationCheck> {
    try {
      const payload = requireRecord(
        await client.request(
          `/organizations/${encodeURIComponent(organizationId)}/targets/${encodeURIComponent(targetId)}/verification-challenges/check`,
          { method: 'POST' },
        ),
        'Target verification check',
      );
      return requireRecord(payload.verification, 'Target verification') as unknown as TargetVerificationCheck;
    } catch (err) {
      if (import.meta.env.DEV) {
        const targets = getDevStorageTargets();
        const target = targets.find(t => t.id === targetId);
        if (target) {
          target.verificationState = 'verified';
          saveDevStorageTargets(targets);
        }
        return { status: 'verified', verified: true };
      }
      throw err;
    }
  }

  async function submitScan(
    organizationId: string,
    targetId: string,
    modules: PersistentModuleId[],
    idempotencyKey: string,
  ): Promise<PersistentScanSubmission> {
    try {
      const payload = requireRecord(
        await client.request(
          `/organizations/${encodeURIComponent(organizationId)}/targets/${encodeURIComponent(targetId)}/scans`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Idempotency-Key': idempotencyKey,
            },
            body: JSON.stringify({ modules }),
          },
        ),
        'Scan submission',
      );
      assertPersistentContract(payload);
      return payload as unknown as PersistentScanSubmission;
    } catch (err) {
      if (import.meta.env.DEV) {
        const scans = getDevStorageScans();
        const newScan: PersistentScan = {
          id: `scan-${Date.now()}`,
          organizationId,
          targetId,
          requestedBy: '00000000-0000-4000-8000-000000000001',
          status: 'completed',
          scannerVersion: '0.1.0',
          contractVersion: EXPECTED_CONTRACT_VERSION,
          requestedModules: modules,
          overallScore: Math.floor(Math.random() * 12) + 85,
          coverage: { security: { state: 'assessed', score: 90 } },
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        };
        scans.unshift(newScan);
        saveDevStorageScans(scans);
        return {
          contractVersion: EXPECTED_CONTRACT_VERSION,
          scan: newScan,
          jobs: [],
          idempotentReplay: false,
        };
      }
      throw err;
    }
  }

  async function listScans(
    organizationId: string,
    limit = 25,
  ): Promise<PersistentScanList> {
    try {
      const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
      const payload = requireRecord(
        await client.request(
          `/organizations/${encodeURIComponent(organizationId)}/scans?limit=${safeLimit}`,
        ),
        'Scan list',
      );
      assertPersistentContract(payload);
      requireArray(payload.scans, 'Scan list');
      return payload as unknown as PersistentScanList;
    } catch (err) {
      if (import.meta.env.DEV) {
        return {
          contractVersion: EXPECTED_CONTRACT_VERSION,
          scans: getDevStorageScans(),
        };
      }
      throw err;
    }
  }

  async function getScanStatus(
    organizationId: string,
    scanId: string,
  ): Promise<PersistentScanResult> {
    try {
      const payload = requireRecord(
        await client.request(
          `/organizations/${encodeURIComponent(organizationId)}/scans/${encodeURIComponent(scanId)}`,
        ),
        'Scan status',
      );
      assertPersistentContract(payload);
      return payload as unknown as PersistentScanResult;
    } catch (err) {
      if (import.meta.env.DEV) {
        const scans = getDevStorageScans();
        const scan = scans.find(s => s.id === scanId) || scans[0];
        return {
          contractVersion: EXPECTED_CONTRACT_VERSION,
          scan,
          jobs: [],
          evidence: [],
          findings: [
            {
              findingId: 'f-01',
              fingerprint: 'fp-01',
              status: 'open',
              severity: 'warning',
              confidence: 0.95,
              evidenceIds: [],
              message: 'Content-Security-Policy Header fehlt oder ist zu weit gefasst.',
              remediation: 'Implementiere eine restriktive CSP mit default-src \'self\'.',
              firstSeenAt: new Date(Date.now() - 86400000).toISOString(),
              lastSeenAt: new Date().toISOString(),
              instanceCreatedAt: new Date().toISOString(),
            },
            {
              findingId: 'f-02',
              fingerprint: 'fp-02',
              status: 'open',
              severity: 'info',
              confidence: 1.0,
              evidenceIds: [],
              message: 'Strict-Transport-Security (HSTS) empfohlen mit mindestens 31536000 Sekunden.',
              remediation: 'Header Strict-Transport-Security: max-age=31536000; includeSubDomains hinzufügen.',
              firstSeenAt: new Date(Date.now() - 86400000).toISOString(),
              lastSeenAt: new Date().toISOString(),
              instanceCreatedAt: new Date().toISOString(),
            },
          ],
        };
      }
      throw err;
    }
  }

  async function listAuditEvents(
    organizationId: string,
    options: { limit?: number; cursor?: string } = {},
  ): Promise<WorkspaceAuditPage> {
    try {
      const search = new URLSearchParams();
      if (options.limit !== undefined) search.set('limit', String(options.limit));
      if (options.cursor) search.set('cursor', options.cursor);
      const suffix = search.size > 0 ? `?${search.toString()}` : '';

      const payload = requireRecord(
        await client.request(
          `/organizations/${encodeURIComponent(organizationId)}/audit-events${suffix}`,
        ),
        'Audit history',
      );
      requireArray(payload.events, 'Audit history');
      return payload as unknown as WorkspaceAuditPage;
    } catch (err) {
      if (import.meta.env.DEV) {
        return {
          events: [],
          nextCursor: null,
        };
      }
      throw err;
    }
  }

  return {
    checkTargetVerification,
    createOrganization,
    createWebsiteTarget,
    getScanStatus,
    getTarget,
    listAuditEvents,
    listOrganizations,
    listScans,
    listTargets,
    startTargetVerification,
    submitScan,
    updateOrganization,
  };
}

export type WorkspaceApi = ReturnType<typeof createWorkspaceApi>;

export function createScanIdempotencyKey(): string {
  return crypto.randomUUID();
}

