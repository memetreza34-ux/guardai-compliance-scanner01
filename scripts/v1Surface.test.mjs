import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('V1 navigation exposes only the five customer tasks', () => {
  const shell = source('src/pages/app/AppShell.tsx');
  const match = shell.match(/const navSections = \[([\s\S]*?)\];/);
  assert.ok(match, 'V1 navigation must be declared');
  const paths = [...match[1].matchAll(/path: '([^']+)'/g)].map(item => item[1]);
  assert.deepEqual(paths, ['/app', '/app/targets', '/app/scans', '/app/findings', '/app/reports']);
});

test('deferred app modules are not reachable through V1 app routes', () => {
  const routes = source('src/AppRoutes.tsx');
  const deferred = [
    'evidence', 'controls', 'frameworks', 'risks', 'monitoring',
    'notifications', 'drift', 'trust-center', 'integrations', 'ai-governance',
    'billing', 'team', 'audit-log',
  ];
  for (const path of deferred) {
    assert.doesNotMatch(routes, new RegExp('<Route path="' + path + '(?:/|")'), path + ' must be V2-gated');
  }
  for (const path of ['targets', 'targets/:targetId', 'scans', 'scans/:scanId', 'findings', 'reports', 'reports/:reportId']) {
    assert.ok(routes.includes('<Route path="' + path + '"'), 'Core route ' + path + ' missing');
  }
  // Public return/callback routes stay for compatibility with already issued links.
  for (const path of ['/trust/:slug', '/billing/return', '/integrations/github/callback']) {
    assert.ok(routes.includes('<Route path="' + path + '"'), 'Compatibility route ' + path + ' missing');
  }
});

test('pricing does not advertise unverified paid plans or quota counts', () => {
  const pricing = source('src/pages/public/PricingPage.tsx');
  assert.doesNotMatch(pricing, /fetchPublicPlans|defaultPlans|50 manuelle Security-Scans|500 Security-Scans|Preis_[A-Za-z]+/);
  assert.match(pricing, /Bezahlte Abonnements sind noch nicht freigeschaltet/);
});

test('reports do not offer an inaccessible V2 Trust Center action', () => {
  const report = source('src/pages/app/ReportDetailPage.tsx');
  assert.doesNotMatch(report, /navigate\('\/app\/trust-center'\)/);
});

test('scan history failure cannot silently appear as zero tested websites', () => {
  const targets = source('src/pages/app/TargetsPage.tsx');
  assert.match(targets, /setScanHistoryUnavailable\(!trustedScans\)/);
  assert.match(targets, /scanHistoryUnavailable \? "Unbekannt" : testedTargetsCount/);
  assert.doesNotMatch(targets, /listScans\([^\n]+\.catch\(\(\) => \(\{ contractVersion: '', scans: \[\] \}\)\)/);
});

test('technical scores are not shown as an all-green security guarantee', () => {
  const targets = source('src/pages/app/TargetsPage.tsx');
  assert.match(targets, /Scan-Score \{latestScan\.overallScore\}\/100/);
  assert.match(targets, /keine Sicherheits- oder Compliance-Garantie/);
  assert.doesNotMatch(targets, /text-emerald-400 bg-emerald-500\/10 px-1\.5 py-0\.5 rounded border border-emerald-500\/20/);
});


test('first-run workspace gate controls every authenticated customer route', () => {
  const app = source('src/pages/app/AppShell.tsx');
  assert.match(app, /function AppWorkspaceGate\(\)/);
  assert.match(app, /if \(isLoading\)/);
  assert.match(app, /if \(error\)/);
  assert.match(app, /if \(!currentOrg\)/);
  assert.match(app, /<AppWorkspaceGate \/>/);
  assert.doesNotMatch(app, /<Outlet \/>/);
  assert.match(app, /<Outlet key=\{\x60\$\{session\?\.user\.id/);
  assert.equal((app.match(/<WorkspaceOnboarding /g) || []).length, 1, 'only one first-run workspace creation UI');
  assert.equal((app.match(/path: '\/app[^']*'/g) || []).length, 5);
});

test('dashboard has independent API failures, truthful counts and tenant-scoped projections', () => {
  const dashboard = source('src/pages/app/DashboardPage.tsx');
  assert.match(dashboard, /Promise\.allSettled\(/);
  assert.match(dashboard, /target\.organizationId === orgId/);
  assert.match(dashboard, /finding\.organizationId === orgId/);
  assert.match(dashboard, /scan\.organizationId === orgId/);
  assert.match(dashboard, /targetsError \? 'Unbekannt'/);
  assert.match(dashboard, /findingsError \? 'Unbekannt'/);
  assert.match(dashboard, /targetsError \|\| scansError \? 'unknown'/);
  assert.doesNotMatch(dashboard, /<WorkspaceOnboarding/);
});


test('website list rejects cross-org payloads and stale scan or create responses', () => {
  const targets = source('src/pages/app/TargetsPage.tsx');
  assert.match(targets, /targetsBelongToOrganization\(targetList, currentOrg!\.id\)/);
  assert.match(targets, /scan\.organizationId === currentOrg!\.id/);
  assert.match(targets, /activeScopeRef\.current === scopeKey/);
  assert.match(targets, /activeTokenRef\.current === issuedToken/);
  assert.match(targets, /activeRoleRef\.current === 'owner'/);
  assert.match(targets, /activeRoleRef\.current === 'admin'/);
  assert.match(targets, /submission\.scan\.organizationId === issuedOrgId/);
  assert.match(targets, /target\.type === 'website' && target\.verificationState === 'verified'/);
  assert.doesNotMatch(targets, /<WorkspaceOnboarding/);
});
