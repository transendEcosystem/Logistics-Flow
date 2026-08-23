export interface PartnerDiscountInfo {
  partnerId: string;
  agreementId?: string | null;
  eligible: boolean;
}

/** Reads the partner-sale discount tag stored on a company record, if it matches the given partner. */
export function getCompanyPartnerDiscount(companyData: any, partnerId: string): PartnerDiscountInfo | null {
  const discount = companyData?.partnerDiscount;
  if (!discount?.eligible || discount.partnerId !== partnerId) return null;
  return discount;
}

export function calculateDiscountedAmount(amount: number, agreement: { discountType: 'percentage' | 'fixed'; discountValue: number }): number {
  if (agreement.discountType === 'fixed') return Math.max(0, amount - agreement.discountValue);
  return Math.max(0, amount - (amount * agreement.discountValue) / 100);
}
