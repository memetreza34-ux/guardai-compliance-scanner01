import { useState } from 'react';
import { ChevronDown, Building2, Plus, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { useWorkspace } from '../providers/WorkspaceProvider';

export function WorkspaceSwitcher() {
  const { organizations, currentOrg, setCurrentOrg, isLoading } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading) {
    return <Button variant="outline" size="sm" className="h-9 w-32 border-dashed animate-pulse"></Button>;
  }

  return (
    <div className="relative">
      <Button 
        variant="outline" 
        size="sm" 
        className="flex items-center gap-2 h-9 px-3 border-dashed"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Building2 className="w-4 h-4 text-primary" />
        <span className="font-semibold text-xs truncate max-w-[120px]">
          {currentOrg?.name || 'No Workspace'}
        </span>
        <ChevronDown className="w-3 h-3 text-muted-foreground ml-1" />
      </Button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute top-full left-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
            
            <div className="p-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Your Workspaces
            </div>
            
            <div className="p-1 max-h-60 overflow-y-auto">
              {organizations.length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">No organizations found.</div>
              )}
              {organizations.map(org => (
                <button 
                  key={org.id}
                  onClick={() => { setCurrentOrg(org); setIsOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mb-1 ${
                    currentOrg?.id === org.id ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span className="truncate">{org.name}</span>
                </button>
              ))}
            </div>

            <div className="border-t border-border p-1">
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors">
                <Settings className="w-4 h-4" />
                Workspace Settings
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors">
                <Plus className="w-4 h-4" />
                Create New Team
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
