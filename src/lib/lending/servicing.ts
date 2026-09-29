export type RepaymentInstallmentStatus = 'scheduled' | 'partially_paid' | 'paid' | 'overdue';
export type LendingTransactionType = 'debit' | 'credit';

export interface LendingTransaction {
  id: string;
  applicationId: string;
  installmentId?: string;
  date: string;
  description: string;
  type: LendingTransactionType;
  amount: number;
  reference: string;
  source: 'installment_raise' | 'bank_receipt' | 'adjustment';
  createdBy?: string;
}

export interface RepaymentInstallment {
  id: string;
  applicationId: string;
  installmentNumber: number;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  status: RepaymentInstallmentStatus;
  raisedAt?: string;
  raisedBy?: string;
  paidAt?: string;
}

export interface RepaymentScheduleInput {
  applicationId: string;
  principal: number;
  annualInterestRate: number;
  termMonths: number;
  firstDueDate: string;
}

export function calculateMonthlyPayment(principal: number, annualInterestRate: number, termMonths: number): number {
  const monthlyRate = annualInterestRate / 100 / 12;
  if (monthlyRate === 0) return Number((principal / termMonths).toFixed(2));
  const payment = principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths) / (Math.pow(1 + monthlyRate, termMonths) - 1);
  return Number(payment.toFixed(2));
}

export function buildRepaymentSchedule(input: RepaymentScheduleInput): RepaymentInstallment[] {
  const payment = calculateMonthlyPayment(input.principal, input.annualInterestRate, input.termMonths);
  let balance = input.principal;
  const schedule: RepaymentInstallment[] = [];
  const firstDueDate = new Date(`${input.firstDueDate}T00:00:00.000Z`);

  for (let index = 0; index < input.termMonths; index += 1) {
    const dueDate = new Date(Date.UTC(firstDueDate.getUTCFullYear(), firstDueDate.getUTCMonth() + index, firstDueDate.getUTCDate()));
    const monthlyRate = input.annualInterestRate / 100 / 12;
    const interest = Number((balance * monthlyRate).toFixed(2));
    const amountDue = index === input.termMonths - 1 ? Number((balance + interest).toFixed(2)) : payment;
    balance = Math.max(0, Number((balance - (amountDue - interest)).toFixed(2)));
    schedule.push({
      id: `${input.applicationId}-${index + 1}`,
      applicationId: input.applicationId,
      installmentNumber: index + 1,
      dueDate: dueDate.toISOString().slice(0, 10),
      amountDue,
      amountPaid: 0,
      status: 'scheduled',
    });
  }

  return schedule;
}

export function getInstallmentStatus(dueDate: string, amountDue: number, amountPaid: number, now = new Date()): RepaymentInstallmentStatus {
  if (amountPaid >= amountDue - 0.01) return 'paid';
  if (amountPaid > 0) return 'partially_paid';
  return new Date(`${dueDate}T23:59:59.999Z`) < now ? 'overdue' : 'scheduled';
}
