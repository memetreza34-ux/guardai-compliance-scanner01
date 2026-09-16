import React, { createContext, useContext, useState } from 'react';

interface Organization {
  id: string;
  name: string;
  role: 'Owner' | 'Admin' | 'Member' | 'Viewer';
}

interface WorkspaceContextType {
  organizations: Organization[];
  currentOrg: Organization | null;
  setCurrentOrg: (org: Organization) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  organizations: [],
  currentOrg: null,
  setCurrentOrg: () => {},
});

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [organizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);

  return (
    <WorkspaceContext.Provider value={{ organizations, currentOrg, setCurrentOrg }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => useContext(WorkspaceContext);