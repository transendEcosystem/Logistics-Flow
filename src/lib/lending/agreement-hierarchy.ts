/**
 * Agreement product hierarchy: Type (master facility) -> Product (sub-facility) -> Variables (fixed approved lists).
 * Users may only write deals from approved combinations; the credit module will gate these by risk.
 */

export type AgreementTypeId = 'loans' | 'installment-sale' | 'leases' | 'discounting';

export interface AgreementVariableOption {
  id: string;
  label: string;
  /** Numeric percent value where applicable. */
  value: number;
}

export interface AgreementProductVariable {
  /** Variable key stored on the facility (e.g. depositPercent, residualPercent, balloonPercent, escalationPercent). */
  key: 'depositPercent' | 'residualPercent' | 'balloonPercent' | 'escalationPercent';
  label: string;
  options: AgreementVariableOption[];
}

export interface AgreementProduct {
  id: string;
  label: string;
  /** Variables applicable to this product (fixed approved lists). */
  variables: AgreementProductVariable[];
}

export interface AgreementTypeDefinition {
  id: AgreementTypeId;
  label: string;
  /** Calculation method: pv (present value), flat (flat rate), discount (cession/discount). */
  calculation: 'pv' | 'flat' | 'discount';
  /** Schedule display mode: split capital+interest, or single rental+VAT. */
  scheduleDisplay: 'split' | 'rental_vat';
  products: AgreementProduct[];
}

const PERCENTS_5_TO_25 = [5, 10, 15, 20, 25].map((v) => ({ id: `${v}`, label: `${v}%`, value: v }));
const PERCENTS_10_TO_25 = [10, 15, 20, 25].map((v) => ({ id: `${v}`, label: `${v}%`, value: v }));
const ESCALATION = [3, 5, 7.5, 10].map((v) => ({ id: `${v}`, label: `${v}%`, value: v }));

export const AGREEMENT_HIERARCHY: AgreementTypeDefinition[] = [
  {
    id: 'loans',
    label: 'Loans (Working Capital)',
    calculation: 'pv',
    scheduleDisplay: 'split',
    products: [
      { id: 'loan-pv', label: 'Loan (PV)', variables: [{ key: 'balloonPercent', label: 'Balloon', options: PERCENTS_5_TO_25 }] },
      { id: 'loan-fl', label: 'Loan (FL)', variables: [{ key: 'balloonPercent', label: 'Balloon', options: PERCENTS_5_TO_25 }] },
      { id: 'revolving', label: 'Revolving Credit', variables: [{ key: 'balloonPercent', label: 'Balloon', options: PERCENTS_5_TO_25 }] },
    ],
  },
  {
    id: 'installment-sale',
    label: 'Installment Sale',
    calculation: 'pv',
    scheduleDisplay: 'split',
    products: [
      { id: 'straight', label: 'Installment Sale (Straight)', variables: [{ key: 'depositPercent', label: 'Deposit', options: PERCENTS_5_TO_25 }] },
      {
        id: 'balloon',
        label: 'Installment Sale (Balloon)',
        variables: [
          { key: 'depositPercent', label: 'Deposit', options: PERCENTS_5_TO_25 },
          { key: 'balloonPercent', label: 'Balloon', options: PERCENTS_5_TO_25 },
        ],
      },
    ],
  },
  {
    id: 'leases',
    label: 'Leases',
    calculation: 'pv',
    scheduleDisplay: 'rental_vat',
    products: [
      {
        id: 'straight',
        label: 'Lease (Straight)',
        variables: [
          { key: 'depositPercent', label: 'Deposit', options: PERCENTS_5_TO_25 },
          { key: 'escalationPercent', label: 'Escalation', options: ESCALATION },
        ],
      },
      {
        id: 'balloon',
        label: 'Lease (Balloon)',
        variables: [
          { key: 'depositPercent', label: 'Deposit', options: PERCENTS_5_TO_25 },
          { key: 'balloonPercent', label: 'Balloon', options: PERCENTS_5_TO_25 },
          { key: 'escalationPercent', label: 'Escalation', options: ESCALATION },
        ],
      },
    ],
  },
  {
    id: 'discounting',
    label: 'Discounting (Cession)',
    calculation: 'discount',
    scheduleDisplay: 'split',
    products: [
      { id: 'confirmed-factoring', label: 'Confirmed Factoring', variables: [{ key: 'residualPercent', label: 'Residual', options: PERCENTS_10_TO_25 }] },
      { id: 'unconfirmed-factoring', label: 'Unconfirmed Factoring', variables: [{ key: 'residualPercent', label: 'Residual', options: PERCENTS_10_TO_25 }] },
      { id: 'invoice-discounting', label: 'Invoice Discounting', variables: [{ key: 'residualPercent', label: 'Residual', options: PERCENTS_10_TO_25 }] },
      { id: 'rights-discounting', label: 'Rights Discounting', variables: [{ key: 'residualPercent', label: 'Residual', options: PERCENTS_10_TO_25 }] },
      { id: 'bridging', label: 'Bridging Finance', variables: [{ key: 'residualPercent', label: 'Residual', options: PERCENTS_10_TO_25 }] },
    ],
  },
];

/** Map existing agreement type codes (used across the app) to hierarchy type ids. */
const TYPE_CODE_MAP: Record<string, AgreementTypeId> = {
  'loan-pv-term': 'loans',
  'installment-sale-term': 'installment-sale',
  'rental-term': 'leases',
  discounting: 'discounting',
};

export function getAgreementTypeByCode(code?: string): AgreementTypeDefinition | undefined {
  const id = TYPE_CODE_MAP[String(code || '')] || (AGREEMENT_HIERARCHY.find((t) => t.id === code)?.id);
  return AGREEMENT_HIERARCHY.find((t) => t.id === id);
}

export function getAgreementTypeById(id?: string): AgreementTypeDefinition | undefined {
  return AGREEMENT_HIERARCHY.find((t) => t.id === id);
}

export function getProduct(typeId?: string, productId?: string): AgreementProduct | undefined {
  return getAgreementTypeById(typeId)?.products.find((p) => p.id === productId);
}
