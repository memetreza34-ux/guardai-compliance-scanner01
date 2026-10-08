import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowRight, Menu, ShieldCheck, X } from 'lucide-react';

const navItems = [
  { label: 'Produkt', to: '/product' },
  { label: 'Security', to: '/security' },
  { label: 'Preise', to: '/pricing' },
  { label: 'Über uns', to: '/about' },
  { label: 'Kontakt', to: '/contact' },
];

function navClass(active: boolean) {
  return active
    ? 'text-white'
    : 'text-slate-400 transition-colors hover:text-white';
}

export default function PublicSiteLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/88 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5" aria-label="GuardAI Startseite">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-400/25 bg-indigo-500/10">
              <ShieldCheck className="h-5 w-5 text-indigo-300" />
            </span>
            <span className="text-base font-semibold tracking-tight text-white">GuardAI</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium md:flex" aria-label="Hauptnavigation">
            {navItems.map(item => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => navClass(isActive)}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:text-white">
              Anmelden
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-200"
            >
              Kostenlos starten <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <button
            type="button"
            className="rounded-lg border border-white/10 p-2 text-slate-300 md:hidden"
            aria-label={mobileOpen ? 'Navigation schließen' : 'Navigation öffnen'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(open => !open)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t border-white/10 px-4 py-4 md:hidden">
            <nav className="mx-auto flex max-w-7xl flex-col gap-1" aria-label="Mobile Navigation">
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-white/8 text-white' : 'text-slate-400'}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-4">
                <Link to="/login" className="rounded-lg border border-white/10 px-3 py-2.5 text-center text-sm font-medium text-slate-300">
                  Anmelden
                </Link>
                <Link to="/signup" className="rounded-lg bg-white px-3 py-2.5 text-center text-sm font-semibold text-slate-950">
                  Starten
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      <Outlet />

      <footer className="border-t border-white/10 bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-[1.3fr_repeat(3,1fr)]">
            <div className="max-w-sm">
              <Link to="/" className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-400/25 bg-indigo-500/10">
                  <ShieldCheck className="h-5 w-5 text-indigo-300" />
                </span>
                <span className="font-semibold text-white">GuardAI</span>
              </Link>
              <p className="mt-4 text-sm leading-6 text-slate-500">
                Evidence-first Technical GRC: technische Beobachtungen werden nachvollziehbar zu Evidence, Findings und später zu Controls, Risk und Assurance verbunden.
              </p>
            </div>

            <div>
              <div className="text-sm font-semibold text-slate-200">Produkt</div>
              <div className="mt-4 space-y-3 text-sm text-slate-500">
                <Link className="block hover:text-white" to="/product">Produktübersicht</Link>
                <Link className="block hover:text-white" to="/security">Security</Link>
                <Link className="block hover:text-white" to="/pricing">Preise</Link>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-slate-200">Unternehmen</div>
              <div className="mt-4 space-y-3 text-sm text-slate-500">
                <Link className="block hover:text-white" to="/about">Über GuardAI</Link>
                <Link className="block hover:text-white" to="/contact">Kontakt</Link>
                <Link className="block hover:text-white" to="/login">App öffnen</Link>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-slate-200">Produktgrenzen</div>
              <p className="mt-4 text-sm leading-6 text-slate-500">
                GuardAI ist kein Zertifizierer, keine Rechtsberatung und kein vollständiger Penetrationstest. Automatisierte Checks decken nur ihren jeweils ausgeführten technischen Scope ab.
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <span>© 2026 GuardAI. Technical evidence, not compliance theatre.</span>
            <span>Security- und Rechtsaussagen bleiben scope- und evidence-basiert.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
