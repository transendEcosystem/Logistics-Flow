export type AccountingJournalLine = {
  transactionId: string;
  reference: string;
  date: string;
  description: string;
  account: string;
  debit: number;
  credit: number;
};

export type AccountingJournalBatch = {
  applicationId?: string;
  period?: string;
  currency: 'ZAR';
  lines: AccountingJournalLine[];
  totalDebit: number;
  totalCredit: number;
};

function money(value: unknown): number {
  return Number(Number(value || 0).toFixed(2));
}

export function buildAccountingJournalBatch(transactions: Array<Record<string, any>>, applicationId?: string, period?: string): AccountingJournalBatch {
  const lines = transactions.flatMap((transaction) => {
    const amount = money(transaction.amount);
    if (amount <= 0) return [];
    const isDebit = transaction.type === 'debit';
    return [
      {
        transactionId: String(transaction.id || ''),
        reference: String(transaction.reference || transaction.id || ''),
        date: String(transaction.effectiveDate || transaction.date || '').slice(0, 10),
        description: String(transaction.description || 'Lending transaction'),
        account: isDebit ? 'Borrower Receivables' : 'Bank Receipts Clearing',
        debit: isDebit ? amount : 0,
        credit: isDebit ? 0 : amount,
      },
      {
        transactionId: String(transaction.id || ''),
        reference: String(transaction.reference || transaction.id || ''),
        date: String(transaction.effectiveDate || transaction.date || '').slice(0, 10),
        description: String(transaction.description || 'Lending transaction'),
        account: isDebit ? 'Lending Income / Principal Control' : 'Borrower Receivables',
        debit: isDebit ? 0 : amount,
        credit: isDebit ? amount : 0,
      },
    ];
  });
  const totalDebit = money(lines.reduce((total, line) => total + line.debit, 0));
  const totalCredit = money(lines.reduce((total, line) => total + line.credit, 0));
  return { applicationId, period, currency: 'ZAR', lines, totalDebit, totalCredit };
}
