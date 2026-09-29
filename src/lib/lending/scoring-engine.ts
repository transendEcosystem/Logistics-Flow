import { validateAgreementAgainstPolicies } from './policy-engine';

// --- TYPES FOR SCORING ENGINE ---

export interface RatioBounds {
  min: number;
  max: number;
}

export interface ScoringPolicyThresholds {
  minBankScore: number;          // e.g. 580
  maxBankScore: number;          // e.g. 850
  bureauPenaltyPoints: number;   // e.g. 50 points per adverse record
  returnedDebitPenalty: number;  // e.g. 45 points if returned debit orders found vs declared 0
  conductBonusPoints: number;    // e.g. 30 points if clean internal payment history
  conductArrearsPenalty: number; // e.g. 60 points if overdue internal transactions exist
  
  // Configurable Inter-Month & Recon Variance Thresholds
  dsoExpansionThresholdDays: number;         // e.g. 15 days expansion in DSO
  creditorDaysDriftThreshold: number;        // e.g. 15 days expansion in DPO
  reconVarianceTolerancePercent: number;     // e.g. 2.5% max variance declared vs bank pull
  closingBalanceContractionPercent: number;  // e.g. 20% max month-to-month bank balance contraction

  // 13 Critical Financial Ratios (Rows A211–A223)
  debtServiceCoverageRatio: RatioBounds; // DSCR e.g. min 1.25, max 4.0
  currentRatio: RatioBounds;             // Current Ratio e.g. min 1.1, max 3.0
  quickRatio: RatioBounds;               // Quick Ratio e.g. min 0.9, max 2.5
  debtToWorthRatio: RatioBounds;         // Debt to Equity / Worth e.g. min 0.1, max 2.5
  grossMarginPercent: RatioBounds;       // Gross Profit Margin % e.g. min 15.0, max 60.0
  netMarginPercent: RatioBounds;         // Net Profit Margin % e.g. min 3.0, max 50.0
  salesToAssetsRatio: RatioBounds;       // Asset Turnover e.g. min 1.0, max 5.0
  returnOnAssets: RatioBounds;           // ROA % e.g. min 4.0, max 40.0
  returnOnInvestments: RatioBounds;      // ROI % e.g. min 5.0, max 50.0
  inventoryTurnover: RatioBounds;        // Inventory Turnover e.g. min 4.0, max 24.0
  inventoryTurnDays: RatioBounds;        // Days Inventory Held e.g. min 15, max 90
  accReceivableTurnover: RatioBounds;    // DSO Days e.g. min 15, max 60
  accPayableTurnover: RatioBounds;       // DPO Days e.g. min 15, max 60
  avePaymentPeriod: RatioBounds;         // Ave Payment Period Days e.g. min 15, max 60
}

export const DEFAULT_SCORING_THRESHOLDS: ScoringPolicyThresholds = {
  minBankScore: 580,
  maxBankScore: 850,
  bureauPenaltyPoints: 50,
  returnedDebitPenalty: 45,
  conductBonusPoints: 30,
  conductArrearsPenalty: 60,

  dsoExpansionThresholdDays: 15,
  creditorDaysDriftThreshold: 15,
  reconVarianceTolerancePercent: 2.5,
  closingBalanceContractionPercent: 20,

  debtServiceCoverageRatio: { min: 1.25, max: 4.0 },
  currentRatio: { min: 1.1, max: 3.0 },
  quickRatio: { min: 0.9, max: 2.5 },
  debtToWorthRatio: { min: 0.1, max: 2.5 },
  grossMarginPercent: { min: 15.0, max: 60.0 },
  netMarginPercent: { min: 3.0, max: 50.0 },
  salesToAssetsRatio: { min: 1.0, max: 5.0 },
  returnOnAssets: { min: 4.0, max: 40.0 },
  returnOnInvestments: { min: 5.0, max: 50.0 },
  inventoryTurnover: { min: 4.0, max: 24.0 },
  inventoryTurnDays: { min: 15, max: 90 },
  accReceivableTurnover: { min: 15, max: 60 },
  accPayableTurnover: { min: 15, max: 60 },
  avePaymentPeriod: { min: 15, max: 60 },
};

export interface MonthlyDebtorRecord {
  month: string;
  openingBalance: number;
  salesInvoiced: number;
  collectionsReceived: number;
  closingBalance: number;
  dsoDays?: number;
}

export interface MonthlyCreditorRecord {
  month: string;
  openingBalance: number;
  purchases: number;
  paymentsMade: number;
  closingBalance: number;
  dpoDays?: number;
}

export interface MonthlyBankRecord {
  month: string;
  openingBalance: number;
  totalReceipts: number;
  totalPayments: number;
  closingBalance: number;
  returnedDebitsCount: number;
}

export interface StakeholderMaritalProfile {
  name: string;
  isDirector?: boolean;
  maritalStatus?: 'single' | 'married_cop' | 'married_anc' | 'divorced';
  spouseName?: string;
  spouseIdNumber?: string;
  spouseAssetsNotes?: string;
}

export interface ExistingBankFacilityAudit {
  bankName?: string;
  holdsCessionOfBookDebts?: boolean;
  holdsNotarialBond?: boolean;
  facilityAgreementDocUrl?: string;
}

export interface ScoringInputData {
  // Data Stream 1: Bank & Bureau Generic Score
  bankGenericScore?: number; // e.g. 640
  bureauScore?: number;     // e.g. 650
  
  // Data Stream 2: Questionnaire vs Discovered Variances
  declaredReturnedDebits?: boolean;
  discoveredReturnedDebitsCount?: number;
  
  // Data Stream 3: Internal Conduct (Existing Client)
  isExistingClient?: boolean;
  internalAgreementCount?: number;
  internalArrearsCount?: number;
  internalOutstandingBalance?: number;

  // Data Stream 4: Financial Statement & Bank Inputs
  monthlyInflow?: number;
  monthlyOutflow?: number;
  requestedMonthlyPayment?: number;
  revenue?: number;
  costOfGoodsSold?: number;
  grossProfit?: number;
  netProfit?: number;
  totalAssets?: number;
  currentAssets?: number;
  inventory?: number;
  cashAndBank?: number;
  accountsReceivable?: number;
  totalLiabilities?: number;
  currentLiabilities?: number;
  accountsPayable?: number;
  equity?: number;

  // Recon Inputs: Client Declared vs Bank Pulled
  declaredTurnover?: number;
  bankPulledTurnover?: number;
  declaredExpenses?: number;
  bankPulledExpenses?: number;

  // 12-Month Schedules for Inter-Month Trend Tracking
  monthlyDebtorsSchedule?: MonthlyDebtorRecord[];
  monthlyCreditorsSchedule?: MonthlyCreditorRecord[];
  monthlyBankSchedule?: MonthlyBankRecord[];

  // Evidenced Marital, Bank Encumbrance, & Deposit Controls
  stakeholdersMaritalProfiles?: StakeholderMaritalProfile[];
  existingBankFacility?: ExistingBankFacilityAudit;
  proposedDepositAmount?: number;
  proposedDepositPercent?: number;
  facilityType?: string;
}

export interface RatioResult {
  code: string;
  name: string;
  value: number;
  minApproved: number;
  maxApproved: number;
  isException: boolean;
  unit: 'ratio' | '%' | 'days' | 'times';
  note: string;
}

export interface TrendAlert {
  type: 'debtor_dso_expansion' | 'creditor_dpo_drift' | 'bank_balance_contraction' | 'recon_variance';
  severity: 'warning' | 'alert';
  title: string;
  details: string;
  requiresAnalysis: boolean;
}

export interface ScoringEvaluationResult {
  rawBankScore: number;
  adjustedFinalScore: number; // Final calculated internal score (300 - 950)
  scoreBand: 'A+ (Excellent)' | 'A (Low Risk)' | 'B (Moderate Risk)' | 'C (High Risk / Exception)' | 'D (Declined)';
  
  // Data Stream Summaries
  stream1BankScore: {
    baseScore: number;
    passMinThreshold: boolean;
    minRequired: number;
  };
  stream2VarianceAdjustment: {
    penaltyApplied: number;
    returnedDebitVariance: boolean;
    details: string[];
  };
  stream3InternalConduct: {
    adjustmentPoints: number;
    isExistingClient: boolean;
    details: string;
  };
  stream4FinancialRatios: {
    ratios: RatioResult[];
    exceptionCount: number;
    affordabilityPass: boolean;
  };

  // 12-Month Inter-Month Trend Analysis & Recon
  trendAlerts: TrendAlert[];
  reconVariance: {
    turnoverVariancePercent: number;
    expensesVariancePercent: number;
    isReconException: boolean;
    note: string;
  };

  // Overall Credit Committee Presentation
  outcome: 'APPROVED' | 'DECLINED' | 'REQUIRES_COMMITTEE_EXCEPTIONS';
  exceptionList: string[];

  // Proposed Credit Committee Exception Terms
  proposedExceptionTerms?: {
    maxRecommendedLimit: number;
    maxRecommendedTermMonths: number;
    riskAdjustedInterestRate: number;
    debtorAdvanceRateAdjustmentPercent?: number; // e.g. 80% reduced to 60% due to DSO drift
    mitigationRequirements: string[];
  };
}

/**
 * CORE SCORING CALCULATOR
 * Blends Bank Generic Scores, Questionnaire Variances, Internal Conduct, and Financial Ratios.
 */
export function calculateInternalScore(
  input: ScoringInputData,
  thresholds: ScoringPolicyThresholds = DEFAULT_SCORING_THRESHOLDS
): ScoringEvaluationResult {
  // 1. DATA STREAM 1: BANK & BUREAU GENERIC SCORE
  const baseScore = input.bankGenericScore || input.bureauScore || 600;
  const passMinBankScore = baseScore >= thresholds.minBankScore;

  let currentPoints = baseScore;

  // 2. DATA STREAM 2: QUESTIONNAIRE VARIANCE ADJUSTMENTS
  let variancePenalty = 0;
  const varianceDetails: string[] = [];
  const returnedDebitVariance =
    Boolean(!input.declaredReturnedDebits) && Boolean((input.discoveredReturnedDebitsCount || 0) > 0);

  if (returnedDebitVariance) {
    const penalty = thresholds.returnedDebitPenalty * (input.discoveredReturnedDebitsCount || 1);
    variancePenalty += penalty;
    varianceDetails.push(
      `Applicant declared 0 returned debits, but Open Banking discovered ${input.discoveredReturnedDebitsCount} returned debits (-${penalty} pts)`
    );
  }

  currentPoints -= variancePenalty;

  // 3. DATA STREAM 3: INTERNAL PAYMENT HISTORY CONDUCT
  let conductPoints = 0;
  let conductDetail = 'New client - no internal payment history.';

  if (input.isExistingClient) {
    if ((input.internalArrearsCount || 0) > 0) {
      conductPoints -= thresholds.conductArrearsPenalty * input.internalArrearsCount!;
      conductDetail = `Existing client with ${input.internalArrearsCount} overdue transaction(s) (-${thresholds.conductArrearsPenalty * input.internalArrearsCount!} pts)`;
    } else if ((input.internalAgreementCount || 0) > 0) {
      conductPoints += thresholds.conductBonusPoints;
      conductDetail = `Existing client with ${input.internalAgreementCount} successful agreement(s) (+${thresholds.conductBonusPoints} pts bonus)`;
    }
  }

  currentPoints += conductPoints;

  // Clamp final score between 300 and 950
  const adjustedFinalScore = Math.min(Math.max(Math.round(currentPoints), 300), 950);

  // 4. DATA STREAM 4: FINANCIAL RATIOS & AFFORDABILITY (Rows A211–A223)
  const ratios: RatioResult[] = [];
  const exceptions: string[] = [];

  const addRatio = (
    code: string,
    name: string,
    value: number,
    bounds: RatioBounds,
    unit: RatioResult['unit'],
    customNote?: string
  ) => {
    const isException = value < bounds.min || value > bounds.max;
    const note = isException
      ? customNote || `${name} of ${value}${unit === '%' ? '%' : ''} is outside policy bounds (${bounds.min} - ${bounds.max}).`
      : `${name} is within approved policy bounds (${bounds.min} - ${bounds.max}).`;

    ratios.push({
      code,
      name,
      value: Number(value.toFixed(2)),
      minApproved: bounds.min,
      maxApproved: bounds.max,
      isException,
      unit,
      note,
    });

    if (isException) {
      exceptions.push(`${name} Exception: ${value}${unit === '%' ? '%' : ''} (Approved Range: ${bounds.min} - ${bounds.max})`);
    }
  };

  // 1. Debt Service Coverage Ratio (DSCR)
  const netMonthlyCashflow = (input.monthlyInflow || 0) - (input.monthlyOutflow || 0);
  const proposedPayment = input.requestedMonthlyPayment || 1;
  const dscrValue = Number((netMonthlyCashflow / proposedPayment).toFixed(2));
  addRatio('dscr', 'Debt Service Coverage Ratio (DSCR)', dscrValue, thresholds.debtServiceCoverageRatio, 'ratio');

  // 2. Current Ratio (Current Assets / Current Liabilities)
  if (input.currentAssets && input.currentLiabilities && input.currentLiabilities > 0) {
    const crValue = input.currentAssets / input.currentLiabilities;
    addRatio('cr', 'Current Ratio (Liquidity)', crValue, thresholds.currentRatio, 'ratio');
  }

  // 3. Quick Ratio ((Cash + Debtors) / Current Liabilities)
  if (input.currentLiabilities && input.currentLiabilities > 0) {
    const quickAssets = (input.cashAndBank || 0) + (input.accountsReceivable || (input.currentAssets || 0) * 0.5);
    const qrValue = quickAssets / input.currentLiabilities;
    addRatio('qr', 'Quick Ratio (Acid Test)', qrValue, thresholds.quickRatio, 'ratio');
  }

  // 4. Debt-to-Worth / Debt-to-Equity (Total Liabilities / Equity)
  if (input.equity && input.equity > 0 && input.totalLiabilities) {
    const deValue = input.totalLiabilities / input.equity;
    addRatio('de', 'Debt to Equity / Worth Ratio', deValue, thresholds.debtToWorthRatio, 'ratio');
  }

  // 5. Gross Margin % (Gross Profit / Revenue * 100)
  if (input.revenue && input.revenue > 0 && input.grossProfit !== undefined) {
    const gmValue = (input.grossProfit / input.revenue) * 100;
    addRatio('gm', 'Gross Margin %', gmValue, thresholds.grossMarginPercent, '%');
  }

  // 6. Net Profit Margin % (Net Profit / Revenue * 100)
  if (input.revenue && input.revenue > 0 && input.netProfit !== undefined) {
    const npmValue = (input.netProfit / input.revenue) * 100;
    addRatio('npm', 'Net Profit Margin %', npmValue, thresholds.netMarginPercent, '%');
  }

  // 7. Sales to Assets (Revenue / Total Assets)
  if (input.totalAssets && input.totalAssets > 0 && input.revenue) {
    const staValue = input.revenue / input.totalAssets;
    addRatio('sta', 'Sales to Assets Ratio', staValue, thresholds.salesToAssetsRatio, 'times');
  }

  // 8. Return on Assets ROA % (Net Profit / Total Assets * 100)
  if (input.totalAssets && input.totalAssets > 0 && input.netProfit) {
    const roaValue = (input.netProfit / input.totalAssets) * 100;
    addRatio('roa', 'Return on Assets (ROA) %', roaValue, thresholds.returnOnAssets, '%');
  }

  // 9. Return on Investments ROI % (Net Profit / Equity * 100)
  if (input.equity && input.equity > 0 && input.netProfit) {
    const roiValue = (input.netProfit / input.equity) * 100;
    addRatio('roi', 'Return on Investment (ROI) %', roiValue, thresholds.returnOnInvestments, '%');
  }

  // 10. Inventory Turnover (COGS / Inventory)
  if (input.inventory && input.inventory > 0 && input.costOfGoodsSold) {
    const invTurn = input.costOfGoodsSold / input.inventory;
    addRatio('inv_turn', 'Inventory Turnover', invTurn, thresholds.inventoryTurnover, 'times');

    // 11. Inventory Turn Days (365 / Inventory Turnover)
    const invDays = 365 / invTurn;
    addRatio('inv_days', 'Inventory Turn Days', invDays, thresholds.inventoryTurnDays, 'days');
  }

  // 12. Accounts Receivable Turnover / DSO Days
  if (input.accountsReceivable && input.accountsReceivable > 0 && input.revenue) {
    const dsoDays = (input.accountsReceivable / input.revenue) * 365;
    addRatio('dso_days', 'Accounts Receivable Days (DSO)', dsoDays, thresholds.accReceivableTurnover, 'days');
  }

  // 13. Accounts Payable Turnover / DPO Days & Ave Payment Period
  if (input.accountsPayable && input.accountsPayable > 0 && (input.costOfGoodsSold || input.revenue)) {
    const baseCost = input.costOfGoodsSold || (input.revenue! * 0.7);
    const dpoDays = (input.accountsPayable / baseCost) * 365;
    addRatio('dpo_days', 'Accounts Payable Days (DPO)', dpoDays, thresholds.accPayableTurnover, 'days');
    addRatio('ave_payment', 'Average Payment Period', dpoDays, thresholds.avePaymentPeriod, 'days');
  }

  // 5. INTER-MONTH TREND ANALYSIS & RECON VARIANCE EVALUATION
  const trendAlerts: TrendAlert[] = [];

  // Trend A: Debtors Closing Balance / DSO Expansion Trend
  if (input.monthlyDebtorsSchedule && input.monthlyDebtorsSchedule.length >= 2) {
    const firstMonth = input.monthlyDebtorsSchedule[0];
    const lastMonth = input.monthlyDebtorsSchedule[input.monthlyDebtorsSchedule.length - 1];
    
    const openingDso = firstMonth.dsoDays || (firstMonth.salesInvoiced > 0 ? (firstMonth.closingBalance / firstMonth.salesInvoiced) * 30 : 30);
    const closingDso = lastMonth.dsoDays || (lastMonth.salesInvoiced > 0 ? (lastMonth.closingBalance / lastMonth.salesInvoiced) * 30 : 45);
    const dsoExpansion = closingDso - openingDso;

    if (dsoExpansion > thresholds.dsoExpansionThresholdDays) {
      trendAlerts.push({
        type: 'debtor_dso_expansion',
        severity: 'alert',
        title: 'Debtor Collection Expansion (DSO Drift)',
        details: `Debtors closing balance expanded with DSO drifting from ${Math.round(openingDso)} days to ${Math.round(closingDso)} days (+${Math.round(dsoExpansion)} days expansion). Requires deep-dive debtor control analysis.`,
        requiresAnalysis: true,
      });
      exceptions.push(`Debtor DSO Drift Warning: +${Math.round(dsoExpansion)} Days DSO Expansion over 12 Months`);
    }
  }

  // Trend B: Creditors Payment Period Drift
  if (input.monthlyCreditorsSchedule && input.monthlyCreditorsSchedule.length >= 2) {
    const firstMonth = input.monthlyCreditorsSchedule[0];
    const lastMonth = input.monthlyCreditorsSchedule[input.monthlyCreditorsSchedule.length - 1];
    
    const openingDpo = firstMonth.dpoDays || 30;
    const closingDpo = lastMonth.dpoDays || 48;
    const dpoDrift = closingDpo - openingDpo;

    if (dpoDrift > thresholds.creditorDaysDriftThreshold) {
      trendAlerts.push({
        type: 'creditor_dpo_drift',
        severity: 'warning',
        title: 'Creditor Payment Period Drift (Stretch)',
        details: `Creditor payment period drifted from ${Math.round(openingDpo)} days to ${Math.round(closingDpo)} days (+${Math.round(dpoDrift)} days drift). Supplier payment terms stretching.`,
        requiresAnalysis: true,
      });
      exceptions.push(`Creditor DPO Drift Warning: +${Math.round(dpoDrift)} Days Creditor Payment Stretch`);
    }
  }

  // Trend C: Bank Closing Balance Contraction
  if (input.monthlyBankSchedule && input.monthlyBankSchedule.length >= 2) {
    const firstBank = input.monthlyBankSchedule[0];
    const lastBank = input.monthlyBankSchedule[input.monthlyBankSchedule.length - 1];
    
    if (firstBank.closingBalance > 0) {
      const contractionPct = ((firstBank.closingBalance - lastBank.closingBalance) / firstBank.closingBalance) * 100;
      if (contractionPct > thresholds.closingBalanceContractionPercent) {
        trendAlerts.push({
          type: 'bank_balance_contraction',
          severity: 'warning',
          title: 'Bank Closing Balance Contraction',
          details: `Closing bank liquidity contracted by ${contractionPct.toFixed(1)}% over the 12-month period.`,
          requiresAnalysis: true,
        });
      }
    }
  }

  // Recon Variance: Client Declared vs Bank Pulled
  let turnoverVarPct = 0;
  let expensesVarPct = 0;
  let isReconException = false;
  let reconNote = 'Declared turnover and expenses match bank pull within tolerance.';

  if (input.declaredTurnover && input.bankPulledTurnover && input.bankPulledTurnover > 0) {
    turnoverVarPct = Math.abs((input.declaredTurnover - input.bankPulledTurnover) / input.bankPulledTurnover) * 100;
  }
  if (input.declaredExpenses && input.bankPulledExpenses && input.bankPulledExpenses > 0) {
    expensesVarPct = Math.abs((input.declaredExpenses - input.bankPulledExpenses) / input.bankPulledExpenses) * 100;
  }

  if (turnoverVarPct > thresholds.reconVarianceTolerancePercent || expensesVarPct > thresholds.reconVarianceTolerancePercent) {
    isReconException = true;
    reconNote = `Reconciliation variance detected: Turnover Variance ${turnoverVarPct.toFixed(1)}%, Expense Variance ${expensesVarPct.toFixed(1)}% (Policy Max Tolerance: ${thresholds.reconVarianceTolerancePercent}%).`;
    trendAlerts.push({
      type: 'recon_variance',
      severity: 'alert',
      title: 'Bank Reconciliation Variance Exception',
      details: reconNote,
      requiresAnalysis: true,
    });
    exceptions.push(`Bank Recon Variance Exception: Turnover ${turnoverVarPct.toFixed(1)}%, Expenses ${expensesVarPct.toFixed(1)}%`);
  }

  // 6. DETERMINE SCORE BAND & OVERALL DECISION
  let scoreBand: ScoringEvaluationResult['scoreBand'] = 'B (Moderate Risk)';
  if (adjustedFinalScore >= 750) scoreBand = 'A+ (Excellent)';
  else if (adjustedFinalScore >= 680) scoreBand = 'A (Low Risk)';
  else if (adjustedFinalScore >= 600) scoreBand = 'B (Moderate Risk)';
  else if (adjustedFinalScore >= 520) scoreBand = 'C (High Risk / Exception)';
  else scoreBand = 'D (Declined)';

  if (returnedDebitVariance) {
    exceptions.push('Questionnaire Discrepancy: Discovered returned debit orders');
  }

  if (!passMinBankScore) {
    exceptions.push(`Bank Generic Score Exception: ${baseScore} (Min Required: ${thresholds.minBankScore})`);
  }

  let outcome: ScoringEvaluationResult['outcome'] = 'APPROVED';

  if (adjustedFinalScore < 500 || (exceptions.length >= 4 && adjustedFinalScore < 580)) {
    outcome = 'DECLINED';
  } else if (exceptions.length > 0 || adjustedFinalScore < 650) {
    outcome = 'REQUIRES_COMMITTEE_EXCEPTIONS';
  }

  // 7. CALCULATE PROPOSED EVIDENCED EXCEPTION TERMS FOR CREDIT COMMITTEE
  let proposedExceptionTerms: ScoringEvaluationResult['proposedExceptionTerms'] = undefined;

  if (outcome === 'REQUIRES_COMMITTEE_EXCEPTIONS') {
    const baseAmount = input.requestedMonthlyPayment ? input.requestedMonthlyPayment * 36 : 150000;
    const recommendedLimit = Math.round(baseAmount * (adjustedFinalScore / 700));
    const recommendedTerm = adjustedFinalScore < 600 ? 24 : 36;
    const riskRate = Number((11.75 + (720 - adjustedFinalScore) * 0.025).toFixed(2));
    
    // If DSO drift was detected, adjust debtor advance rate recommendation
    const dsoTrend = trendAlerts.find(t => t.type === 'debtor_dso_expansion');
    const advanceRateAdj = dsoTrend ? 60 : undefined;

    const mitigations: string[] = [];

    // A. Evidenced Director Surety & Marital Regime Check
    const directors = input.stakeholdersMaritalProfiles?.filter(s => s.isDirector !== false) || [];
    const copDirectors = directors.filter(d => d.maritalStatus === 'married_cop');
    const ancDirectors = directors.filter(d => d.maritalStatus === 'married_anc');

    if (copDirectors.length > 0) {
      copDirectors.forEach(d => {
        const spouse = d.spouseName ? ` (${d.spouseName})` : '';
        mitigations.push(`Spousal Resolution & Joint Signature required for Director ${d.name}${spouse} [Married COP]`);
      });
    } else if (ancDirectors.length > 0) {
      ancDirectors.forEach(d => {
        const notes = d.spouseAssetsNotes ? `: ${d.spouseAssetsNotes}` : '';
        mitigations.push(`Personal Surety from Director ${d.name} [Married ANC] - Inspect spouse separate asset disclosure${notes}`);
      });
    } else if (directors.length > 0) {
      directors.forEach(d => {
        mitigations.push(`Personal Surety required from Director ${d.name} (Verify Marital Regime & Spousal Consent)`);
      });
    } else {
      mitigations.push('Personal Surety from all active directors (Spousal Resolution required if Married COP)');
    }

    // B. Evidenced Cession of Book Debts & Bank Encumbrance Check
    const bankAudit = input.existingBankFacility;
    if (bankAudit?.holdsCessionOfBookDebts) {
      const bank = bankAudit.bankName || 'Primary Bank';
      mitigations.push(`Primary Cession of Book Debts held by ${bank}. Require Inter-Creditor Deed or Second-Ranking Cession`);
    } else if (bankAudit?.holdsNotarialBond) {
      const bank = bankAudit.bankName || 'Primary Bank';
      mitigations.push(`General Notarial Bond registered by ${bank}. Inspect bond conditions prior to collateral registration`);
    } else {
      mitigations.push('General Cession of Book Debts (Unencumbered trade receivables)');
    }

    // C. Upfront Cash Deposit Requirement for Asset Finance / Lease
    if (input.proposedDepositAmount && input.proposedDepositAmount > 0) {
      const pct = input.proposedDepositPercent ? ` (${input.proposedDepositPercent}%)` : '';
      mitigations.push(`Upfront Cash Deposit of R ${input.proposedDepositAmount.toLocaleString()}${pct} required prior to booking agreement`);
    } else {
      mitigations.push('Upfront Cash Deposit buffer (10% - 20%) required prior to booking agreement execution');
    }

    if (dsoTrend) {
      mitigations.push('Reduce Debtor Sub-Limit Advance Rate from 80% to 60% due to DSO expansion drift');
    }
    if (isReconException) {
      mitigations.push('Require audited VAT returns and SARS statement of account to resolve Bank Recon variance');
    }

    proposedExceptionTerms = {
      maxRecommendedLimit: Math.min(recommendedLimit, 250000),
      maxRecommendedTermMonths: Math.min(recommendedTerm, 36),
      riskAdjustedInterestRate: Math.max(riskRate, 14.5),
      debtorAdvanceRateAdjustmentPercent: advanceRateAdj,
      mitigationRequirements: mitigations,
    };
  }

  return {
    rawBankScore: baseScore,
    adjustedFinalScore,
    scoreBand,
    stream1BankScore: {
      baseScore,
      passMinThreshold: passMinBankScore,
      minRequired: thresholds.minBankScore,
    },
    stream2VarianceAdjustment: {
      penaltyApplied: variancePenalty,
      returnedDebitVariance,
      details: varianceDetails,
    },
    stream3InternalConduct: {
      adjustmentPoints: conductPoints,
      isExistingClient: Boolean(input.isExistingClient),
      details: conductDetail,
    },
    stream4FinancialRatios: {
      ratios,
      exceptionCount: ratios.filter((r) => r.isException).length,
      affordabilityPass: dscrValue >= thresholds.debtServiceCoverageRatio.min,
    },
    trendAlerts,
    reconVariance: {
      turnoverVariancePercent: Number(turnoverVarPct.toFixed(1)),
      expensesVariancePercent: Number(expensesVarPct.toFixed(1)),
      isReconException,
      note: reconNote,
    },
    outcome,
    exceptionList: exceptions,
    proposedExceptionTerms,
  };
}
