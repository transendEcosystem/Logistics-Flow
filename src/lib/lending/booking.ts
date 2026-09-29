export type LendingAgreementStatus = 'booking' | 'live' | 'settled' | 'cancelled';

export interface LendingBookingChecklist {
  depositReceived: boolean;
  assetRegisteredToLender: boolean;
  collateralRegistered: boolean;
  securityRegistered: boolean;
  originalDocumentsVaulted: boolean;
  signaturesChecked: boolean;
  authorizedSignerVerified: boolean;
  companyOrSpouseDocumentsVaulted: boolean;
}

export const DEFAULT_BOOKING_CHECKLIST: LendingBookingChecklist = {
  depositReceived: false,
  assetRegisteredToLender: false,
  collateralRegistered: false,
  securityRegistered: false,
  originalDocumentsVaulted: false,
  signaturesChecked: false,
  authorizedSignerVerified: false,
  companyOrSpouseDocumentsVaulted: false,
};

export function isBookingComplete(checklist: Partial<LendingBookingChecklist> = {}): boolean {
  return Object.keys(DEFAULT_BOOKING_CHECKLIST).every((key) => checklist[key as keyof LendingBookingChecklist] === true);
}
