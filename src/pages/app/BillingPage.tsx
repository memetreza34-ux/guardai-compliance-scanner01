import { useEffect, useState } from 'react';
import { CheckCircle2, CreditCard, ExternalLink, RefreshCw, ShieldAlert } from 'lucide-react';
import { GuardApiError } from '../../api/apiClient';
import { createBillingApi, createBillingIdempotencyKey } from '../../api/billingApi';
import { useAuth } from '../../auth/AuthProvider';
import { useWorkspace } from '../../providers/WorkspaceProvider';
import type { BillingStatus } from '../../types/billing';

function formatDate(value?: string | null) {
  if (!value) return 'Not scheduled';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Unavailable' : parsed.toLocaleString();
}

function readableError(error: unknown) {
  if (error instanceof GuardApiError) return `${error.message} (${error.code})`;
  return error instanceof Error ? error.message : 'Billing request failed.';
}

function statusTone(status: string) {
  if (status === 'active' || status === 'trialing') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
  if (status === 'past_due' || status === 'unpaid' || status === 'incomplete') return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
  return 'border-slate-700 bg-slate-950 text-slate-400';
}

export default function BillingPage() {
  const { session } = useAuth();
  const { currentOrg, isLoading: orgLoading } = useWorkspace();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  const canManage = currentOrg?.role === 'owner' || currentOrg?.role === 'admin';

  useEffect(() => {
    let cancelled = false;
    setBilling(null);
    setStorageReady(true);
    setError(null);

    if (orgLoading) {
      setLoading(true);
      return;
    }

    if (!session?.access_token || !currentOrg) {
      setLoading(false);
      return;
    }

    if (!canManage) {
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      try {
        const api = createBillingApi(async () => session!.access_token);
        try {
          const next = await api.getStatus(currentOrg!.id);
          if (!cancelled) setBilling(next);
        } catch (loadError) {
          if (loadError instanceof GuardApiError && loadError.code === 'BILLING_STORAGE_NOT_READY') {
            if (!cancelled) setStorageReady(false);
          } else {
            throw loadError;
          }
        }
      } catch (loadError) {
        if (!cancelled) setError(readableError(loadError));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [session, currentOrg, orgLoading, canManage, retry]);

  async function startCheckout(plan: string) {
    if (!session?.access_token || !currentOrg || !canManage || !billing?.billingEnabled || checkoutPlan) return;
    setCheckoutPlan(plan);
    setError(null);
    try {
      const api = createBillingApi(async () => session.access_token);
      const checkout = await api.createCheckout(currentOrg.id, plan, createBillingIdempotencyKey());
      window.location.assign(checkout.url);
    } catch (checkoutError) {
      if (checkoutError instanceof GuardApiError && checkoutError.code === 'BILLING_STORAGE_NOT_READY') {
        setStorageReady(false);
      } else {
        setError(readableError(checkoutError));
      }
      setCheckoutPlan(null);
    }
  }

  if (orgLoading || loading) {
    return <div className="flex items-center justify-center p-12 text-slate-400">Loading billing...</div>;
  }

  if (!currentOrg) {
    return <div className="text-sm text-slate-500">Create or select a workspace before opening Billing.</div>;
  }

  if (!canManage) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">Organization</div>
          <h1 className="mt-2 text-2xl font-semibold text-slate-100">Billing</h1>
        </div>
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
            <div>
              <h2 className="font-semibold text-slate-200">Admin access required</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Billing state and Checkout creation are restricted to Organization Admins and Owners. Your {currentOrg.role} role does not receive billing details from the server.
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-7 animate-in fade-in duration-500">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">Organization</div>
        <h1 className="mt-2 text-2xl font-semibold text-slate-100">Billing</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Subscription state is read from GuardAI's server-side billing record. Checkout return pages never activate entitlements by themselves; verified provider webhooks reconcile the authoritative state.
        </p>
      </div>

      {!storageReady && (
        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-6">
          <div className="flex gap-3">
            <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <h2 className="font-semibold text-slate-100">Billing storage is not fully provisioned in this environment</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                GuardAI will not simulate subscriptions or usage in browser state. The billing and entitlement SQL drafts must be promoted through the controlled staging migration process before this environment can use them.
              </p>
            </div>
          </div>
        </section>
      )}

      {error && (
        <div role="alert" className="flex items-start justify-between gap-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
          <span>{error}</span>
          <button onClick={() => setRetry(value => value + 1)} className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 hover:bg-rose-500/10">
            <RefreshCw className="h-4 w-4" /> Reload
          </button>
        </div>
      )}

      {storageReady && billing && (
        <>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-600">Current plan</div>
                <h2 className="mt-2 text-3xl font-semibold capitalize text-slate-100">{billing.plan}</h2>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusTone(billing.status)}`}>{billing.status}</span>
                  <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-400">provider: {billing.provider}</span>
                </div>
              </div>
              <div className="grid gap-3 text-sm sm:grid-cols-2 lg:min-w-[24rem]">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="text-xs text-slate-600">Period end</div>
                  <div className="mt-1 text-slate-300">{formatDate(billing.periodEnd)}</div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="text-xs text-slate-600">Cancellation</div>
                  <div className="mt-1 text-slate-300">{billing.cancelAtPeriodEnd ? 'Ends at period end' : 'Not scheduled'}</div>
                </div>
              </div>
            </div>
          </section>

          {!billing.billingEnabled ? (
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="font-semibold text-slate-100">Paid billing is disabled in this environment</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                The current server is not configured to create Stripe Checkout sessions. Your existing server-side plan state remains visible above.
              </p>
            </section>
          ) : billing.availablePlans.length === 0 ? (
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="font-semibold text-slate-100">No paid plans are configured</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                GuardAI will not invent commercial packages in the client. Paid choices appear here only when the server exposes configured plan codes.
              </p>
            </section>
          ) : (
            <section className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Configured plans</h2>
                <p className="text-sm text-slate-500">
                  Prices and limits are controlled outside this client. Starting Checkout sends only the selected server-configured GuardAI plan code.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {billing.availablePlans.map(plan => {
                  const current = billing.plan === plan && ['active', 'trialing'].includes(billing.status);
                  return (
                    <div key={plan} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-semibold capitalize text-slate-100">{plan}</h3>
                        {current && <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /> Current</span>}
                      </div>
                      <p className="mt-3 text-xs leading-5 text-slate-600">
                        Commercial price and entitlement details are not inferred by this page.
                      </p>
                      <button
                        onClick={() => startCheckout(plan)}
                        disabled={current || checkoutPlan !== null || billing.status !== 'active' || billing.plan !== 'free'}
                        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-sm font-medium text-indigo-300 hover:bg-indigo-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ExternalLink className="h-4 w-4" />
                        {checkoutPlan === plan ? 'Opening Checkout…' : current ? 'Current plan' : 'Open Stripe Checkout'}
                      </button>
                    </div>
                  );
                })}
              </div>

              {billing.plan !== 'free' && (
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-xs leading-5 text-slate-600">
                  This V1 interface does not expose a subscription-management portal or create a second Checkout for an existing provider subscription. GuardAI keeps that path blocked until a dedicated provider-management workflow exists.
                </div>
              )}
            </section>
          )}

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-xs leading-5 text-slate-600">
            Entitlements and scanner usage limits are enforced by backend persistence during scan submission. This page does not override capability checks and does not infer entitlement from a successful browser redirect.
          </section>
        </>
      )}
    </div>
  );
}
