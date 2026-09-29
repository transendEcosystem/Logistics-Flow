export type DiscoveryGapCategory = 'purpose' | 'client_identity' | 'financial_capacity' | 'asset' | 'liability' | 'security' | 'surety' | 'adverse_event';
export type DiscoveryGapStatus = 'pending' | 'confirmed' | 'variance_found' | 'not_applicable';

export interface LendingDiscoveryGap {
  id: string;
  category: DiscoveryGapCategory;
  requirement: string;
  disclosedValue?: string;
  status: DiscoveryGapStatus;
  findings?: string;
  source?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export function buildInitialDiscoveryGaps(application: Record<string, unknown>): LendingDiscoveryGap[] {
  const requirements: Array<[DiscoveryGapCategory, string, string]> = [
    ['purpose', 'Confirm the purpose, operational cause, amount, and proposed product.', String(application.purposeNarrative || application.fundingNeed || '')],
    ['client_identity', 'Confirm legal entity, ownership, directors, authorised signatories, and marital-security requirements.', String(application.companyName || '')],
    ['financial_capacity', 'Compare declared liabilities and cash-flow capacity with bank statements, financial records, questionnaire data, and observed activity.', String(application.disclosedLiabilities || '')],
    ['asset', 'Identify disclosed paid-up assets and investigate omitted vehicles, equipment, and receivable rights that may support credit.', String(application.disclosedPaidUpAssets || '')],
    ['security', 'Confirm existing encumbrances and identify collateral or security instruments required for the requested facility.', String(application.disclosedExistingSecurity || '')],
    ['surety', 'Confirm proposed sureties, authority, spouse requirements, and evidence required for enforceable security.', String(application.proposedSureties || '')],
    ['adverse_event', 'Check disclosed adverse events against forensic gap analysis, deep-dive findings, registry data, and credit checks.', String(application.disclosedAdverseEvents || '')],
  ];
  return requirements.map(([category, requirement, disclosedValue]) => ({ id: category, category, requirement, disclosedValue: disclosedValue || undefined, status: 'pending' }));
}
