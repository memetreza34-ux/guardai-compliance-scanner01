import type { TechnicalReportRecord } from '../types/report';

/**
 * Client display guard only. API authorization and PostgreSQL RLS remain mandatory.
 * A null scope may never authorize a previous user's or organization's report UI.
 */
type ScopeId = string | null | undefined;

export function reportListScope(userId: ScopeId, organizationId: ScopeId): string | null {
  return userId && organizationId ? `${userId}:${organizationId}` : null;
}

export function reportDetailScope(
  userId: ScopeId,
  organizationId: ScopeId,
  reportId: ScopeId,
): string | null {
  const listScope = reportListScope(userId, organizationId);
  return listScope && reportId ? `${listScope}:${reportId}` : null;
}

export function reportBelongsToOrganization(
  report: Pick<TechnicalReportRecord, 'organizationId' | 'scanId' | 'snapshot'>,
  organizationId: string,
): boolean {
  return !!organizationId
    && report.organizationId === organizationId
    && report.snapshot?.scan?.organizationId === organizationId
    && report.snapshot?.scan?.id === report.scanId;
}

export function reportsBelongToOrganization(
  reports: TechnicalReportRecord[],
  organizationId: string,
): boolean {
  return reports.every(report => reportBelongsToOrganization(report, organizationId));
}

export function isCurrentReportScope(activeScope: string | null, loadedScope: string | null): boolean {
  return activeScope !== null && activeScope === loadedScope;
}
