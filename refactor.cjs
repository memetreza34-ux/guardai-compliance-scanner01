const fs = require('fs');

const files = [
  'src/components/AiGovernanceCenter.tsx',
  'src/components/BillingCenter.tsx',
  'src/components/GitHubIntegrationManager.tsx',
  'src/components/MonitoringCenter.tsx',
  'src/components/ReportCenter.tsx',
  'src/components/TrustCenterManager.tsx',
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // 1. Add import
  if (!content.includes('useWorkspace')) {
    content = content.replace(
      "import { useEffect, useState",
      "import { useWorkspace } from '../providers/WorkspaceProvider';\nimport { useEffect, useState"
    );
    if (!content.includes('useWorkspace')) { // Fallback if no useState
      content = content.replace(
        "import React",
        "import { useWorkspace } from '../providers/WorkspaceProvider';\nimport React"
      );
    }
  }

  // 2. Replace states
  content = content.replace(/const \[organizations, setOrganizations\] = useState<WorkspaceOrganization\[\]>\(\[\]\);\s*/, '');
  content = content.replace(/const \[organizationId, setOrganizationId\] = useState\(''\);\s*/, 
    'const { currentOrg } = useWorkspace();\n  const organizationId = currentOrg?.id || \'\';\n');

  // 3. Remove useEffect that fetches orgs
  // This is a bit tricky, I'll match the standard useEffect block they all share.
  content = content.replace(/useEffect\(\(\) => \{\n\s*let cancelled = false;\n\s*workspaceApi\.listOrganizations\(\)[\s\S]*?\}\);\s*\}\);\n\s*return \(\) => \{\n\s*cancelled = true;\n\s*\};\n\s*\}, \[workspaceApi\]\);\n/, '');

  // 4. Remove the <label> Workspace </label> dropdown
  // regex to match the label block containing Workspace and select
  content = content.replace(/<label className="block max-w-[^"]+ space-y-1 text-sm">\s*<span>Workspace<\/span>\s*<select[\s\S]*?<\/select>\s*<\/label>\s*/, '');
  content = content.replace(/<label className="block max-w-[^"]+ mb-6 space-y-1 text-sm">\s*<span className="font-medium text-slate-200">Workspace<\/span>\s*<select[\s\S]*?<\/select>\s*<\/label>\s*/, '');


  fs.writeFileSync(file, content, 'utf8');
}

console.log("Done refactoring.");
