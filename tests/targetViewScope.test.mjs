import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isCurrentTargetScope,
  isTargetInitialFailure,
  targetDetailScope,
  targetListScope,
  targetsBelongToOrganization,
} from '../src/lib/targetViewScope.ts';

test('missing user or organization does not expose a target-list scope', () => {
  assert.equal(targetListScope(null, 'org-a'), null);
  assert.equal(targetListScope('user-a', null), null);
  assert.equal(targetListScope('', 'org-a'), null);
  assert.equal(isCurrentTargetScope(null, null), false);
});

test('target list scopes distinguish separate users and organizations', () => {
  const original = targetListScope('user-a', 'org-a');
  assert.equal(isCurrentTargetScope(original, original), true);
  assert.equal(isCurrentTargetScope(targetListScope('user-a', 'org-b'), original), false);
  assert.equal(isCurrentTargetScope(targetListScope('user-b', 'org-a'), original), false);
});

test('target details also include requested target identity', () => {
  const original = targetDetailScope('user-a', 'org-a', 'target-1');
  assert.equal(isCurrentTargetScope(original, original), true);
  assert.equal(isCurrentTargetScope(targetDetailScope('user-a', 'org-a', 'target-2'), original), false);
  assert.equal(isCurrentTargetScope(targetDetailScope('user-b', 'org-a', 'target-1'), original), false);
  assert.equal(isCurrentTargetScope(targetDetailScope('user-a', 'org-b', 'target-1'), original), false);
  assert.equal(targetDetailScope('user-a', 'org-a', null), null);
});

test('first-page fetch failure is not an empty collection or an authorized result', () => {
  const active = targetListScope('user-a', 'org-a');
  assert.equal(isTargetInitialFailure(active, null, active), true);
  assert.equal(isTargetInitialFailure(active, active, active), false);
  assert.equal(isTargetInitialFailure(active, null, null), false);
});

test('a failure from another workspace must not become the current error', () => {
  const a = targetDetailScope('user-a', 'org-a', 'target-a');
  const b = targetDetailScope('user-a', 'org-b', 'target-b');
  assert.equal(isTargetInitialFailure(b, a, a), false);
  assert.equal(isCurrentTargetScope(b, a), false);
  assert.equal(isTargetInitialFailure(null, null, null), false);
});

test('mixed-tenant target responses are rejected before display', () => {
  const same = [{ organizationId: 'org-a' }, { organizationId: 'org-a' }];
  const mixed = [{ organizationId: 'org-a' }, { organizationId: 'org-b' }];
  assert.equal(targetsBelongToOrganization(same, 'org-a'), true);
  assert.equal(targetsBelongToOrganization(mixed, 'org-a'), false);
  assert.equal(targetsBelongToOrganization([{ organizationId: 'org-b' }], 'org-a'), false);
});

test('an empty successful list can legitimately be empty', () => {
  assert.equal(targetsBelongToOrganization([], 'org-a'), true);
  const active = targetListScope('user-a', 'org-a');
  assert.equal(isCurrentTargetScope(active, active), true);
  assert.equal(isTargetInitialFailure(active, active, null), false);
});

test('same tenant and target under a different logged-in user is never current', () => {
  const loaded = targetDetailScope('user-a', 'org-a', 'target-a');
  assert.equal(isCurrentTargetScope(targetDetailScope('user-b', 'org-a', 'target-a'), loaded), false);
  assert.equal(isTargetInitialFailure(targetDetailScope('user-b', 'org-a', 'target-a'), loaded, loaded), false);
});
