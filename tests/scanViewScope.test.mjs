import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isInitialLoadFailedForActiveScope,
  isLoadedForActiveScope,
  scanDetailScope,
  scanHistoryScope,
} from '../src/lib/scanViewScope.ts';

test('missing identity or organization never establishes a readable scan scope', () => {
  assert.equal(scanHistoryScope(null, 'org-a'), null);
  assert.equal(scanHistoryScope('user-a', undefined), null);
  assert.equal(scanDetailScope('user-a', 'org-a', undefined), null);
  assert.equal(isLoadedForActiveScope(null, null), false);
  assert.equal(isInitialLoadFailedForActiveScope(null, null, null), false);
});

test('scan history from a different user or tenant is never current', () => {
  const loaded = scanHistoryScope('user-a', 'org-a');
  assert.equal(isLoadedForActiveScope(scanHistoryScope('user-a', 'org-b'), loaded), false);
  assert.equal(isLoadedForActiveScope(scanHistoryScope('user-b', 'org-a'), loaded), false);
  assert.equal(isLoadedForActiveScope(scanHistoryScope('user-a', 'org-a'), loaded), true);
});

test('scan details are scoped to requested scan ID as well as user and organization', () => {
  const loaded = scanDetailScope('user-a', 'org-a', 'scan-1');
  assert.equal(isLoadedForActiveScope(scanDetailScope('user-a', 'org-a', 'scan-2'), loaded), false);
  assert.equal(isLoadedForActiveScope(scanDetailScope('user-a', 'org-b', 'scan-1'), loaded), false);
  assert.equal(isLoadedForActiveScope(scanDetailScope('user-a', 'org-a', 'scan-1'), loaded), true);
});

test('failed initial read is unavailable, but only for its own scope', () => {
  const scopeA = scanHistoryScope('user-a', 'org-a');
  const scopeB = scanHistoryScope('user-a', 'org-b');
  assert.equal(isInitialLoadFailedForActiveScope(scopeA, null, scopeA), true);
  assert.equal(isInitialLoadFailedForActiveScope(scopeB, null, scopeA), false);
  assert.equal(isInitialLoadFailedForActiveScope(scopeA, scopeA, scopeA), false);
  assert.equal(isInitialLoadFailedForActiveScope(scopeA, null, null), false);
});

test('scan status refresh failure retains loaded same-scope evidence rather than inventing empty', () => {
  const scope = scanDetailScope('user-a', 'org-a', 'scan-a');
  assert.equal(isLoadedForActiveScope(scope, scope), true);
  assert.equal(isInitialLoadFailedForActiveScope(scope, scope, scope), false);
});

test('a changed scope with no authorized response remains unknown/loading, not a zero or error state', () => {
  const old = scanDetailScope('user-a', 'org-a', 'scan-a');
  const next = scanDetailScope('user-a', 'org-a', 'scan-b');
  assert.equal(isLoadedForActiveScope(next, old), false);
  assert.equal(isInitialLoadFailedForActiveScope(next, old, old), false);
});
