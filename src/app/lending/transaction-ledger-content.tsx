'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Banknote, CheckCircle2, Clock3, Loader2, PlusCircle, Receipt, RefreshCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getClientSideAuthToken } from '@/firebase';

async function servicingRequest(payload: Record<string, unknown>) {
  const token = await getClientSideAuthToken();
  if (!token) throw new Error('Authentication required.');
  const response = await fetch('/api/lending/servicing', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.error || 'Servicing request failed.');
  return result;
}

export default function TransactionLedgerContent() {
  const { toast } = useToast();
  const [applications, setApplications] = useState<any[]>([]);
  const [applicationId, setApplicationId] = useState('');
  const [schedule, setSchedule] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [firstDueDate, setFirstDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [interestRate, setInterestRate] = useState('0');
  const [receiptInstallmentId, setReceiptInstallmentId] = useState('');
  const [receiptAmount, setReceiptAmount] = useState('');
  const [receiptReference, setReceiptReference] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'debit' | 'credit'>('debit');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReference, setAdjustmentReference] = useState('');
  const [adjustmentDescription, setAdjustmentDescription] = useState('');

  const loadApplications = useCallback(async () => {
    const token = await getClientSideAuthToken();
    if (!token) return;
    const response = await fetch('/api/lending/application', { headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load applications.');
    setApplications(result.data || []);
    if (!applicationId && result.data?.[0]?.id) setApplicationId(result.data[0].id);
  }, [applicationId]);

  const loadLedger = useCallback(async () => {
    if (!applicationId) return;
    const token = await getClientSideAuthToken();
    if (!token) return;
    const response = await fetch(`/api/lending/servicing?applicationId=${encodeURIComponent(applicationId)}`, { headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load repayment schedule.');
    setSchedule(result.data || []);
    setTransactions(result.transactions || []);
  }, [applicationId, applications]);

  useEffect(() => { loadApplications().catch((error) => toast({ variant: 'destructive', title: 'Load Error', description: error.message })).finally(() => setIsLoading(false)); }, [loadApplications, toast]);
  useEffect(() => { loadLedger().catch((error) => toast({ variant: 'destructive', title: 'Ledger Error', description: error.message })); }, [loadLedger, toast]);

  const selectedApplication = useMemo(() => applications.find((item) => item.id === applicationId), [applications, applicationId]);
  const generateSchedule = async () => {
    if (!selectedApplication) return;
    try {
      setIsWorking(true);
      await servicingRequest({ action: 'generate_schedule', applicationId, principal: Number(selectedApplication.approvalLimit || selectedApplication.amountRequested), annualInterestRate: Number(interestRate), termMonths: Number(selectedApplication.termMonths), firstDueDate });
      toast({ title: 'Repayment schedule generated', description: 'No installments were raised. Raise each installment when it becomes due.' });
      await loadLedger();
    } catch (error: any) { toast({ variant: 'destructive', title: 'Schedule Failed', description: error.message }); } finally { setIsWorking(false); }
  };

  const raiseInstallment = async (installmentId: string) => {
    try {
      setIsWorking(true);
      await servicingRequest({ action: 'raise_installment', applicationId, installmentId });
      toast({ title: 'Installment raised', description: 'The installment is now due and has been recorded as a debit.' });
      await loadLedger();
    } catch (error: any) { toast({ variant: 'destructive', title: 'Raise Failed', description: error.message }); } finally { setIsWorking(false); }
  };

  const postReceipt = async () => {
    try {
      setIsWorking(true);
      await servicingRequest({ action: 'post_receipt', applicationId, installmentId: receiptInstallmentId, amount: Number(receiptAmount), reference: receiptReference });
      toast({ title: 'Bank receipt posted' });
      setReceiptAmount(''); setReceiptReference('');
      await loadLedger();
    } catch (error: any) { toast({ variant: 'destructive', title: 'Receipt Failed', description: error.message }); } finally { setIsWorking(false); }
  };

  const postAdjustment = async () => {
    try {
      setIsWorking(true);
      await servicingRequest({ action: 'post_adjustment', applicationId, type: adjustmentType, amount: Number(adjustmentAmount), reference: adjustmentReference, description: adjustmentDescription });
      toast({ title: 'Adjustment journal posted' });
      setAdjustmentAmount(''); setAdjustmentReference(''); setAdjustmentDescription('');
      await loadLedger();
    } catch (error: any) { toast({ variant: 'destructive', title: 'Adjustment Failed', description: error.message }); } finally { setIsWorking(false); }
  };

  const closeFacility = async () => {
    try {
      setIsWorking(true);
      await servicingRequest({ action: 'close_facility', applicationId });
      toast({ title: 'Facility closed' });
      await loadApplications();
    } catch (error: any) { toast({ variant: 'destructive', title: 'Closure Failed', description: error.message }); } finally { setIsWorking(false); }
  };

  const arrears = useMemo(() => schedule.filter((installment) => installment.raisedAt && installment.status !== 'paid' && new Date(`${installment.dueDate}T23:59:59.999Z`) < new Date()), [schedule]);
  const ledgerBalance = useMemo(() => transactions.reduce((balance, transaction) => balance + (transaction.type === 'debit' ? Number(transaction.amount || 0) : -Number(transaction.amount || 0)), 0), [transactions]);

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" /></div>;
  return <div className="space-y-6">
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5 text-primary" /> Transaction Ledger</CardTitle><CardDescription>Raise installments from the repayment schedule. A raised installment becomes a debit and is now due.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-[1fr_160px_160px_auto] items-end">
          <div className="space-y-2"><Label>Facility application</Label><select className="flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={applicationId} onChange={(event) => setApplicationId(event.target.value)}><option value="">Select application</option>{applications.map((application) => <option key={application.id} value={application.id}>{application.companyName} · R {Number(application.amountRequested || 0).toLocaleString()}</option>)}</select></div>
          <div className="space-y-2"><Label>Annual rate %</Label><Input type="number" min="0" value={interestRate} onChange={(event) => setInterestRate(event.target.value)} /></div>
          <div className="space-y-2"><Label>First due date</Label><Input type="date" value={firstDueDate} onChange={(event) => setFirstDueDate(event.target.value)} /></div>
          <Button onClick={generateSchedule} disabled={!selectedApplication || isWorking}><PlusCircle className="mr-2 h-4 w-4" />Generate schedule</Button>
        </div>
      </CardContent>
    </Card>
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Card><CardHeader><CardTitle>Repayment schedule</CardTitle><CardDescription>Each row remains unraised until an operator raises it.</CardDescription></CardHeader><CardContent className="space-y-2">{schedule.length === 0 ? <p className="py-8 text-center text-muted-foreground">No repayment schedule generated.</p> : schedule.map((installment) => <div key={installment.id} className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-semibold">Installment {installment.installmentNumber} · R {Number(installment.amountDue || 0).toLocaleString()}</div><div className="text-sm text-muted-foreground">Due {installment.dueDate} · {installment.raisedAt ? `Raised ${new Date(installment.raisedAt).toLocaleDateString()}` : 'Not raised'}</div></div><div className="flex items-center gap-2">{installment.raisedAt ? <Badge variant="default"><CheckCircle2 className="mr-1 h-3 w-3" />Raised / now due</Badge> : <><Badge variant="outline"><Clock3 className="mr-1 h-3 w-3" />Scheduled</Badge><Button size="sm" onClick={() => raiseInstallment(installment.id)} disabled={isWorking}>Raise</Button></>}</div></div>)}</CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Banknote className="h-5 w-5 text-emerald-600" /> Ledger entries</CardTitle><CardDescription>Debit raises and credit receipts for the selected facility.</CardDescription></CardHeader><CardContent className="space-y-2">{transactions.length === 0 ? <p className="py-8 text-center text-muted-foreground">No transactions recorded yet.</p> : transactions.map((transaction) => <div key={transaction.id} className="flex items-center justify-between border-b py-2 text-sm"><div><div className="font-medium">{transaction.description}</div><div className="text-xs text-muted-foreground">{transaction.date} · {transaction.reference}</div></div><span className={transaction.type === 'credit' ? 'font-bold text-emerald-600' : 'font-bold text-destructive'}>{transaction.type === 'credit' ? '+' : '-'} R {Number(transaction.amount || 0).toLocaleString()}</span></div>)}</CardContent></Card>
    </div>
    <div className="grid gap-6 lg:grid-cols-3">
      <Card><CardHeader><CardTitle className="text-base">Arrears and balance</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><div className="flex justify-between"><span>Raised overdue</span><Badge variant={arrears.length ? 'destructive' : 'default'}>{arrears.length}</Badge></div><div className="flex justify-between"><span>Ledger balance due</span><strong>R {ledgerBalance.toLocaleString()}</strong></div><Button className="w-full mt-3" variant="outline" onClick={closeFacility} disabled={!applicationId || isWorking || ledgerBalance > 0.01}>Close settled facility</Button></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Post bank receipt</CardTitle><CardDescription>Allocate a receipt to a raised installment.</CardDescription></CardHeader><CardContent className="space-y-3"><select className="flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={receiptInstallmentId} onChange={(event) => setReceiptInstallmentId(event.target.value)}><option value="">Select raised installment</option>{schedule.filter((installment) => installment.raisedAt && Number(installment.amountPaid || 0) < Number(installment.amountDue || 0)).map((installment) => <option key={installment.id} value={installment.id}>#{installment.installmentNumber} · R {Number(installment.amountDue - (installment.amountPaid || 0)).toLocaleString()} due</option>)}</select><Input type="number" min="0.01" placeholder="Receipt amount" value={receiptAmount} onChange={(event) => setReceiptAmount(event.target.value)} /><Input placeholder="Bank reference" value={receiptReference} onChange={(event) => setReceiptReference(event.target.value)} /><Button className="w-full" onClick={postReceipt} disabled={isWorking || !receiptInstallmentId || !receiptAmount || !receiptReference}>Post receipt</Button></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Adjustment journal</CardTitle><CardDescription>Post a debit or credit correction.</CardDescription></CardHeader><CardContent className="space-y-3"><select className="flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={adjustmentType} onChange={(event) => setAdjustmentType(event.target.value as 'debit' | 'credit')}><option value="debit">Debit adjustment</option><option value="credit">Credit adjustment</option></select><Input type="number" min="0.01" placeholder="Amount" value={adjustmentAmount} onChange={(event) => setAdjustmentAmount(event.target.value)} /><Input placeholder="Journal reference" value={adjustmentReference} onChange={(event) => setAdjustmentReference(event.target.value)} /><Input placeholder="Description" value={adjustmentDescription} onChange={(event) => setAdjustmentDescription(event.target.value)} /><Button className="w-full" onClick={postAdjustment} disabled={isWorking || !adjustmentAmount || !adjustmentReference || !adjustmentDescription}>Post adjustment</Button></CardContent></Card>
    </div>
  </div>;
}
