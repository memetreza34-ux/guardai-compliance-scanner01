export type MonitorStatus = 'active' | 'paused' | 'disabled';
export type NotificationType = 'new_finding' | 'scan_failed';

export interface WorkspaceMonitor {
  id: string;
  organizationId: string;
  targetId: string;
  moduleId: 'security';
  status: MonitorStatus;
  scheduleMinutes: number;
  nextRunAt: string;
  leasedAt: string | null;
  leaseExpiresAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceNotification {
  id: string;
  organizationId: string;
  type: NotificationType;
  scanId: string | null;
  findingId: string | null;
  severity: 'critical' | 'warning' | 'info' | null;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPage {
  notifications: WorkspaceNotification[];
  nextCursor: string | null;
}


export type DriftEventType = 'finding_introduced' | 'finding_reappeared';

export interface WorkspaceDriftEvent {
  id: string;
  organizationId: string;
  type: DriftEventType;
  monitorId: string;
  monitorRunId: string;
  scheduledFor: string;
  scanId: string;
  targetId: string;
  targetDisplayName: string;
  findingId: string;
  ruleId: string | null;
  ruleTitle: string | null;
  ruleVersion: string | null;
  severity: 'critical' | 'warning' | 'info' | null;
  message: string | null;
  evidenceIds: string[];
  fromStatus: string | null;
  toStatus: 'open';
  detectedAt: string;
}

export interface DriftEventPage {
  events: WorkspaceDriftEvent[];
  nextCursor: string | null;
}
