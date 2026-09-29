export type CreditCommitteeOutcome = 'approved_subject_to_conditions' | 'declined' | 'further_discovery_required';

export interface CreditCommitteeDecision {
  outcome: CreditCommitteeOutcome;
  clientFacilityLimit: number;
  agreementFacilityLimit: number;
  conditions: string[];
  collateralRequirements: string[];
  securityRequirements: string[];
  suretyRequirements: string[];
  rationale: string;
  decidedAt?: string;
  decidedBy?: string;
}

export function normalizeRequirementLines(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || '').split('\n').map((item) => item.trim()).filter(Boolean);
}
