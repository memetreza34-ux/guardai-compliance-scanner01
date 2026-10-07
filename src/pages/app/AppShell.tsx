import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Activity,
  Bell,
  BookOpenCheck,
  FileCheck,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  Target,
  X,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { WorkspaceSwitcher } from '../../components/WorkspaceSwitcher';
import { Button } from '../../components/ui/button';

const navSections = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', path: '/app', icon: LayoutDashboard, end: true },
      { name: 'Notifications', path: '/app/notifications', icon: Bell },
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
    ],
  },
  {
    label: 'Monitor',
    items: [
      { name: 'Monitoring', path: '/app/monitoring', icon: Activity },
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
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
