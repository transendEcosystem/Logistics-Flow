import { generateAmortizationSchedule } from '@/app/lending/loan-calculations';

export interface DealTerms {
  principal: number;
  annualRatePercent: number;
  termMonths: number;
  /** Product variables inherited from the sub-facility. */
  depositPercent?: number;
  balloonPercent?: number;
  residualPercent?: number;
  escalationPercent?: number;
  /** Calculation method from the agreement type. */
  calculation: 'pv' | 'flat' | 'discount';
  /** Schedule display mode. */
  scheduleDisplay: 'split' | 'rental_vat';
  firstInstallmentDate?: string;
}

export interface DealRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
  /** Lease display: single rental ex VAT. */
  rentalExVat?: number;
  vat?: number;
  rentalIncVat?: number;
}

export interface DealResult {
  rows: DealRow[];
  /** Amount financed after deposit. */
  financedAmount: number;
  depositAmount: number;
  balloonAmount: number;
  monthlyPayment: number;
  totalInterest: number;
  totalRepayable: number;
  /** Lease display. */
  monthlyRentalExVat: number;
  monthlyVat: number;
  monthlyRentalIncVat: number;
  scheduleDisplay: 'split' | 'rental_vat';
  calculation: 'pv' | 'flat' | 'discount';
}

const VAT_RATE = 0.15;

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Computes the deal schedule honouring the agreement type's calculation method
 * and the product variables (deposit, balloon, residual, escalation).
 */
export function computeDeal(terms: DealTerms): DealResult {
  const principal = Math.max(0, Number(terms.principal || 0));
  const annualRatePercent = Math.max(0, Number(terms.annualRatePercent || 0));
  const termMonths = Math.max(0, Math.trunc(Number(terms.termMonths || 0)));

  const depositAmount = round(principal * (Number(terms.depositPercent || 0) / 100));
  const balloonAmount = round(principal * (Number(terms.balloonPercent || 0) / 100));
  // Amount actually amortised over the term (deposit reduces it, balloon is deferred to the end).
  const financedAmount = Math.max(0, principal - depositAmount - balloonAmount);

  let rows: DealRow[] = [];
  let monthlyPayment = 0;
  let totalInterest = 0;

  if (terms.calculation === 'flat') {
    // Flat rate: Interest = Principal x (rate/100) x (months/12); Installment = Total / months.
    totalInterest = round(financedAmount * (annualRatePercent / 100) * (termMonths / 12));
    const total = financedAmount + totalInterest;
    monthlyPayment = termMonths > 0 ? round(total / termMonths) : 0;
    const monthlyPrincipal = termMonths > 0 ? round(financedAmount / termMonths) : 0;
    const monthlyInterest = termMonths > 0 ? round(totalInterest / termMonths) : 0;
    let balance = financedAmount;
    for (let i = 1; i <= termMonths; i++) {
      balance = Math.max(0, balance - monthlyPrincipal);
      rows.push({ month: i, payment: monthlyPayment, principal: monthlyPrincipal, interest: monthlyInterest, remainingBalance: balance });
    }
  } else {
    // Present value / discounting share the amortising schedule over the financed amount.
    const base = generateAmortizationSchedule(financedAmount, annualRatePercent, termMonths, terms.firstInstallmentDate, false);
    rows = base.map((r) => ({ month: r.month, payment: r.payment, principal: r.principal, interest: r.interest, remainingBalance: r.remainingBalance }));
    monthlyPayment = base[0]?.payment || 0;
    totalInterest = round(rows.reduce((sum, r) => sum + r.interest, 0));
  }

  const totalRepayable = round(financedAmount + totalInterest + balloonAmount);

  // Lease display: one rental figure + VAT, no capital/interest split.
  const monthlyRentalExVat = round(monthlyPayment);
  const monthlyVat = round(monthlyRentalExVat * VAT_RATE);
  const monthlyRentalIncVat = round(monthlyRentalExVat + monthlyVat);

  if (terms.scheduleDisplay === 'rental_vat') {
    rows = rows.map((r) => {
      const rentalExVat = round(r.payment);
      const vat = round(rentalExVat * VAT_RATE);
      return { ...r, rentalExVat, vat, rentalIncVat: round(rentalExVat + vat) };
    });
  }

  return {
    rows,
    financedAmount,
    depositAmount,
    balloonAmount,
    monthlyPayment: round(monthlyPayment),
    totalInterest,
    totalRepayable,
    monthlyRentalExVat,
    monthlyVat,
    monthlyRentalIncVat,
    scheduleDisplay: terms.scheduleDisplay,
    calculation: terms.calculation,
  };
}
