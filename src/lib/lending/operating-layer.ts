export type LendingApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'conditionally_approved'
  | 'offer_issued'
  | 'offer_accepted'
  | 'declined'
  | 'disbursed';

export const LENDING_APPLICATION_TRANSITIONS: Record<LendingApplicationStatus, LendingApplicationStatus[]> = {
  draft: ['submitted'],
  submitted: ['under_review', 'declined'],
  under_review: ['approved', 'conditionally_approved', 'declined'],
  approved: ['offer_issued'],
  conditionally_approved: ['approved', 'offer_issued', 'declined'],
  offer_issued: ['offer_accepted', 'declined'],
  offer_accepted: ['disbursed'],
  declined: [],
  disbursed: [],
};

export interface LendingApplicationRecord {
  id?: string;
  applicationId?: string;
  clientId?: string;
  facilityId?: string;
  masterFacilityId?: string;
  agreementId?: string;
  caseType?: 'global_facility_indication' | 'agreement_facility_case' | 'linked_facility_case';
  originationType?: 'direct' | 'quote' | 'enquiry' | 'market' | 'referral' | 'admin';
  originationSourceId?: string;
  engagementEvents?: Array<{
    type: string;
    occurredAt?: string;
    sourceId?: string;
    metadata?: Record<string, unknown>;
  }>;
  facilityIndication?: {
    status: 'non_binding';
    wording: string;
    issuedAt?: string;
    expiresAt?: string;
    committeeDetermined: boolean;
  };
  sourceCollections?: string[];
  masterFacilityLimit?: number;
  availableFacilityLimit?: number;
  facilityAgreementType?: string;
  province?: string;
  city?: string;
  companyName: string;
  entityType: string;
  primaryContact: string;
  email: string;
  phone: string;
  amountRequested: number;
  termMonths: number;
  facilityType: string;
  fundingNeed: string;
  status: LendingApplicationStatus;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  submittedAt?: string;
  underwritingDecision?: string;
  riskBand?: string;
  approvalLimit?: number;
  decisionNotes?: string;
  decisionAt?: string;
  decisionBy?: string;
  conditions?: string[];
  offerTerms?: string;
  offerIssuedAt?: string;
  offerAcceptedAt?: string;
  offerAcceptedBy?: string;
  purposeNarrative?: string;
  fundingCause?: string;
  proposedAssetOrReceivable?: string;
  disclosedPaidUpAssets?: string;
  disclosedExistingSecurity?: string;
  disclosedLiabilities?: string;
  disclosedAdverseEvents?: string;
  proposedSureties?: string;
  disclosureAttestedAt?: string;
}

export const DEFAULT_LENDING_APPLICATION: Partial<LendingApplicationRecord> = {
  status: 'draft',
  entityType: 'Pty Ltd',
  facilityType: 'Asset Finance',
  fundingNeed: 'fleet-expansion',
  termMonths: 60,
  amountRequested: 250000,
};

export function normalizeLendingApplication(input: Partial<LendingApplicationRecord> = {}): LendingApplicationRecord {
  const application: LendingApplicationRecord = {
    companyName: String(input.companyName || '').trim(),
    entityType: String(input.entityType || 'Pty Ltd').trim(),
    primaryContact: String(input.primaryContact || '').trim(),
    email: String(input.email || '').trim(),
    phone: String(input.phone || '').trim(),
    amountRequested: Number(input.amountRequested || 0),
    termMonths: Number(input.termMonths || 60),
    facilityType: String(input.facilityType || 'Asset Finance').trim(),
    fundingNeed: String(input.fundingNeed || 'fleet-expansion').trim(),
    status: (input.status as LendingApplicationStatus) || 'draft',
    notes: String(input.notes || '').trim(),
    underwritingDecision: String(input.underwritingDecision || '').trim() || undefined,
    riskBand: String(input.riskBand || '').trim() || undefined,
    approvalLimit: Number(input.approvalLimit || 0) || undefined,
    purposeNarrative: String(input.purposeNarrative || '').trim() || undefined,
    fundingCause: String(input.fundingCause || '').trim() || undefined,
    proposedAssetOrReceivable: String(input.proposedAssetOrReceivable || '').trim() || undefined,
    disclosedPaidUpAssets: String(input.disclosedPaidUpAssets || '').trim() || undefined,
    disclosedExistingSecurity: String(input.disclosedExistingSecurity || '').trim() || undefined,
    disclosedLiabilities: String(input.disclosedLiabilities || '').trim() || undefined,
    disclosedAdverseEvents: String(input.disclosedAdverseEvents || '').trim() || undefined,
    proposedSureties: String(input.proposedSureties || '').trim() || undefined,
    disclosureAttestedAt: input.disclosureAttestedAt ? String(input.disclosureAttestedAt) : undefined,
  };

  if (input.id) application.id = String(input.id);
  if (input.applicationId) application.applicationId = String(input.applicationId);
  if (input.clientId) application.clientId = String(input.clientId);
  if (input.facilityId) application.facilityId = String(input.facilityId);
  if (input.masterFacilityId) application.masterFacilityId = String(input.masterFacilityId);
  if (input.agreementId) application.agreementId = String(input.agreementId);
  if (input.caseType) application.caseType = input.caseType;
  if (input.originationType) application.originationType = input.originationType;
  if (input.originationSourceId) application.originationSourceId = String(input.originationSourceId);
  if (Array.isArray(input.engagementEvents)) application.engagementEvents = input.engagementEvents;
  if (input.facilityIndication) application.facilityIndication = input.facilityIndication;
  if (Array.isArray(input.sourceCollections)) application.sourceCollections = input.sourceCollections.map(String);
  if (input.masterFacilityLimit !== undefined) application.masterFacilityLimit = Number(input.masterFacilityLimit || 0);
  if (input.availableFacilityLimit !== undefined) application.availableFacilityLimit = Number(input.availableFacilityLimit || 0);
  if (input.facilityAgreementType) application.facilityAgreementType = String(input.facilityAgreementType);
  if (input.province) application.province = String(input.province);
  if (input.city) application.city = String(input.city);
  if (input.createdAt) application.createdAt = String(input.createdAt);
  if (input.updatedAt) application.updatedAt = String(input.updatedAt);
  if (input.submittedAt) application.submittedAt = String(input.submittedAt);

  return application;
}
