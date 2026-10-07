export type GovernanceFrameworkKind = 'technical_internal';
export type GovernanceAssessmentType = 'automated_technical';

export interface GovernanceRequirement {
  id: string;
  controlId: string;
  title: string;
  assessmentType: GovernanceAssessmentType;
  mappedRuleIds: string[];
  scopeBoundary: string;
}

export interface GovernanceControl {
  id: string;
  title: string;
  category: string;
  description: string;
  requirementIds: string[];
  mappedRuleIds: string[];
  requirements: GovernanceRequirement[];
}

export interface GovernanceFrameworkSummary {
  id: string;
  version: number;
  title: string;
  description: string;
  kind: GovernanceFrameworkKind;
  claimBoundary: string;
  controlIds: string[];
  requirementIds: string[];
  controlCount: number;
  requirementCount: number;
  externalMappingCount: number;
}

export interface GovernanceFrameworkDetail extends GovernanceFrameworkSummary {
  controls: Omit<GovernanceControl, 'requirements'>[];
  requirements: GovernanceRequirement[];
  externalMappings: unknown[];
}

export interface GovernanceCatalogMetadata {
  schemaVersion: number;
  frameworkCount: number;
  controlCount: number;
  requirementCount: number;
  externalMappingCount: number;
}
