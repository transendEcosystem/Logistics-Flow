export type FacilityLetterStatus =
  | 'draft'
  | 'issued'
  | 'accepted'
  | 'declined'
  | 'expired';

export type BookingStageId =
  | 'facility_letter_sent'
  | 'facility_letter_signed'
  | 'signed_letter_vaulted'
  | 'agreement_generated'
  | 'security_documents_generated'
  | 'client_signed_agreements'
  | 'agreements_vaulted'
  | 'security_implemented'
  | 'deposit_collected'
  | 'compliance_checked'
  | 'payout_authorised';

export interface BookingStageDefinition {
  id: BookingStageId;
  label: string;
  description: string;
  /** Stage is owned by the client rather than the lender. */
  actor: 'lender' | 'client';
  /** Skipped automatically when the agreement requires no deposit or security. */
  conditional?: 'deposit' | 'security';
}

export const BOOKING_STAGES: BookingStageDefinition[] = [
  { id: 'facility_letter_sent', label: 'Facility letter sent', description: 'Approved facility letter issued to the client for acceptance.', actor: 'lender' },
  { id: 'facility_letter_signed', label: 'Facility letter signed', description: 'Client accepted and signed the facility letter.', actor: 'client' },
  { id: 'signed_letter_vaulted', label: 'Signed letter vaulted', description: 'Signed facility letter stored in the document vault.', actor: 'lender' },
  { id: 'agreement_generated', label: 'Agreement generated', description: 'Agreement drafted strictly in terms of the approved facility letter.', actor: 'lender' },
  { id: 'security_documents_generated', label: 'Collateral & security agreements generated', description: 'Cession, surety, notarial bond and collateral instruments prepared.', actor: 'lender', conditional: 'security' },
  { id: 'client_signed_agreements', label: 'Client accepted and signed agreements', description: 'Client signed the agreement and all security documents.', actor: 'client' },
  { id: 'agreements_vaulted', label: 'Agreements vaulted', description: 'Executed agreements stored in the document vault.', actor: 'lender' },
  { id: 'security_implemented', label: 'Collateral & security implemented', description: 'Security registered and perfected against the relevant registries.', actor: 'lender', conditional: 'security' },
  { id: 'deposit_collected', label: 'Deposit collected', description: 'Required upfront deposit received and reconciled.', actor: 'client', conditional: 'deposit' },
  { id: 'compliance_checked', label: 'Compliance checked', description: 'Final compliance and condition verification completed.', actor: 'lender' },
  { id: 'payout_authorised', label: 'Payout authorised', description: 'Authorised signatory released funds to the client.', actor: 'lender' },
];

export interface BookingRequirements {
  depositRequired: boolean;
  securityRequired: boolean;
}

export function getApplicableBookingStages(requirements: BookingRequirements): BookingStageDefinition[] {
  return BOOKING_STAGES.filter((stage) => {
    if (stage.conditional === 'deposit') return requirements.depositRequired;
    if (stage.conditional === 'security') return requirements.securityRequired;
    return true;
  });
}

export type BookingStageState = Partial<Record<BookingStageId, { completed: boolean; completedAt?: string; completedBy?: string; note?: string }>>;

export function getNextBookingStage(stages: BookingStageDefinition[], state: BookingStageState): BookingStageDefinition | null {
  return stages.find((stage) => !state[stage.id]?.completed) || null;
}

/** Stages must complete in order so payout can never precede signature or security. */
export function canCompleteBookingStage(stageId: BookingStageId, stages: BookingStageDefinition[], state: BookingStageState): boolean {
  const index = stages.findIndex((stage) => stage.id === stageId);
  if (index < 0) return false;
  return stages.slice(0, index).every((stage) => state[stage.id]?.completed === true);
}

export function getBookingProgress(stages: BookingStageDefinition[], state: BookingStageState): number {
  if (stages.length === 0) return 0;
  const completed = stages.filter((stage) => state[stage.id]?.completed).length;
  return Math.round((completed / stages.length) * 100);
}

export function isBookingReadyForLive(stages: BookingStageDefinition[], state: BookingStageState): boolean {
  return stages.every((stage) => state[stage.id]?.completed === true);
}

export interface FacilityLetterTerms {
  agreementType: string;
  approvedAmount: number;
  termMonths: number;
  interestRate: number;
  depositAmount: number;
  conditions: string[];
  collateralRequirements: string[];
  securityRequirements: string[];
  suretyRequirements: string[];
}

export function buildFacilityLetterBody(clientName: string, terms: FacilityLetterTerms): string {
  const lines = [
    `FACILITY LETTER`,
    ``,
    `Client: ${clientName}`,
    `Agreement type: ${terms.agreementType}`,
    `Approved facility amount: R ${Number(terms.approvedAmount || 0).toLocaleString()}`,
    `Term: ${terms.termMonths} months`,
    `Interest rate: ${terms.interestRate}% per annum`,
  ];
  if (terms.depositAmount > 0) lines.push(`Required deposit: R ${Number(terms.depositAmount).toLocaleString()}`);
  const appendSection = (title: string, items: string[]) => {
    if (items.length === 0) return;
    lines.push('', title);
    items.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
  };
  appendSection('CONDITIONS PRECEDENT', terms.conditions);
  appendSection('COLLATERAL REQUIREMENTS', terms.collateralRequirements);
  appendSection('SECURITY REQUIREMENTS', terms.securityRequirements);
  appendSection('SURETY REQUIREMENTS', terms.suretyRequirements);
  lines.push(
    '',
    'This facility is granted subject to the conditions above, the signature of the agreement and all security documents, implementation of security, and final compliance verification. No amount is payable to the client until payout is authorised.',
  );
  return lines.join('\n');
}
