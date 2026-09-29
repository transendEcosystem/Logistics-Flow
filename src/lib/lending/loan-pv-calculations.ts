export interface PvInstalmentRow {
  instalmentNumber: number;
  dueDate: string;
  openingBalance: number;
  instalment: number;
  interest: number;
  capital: number;
  closingBalance: number;
}

export interface PvLoanTerms {
  /** Capital advanced to the client (the present value). */
  principal: number;
  /** Nominal annual rate, e.g. 16.5 for 16.5% pa. */
  annualRatePercent: number;
  numberOfInstalments: number;
  /** ISO date of the first instalment. */
  firstInstalmentDate: string;
}

export interface PvLoanResult {
  principal: number;
  annualRatePercent: number;
  monthlyRate: number;
  numberOfInstalments: number;
  instalment: number;
  totalRepayable: number;
  totalInterest: number;
  firstInstalmentDate: string;
  finalInstalmentDate: string;
  paymentDayOfMonth: number;
  schedule: PvInstalmentRow[];
}

function addMonths(iso: string, months: number): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const day = date.getDate();
  const shifted = new Date(date.getFullYear(), date.getMonth() + months, 1);
  // Clamp to month end so the 31st never rolls into the following month.
  const lastDay = new Date(shifted.getFullYear(), shifted.getMonth() + 1, 0).getDate();
  shifted.setDate(Math.min(day, lastDay));
  return shifted.toISOString().slice(0, 10);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Present-value annuity in arrears: PMT = PV x i / [1 - (1+i)^-n].
 * The final instalment absorbs rounding so the closing balance is exactly nil.
 */
export function calculatePvLoan(terms: PvLoanTerms): PvLoanResult {
  const principal = Number(terms.principal || 0);
  const annualRatePercent = Number(terms.annualRatePercent || 0);
  const numberOfInstalments = Math.max(0, Math.trunc(Number(terms.numberOfInstalments || 0)));
  const monthlyRate = annualRatePercent / 100 / 12;

  if (principal <= 0 || numberOfInstalments <= 0) {
    return {
      principal, annualRatePercent, monthlyRate, numberOfInstalments,
      instalment: 0, totalRepayable: 0, totalInterest: 0,
      firstInstalmentDate: terms.firstInstalmentDate,
      finalInstalmentDate: terms.firstInstalmentDate,
      paymentDayOfMonth: new Date(terms.firstInstalmentDate).getDate() || 1,
      schedule: [],
    };
  }

  const rawInstalment = monthlyRate === 0
    ? principal / numberOfInstalments
    : (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -numberOfInstalments));
  const instalment = round(rawInstalment);

  const schedule: PvInstalmentRow[] = [];
  let balance = principal;

  for (let index = 1; index <= numberOfInstalments; index += 1) {
    const openingBalance = round(balance);
    const interest = round(openingBalance * monthlyRate);
    const isFinal = index === numberOfInstalments;
    const thisInstalment = isFinal ? round(openingBalance + interest) : instalment;
    const capital = round(thisInstalment - interest);
    balance = round(openingBalance - capital);

    schedule.push({
      instalmentNumber: index,
      dueDate: addMonths(terms.firstInstalmentDate, index - 1),
      openingBalance,
      instalment: thisInstalment,
      interest,
      capital,
      closingBalance: isFinal ? 0 : balance,
    });
  }

  const totalRepayable = round(schedule.reduce((sum, row) => sum + row.instalment, 0));

  return {
    principal,
    annualRatePercent,
    monthlyRate,
    numberOfInstalments,
    instalment,
    totalRepayable,
    totalInterest: round(totalRepayable - principal),
    firstInstalmentDate: schedule[0].dueDate,
    finalInstalmentDate: schedule[schedule.length - 1].dueDate,
    paymentDayOfMonth: new Date(schedule[0].dueDate).getDate(),
    schedule,
  };
}

const UNITS = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function belowThousand(value: number): string {
  if (value === 0) return '';
  if (value < 20) return UNITS[value];
  if (value < 100) {
    const remainder = value % 10;
    return `${TENS[Math.floor(value / 10)]}${remainder ? `-${UNITS[remainder]}` : ''}`;
  }
  const remainder = value % 100;
  return `${UNITS[Math.floor(value / 100)]} Hundred${remainder ? ` and ${belowThousand(remainder)}` : ''}`;
}

/** Renders an amount for the "in words" clause of the acknowledgement of debt. */
export function amountInWords(amount: number): string {
  const rands = Math.floor(Math.abs(amount));
  const cents = Math.round((Math.abs(amount) - rands) * 100);
  if (rands === 0 && cents === 0) return 'Zero Rand';

  const scales: Array<[number, string]> = [[1_000_000_000, 'Billion'], [1_000_000, 'Million'], [1_000, 'Thousand']];
  let remaining = rands;
  const parts: string[] = [];

  for (const [scaleValue, scaleName] of scales) {
    const count = Math.floor(remaining / scaleValue);
    if (count > 0) {
      parts.push(`${belowThousand(count)} ${scaleName}`);
      remaining %= scaleValue;
    }
  }
  if (remaining > 0) parts.push(belowThousand(remaining));

  const randWords = parts.length > 0 ? parts.join(' ') : 'Zero';
  const centWords = cents > 0 ? ` and ${belowThousand(cents)} Cents` : '';
  return `${randWords} Rand${centWords}`;
}

export function formatRand(amount: number): string {
  return `R ${Number(amount || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatLongDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
}

const ORDINAL_SUFFIX = (day: number) => {
  if (day % 100 >= 11 && day % 100 <= 13) return 'th';
  return ['th', 'st', 'nd', 'rd'][day % 10] || 'th';
};

export function ordinalDay(day: number): string {
  return `${day}${ORDINAL_SUFFIX(day)}`;
}
