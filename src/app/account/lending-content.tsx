'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getClientSideAuthToken } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Banknote, Download, FileText, Landmark, Loader2, Receipt } from 'lucide-react';

export default function LendingContent() {
  const { toast } = useToast();
  const [data, setData] = useState<any>({ applications: [], schedules: [], transactions: [], invoices: [], documents: [] });
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    getClientSideAuthToken().then(async (token) => {
      if (!token) throw new Error('Authentication required.');
      const response = await fetch('/api/account/lending', { headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load lending account.');
      setData(result.data);
    }).catch((error) => toast({ variant: 'destructive', title: 'Lending account unavailable', description: error.message })).finally(() => setIsLoading(false));
  }, [toast]);
  const balance = useMemo(() => data.transactions.reduce((total: number, transaction: any) => total + (transaction.type === 'debit' ? Number(transaction.amount || 0) : -Number(transaction.amount || 0)), 0), [data.transactions]);
  const arrears = data.schedules.filter((schedule: any) => schedule.raisedAt && schedule.status !== 'paid' && new Date(`${schedule.dueDate}T23:59:59.999Z`) < new Date()).length;
  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" /></div>;
  return <div className="space-y-6">
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Landmark className="h-5 w-5 text-primary" /> My Lending Account</CardTitle><CardDescription>Applications, facilities, raised installments, ledger activity, invoices, and lending documents.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">Applications</p><strong className="text-2xl">{data.applications.length}</strong></div><div><p className="text-xs text-muted-foreground">Balance due</p><strong className="text-2xl">R {balance.toLocaleString()}</strong></div><div><p className="text-xs text-muted-foreground">Raised overdue</p><strong className="text-2xl text-destructive">{arrears}</strong></div></CardContent></Card>
    <div className="grid gap-6 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>Applications and facilities</CardTitle></CardHeader><CardContent className="space-y-3">{data.applications.length ? data.applications.map((application: any) => <div key={application.id} className="rounded-md border p-3"><div className="flex justify-between gap-3"><strong>{application.companyName || application.name}</strong><Badge variant="secondary" className="capitalize">{String(application.status || 'submitted').replace('_', ' ')}</Badge></div><p className="text-sm text-muted-foreground">{application.facilityType} · Requested R {Number(application.amountRequested || 0).toLocaleString()}</p>{application.offerTerms && <p className="mt-2 text-sm">Offer: {application.offerTerms}</p>}</div>) : <p className="py-8 text-center text-muted-foreground">No lending applications found.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5 text-primary" /> Invoices</CardTitle></CardHeader><CardContent className="space-y-3">{data.invoices.length ? data.invoices.map((invoice: any) => <div key={invoice.id} className="flex items-center justify-between border-b py-2"><div><strong className="font-mono text-sm">{invoice.invoiceNumber || invoice.id}</strong><p className="text-xs text-muted-foreground">{invoice.description}</p></div><Button asChild size="sm" variant="outline"><a href="#billing"><FileText className="mr-2 h-4 w-4" />View in Billing</a></Button></div>) : <p className="py-8 text-center text-muted-foreground">No lending invoices found.</p>}</CardContent></Card>
    </div>
    <div className="grid gap-6 lg:grid-cols-2">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Banknote className="h-5 w-5 text-emerald-600" /> Repayment schedule</CardTitle></CardHeader><CardContent className="space-y-2">{data.schedules.length ? data.schedules.map((schedule: any) => <div key={schedule.id} className="flex items-center justify-between border-b py-2 text-sm"><span>#{schedule.installmentNumber} · {schedule.dueDate}</span><span className="flex items-center gap-2">R {Number(schedule.amountDue || 0).toLocaleString()} {schedule.raisedAt ? <Badge><span className="mr-1">✓</span> Raised</Badge> : <Badge variant="outline">Scheduled</Badge>}</span></div>) : <p className="py-8 text-center text-muted-foreground">No repayment schedule found.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Ledger and documents</CardTitle></CardHeader><CardContent className="space-y-2">{data.transactions.map((transaction: any) => <div key={transaction.id} className="flex justify-between border-b py-2 text-sm"><span>{transaction.description}<small className="block text-muted-foreground">{transaction.date}</small></span><strong className={transaction.type === 'credit' ? 'text-emerald-600' : 'text-destructive'}>{transaction.type === 'credit' ? '+' : '-'} R {Number(transaction.amount || 0).toLocaleString()}</strong></div>)}{data.documents.map((document: any) => <div key={document.id} className="flex items-center justify-between border-b py-2 text-sm"><span>{document.documentName || document.documentType}</span><Button asChild size="icon" variant="ghost"><a href={document.fileUrl} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /></a></Button></div>)}{!data.transactions.length && !data.documents.length && <p className="py-8 text-center text-muted-foreground">No ledger activity or documents found.</p>}</CardContent></Card>
    </div>
  </div>;
}