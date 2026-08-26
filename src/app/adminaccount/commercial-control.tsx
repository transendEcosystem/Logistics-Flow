'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Loader2, Save, Target, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getClientSideAuthToken } from '@/firebase';
import { useConfig } from '@/hooks/use-config';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';

const defaults = {
  directSignupsTarget: 25,
  referralsPerPaidMember: 2,
  referralConversionPercent: 15,
  intelligenceAdoptionPercent: 60,
  transactionAdoptionPercent: 35,
  annualMembershipAdoptionPercent: 25,
  annualMembershipDiscountPercent: 10,
  intelligenceMonthlyChurnPercent: 3,
  transactionMonthlyChurnPercent: 2,
  averageIntelligenceRevenue: 500,
  averageTransactionRevenue: 250,
  productAdoptionPercent: 10,
  averageRetainedProductRevenue: 100,
  supplierRewardEligibleSpend: 100000,
  averageNegotiatedSupplierDiscountPercent: 10,
  bronzeMixPercent: 40,
  silverMixPercent: 30,
  goldMixPercent: 20,
  platinumMixPercent: 10,
  financeConclusionsTarget: 2,
  financeAverageDealValue: 500000,
  financeOriginationCommissionPercent: 1,
  loadConclusionsTarget: 5,
  loadAverageDealValue: 25000,
  loadBrokerageCommissionPercent: 3,
  buySellConclusionsTarget: 1,
  buySellAverageDealValue: 350000,
  buySellCommissionPercent: 2,
  referralCommissionPercent: 30,
  openingInvestment: 0,
  operatingBudget: 75000,
};

const toNumber = (value: string) => Math.max(0, Number(value) || 0);
const inputUnit = (key: string) => key.includes('Percent') || key.includes('Mix') || key.includes('Adoption') || key.includes('Conversion') ? '%' : key.includes('Revenue') || key.includes('Commission') || key.includes('Discount') || key.includes('Budget') || key.includes('Spend') || key.includes('DealValue') ? 'R' : '';

export default function CommercialControl({ actuals, accruedCommissions, paidMembers }: { actuals: any; accruedCommissions: number; paidMembers: number }) {
  const { toast } = useToast();
  const { data: savedPlan, isLoading } = useConfig<any>('commercialPlan');
  const [plan, setPlan] = useState(defaults);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (savedPlan) setPlan({ ...defaults, ...savedPlan }); }, [savedPlan]);

  const roadmap = useMemo(() => {
    const directPaid = plan.directSignupsTarget * Math.max(plan.intelligenceAdoptionPercent, plan.transactionAdoptionPercent) / 100;
    const referralOpportunities = (paidMembers + directPaid) * plan.referralsPerPaidMember;
    const referralSignups = referralOpportunities * plan.referralConversionPercent / 100;
    const intelligenceActivations = (plan.directSignupsTarget + referralSignups) * plan.intelligenceAdoptionPercent / 100;
    const transactionActivations = (plan.directSignupsTarget + referralSignups) * plan.transactionAdoptionPercent / 100;
    const productConversions = (paidMembers + directPaid + referralSignups) * plan.productAdoptionPercent / 100;
    const weightedCashbackPercent = (plan.bronzeMixPercent * 20 + plan.silverMixPercent * 40 + plan.goldMixPercent * 60 + plan.platinumMixPercent * 80) / 100;
    const supplierDiscountValue = plan.supplierRewardEligibleSpend * plan.averageNegotiatedSupplierDiscountPercent / 100;
    const supplierCashback = supplierDiscountValue * weightedCashbackPercent / 100;
    const supplierRewardRetention = supplierDiscountValue - supplierCashback;
    const financeOriginationCommission = plan.financeConclusionsTarget * plan.financeAverageDealValue * plan.financeOriginationCommissionPercent / 100;
    const loadBrokerageCommission = plan.loadConclusionsTarget * plan.loadAverageDealValue * plan.loadBrokerageCommissionPercent / 100;
    const buySellBrokerageCommission = plan.buySellConclusionsTarget * plan.buySellAverageDealValue * plan.buySellCommissionPercent / 100;
    const brokerageCommission = financeOriginationCommission + loadBrokerageCommission + buySellBrokerageCommission;
    const intelligenceRevenue = intelligenceActivations * plan.averageIntelligenceRevenue;
    const transactionRevenue = transactionActivations * plan.averageTransactionRevenue;
    const productRevenue = productConversions * plan.averageRetainedProductRevenue;
    const referralCommissionProvision = referralSignups * (plan.intelligenceAdoptionPercent / 100) * plan.averageIntelligenceRevenue * plan.referralCommissionPercent / 100;
    return { directPaid, referralOpportunities, referralSignups, intelligenceActivations, transactionActivations, productConversions, weightedCashbackPercent, supplierDiscountValue, supplierCashback, intelligenceRevenue, transactionRevenue, productRevenue, supplierRewardRetention, financeOriginationCommission, loadBrokerageCommission, buySellBrokerageCommission, brokerageCommission, referralCommissionProvision };
  }, [plan, paidMembers]);
  const rows = [
    { label: 'Intelligence Revenue', planned: roadmap.intelligenceRevenue, actual: Number(actuals?.intelligence || 0), note: 'New Intelligence activations from direct and referred signups' },
    { label: 'Transaction Revenue', planned: roadmap.transactionRevenue, actual: Number(actuals?.transaction || 0), note: 'New Transaction activations from direct and referred signups' },
    { label: 'Product Revenue', planned: roadmap.productRevenue, actual: Number(actuals?.products || 0), note: 'Retained margin from paid-member product adoption' },
    { label: 'Supplier Reward Retention', planned: roadmap.supplierRewardRetention, actual: Number(actuals?.supplierRewardRetention || 0), note: `Negotiated supplier discount less planned weighted cashback of ${roadmap.weightedCashbackPercent.toFixed(0)}%` },
    { label: 'Finance Origination Commission', planned: roadmap.financeOriginationCommission, actual: Number(actuals?.financeOriginationCommission || 0), note: 'Retained finance conclusion fee' },
    { label: 'Loads Brokerage Commission', planned: roadmap.loadBrokerageCommission, actual: Number(actuals?.loadBrokerageCommission || 0), note: 'Retained load conclusion fee' },
    { label: 'Buy & Sell Brokerage Commission', planned: roadmap.buySellBrokerageCommission, actual: Number(actuals?.buySellBrokerageCommission || 0), note: 'Retained asset conclusion fee' },
  ];
  const plannedRevenue = rows.reduce((sum, row) => sum + row.planned, 0);
  const actualRevenue = rows.reduce((sum, row) => sum + row.actual, 0) + Number(actuals?.unclassified || 0);
  const plannedContribution = plannedRevenue;
  const actualContribution = actualRevenue;
  const plannedNetContribution = plannedRevenue - plan.operatingBudget - roadmap.referralCommissionProvision;
  const actualNetContribution = actualRevenue - plan.operatingBudget - accruedCommissions;
  const twelveMonthForecast = useMemo(() => {
    const rows: any[] = [];
    const intelligenceAdoption = Math.min(1, plan.intelligenceAdoptionPercent / 100);
    const transactionAdoption = Math.min(1, plan.transactionAdoptionPercent / 100);
    const paidConversion = intelligenceAdoption + transactionAdoption - intelligenceAdoption * transactionAdoption;
    const referralConversion = Math.min(1, plan.referralConversionPercent / 100);
    const referralsPerPaidMember = Math.min(10, Math.max(0, plan.referralsPerPaidMember));
    let activeMonthlyPaidMembers = paidMembers;
    let activeAnnualPaidMembers = 0;
    let activeMonthlyIntelligence = 0;
    let activeMonthlyTransaction = 0;
    let activeAnnualIntelligence = 0;
    let activeAnnualTransaction = 0;
    let cumulativeContribution = -plan.openingInvestment;
    const annualShare = plan.annualMembershipAdoptionPercent / 100;
    const intelligenceAnnualPrice = plan.averageIntelligenceRevenue * 12 * (1 - plan.annualMembershipDiscountPercent / 100);
    const transactionAnnualPrice = plan.averageTransactionRevenue * 12 * (1 - plan.annualMembershipDiscountPercent / 100);
    for (let month = 1; month <= 12; month += 1) {
      const activePaidMembers = activeMonthlyPaidMembers + activeAnnualPaidMembers;
      // A monthly model can only use the paid base at the start of the month. New members become referrers next month.
      const referralOpportunities = activePaidMembers * referralsPerPaidMember;
      const unboundedReferralSignups = referralOpportunities * referralConversion;
      const referralSignups = Math.min(unboundedReferralSignups, activePaidMembers);
      const registrations = plan.directSignupsTarget + referralSignups;
      const newPaidMembers = registrations * paidConversion;
      const intelligenceActivations = registrations * intelligenceAdoption;
      const transactionActivations = registrations * transactionAdoption;
      const newAnnualIntelligence = intelligenceActivations * annualShare;
      const newAnnualTransaction = transactionActivations * annualShare;
      activeMonthlyIntelligence = activeMonthlyIntelligence * (1 - plan.intelligenceMonthlyChurnPercent / 100) + intelligenceActivations - newAnnualIntelligence;
      activeMonthlyTransaction = activeMonthlyTransaction * (1 - plan.transactionMonthlyChurnPercent / 100) + transactionActivations - newAnnualTransaction;
      activeAnnualIntelligence += newAnnualIntelligence;
      activeAnnualTransaction += newAnnualTransaction;
      activeMonthlyPaidMembers = activeMonthlyPaidMembers * (1 - Math.min(plan.intelligenceMonthlyChurnPercent, plan.transactionMonthlyChurnPercent) / 100) + newPaidMembers * (1 - annualShare);
      activeAnnualPaidMembers += newPaidMembers * annualShare;
      const closingPaidMembers = activeMonthlyPaidMembers + activeAnnualPaidMembers;
      const intelligenceRevenue = activeMonthlyIntelligence * plan.averageIntelligenceRevenue + newAnnualIntelligence * intelligenceAnnualPrice;
      const transactionRevenue = activeMonthlyTransaction * plan.averageTransactionRevenue + newAnnualTransaction * transactionAnnualPrice;
      const productRevenue = (activePaidMembers * plan.productAdoptionPercent / 100) * plan.averageRetainedProductRevenue;
      const supplierDiscount = plan.supplierRewardEligibleSpend * plan.averageNegotiatedSupplierDiscountPercent / 100;
      const supplierRetention = supplierDiscount * (1 - roadmap.weightedCashbackPercent / 100);
      const brokerage = roadmap.brokerageCommission;
      const referralWalletProvision = referralSignups * plan.intelligenceAdoptionPercent / 100 * plan.averageIntelligenceRevenue * plan.referralCommissionPercent / 100;
      const revenueContribution = intelligenceRevenue + transactionRevenue + productRevenue + supplierRetention + brokerage;
      const netContribution = revenueContribution - plan.operatingBudget - referralWalletProvision;
      cumulativeContribution += netContribution;
      rows.push({ month, directSignups: plan.directSignupsTarget, referralSignups, registrations, newPaidMembers, activePaidMembers: closingPaidMembers, intelligenceMembers: activeMonthlyIntelligence + activeAnnualIntelligence, transactionMembers: activeMonthlyTransaction + activeAnnualTransaction, revenueContribution, deduction: plan.operatingBudget + referralWalletProvision, netContribution, cumulativeContribution });
    }
    return rows;
  }, [plan, paidMembers, roadmap.weightedCashbackPercent, roadmap.brokerageCommission]);
  const breakEvenMonth = twelveMonthForecast.find(row => row.cumulativeContribution >= 0)?.month || null;

  const save = async () => {
    setSaving(true);
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error('Authentication failed.');
      const response = await fetch('/api/updateConfigDoc', {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: 'configuration/commercialPlan', data: { ...plan, updatedAt: { _methodName: 'serverTimestamp' } } }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to save commercial plan.');
      toast({ title: 'Commercial plan saved', description: 'Roadmap targets and operating budget are now the baseline for actuals.' });
    } catch (error: any) { toast({ variant: 'destructive', title: 'Save failed', description: error.message }); }
    finally { setSaving(false); }
  };

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  const inputs: Array<[string, string]> = [
    ['directSignupsTarget', 'Direct signups target'], ['referralsPerPaidMember', 'Referrals / paid member'], ['referralConversionPercent', 'Referral conversion'], ['intelligenceAdoptionPercent', 'Intelligence adoption'], ['transactionAdoptionPercent', 'Transaction adoption'], ['annualMembershipAdoptionPercent', 'Annual membership adoption'], ['annualMembershipDiscountPercent', 'Blended annual discount'], ['intelligenceMonthlyChurnPercent', 'Intelligence monthly churn'], ['transactionMonthlyChurnPercent', 'Transaction monthly churn'], ['averageIntelligenceRevenue', 'Avg Intelligence revenue'], ['averageTransactionRevenue', 'Avg Transaction revenue'], ['productAdoptionPercent', 'Product adoption'], ['averageRetainedProductRevenue', 'Retained revenue / product conversion'], ['supplierRewardEligibleSpend', 'Supplier reward eligible spend'], ['averageNegotiatedSupplierDiscountPercent', 'Avg negotiated supplier discount'], ['bronzeMixPercent', 'Bronze mix'], ['silverMixPercent', 'Silver mix'], ['goldMixPercent', 'Gold mix'], ['platinumMixPercent', 'Platinum mix'], ['financeConclusionsTarget', 'Finance conclusions'], ['financeAverageDealValue', 'Avg finance deal value'], ['financeOriginationCommissionPercent', 'Finance origination commission'], ['loadConclusionsTarget', 'Load conclusions'], ['loadAverageDealValue', 'Avg load deal value'], ['loadBrokerageCommissionPercent', 'Loads brokerage commission'], ['buySellConclusionsTarget', 'Buy & Sell conclusions'], ['buySellAverageDealValue', 'Avg Buy & Sell deal value'], ['buySellCommissionPercent', 'Buy & Sell commission'], ['referralCommissionPercent', 'Referral commission'], ['openingInvestment', 'Opening investment / cash deficit'], ['operatingBudget', 'Operating budget'],
  ];
  const varianceClass = (value: number) => value < 0 ? 'text-destructive' : 'text-emerald-600';
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" />Sales Roadmap Inputs</CardTitle><CardDescription>Set the controllable monthly activities. Commercial revenue, referral liability and the budget baseline are calculated automatically from these inputs.</CardDescription></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {inputs.map(([key, label]) => <div key={key} className="space-y-2"><Label>{label}{inputUnit(key) ? ` (${inputUnit(key)})` : ''}</Label><Input type="number" value={(plan as any)[key]} onChange={event => setPlan(current => ({ ...current, [key]: toNumber(event.target.value) }))} /></div>)}
          </div>
          <div className="flex flex-wrap gap-4 rounded-lg bg-muted/40 p-4 text-sm"><span><strong>{paidMembers}</strong> current paid members</span><span><strong>{roadmap.referralOpportunities.toFixed(0)}</strong> referral opportunities</span><span><strong>{roadmap.referralSignups.toFixed(0)}</strong> referral signups</span><span><strong>{roadmap.intelligenceActivations.toFixed(0)}</strong> Intelligence activations</span><span><strong>{roadmap.transactionActivations.toFixed(0)}</strong> Transaction activations</span><span><strong>{formatCurrency(roadmap.supplierDiscountValue)}</strong> negotiated supplier discount value</span><span><strong>{formatCurrency(roadmap.supplierCashback)}</strong> planned member cashback</span><span><strong>{formatCurrency(roadmap.referralCommissionProvision)}</strong> planned wallet commission provision</span></div>
          <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save Sales Roadmap</Button>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardDescription>Planned Revenue</CardDescription><CardTitle>{formatCurrency(plannedRevenue)}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">Current roadmap period</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Actual Revenue</CardDescription><CardTitle>{formatCurrency(actualRevenue)}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">Live recorded platform and commission evidence</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Operating Budget + Referral Return</CardDescription><CardTitle>{formatCurrency(plan.operatingBudget + accruedCommissions)}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">Actual deductions tracked outside revenue</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Net Contribution</CardDescription><CardTitle>{formatCurrency(Math.max(0, actualNetContribution))}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">Revenue less actual budget and accrued network return</p></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />Actual vs Planned Revenue</CardTitle><CardDescription>Only variance may be negative. Revenue contribution is the sum of the revenue lines above.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Revenue Stream</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Plan</TableHead><TableHead className="text-right">Actual</TableHead><TableHead className="text-right">Variance</TableHead></TableRow></TableHeader><TableBody>
        {rows.map(row => <TableRow key={row.label}><TableCell className="font-medium">{row.label}</TableCell><TableCell className="text-muted-foreground text-sm">{row.note}</TableCell><TableCell className="text-right">{formatCurrency(Math.max(0, row.planned))}</TableCell><TableCell className="text-right">{formatCurrency(Math.max(0, row.actual))}</TableCell><TableCell className={`text-right font-medium ${varianceClass(row.actual - row.planned)}`}>{formatCurrency(row.actual - row.planned)}</TableCell></TableRow>)}
        <TableRow className="bg-muted/40"><TableCell colSpan={2} className="font-semibold">Revenue Contribution (sum of lines above)</TableCell><TableCell className="text-right font-semibold">{formatCurrency(Math.max(0, plannedContribution))}</TableCell><TableCell className="text-right font-semibold">{formatCurrency(Math.max(0, actualContribution))}</TableCell><TableCell className={`text-right font-semibold ${varianceClass(actualContribution - plannedContribution)}`}>{formatCurrency(actualContribution - plannedContribution)}</TableCell></TableRow>
        <TableRow>
          <TableCell colSpan={2} className="text-muted-foreground">Less operating budget and referral-wallet return</TableCell>
          <TableCell className="text-right">{formatCurrency(Math.max(0, plan.operatingBudget + roadmap.referralCommissionProvision))}</TableCell>
          <TableCell className="text-right">{formatCurrency(Math.max(0, plan.operatingBudget + accruedCommissions))}</TableCell>
          <TableCell className={varianceClass(actualNetContribution - plannedNetContribution)}>{formatCurrency(actualNetContribution - plannedNetContribution)}</TableCell>
        </TableRow>
        <TableRow className="bg-primary/5"><TableCell colSpan={2} className="font-semibold">Net Contribution</TableCell><TableCell className="text-right font-semibold">{formatCurrency(Math.max(0, plannedNetContribution))}</TableCell><TableCell className="text-right font-semibold">{formatCurrency(Math.max(0, actualNetContribution))}</TableCell><TableCell className={`text-right font-semibold ${varianceClass(actualNetContribution - plannedNetContribution)}`}>{formatCurrency(actualNetContribution - plannedNetContribution)}</TableCell></TableRow>
      </TableBody></Table></CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" />12-Month Cohort Forecast</CardTitle><CardDescription>Direct and referral registrations are converted into paid members through the two membership adoption rates. New paid members begin generating referrals in the following month; annual members pay discounted revenue upfront and are excluded from monthly churn during this view.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid gap-4 md:grid-cols-3"><div className="rounded-lg bg-muted/40 p-4"><p className="text-xs text-muted-foreground">Month 12 Active Paid Members</p><p className="text-2xl font-black">{twelveMonthForecast[11]?.activePaidMembers.toFixed(0) || 0}</p></div><div className="rounded-lg bg-muted/40 p-4"><p className="text-xs text-muted-foreground">Month 12 Cumulative Contribution</p><p className={`text-2xl font-black ${(twelveMonthForecast[11]?.cumulativeContribution || 0) < 0 ? 'text-destructive' : 'text-emerald-600'}`}>{formatCurrency(twelveMonthForecast[11]?.cumulativeContribution || 0)}</p></div><div className="rounded-lg bg-muted/40 p-4"><p className="text-xs text-muted-foreground">Break-even Month</p><p className="text-2xl font-black">{breakEvenMonth ? `Month ${breakEvenMonth}` : 'Beyond Month 12'}</p></div></div><Table><TableHeader><TableRow><TableHead>Month</TableHead><TableHead className="text-right">Direct Registrations</TableHead><TableHead className="text-right">Referral Registrations</TableHead><TableHead className="text-right">New Paid</TableHead><TableHead className="text-right">Active Paid</TableHead><TableHead className="text-right">Intelligence</TableHead><TableHead className="text-right">Transaction</TableHead><TableHead className="text-right">Revenue Contribution</TableHead><TableHead className="text-right">Deductions</TableHead><TableHead className="text-right">Cumulative Contribution</TableHead></TableRow></TableHeader><TableBody>{twelveMonthForecast.map(row => <TableRow key={row.month}><TableCell>Month {row.month}</TableCell><TableCell className="text-right">{row.directSignups.toFixed(0)}</TableCell><TableCell className="text-right">{row.referralSignups.toFixed(0)}</TableCell><TableCell className="text-right">{row.newPaidMembers.toFixed(0)}</TableCell><TableCell className="text-right">{row.activePaidMembers.toFixed(0)}</TableCell><TableCell className="text-right">{row.intelligenceMembers.toFixed(0)}</TableCell><TableCell className="text-right">{row.transactionMembers.toFixed(0)}</TableCell><TableCell className="text-right">{formatCurrency(Math.max(0, row.revenueContribution))}</TableCell><TableCell className="text-right">{formatCurrency(Math.max(0, row.deduction))}</TableCell><TableCell className={row.cumulativeContribution < 0 ? 'text-right text-destructive' : 'text-right text-emerald-600'}>{formatCurrency(row.cumulativeContribution)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
      <Card className="bg-muted/30"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Wallet className="h-5 w-5 text-primary" />Management Chain</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Sales roadmap targets drive the Intelligence, Transaction, Product, supplier reward-retention and brokerage/origination lines. The operating budget determines required contribution. Supplier rewards are a negotiated discount split: cashback goes to the member wallet by loyalty tier and Logistics Flow retains at least 20%. Brokerage and origination fees are retained platform commission for work performed and are not included in network-owner sharing. Live Commercials data provides actuals, while the commission ledger provides Nathan’s and other network owners’ accrued and paid return. Harvested profiles and engagement evidence remain the conversion source for this plan.</CardContent></Card>
    </div>
  );
}
