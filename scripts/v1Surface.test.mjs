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
  assert.match(targets, /setScanHistoryUnavailable\(!scanHistory.ok\)/);
  assert.match(targets, /scanHistoryUnavailable \? "Unbekannt" : testedTargetsCount/);
  assert.doesNotMatch(targets, /listScans\([^\n]+\.catch\(\(\) => \(\{ contractVersion: '', scans: \[\] \}\)\)/);
});

test('technical scores are not shown as an all-green security guarantee', () => {
  const targets = source('src/pages/app/TargetsPage.tsx');
  assert.match(targets, /Scan-Score \{latestScan\.overallScore\}\/100/);
  assert.match(targets, /keine Sicherheits- oder Compliance-Garantie/);
  assert.doesNotMatch(targets, /text-emerald-400 bg-emerald-500\/10 px-1\.5 py-0\.5 rounded border border-emerald-500\/20/);
});
