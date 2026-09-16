import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { useWorkspace } from '../../providers/WorkspaceProvider';
import { ShieldCheck, Target, AlertTriangle } from 'lucide-react';


interface TargetEntity {
  id: string;
  name: string;
  verification_status: string;
}

interface Finding {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'resolved' | 'accepted_risk';
}

export default function DashboardPage() {
  const { session } = useAuth();
  const { currentOrg, setCurrentOrg } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [targets, setTargets] = useState<TargetEntity[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);

  useEffect(() => {
    async function loadData() {
      if (!session) return;
      try {
        setLoading(true);
        setError(null);
        
        // Fetch orgs
        let orgId = currentOrg?.id;
        if (!orgId) {
          const orgsRes = await fetch('/api/v1/organizations', {
            headers: { Authorization: `Bearer ${session.access_token}` }
          });
          if (!orgsRes.ok) throw new Error('Failed to fetch organizations');
          const data = await orgsRes.json();
          if (data.data?.length > 0) {
            orgId = data.data[0].id;
            setCurrentOrg(data.data[0]);
          }
        }
        
        if (orgId) {
          // Fetch targets
          const targetsRes = await Promise.all([
            fetch(`/api/v1/organizations/${orgId}/targets`, {
              headers: { Authorization: `Bearer ${session.access_token}` }
            }).then(r => r.ok ? r.json() : { data: [] }),
            fetch(`/api/v1/organizations/${orgId}/findings`, {
              headers: { Authorization: `Bearer ${session.access_token}` }
            }).then(r => r.ok ? r.json() : { data: [] })
          ]);
          
          setTargets(targetsRes[0].data || []);
          setFindings(targetsRes[1].data || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred loading dashboard data.');
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [session, currentOrg?.id, setCurrentOrg]);

  if (loading) {
    return <div className="animate-pulse flex items-center justify-center p-12 text-slate-400">Loading dashboard data...</div>;
  }

  if (error) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-lg">
        <p className="font-semibold mb-1">Failed to load dashboard</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  const openFindings = findings.filter(f => f.status === 'open');
  const criticalFindings = openFindings.filter(f => f.severity === 'critical');
  const verifiedTargets = targets.filter(t => t.verification_status === 'verified');

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
          <div className="text-3xl font-semibold text-slate-100">{criticalFindings.length}</div>
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
                <div className="text-sm font-mono text-slate-400">{finding.id}</div>
                <div className="text-sm font-medium capitalize text-slate-300">Severity: {finding.severity}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}