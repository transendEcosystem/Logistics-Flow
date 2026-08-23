'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Banknote, CircleDollarSign, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getClientSideAuthToken, useUser } from '@/firebase';
import { formatCurrency } from '@/lib/utils';

type CommissionEntry = {
  id: string;
  referredCompanyName?: string;
  membershipId?: string;
  grossAmount?: number;
  retainedPlatformRevenue?: number;
  commissionRate?: number;
  commissionAmount?: number;
  earnedAt?: string;
  payoutEligibleAt?: string;
  type?: string;
  status?: string;
};

export default function EarningsContent() {
  const { user, isUserLoading } = useUser();
  const [entries, setEntries] = useState<CommissionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEarnings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error('You must be signed in to view earnings.');
      const response = await fetch('/api/getEarnings', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load earnings.');
      setEntries(result.entries || []);
    } catch (loadError: any) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isUserLoading && user) loadEarnings();
  }, [isUserLoading, loadEarnings, user]);

  const monthlyEarnings = useMemo(() => {
    const totals = new Map<string, number>();
    for (const entry of entries) {
      const date = entry.earnedAt ? new Date(entry.earnedAt) : null;
      if (!date || Number.isNaN(date.getTime())) continue;
      const month = new Intl.DateTimeFormat('en-ZA', { month: 'long', year: 'numeric' }).format(date);
      totals.set(month, (totals.get(month) || 0) + Number(entry.commissionAmount || 0));
    }
    return Array.from(totals, ([month, amount]) => ({ month, amount }));
  }, [entries]);

  const currentMonthEarnings = monthlyEarnings[0]?.amount || 0;
  const totalEarned = entries.reduce((total, entry) => total + Number(entry.commissionAmount || 0), 0);
  const eligibleForPayment = entries.filter(entry => entry.payoutEligibleAt && new Date(entry.payoutEligibleAt) <= new Date()).reduce((total, entry) => total + Number(entry.commissionAmount || 0), 0);
  const benefitLabel = (type?: string) => ({
    membership_revenue_share: 'Benefit 1: Membership Revenue',
    transaction_revenue_share: 'Benefit 2: Transaction Revenue',
    incentives_product_revenue_share: 'Benefit 3: Incentives Products',
  }[type || ''] || 'Network Revenue');

  if (isLoading || isUserLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  if (error) {
    return <Card><CardContent className="py-8"><p className="text-destructive">{error}</p><Button className="mt-4" onClick={loadEarnings}>Try Again</Button></CardContent></Card>;
  }

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold"><CircleDollarSign className="h-7 w-7 text-primary" /> Network Earnings</h1>
          <p className="text-sm text-muted-foreground">Accrued revenue shares from members and sales in your network.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardDescription>This Month</CardDescription><CardTitle>{formatCurrency(currentMonthEarnings)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Total Earned</CardDescription><CardTitle>{formatCurrency(totalEarned)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Eligible for Payment</CardDescription><CardTitle>{formatCurrency(eligibleForPayment)}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">Payments are scheduled by the 7th of the following month.</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Banknote className="h-5 w-5" /> Monthly Earnings</CardTitle><CardDescription>Accrued amounts are scheduled for payment by the 7th of the following month.</CardDescription></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Month</TableHead><TableHead className="text-right">Earned</TableHead></TableRow></TableHeader>
            <TableBody>
              {monthlyEarnings.length ? monthlyEarnings.map(row => <TableRow key={row.month}><TableCell>{row.month}</TableCell><TableCell className="text-right font-medium">{formatCurrency(row.amount)}</TableCell></TableRow>) : <TableRow><TableCell colSpan={2} className="py-8 text-center text-muted-foreground">No confirmed membership commissions yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Commission Activity</CardTitle><CardDescription>Each entry is tied to revenue generated by a referred member.</CardDescription></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Benefit</TableHead><TableHead>Referred Member</TableHead><TableHead className="text-right">Rate</TableHead><TableHead>Payment Due</TableHead><TableHead className="text-right">Commission</TableHead></TableRow></TableHeader>
            <TableBody>
              {entries.length ? entries.map(entry => <TableRow key={entry.id}><TableCell>{entry.earnedAt ? new Date(entry.earnedAt).toLocaleDateString('en-ZA') : '-'}</TableCell><TableCell>{benefitLabel(entry.type)}</TableCell><TableCell>{entry.referredCompanyName || '-'}</TableCell><TableCell className="text-right">{Number(entry.commissionRate || 0)}%</TableCell><TableCell>{entry.payoutEligibleAt ? new Date(entry.payoutEligibleAt).toLocaleDateString('en-ZA') : '-'}</TableCell><TableCell className="text-right font-medium">{formatCurrency(Number(entry.commissionAmount || 0))}</TableCell></TableRow>) : <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Commission entries will appear here when referred members generate qualifying revenue.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}