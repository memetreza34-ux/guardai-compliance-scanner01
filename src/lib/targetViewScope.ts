/**
 * Display-only client scopes. The API must enforce authorization independently.
 * A null scope never authorizes rendering previous workspace results.
 */
type ScopeId = string | null | undefined;

export function targetListScope(userId: ScopeId, organizationId: ScopeId): string | null {
  return userId && organizationId ? `${userId}:${organizationId}` : null;
}

export function targetDetailScope(
  userId: ScopeId,
  organizationId: ScopeId,
  targetId: ScopeId,
): string | null {
  const listScope = targetListScope(userId, organizationId);
  return listScope && targetId ? `${listScope}:${targetId}` : null;
}

export function isCurrentTargetScope(
  activeScope: string | null,
  loadedScope: string | null,
): boolean {
  return activeScope !== null && activeScope === loadedScope;
}

export function isTargetInitialFailure(
  activeScope: string | null,
  loadedScope: string | null,
  failedScope: string | null,
): boolean {
  return activeScope !== null
    && !isCurrentTargetScope(activeScope, loadedScope)
    && failedScope === activeScope;
}

export function targetsBelongToOrganization<T extends { organizationId: string }>(
  targets: T[],
  organizationId: string,
): boolean {
  return targets.every(target => target.organizationId === organizationId);
}
