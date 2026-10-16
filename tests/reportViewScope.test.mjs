import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isCurrentReportScope,
  reportBelongsToOrganization,
  reportDetailScope,
  reportListScope,
  reportsBelongToOrganization,
} from '../src/lib/reportViewScope.ts';

function record(organizationId = 'org-a', snapshotOrg = organizationId, scanId = 'scan-a') {
  return {
    id: 'report-a', organizationId, scanId,
    snapshot: { scan: { id: scanId, organizationId: snapshotOrg } },
  };
}

test('report list cannot display without user and organization identity', () => {
  assert.equal(reportListScope(null, 'org-a'), null);
  assert.equal(reportListScope('user-a', null), null);
  assert.equal(isCurrentReportScope(null, null), false);
});

test('report list scopes are distinct across accounts and organizations', () => {
  const old = reportListScope('user-a', 'org-a');
  assert.equal(isCurrentReportScope(reportListScope('user-a', 'org-b'), old), false);
  assert.equal(isCurrentReportScope(reportListScope('user-b', 'org-a'), old), false);
  assert.equal(isCurrentReportScope(old, old), true);
});

test('report details are scoped by requested report id', () => {
  const old = reportDetailScope('user-a', 'org-a', 'report-a');
  assert.equal(isCurrentReportScope(reportDetailScope('user-a', 'org-a', 'report-b'), old), false);
  assert.equal(isCurrentReportScope(reportDetailScope('user-a', 'org-b', 'report-a'), old), false);
  assert.equal(reportDetailScope('user-a', 'org-a', null), null);
});

test('report payload rejects other-organization record and embedded scan', () => {
  assert.equal(reportBelongsToOrganization(record(), 'org-a'), true);
  assert.equal(reportBelongsToOrganization(record('org-b', 'org-b'), 'org-a'), false);
  assert.equal(reportBelongsToOrganization(record('org-a', 'org-b'), 'org-a'), false);
  assert.equal(reportBelongsToOrganization(record('org-a', 'org-a', 'scan-b'), 'org-a'), true);
  assert.equal(reportBelongsToOrganization({...record(),scanId:'scan-z'}, 'org-a'), false);
});

test('a mixed-tenant report page is not safe to render or append', () => {
  assert.equal(reportsBelongToOrganization([record(), record()], 'org-a'), true);
  assert.equal(reportsBelongToOrganization([record(), record('org-b', 'org-b')], 'org-a'), false);
  assert.equal(reportsBelongToOrganization([record(), record('org-a', 'org-b')], 'org-a'), false);
  assert.equal(reportsBelongToOrganization([], 'org-a'), true);
});
