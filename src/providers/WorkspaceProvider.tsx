import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { createWorkspaceApi } from '../api/workspaceApi';
import type { WorkspaceOrganization } from '../types/workspace';

interface WorkspaceContextType {
  organizations: WorkspaceOrganization[];
  currentOrg: WorkspaceOrganization | null;
  setCurrentOrg: (org: WorkspaceOrganization) => void;
  isLoading: boolean;
  error: string | null;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  organizations: [],
  currentOrg: null,
  setCurrentOrg: () => {},
  isLoading: true,
  error: null,
});

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [organizations, setOrganizations] = useState<WorkspaceOrganization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<WorkspaceOrganization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadWorkspace() {
      if (!session?.access_token) return;
      try {
        setIsLoading(true);
        setError(null);
        
        const api = createWorkspaceApi(async () => session.access_token);
        const orgs = await api.listOrganizations();
        
        if (!mounted) return;
        
        setOrganizations(orgs);
        if (orgs.length > 0) {
          setCurrentOrg(orgs[0]);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load workspace.');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadWorkspace();

    return () => {
      mounted = false;
    };
  }, [session?.access_token]);

  return (
    <WorkspaceContext.Provider value={{ organizations, currentOrg, setCurrentOrg, isLoading, error }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => useContext(WorkspaceContext);