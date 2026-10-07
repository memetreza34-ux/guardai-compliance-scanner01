export type RiskStatus = 'open' | 'mitigating' | 'accepted' | 'closed';
export type RiskTreatment = 'mitigate' | 'accept' | 'avoid' | 'transfer' | 'monitor';

export interface WorkspaceRisk {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  status: RiskStatus;
  treatment: RiskTreatment;
  likelihood: number;
  impact: number;
  inherentScore: number;
  residualLikelihood: number | null;
  residualImpact: number | null;
  residualScore: number | null;
  ownerUserId: string | null;
  reviewDueAt: string | null;
  targetIds: string[];
  findingIds: string[];
  controlIds: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface RiskInput {
  title: string;
  description?: string | null;
  status?: RiskStatus;
  treatment?: RiskTreatment;
  likelihood: number;
  impact: number;
  residualLikelihood?: number | null;
  residualImpact?: number | null;
  ownerUserId?: string | null;
  reviewDueAt?: string | null;
  targetIds?: string[];
  findingIds?: string[];
  controlIds?: string[];
}
