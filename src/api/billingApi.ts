import {
  createAuthenticatedApiClient,
  GuardApiError,
  type AccessTokenProvider,
} from './apiClient';
import type { BillingCheckout, BillingStatus } from '../types/billing';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertBillingStatus(value: unknown): BillingStatus {
  if (!isRecord(value) || !Array.isArray(value.availablePlans)) {
    throw new GuardApiError('Billing status response is invalid.', 'INVALID_API_RESPONSE', 200);
  }
  if (
    typeof value.provider !== 'string' ||
    typeof value.plan !== 'string' ||
    typeof value.status !== 'string' ||
    typeof value.cancelAtPeriodEnd !== 'boolean' ||
    typeof value.billingEnabled !== 'boolean' ||
    !value.availablePlans.every((plan) => typeof plan === 'string')
  ) {
    throw new GuardApiError('Billing status response is invalid.', 'INVALID_API_RESPONSE', 200);
  }
  if (value.periodEnd !== null && typeof value.periodEnd !== 'string') {
    throw new GuardApiError('Billing period response is invalid.', 'INVALID_API_RESPONSE', 200);
  }
  return value as unknown as BillingStatus;
}

function assertCheckout(value: unknown): BillingCheckout {
  if (
    !isRecord(value) ||
    typeof value.sessionId !== 'string' ||
    typeof value.url !== 'string' ||
    typeof value.expiresAt !== 'string' ||
    typeof value.idempotentReplay !== 'boolean'
  ) {
    throw new GuardApiError('Billing checkout response is invalid.', 'INVALID_API_RESPONSE', 200);
  }
  let parsed;
  try {
    parsed = new URL(value.url);
  } catch {
    throw new GuardApiError('Billing checkout URL is invalid.', 'INVALID_API_RESPONSE', 200);
  }
  if (parsed.protocol !== 'https:') {
    throw new GuardApiError('Billing checkout URL is not HTTPS.', 'INVALID_API_RESPONSE', 200);
  }
  if (Number.isNaN(new Date(value.expiresAt).getTime())) {
    throw new GuardApiError('Billing checkout expiration is invalid.', 'INVALID_API_RESPONSE', 200);
  }
  return value as unknown as BillingCheckout;
}

export function createBillingApi(getAccessToken: AccessTokenProvider) {
  const client = createAuthenticatedApiClient(getAccessToken);

  async function getStatus(organizationId: string): Promise<BillingStatus> {
    const payload = await client.request(
      `/organizations/${encodeURIComponent(organizationId)}/billing`,
    );
    if (!isRecord(payload)) {
      throw new GuardApiError('Billing status response is invalid.', 'INVALID_API_RESPONSE', 200);
    }
    return assertBillingStatus(payload.billing);
  }

  async function createCheckout(
    organizationId: string,
    plan: string,
    idempotencyKey: string,
  ): Promise<BillingCheckout> {
    const payload = await client.request(
      `/organizations/${encodeURIComponent(organizationId)}/billing/checkout-session`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({ plan }),
      },
    );
    if (!isRecord(payload)) {
      throw new GuardApiError('Billing checkout response is invalid.', 'INVALID_API_RESPONSE', 200);
    }
    return assertCheckout(payload.checkout);
  }

  return { createCheckout, getStatus };
}

export interface PublicPlan {
  code: string;
  name: string;
  price: string;
  billingPeriod?: string;
  caption: string;
  highlight: boolean;
  features: string[];
  ctaText?: string;
  ctaLink?: string;
  quotas?: {
    website_targets?: number | null;
    seats?: number | null;
    security_scan?: number | null;
    monitor_schedules?: number | null;
  };
}

export async function fetchPublicPlans(): Promise<PublicPlan[]> {
  try {
    const { API_BASE_URL, API_VERSION_PREFIX } = await import('./apiClient');
    const response = await fetch(`${API_BASE_URL}${API_VERSION_PREFIX}/public/plans`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return [];
    const payload: unknown = await response.json();
    if (isRecord(payload) && Array.isArray(payload.plans)) {
      return payload.plans as PublicPlan[];
    }
  } catch {
    // Falls offline oder unerreichbar: Fallback im Caller
  }
  return [];
}

export function createBillingIdempotencyKey(): string {
  return crypto.randomUUID();
}

export type BillingApi = ReturnType<typeof createBillingApi>;
