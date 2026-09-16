import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { WorkspaceSwitcher } from '../../components/WorkspaceSwitcher';
import { 
  LayoutDashboard, 
  Target, 
  Search, 
  ShieldCheck, 
  FileCheck, 
  FileText, 
  Activity, 
  Brain, 
  Link as LinkIcon, 
  ClipboardList, 
  Users, 
  CreditCard, 
  Settings,
  LogOut
} from 'lucide-react';
import { Button } from '../../components/ui/button';

export default function AppShell() {
  const { session, supabase } = useAuth();

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/app', icon: LayoutDashboard, },
    { name: 'Targets', path: '/app/targets', icon: Target },
    { name: 'Scans', path: '/app/scans', icon: Search },
    { name: 'Findings', path: '/app/findings', icon: ShieldCheck },
    { name: 'Evidence', path: '/app/evidence', icon: FileCheck },
    { name: 'Reports', path: '/app/reports', icon: FileText },
    { name: 'Monitoring', path: '/app/monitoring', icon: Activity },
    { name: 'AI Governance', path: '/app/ai-governance', icon: Brain },
    { name: 'Integrations', path: '/app/integrations', icon: LinkIcon },
    { name: 'Audit Log', path: '/app/audit', icon: ClipboardList },
  ];

  const secondaryNavItems = [
    { name: 'Team', path: '/app/team', icon: Users },
    { name: 'Billing', path: '/app/billing', icon: CreditCard },
    { name: 'Settings', path: '/app/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-300 font-sans overflow-hidden">
      <div className="w-64 border-r border-slate-800 bg-slate-900 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <WorkspaceSwitcher />
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">Main</div>
          {navItems.map(item => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === "/app"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </NavLink>
          ))}

          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-6 mb-2 px-3">Organization</div>
          {secondaryNavItems.map(item => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === "/app"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </NavLink>
          ))}
        </div>

        <div className="p-4 border-t border-slate-800 flex flex-col gap-3">
          <div className="text-xs text-slate-500 truncate">
            {session?.user?.email}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start text-slate-400 hover:text-slate-200 border-slate-700 hover:bg-slate-800"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
      <main className="flex-1 overflow-y-auto bg-slate-950">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}