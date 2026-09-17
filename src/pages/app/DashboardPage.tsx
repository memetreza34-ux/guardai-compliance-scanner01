import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { useWorkspace } from '../../providers/WorkspaceProvider';
import { ShieldCheck, Target, AlertTriangle } from 'lucide-react';
import { createWorkspaceApi } from '../../api/workspaceApi';
import { createFindingApi } from '../../api/findingApi';
import type { WorkspaceTarget } from '../../types/workspace';
import type { WorkspaceFindingSummary } from '../../types/findingLifecycle';
import WorkspaceOnboarding from '../../components/WorkspaceOnboarding';

export default function DashboardPage() {
  const { session } = useAuth();
  const { organizations, currentOrg, isLoading: orgLoading, error: orgError } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [targets, setTargets] = useState<WorkspaceTarget[]>([]);
  const [findings, setFindings] = useState<WorkspaceFindingSummary[]>([]);

  useEffect(() => {
    async function loadData() {
      if (!session?.access_token || !currentOrg) {
        if (!orgLoading) {
           setLoading(false);
        }
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        const getAccessToken = async () => session.access_token;
        const workspaceApi = createWorkspaceApi(getAccessToken);
        const findingApi = createFindingApi(getAccessToken);
        
        const [targetsRes, findingsRes] = await Promise.all([
          workspaceApi.listTargets(currentOrg.id),
          findingApi.listFindings(currentOrg.id, { limit: 50 }) // assuming a reasonable limit for dashboard
        ]);
        
        setTargets(targetsRes);
        setFindings(findingsRes.findings);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred loading dashboard data.');
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [session, currentOrg, orgLoading]);

  if (orgLoading || loading) {
    return <div className="animate-pulse flex items-center justify-center p-12 text-slate-400">Loading dashboard data...</div>;
  }

  if (orgError || error) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-lg">
        <p className="font-semibold mb-1">Failed to load dashboard</p>
        <p className="text-sm">{orgError || error}</p>
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">Welcome to GuardAI</h1>
          <p className="text-sm text-slate-400 mt-1">Create an organization to get started.</p>
        </div>
        <WorkspaceOnboarding api={createWorkspaceApi(async () => session!.access_token)} />
      </div>
    );
  }

  const openFindings = findings.filter(f => f.status === 'open');
  const verifiedTargets = targets.filter(t => t.verificationState === 'verified');

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">Technical Posture</h1>
          <p className="text-sm text-slate-400 mt-1">Evidence coverage and current findings</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Verified Targets
          </div>
          <div className="text-3xl font-semibold text-slate-100">{verifiedTargets.length} <span className="text-sm text-slate-500 font-normal">/ {targets.length}</span></div>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            Open Findings
          </div>
          <div className="text-3xl font-semibold text-slate-100">{openFindings.length}</div>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Critical Findings
          </div>
          <div className="text-3xl font-semibold text-slate-100 text-slate-500 text-sm font-normal">
            Unavailable
          </div>
        </div>
      </div>
      
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mt-8">
        <div className="p-4 border-b border-slate-800/60 bg-slate-900/50">
          <h2 className="text-sm font-semibold text-slate-200">Recent Findings</h2>
        </div>
        <div className="divide-y divide-slate-800/60">
          {openFindings.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No open findings detected.</div>
          ) : (
            openFindings.slice(0, 5).map(finding => (
              <div key={finding.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                <div className="text-sm font-mono text-slate-400">{finding.ruleId || finding.id}</div>
                <div className="text-sm font-medium capitalize text-slate-300">Status: {finding.status}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
