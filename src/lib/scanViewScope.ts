/**
 * UI-only display scopes for scan routes. These guard stale React async results;
 * they do not authorize access, which remains a backend/RLS responsibility.
 */
type IdentityId = string | null | undefined;

export function scanHistoryScope(userId: IdentityId, organizationId: IdentityId): string | null {
  return userId && organizationId ? `${userId}:${organizationId}` : null;
}

export function scanDetailScope(
  userId: IdentityId,
  organizationId: IdentityId,
  scanId: IdentityId,
): string | null {
  const historyScope = scanHistoryScope(userId, organizationId);
  return historyScope && scanId ? `${historyScope}:${scanId}` : null;
}

export function isLoadedForActiveScope(activeScope: string | null, loadedScope: string | null): boolean {
  return activeScope !== null && activeScope === loadedScope;
}

export function isInitialLoadFailedForActiveScope(
  activeScope: string | null,
  loadedScope: string | null,
  failedScope: string | null,
): boolean {
  return activeScope !== null
    && !isLoadedForActiveScope(activeScope, loadedScope)
    && failedScope === activeScope;
}
