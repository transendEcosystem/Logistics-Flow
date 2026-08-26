'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronDown, ChevronRight, CircleDollarSign, Loader2, RefreshCcw, Send, Users } from 'lucide-react';
import { getClientSideAuthToken } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDateSafe } from '@/lib/utils';
import CommercialControl from './commercial-control';

const benefitLabel = (type?: string) => ({
  membership_revenue_share: 'Benefit 1: Membership',
  transaction_revenue_share: 'Benefit 2: Transaction',
  incentives_product_revenue_share: 'Benefit 3: Incentives Product',
}[type || ''] || 'Network Revenue');

export default function Commercials() {
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [paymentReference, setPaymentReference] = useState('');
  const [isSettling, setIsSettling] = useState(false);
  const [expandedOwners, setExpandedOwners] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error('Authentication failed.');
      const response = await fetch('/api/commercials', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load commercial data.');
      setData(result);
      setSelectedPaths([]);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Commercial Reporting Failed', description: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const dueEntries = useMemo(() => (data?.commissions || []).filter((entry: any) => entry.status === 'accrued' && entry.payoutEligibleAt && new Date(entry.payoutEligibleAt) <= new Date()), [data]);
  const selectedTotal = useMemo(() => dueEntries.filter((entry: any) => selectedPaths.includes(entry.path)).reduce((sum: number, entry: any) => sum + Number(entry.commissionAmount || 0), 0), [dueEntries, selectedPaths]);

  const toggleEntry = (path: string, checked: boolean) => setSelectedPaths(current => checked ? [...current, path] : current.filter(value => value !== path));
  const selectAllDue = (checked: boolean) => setSelectedPaths(checked ? dueEntries.map((entry: any) => entry.path) : []);
  const toggleOwner = (companyId: string) => setExpandedOwners(current => current.includes(companyId) ? current.filter(id => id !== companyId) : [...current, companyId]);

  const settleSelected = async () => {
    setIsSettling(true);
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error('Authentication failed.');
      const response = await fetch('/api/commercials', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ commissionPaths: selectedPaths, paymentReference }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to complete the payment run.');
      toast({ title: 'Network Wallet Credits Posted', description: `${formatCurrency(result.total)} credited to network-owner wallets under ${paymentReference}.` });
      setPaymentReference('');
      await loadData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Payment Run Failed', description: error.message });
    } finally {
      setIsSettling(false);
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  const summary = data?.summary || {};

  return <div className="space-y-6 text-left">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="flex items-center gap-2 text-2xl font-semibold"><CircleDollarSign className="h-7 w-7 text-primary" /> Commercials</h1><p className="text-sm text-muted-foreground">Revenue, network-owner performance, commission accruals, and monthly settlement.</p></div>
      <Button variant="outline" onClick={loadData}><RefreshCcw className="mr-2 h-4 w-4" />Refresh</Button>
    </div>

    <div className="grid gap-4 md:grid-cols-4">
      <Card><CardHeader className="pb-2"><CardDescription>Members</CardDescription><CardTitle>{summary.members || 0}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">{summary.paidMembers || 0} paid members</p></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardDescription>Platform Revenue</CardDescription><CardTitle>{formatCurrency(Number(summary.platformRevenue || 0))}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">Recorded membership and mall revenue</p></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardDescription>Accrued Seller Commissions</CardDescription><CardTitle>{formatCurrency(Number(summary.accruedCommissions || 0))}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">Not yet settled</p></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardDescription>Due For Payment</CardDescription><CardTitle>{formatCurrency(Number(summary.dueCommissions || 0))}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">Eligible on or before today</p></CardContent></Card>
    </div>

    <Tabs defaultValue="control">
      <TabsList className="flex flex-wrap h-auto"><TabsTrigger value="control">Commercial Control</TabsTrigger><TabsTrigger value="performance">Network Performance</TabsTrigger><TabsTrigger value="ledger">Commission Ledger</TabsTrigger><TabsTrigger value="payouts">Monthly Payout Run</TabsTrigger></TabsList>
      <TabsContent value="control" className="pt-4"><CommercialControl actuals={summary.actualRevenue} accruedCommissions={Number(summary.accruedCommissions || 0)} paidMembers={Number(summary.paidMembers || 0)} /></TabsContent>
      <TabsContent value="performance" className="pt-4"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Network Owner Performance</CardTitle><CardDescription>Expand a network owner to review their actual leads and referred members.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Network Owner</TableHead><TableHead className="text-right">Leads</TableHead><TableHead className="text-right">Registered</TableHead><TableHead className="text-right">Paid</TableHead><TableHead className="text-right">Membership Revenue</TableHead><TableHead className="text-right">Accrued</TableHead><TableHead className="text-right">Due</TableHead></TableRow></TableHeader><TableBody>{data?.networkOwners?.length ? data.networkOwners.map((owner: any) => <><TableRow key={owner.companyId} className="cursor-pointer hover:bg-muted/40" onClick={() => toggleOwner(owner.companyId)}><TableCell className="font-medium"><div className="flex items-center gap-2">{expandedOwners.includes(owner.companyId) ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}<div><p>{owner.ownerName}</p><p className="text-xs font-normal text-muted-foreground">{owner.companyName}{owner.ownerEmail ? ` · ${owner.ownerEmail}` : ''}</p></div></div></TableCell><TableCell className="text-right">{owner.leads}</TableCell><TableCell className="text-right">{owner.registrations}</TableCell><TableCell className="text-right">{owner.paidMembers}</TableCell><TableCell className="text-right">{formatCurrency(owner.membershipRevenue)}</TableCell><TableCell className="text-right">{formatCurrency(owner.accrued)}</TableCell><TableCell className="text-right">{formatCurrency(owner.due)}</TableCell></TableRow>{expandedOwners.includes(owner.companyId) && <TableRow key={`${owner.companyId}-network`}><TableCell colSpan={7} className="bg-muted/20 p-4"><Table><TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Company / Lead</TableHead><TableHead>Contact</TableHead><TableHead>Status</TableHead><TableHead>Membership</TableHead><TableHead className="text-right">Commission Earned</TableHead></TableRow></TableHeader><TableBody>{owner.network?.length ? owner.network.map((entry: any) => <TableRow key={`${entry.kind}-${entry.id}`}><TableCell><Badge variant={entry.kind === 'member' ? 'default' : 'secondary'} className="capitalize">{entry.kind}</Badge></TableCell><TableCell>{entry.companyName}</TableCell><TableCell><div>{entry.contactName || '-'}</div><div className="text-xs text-muted-foreground">{entry.email || ''}</div></TableCell><TableCell className="capitalize">{entry.status}</TableCell><TableCell className="capitalize">{entry.membership || '-'}</TableCell><TableCell className="text-right">{entry.kind === 'member' ? formatCurrency(Number(entry.commission || 0)) : '-'}</TableCell></TableRow>) : <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">This owner has no recorded network contacts yet.</TableCell></TableRow>}</TableBody></Table></TableCell></TableRow>}</>) : <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No network-owner performance data yet.</TableCell></TableRow>}</TableBody></Table></CardContent></Card></TabsContent>
      <TabsContent value="ledger" className="pt-4"><Card><CardHeader><CardTitle>Commission Ledger</CardTitle><CardDescription>Every accrued, paid, or reversed network-owner commission.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Status</TableHead><TableHead>Benefit</TableHead><TableHead>Referred Member</TableHead><TableHead>Earned</TableHead><TableHead>Due</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader><TableBody>{data?.commissions?.length ? data.commissions.map((entry: any) => <TableRow key={entry.path}><TableCell><Badge variant={entry.status === 'paid' ? 'default' : 'secondary'} className="capitalize">{entry.status}</Badge></TableCell><TableCell>{benefitLabel(entry.type)}</TableCell><TableCell>{entry.referredCompanyName || '-'}</TableCell><TableCell>{formatDateSafe(entry.earnedAt, 'dd MMM yyyy')}</TableCell><TableCell>{formatDateSafe(entry.payoutEligibleAt, 'dd MMM yyyy')}</TableCell><TableCell className="text-right font-medium">{formatCurrency(Number(entry.commissionAmount || 0))}</TableCell></TableRow>) : <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No commissions have accrued yet.</TableCell></TableRow>}</TableBody></Table></CardContent></Card></TabsContent>
      <TabsContent value="payouts" className="pt-4"><Card><CardHeader><CardTitle>Monthly Wallet Credit Run</CardTitle><CardDescription>On or after the 7th, settle accrued referral commission by crediting each eligible network owner&apos;s in-app wallet. Every credit receives an auditable run and settlement reference.</CardDescription></CardHeader><CardContent className="space-y-5"><div className="flex flex-wrap items-end gap-4"><div className="min-w-72 space-y-2"><Label>Settlement Reference</Label><Input value={paymentReference} onChange={event => setPaymentReference(event.target.value)} placeholder="e.g. COMM-2026-08" /></div><Button onClick={settleSelected} disabled={isSettling || !selectedPaths.length || !paymentReference.trim()}><Send className="mr-2 h-4 w-4" />{isSettling ? 'Crediting...' : `Credit ${formatCurrency(selectedTotal)} to Wallets`}</Button></div><Table><TableHeader><TableRow><TableHead><Checkbox checked={dueEntries.length > 0 && selectedPaths.length === dueEntries.length} onCheckedChange={checked => selectAllDue(Boolean(checked))} /></TableHead><TableHead>Network Owner</TableHead><TableHead>Benefit</TableHead><TableHead>Referred Member</TableHead><TableHead>Due</TableHead><TableHead className="text-right">Commission</TableHead></TableRow></TableHeader><TableBody>{dueEntries.length ? dueEntries.map((entry: any) => <TableRow key={entry.path}><TableCell><Checkbox checked={selectedPaths.includes(entry.path)} onCheckedChange={checked => toggleEntry(entry.path, Boolean(checked))} /></TableCell><TableCell>{entry.ownerCompanyId}</TableCell><TableCell>{benefitLabel(entry.type)}</TableCell><TableCell>{entry.referredCompanyName || '-'}</TableCell><TableCell>{formatDateSafe(entry.payoutEligibleAt, 'dd MMM yyyy')}</TableCell><TableCell className="text-right font-medium">{formatCurrency(Number(entry.commissionAmount || 0))}</TableCell></TableRow>) : <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No commissions are due for settlement today.</TableCell></TableRow>}</TableBody></Table></CardContent></Card></TabsContent>
    </Tabs>
  </div>;
}