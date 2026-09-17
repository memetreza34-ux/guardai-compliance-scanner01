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
  refreshOrganizations: (preferredOrganizationId?: string) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  organizations: [],
  currentOrg: null,
  setCurrentOrg: () => {},
  isLoading: true,
  error: null,
  refreshOrganizations: async () => {},
});

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [organizations, setOrganizations] = useState<WorkspaceOrganization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<WorkspaceOrganization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refreshOrganizations(preferredOrganizationId?: string) {
    if (!session?.access_token) return;
    try {
      setIsLoading(true);
      setError(null);
      const api = createWorkspaceApi(async () => session.access_token);
      const orgs = await api.listOrganizations();
      setOrganizations(orgs);
      if (orgs.length > 0) {
        if (preferredOrganizationId) {
          const pref = orgs.find(o => o.id === preferredOrganizationId);
          setCurrentOrg(pref || orgs[0]);
        } else {
          setCurrentOrg(orgs[0]);
        }
      } else {
        setCurrentOrg(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspace.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {

    async function loadWorkspace() {
      if (!session?.access_token) return;
      await refreshOrganizations();
    }

    loadWorkspace();

  }, [session?.access_token]);

  return (
    <WorkspaceContext.Provider value={{ organizations, currentOrg, setCurrentOrg, isLoading, error, refreshOrganizations }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => useContext(WorkspaceContext);