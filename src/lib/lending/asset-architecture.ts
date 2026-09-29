export type LendingAssetKind = 'physical_asset' | 'receivable_right' | 'collateral_asset';
export type LendingAssetOwnership = 'borrower' | 'lender_inventory' | 'lender_conditional' | 'lender_security_interest' | 'third_party';
export type LendingAssetTreatment = 'acquired_for_resale' | 'deferred_sale' | 'security_right' | 'out_and_out_cession';
export type AssetStockTreatment = 'exit_on_agreement_implementation' | 'remain_and_depreciate' | 'exit_on_residual_settlement' | 'underlying_asset_not_owned' | 'enter_on_enforcement_recovery';

export interface LendingAssetControlRecord {
  assetKind: LendingAssetKind;
  ownership: LendingAssetOwnership;
  treatment: LendingAssetTreatment;
  underlyingAssetId?: string;
  agreementId?: string;
  clientId?: string;
  cessionDocumentId?: string;
  cessionDocumentUrl?: string;
  ownershipEffectiveAt?: string;
  releasedAt?: string;
  stockTreatment?: AssetStockTreatment;
  accountingStatus?: 'in_stock' | 'sold_pending_settlement' | 'held_under_lease' | 'released_to_borrower' | 'rights_only' | 'off_stock_collateral' | 'recovered_to_stock';
  residualAmount?: number;
  residualSettledAt?: string;
  invoiceId?: string;
  securityDocumentId?: string;
  securityDocumentUrl?: string;
  enforcementReference?: string;
  recoveredAt?: string;
}

export const ASSET_BASED_AGREEMENT_TYPES = ['asset-finance', 'installment-sale-term', 'rental-term'];

export function isDiscountingAgreement(type: unknown): boolean {
  return String(type || '').toLowerCase() === 'discounting';
}

export function getAgreementAssetControl(type: unknown): LendingAssetControlRecord {
  if (isDiscountingAgreement(type)) {
    return { assetKind: 'receivable_right', ownership: 'lender_conditional', treatment: 'out_and_out_cession', stockTreatment: 'underlying_asset_not_owned', accountingStatus: 'rights_only' };
  }
  const normalizedType = String(type || '').toLowerCase();
  if (normalizedType.includes('installment')) return { assetKind: 'physical_asset', ownership: 'lender_conditional', treatment: 'deferred_sale', stockTreatment: 'exit_on_agreement_implementation', accountingStatus: 'sold_pending_settlement' };
  return { assetKind: 'physical_asset', ownership: 'lender_inventory', treatment: 'acquired_for_resale', stockTreatment: 'remain_and_depreciate', accountingStatus: 'held_under_lease' };
}

export function getCollateralAssetControl(): LendingAssetControlRecord {
  return {
    assetKind: 'collateral_asset',
    ownership: 'lender_security_interest',
    treatment: 'security_right',
    stockTreatment: 'enter_on_enforcement_recovery',
    accountingStatus: 'off_stock_collateral',
  };
}
