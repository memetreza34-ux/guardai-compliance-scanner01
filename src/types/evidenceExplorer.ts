export type EvidenceFreshnessState = 'current' | 'superseded';
export type EvidenceCollectionHealth = 'healthy' | 'pending' | 'collection_error' | 'cancelled' | 'unknown';

export interface EvidenceExplorerItem {
  id: string;
  organizationId: string;
  scanId: string;
  targetId: string;
  targetDisplayName: string;
  detectorId: string;
  detectorVersion: string;
  type: string;
  source: string;
  normalizedData: Record<string, unknown>;
  contentHash: string | null;
  capturedAt: string;
  createdAt: string;
  freshnessState: EvidenceFreshnessState;
  collectionHealth: EvidenceCollectionHealth;
  sourceScanStatus: string;
  sourceScanCompletedAt: string | null;
}

export interface EvidenceExplorerPage {
  evidence: EvidenceExplorerItem[];
  nextCursor: string | null;
}
