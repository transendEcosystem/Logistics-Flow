export const LENDING_ONBOARDING_STAGES = [
  'lead',
  'quote',
  'enquiry',
  'application',
  'discovery',
  'scoring',
  'credit',
  'booking',
  'live',
] as const;

export type LendingOnboardingStage = typeof LENDING_ONBOARDING_STAGES[number];

export interface LendingOnboardingTask {
  id: string;
  label: string;
}

export interface LendingOnboardingStageDefinition {
  id: LendingOnboardingStage;
  label: string;
  milestone: string;
  tasks: LendingOnboardingTask[];
}

export const LENDING_ONBOARDING_WORKFLOW: LendingOnboardingStageDefinition[] = [
  { id: 'lead', label: 'Lead', milestone: 'Initial lending opportunity identified', tasks: [{ id: 'source_confirmed', label: 'Source and owner confirmed' }, { id: 'borrower_identified', label: 'Borrower identified' }] },
  { id: 'quote', label: 'Quote', milestone: 'Indicative structure and pricing prepared', tasks: [{ id: 'product_fit_selected', label: 'Facility product fit selected' }, { id: 'indicative_limit_confirmed', label: 'Indicative limit confirmed' }] },
  { id: 'enquiry', label: 'Enquiry', milestone: 'Borrower request captured', tasks: [{ id: 'request_recorded', label: 'Borrower request recorded' }, { id: 'contact_verified', label: 'Borrower contact verified' }] },
  { id: 'application', label: 'Application', milestone: 'Application pack ready for review', tasks: [{ id: 'client_profile_complete', label: 'Client profile complete' }, { id: 'application_terms_captured', label: 'Amount, term, type and location captured' }, { id: 'policy_fit_checked', label: 'Application policy fit checked' }] },
  { id: 'discovery', label: 'Discovery', milestone: 'Declared position tested against evidence', tasks: [{ id: 'documents_requested', label: 'Required documents requested' }, { id: 'public_discovery_complete', label: 'Public discovery completed' }, { id: 'variances_recorded', label: 'Variances recorded' }] },
  { id: 'scoring', label: 'Scoring', milestone: 'Risk and affordability scored', tasks: [{ id: 'risk_score_recorded', label: 'Risk score recorded' }, { id: 'affordability_reviewed', label: 'Affordability reviewed' }] },
  { id: 'credit', label: 'Credit', milestone: 'Credit decision captured', tasks: [{ id: 'committee_decision_recorded', label: 'Committee decision recorded' }, { id: 'conditions_recorded', label: 'Conditions, security and collateral recorded' }, { id: 'policy_limit_confirmed', label: 'Policy limit confirmed' }] },
  { id: 'booking', label: 'Booking', milestone: 'Implementation conditions completed', tasks: [{ id: 'agreement_prepared', label: 'Agreement prepared' }, { id: 'signatures_checked', label: 'Signatures checked' }, { id: 'security_registered', label: 'Security and collateral registered' }, { id: 'documents_vaulted', label: 'Original documents vaulted' }] },
  { id: 'live', label: 'Live', milestone: 'Facility or agreement released to live servicing', tasks: [{ id: 'release_authorized', label: 'Release authorized' }, { id: 'servicing_started', label: 'Servicing started' }] },
];

export function getOnboardingStageDefinition(stage?: string) {
  return LENDING_ONBOARDING_WORKFLOW.find((item) => item.id === stage) || LENDING_ONBOARDING_WORKFLOW[0];
}

export function getOnboardingProgress(stage?: string) {
  const index = LENDING_ONBOARDING_WORKFLOW.findIndex((item) => item.id === stage);
  if (index < 0) return 0;
  return Math.round(((index + 1) / LENDING_ONBOARDING_WORKFLOW.length) * 100);
}

export function getNextOnboardingStage(stage?: string): LendingOnboardingStage {
  const index = LENDING_ONBOARDING_WORKFLOW.findIndex((item) => item.id === stage);
  return LENDING_ONBOARDING_WORKFLOW[Math.min(Math.max(index + 1, 0), LENDING_ONBOARDING_WORKFLOW.length - 1)].id;
}