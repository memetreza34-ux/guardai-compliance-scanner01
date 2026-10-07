import { Link } from 'react-router-dom';
import { CheckCircle2, CreditCard, XCircle } from 'lucide-react';

export default function BillingReturnPage() {
  const outcome = new URLSearchParams(window.location.search).get('checkout');
  const cancelled = outcome === 'cancelled';

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-16 text-slate-100">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl border ${
          cancelled
            ? 'border-slate-700 bg-slate-950 text-slate-400'
            : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
        }`}>
          {cancelled ? <XCircle className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
        </div>
        <div className="mt-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">
          <CreditCard className="h-4 w-4" /> GuardAI Billing
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          {cancelled ? 'Checkout cancelled' : 'Checkout return received'}
        </h1>
        <p className="mt-4 text-sm leading-6 text-slate-400">
          {cancelled
            ? 'No GuardAI entitlement is activated by this cancelled return. Open Billing to inspect the authoritative server-side subscription state.'
            : 'This page is not a payment receipt and does not activate a plan. GuardAI changes paid entitlements only after a verified Stripe webhook is reconciled on the server.'}
        </p>
        <Link
          className="mt-7 inline-flex rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
          to="/app/billing"
        >
          Open Billing
        </Link>
      </div>
    </main>
  );
}
