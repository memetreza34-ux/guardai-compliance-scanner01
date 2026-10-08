import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Activity,
  Bell,
  BookOpenCheck,
  Brain,
  CreditCard,
  FileCheck,
  FileText,
  FileClock,
  GitCompareArrows,
  LayoutDashboard,
  Link2,
  ListChecks,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Globe2,
  Target,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { useWorkspace } from '../../providers/WorkspaceProvider';
import { createWorkspaceApi } from '../../api/workspaceApi';
import WorkspaceOnboarding from '../../components/WorkspaceOnboarding';
import { WorkspaceSwitcher } from '../../components/WorkspaceSwitcher';
import { Button } from '../../components/ui/button';

const navSections = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', path: '/app', icon: LayoutDashboard, end: true },
    ],
  },
  {
    label: 'Assess',
    items: [
      { name: 'Targets', path: '/app/targets', icon: Target },
      { name: 'Scans', path: '/app/scans', icon: Search },
      { name: 'Findings', path: '/app/findings', icon: ShieldCheck },
      { name: 'Evidence', path: '/app/evidence', icon: FileCheck },
    ],
  },
  {
    label: 'Govern',
    items: [
      { name: 'Controls', path: '/app/controls', icon: ListChecks },
      { name: 'Frameworks', path: '/app/frameworks', icon: BookOpenCheck },
      { name: 'Risks', path: '/app/risks', icon: ShieldAlert },
      { name: 'AI Governance', path: '/app/ai-governance', icon: Brain },
    ],
  },
  {
    label: 'Monitor',
    items: [
      { name: 'Monitoring', path: '/app/monitoring', icon: Activity },
      { name: 'Drift', path: '/app/drift', icon: GitCompareArrows },
      { name: 'Notifications', path: '/app/notifications', icon: Bell },
    ],
  },
  {
    label: 'Assure',
    items: [
      { name: 'Reports', path: '/app/reports', icon: FileText },
      { name: 'Trust Center', path: '/app/trust-center', icon: Globe2 },
    ],
  },
  {
    label: 'Connect',
    items: [
      { name: 'Integrations', path: '/app/integrations', icon: Link2 },
    ],
  },
  {
    label: 'Organization',
    items: [
      { name: 'Team', path: '/app/team', icon: Users },
      { name: 'Audit Log', path: '/app/audit-log', icon: FileClock },
      { name: 'Billing', path: '/app/billing', icon: CreditCard },
    ],
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { session, supabase } = useAuth();

  async function handleSignOut() {
    if (supabase) await supabase.auth.signOut();
  }

  return (
    <div className="flex h-full flex-col bg-slate-900">
      <div className="border-b border-slate-800 p-4">
        <div className="mb-3 flex items-center gap-2 px-1">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10">
            <ShieldCheck className="h-4 w-4 text-indigo-300" />
          </span>
          <span className="text-sm font-semibold text-slate-100">GuardAI</span>
        </div>
        <WorkspaceSwitcher />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navSections.map((section, sectionIndex) => (
          <div key={section.label} className={sectionIndex === 0 ? '' : 'mt-6'}>
            <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
              {section.label}
            </div>
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/app'}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-500/10 text-indigo-300'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.name}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <div className="truncate px-1 text-xs text-slate-600">{session?.user?.email}</div>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full justify-start border-slate-700 bg-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}

function AppWorkspaceGate() {
  const { session } = useAuth();
  const { currentOrg, isLoading, error, refreshOrganizations } = useWorkspace();

  if (isLoading) {
    return <div role="status" className="flex min-h-[22rem] items-center justify-center text-sm text-slate-400">
      Workspace-Berechtigungen werden geladen…
    </div>;
  }

  if (error) {
    return <section className="mx-auto max-w-2xl rounded-2xl border border-rose-500/20 bg-rose-500/[0.06] p-6 sm:p-8">
      <ShieldAlert className="h-7 w-7 text-rose-300" />
      <h1 className="mt-4 text-xl font-semibold text-slate-100">Workspace derzeit nicht verfügbar</h1>
      <p role="alert" className="mt-2 text-sm leading-6 text-slate-400">{error}</p>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        GuardAI zeigt keine zuvor geladenen Workspace-Daten an, wenn die aktuellen Zugriffsrechte nicht geprüft werden konnten.
      </p>
      <button type="button" onClick={() => void refreshOrganizations().catch(() => {})}
        className="mt-6 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800">
        <RefreshCw className="h-4 w-4" /> Erneut prüfen
      </button>
    </section>;
  }

  if (!currentOrg) {
    if (!session) return null;
    return <section className="mx-auto max-w-5xl space-y-8 py-4 sm:py-8">
      <header className="max-w-2xl">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">Dein erster GuardAI Workspace</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-100 sm:text-4xl">Starte mit deiner Organisation.</h1>
        <p className="mt-4 text-sm leading-7 text-slate-400">
          Lege einen eigenen Workspace an. Danach kannst du eine Website hinzufügen, den Domainbesitz per DNS bestätigen
          und deinen ersten technischen Security-Scan ausführen.
        </p>
      </header>
      <div className="grid gap-3 md:grid-cols-3">
        {[
          ['01', 'Organisation', 'Team- und Asset-Daten werden deinem Workspace zugeordnet.'],
          ['02', 'Domain verifizieren', 'Du bestätigst die Kontrolle über das Ziel durch einen DNS-TXT-Eintrag.'],
          ['03', 'Scan ausführen', 'Evidence und Findings stammen aus einem tatsächlich ausgeführten Scan.'],
        ].map(([number, title, description]) => <div key={number}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <span className="font-mono text-xs font-semibold text-indigo-300">{number}</span>
          <h2 className="mt-4 text-sm font-semibold text-slate-100">{title}</h2>
          <p className="mt-2 text-xs leading-6 text-slate-500">{description}</p>
        </div>)}
      </div>
      <div className="max-w-2xl">
        <WorkspaceOnboarding api={createWorkspaceApi(async () => session.access_token)} />
      </div>
      <p className="max-w-2xl text-xs leading-5 text-slate-600">
        Eine verifizierte Domain und ein abgeschlossener Scan sind keine Zertifizierung oder Garantie,
        dass das Ziel frei von Sicherheitslücken ist.
      </p>
    </section>;
  }

  // Remount routed modules after an organization switch so the previous
  // tenant's local component state cannot flash before new reads complete.
  return <Outlet key={currentOrg.id} />;
}

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-300">
      <aside className="hidden w-64 shrink-0 border-r border-slate-800 lg:block">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative h-full w-[min(18rem,86vw)] border-r border-slate-800 shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 z-10 rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-400"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-4 lg:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-300" />
            <span className="text-sm font-semibold text-slate-100">GuardAI</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg border border-slate-700 p-2 text-slate-300"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto bg-slate-950">
          <div className="p-4 sm:p-6 lg:p-8">
            <AppWorkspaceGate />
          </div>
        </main>
      </div>
    </div>
  );
}
