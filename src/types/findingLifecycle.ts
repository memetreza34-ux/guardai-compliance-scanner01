export type FindingLifecycleStatus = 'open' | 'resolved' | 'accepted_risk';
export type FindingTechnicalSeverity = 'critical' | 'warning' | 'info';

export interface WorkspaceFindingSummary {
  id: string;
  organizationId: string;
  targetId: string;
  ruleId: string | null;
  ruleTitle: string | null;
  fingerprint: string;
  status: FindingLifecycleStatus;
  statusReason: string | null;
  statusUpdatedAt: string;
  statusUpdatedBy: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
  latestScanId: string | null;
  ruleVersion: string | null;
  ruleDefinitionHash: string | null;
  severity: FindingTechnicalSeverity | null;
  confidence: number | null;
  evidenceIds: string[];
  message: string | null;
  remediation: string | null;
  latestObservedAt: string | null;
}

export interface FindingListPage {
  findings: WorkspaceFindingSummary[];
  nextCursor: string | null;
}

export interface FindingStatusEvent {
  id: string;
  findingId: string;
  scanId: string | null;
  fromStatus: FindingLifecycleStatus | null;
  toStatus: FindingLifecycleStatus;
  reason: string | null;
  actorId: string | null;
  createdAt: string;
}

export interface FindingStatusHistoryPage {
  events: FindingStatusEvent[];
  nextCursor: string | null;
}
