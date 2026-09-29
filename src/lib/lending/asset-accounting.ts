import type { LendingAssetControlRecord } from './asset-architecture';

export type AssetAccountingEventType = 'installment_sale_conclusion' | 'lease_depreciation' | 'rent_to_own_residual_settlement' | 'discounting_cession';

export interface AssetAccountingJournalLine {
  account: string;
  debit: number;
  credit: number;
}

export interface AssetAccountingEvent {
  eventType: AssetAccountingEventType;
  eventDate: string;
  effectiveDate: string;
  reference: string;
  amount: number;
  bookValue?: number;
  profitOrLoss?: number;
  invoiceRequired?: boolean;
  assetId?: string;
  agreementId?: string;
  clientId?: string;
  journalLines: AssetAccountingJournalLine[];
}

function money(value: number): number { return Number(value.toFixed(2)); }

export function buildAssetAccountingEvent(input: {
  eventType: AssetAccountingEventType;
  eventDate: string;
  effectiveDate: string;
  reference: string;
  amount: number;
  assetId?: string;
  agreementId?: string;
  clientId?: string;
  assetControl: LendingAssetControlRecord;
  assetCost?: number;
  accumulatedDepreciation?: number;
}): AssetAccountingEvent {
  const amount = money(input.amount);
  if (amount <= 0) throw new Error('Accounting event amount must be positive.');
  const isRentToOwnSettlement = input.eventType === 'rent_to_own_residual_settlement';
  if (isRentToOwnSettlement && (!Number.isFinite(input.assetCost) || !Number.isFinite(input.accumulatedDepreciation) || Number(input.assetCost) <= 0 || Number(input.accumulatedDepreciation) < 0)) {
    throw new Error('Rent-to-own settlement requires asset cost and accumulated depreciation.');
  }
  const bookValue = isRentToOwnSettlement ? money(Number(input.assetCost) - Number(input.accumulatedDepreciation)) : undefined;
  const profitOrLoss = isRentToOwnSettlement ? money(amount - Number(bookValue)) : undefined;
  const journalLines = input.eventType === 'lease_depreciation'
    ? [{ account: 'Depreciation Expense', debit: amount, credit: 0 }, { account: 'Accumulated Depreciation', debit: 0, credit: amount }]
    : input.eventType === 'discounting_cession'
      ? [{ account: 'Receivable Rights', debit: amount, credit: 0 }, { account: 'Discounting Settlement Control', debit: 0, credit: amount }]
      : isRentToOwnSettlement
        ? [
          { account: 'Balloon Settlement Receivable', debit: amount, credit: 0 },
          { account: 'Accumulated Depreciation', debit: Number(input.accumulatedDepreciation), credit: 0 },
          { account: 'Stock / Asset Inventory', debit: 0, credit: Number(input.assetCost) },
          ...(profitOrLoss! >= 0
            ? [{ account: 'Profit on Asset Disposal', debit: 0, credit: profitOrLoss! }]
            : [{ account: 'Loss on Asset Disposal', debit: Math.abs(profitOrLoss!), credit: 0 }]),
        ]
        : [{ account: 'Asset Sale / Settlement Receivable', debit: amount, credit: 0 }, { account: 'Stock / Asset Inventory', debit: 0, credit: amount }];
  return { eventType: input.eventType, eventDate: input.eventDate, effectiveDate: input.effectiveDate, reference: input.reference, amount, bookValue, profitOrLoss, invoiceRequired: input.eventType === 'installment_sale_conclusion' || isRentToOwnSettlement, assetId: input.assetId, agreementId: input.agreementId, clientId: input.clientId, journalLines };
}
