import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
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

interface WorkspaceSnapshot {
  userId: string | null;
  organizations: WorkspaceOrganization[];
  currentOrg: WorkspaceOrganization | null;
  isLoading: boolean;
  error: string | null;
}

const initialSnapshot: WorkspaceSnapshot = {
  userId: null,
  organizations: [],
  currentOrg: null,
  isLoading: true,
  error: null,
};

const WorkspaceContext = createContext<WorkspaceContextType>({
  organizations: [],
  currentOrg: null,
  setCurrentOrg: () => {},
  isLoading: true,
  error: null,
  refreshOrganizations: async () => {},
});

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const accessToken = session?.access_token ?? null;
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot>(initialSnapshot);

  // All inflight organization reads are invalidated when user/token changes,
  // a newer refresh starts, or the WorkspaceProvider unmounts.
  const requestGeneration = useRef(0);

  const refreshOrganizations = useCallback(async (preferredOrganizationId?: string) => {
    if (!userId || !accessToken) return;
    const generation = ++requestGeneration.current;

    setSnapshot(previous => previous.userId === userId
      ? { ...previous, isLoading: true, error: null }
      : { userId, organizations: [], currentOrg: null, isLoading: true, error: null });

    try {
      const api = createWorkspaceApi(async () => accessToken);
      const organizations = await api.listOrganizations();
      if (requestGeneration.current !== generation) return;

      setSnapshot(previous => {
        // When a refresh overlaps manual workspace selection, use the latest
        // selection rather than the value captured before the request began.
        const selectedId = preferredOrganizationId ??
          (previous.userId === userId ? previous.currentOrg?.id : null);
        const currentOrg = organizations.find(org => org.id === selectedId)
          ?? organizations[0]
          ?? null;

        return { userId, organizations, currentOrg, isLoading: false, error: null };
      });
    } catch (error) {
      if (requestGeneration.current !== generation) return;
      const message = error instanceof Error ? error.message : 'Failed to load workspace.';
      // Failed organization authorization/lookup must not leave stale tenant
      // membership or role data displayed in the client.
      setSnapshot({ userId, organizations: [], currentOrg: null, isLoading: false, error: message });
      throw error;
    }
  }, [userId, accessToken]);

  useEffect(() => {
    if (!userId || !accessToken) {
      ++requestGeneration.current;
      setSnapshot({ userId: null, organizations: [], currentOrg: null, isLoading: false, error: null });
      return;
    }

    void refreshOrganizations().catch(() => {
      // The provider state already exposes the error to the product UI.
    });

    return () => {
      ++requestGeneration.current;
    };
  }, [userId, accessToken, refreshOrganizations]);

  const setCurrentOrg = useCallback((organization: WorkspaceOrganization) => {
    setSnapshot(previous => {
      if (previous.userId !== userId || !userId) return previous;
      // Never accept arbitrary caller-supplied organization data or roles.
      const selected = previous.organizations.find(item => item.id === organization.id);
      if (!selected) return previous;
      return { ...previous, currentOrg: selected };
    });
  }, [userId]);

  // Prevent rendering stale tenant state during an auth-identity transition,
  // before the next effect has loaded membership for the new user.
  const belongsToCurrentUser = !!userId && snapshot.userId === userId;
  const value: WorkspaceContextType = {
    organizations: belongsToCurrentUser ? snapshot.organizations : [],
    currentOrg: belongsToCurrentUser ? snapshot.currentOrg : null,
    setCurrentOrg,
    isLoading: !!userId && (!belongsToCurrentUser || snapshot.isLoading),
    error: belongsToCurrentUser ? snapshot.error : null,
    refreshOrganizations,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export const useWorkspace = () => useContext(WorkspaceContext);
