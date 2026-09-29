'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Loader2, RefreshCcw, Scale } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getClientSideAuthToken } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

export default function AssetAccountingContent() {
  const { toast } = useToast();
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const loadEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = await getClientSideAuthToken();
      if (!token) throw new Error('Authentication required.');
      const response = await fetch('/api/admin/lending/asset-accounting', { headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load asset accounting events.');
      setEvents(result.data || []);
    } catch (error: any) { toast({ variant: 'destructive', title: 'Asset accounting unavailable', description: error.message }); } finally { setIsLoading(false); }
  }, [toast]);
  useEffect(() => { loadEvents(); }, [loadEvents]);
  const summary = useMemo(() => ({ events: events.length, disposals: events.filter((event) => ['installment_sale_implementation', 'rent_to_own_residual_settlement'].includes(event.eventType)).length, profitOrLoss: events.reduce((total, event) => total + Number(event.profitOrLoss || 0), 0) }), [events]);
  return <div className="space-y-6">
    <div className="flex items-center justify-between"><div><h1 className="flex items-center gap-2 text-2xl font-black"><BarChart3 className="h-6 w-6 text-primary" /> Asset Accounting</h1><p className="text-sm text-muted-foreground">Lifecycle journals, stock movements, depreciation, and disposal outcomes.</p></div><Button variant="outline" size="sm" onClick={loadEvents} disabled={isLoading}><RefreshCcw className={isLoading ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />Refresh</Button></div>
    <div className="grid gap-4 sm:grid-cols-3"><Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Accounting events</p><strong className="text-2xl">{summary.events}</strong></CardContent></Card><Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Asset disposals</p><strong className="text-2xl">{summary.disposals}</strong></CardContent></Card><Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Disposal profit / loss</p><strong className={summary.profitOrLoss < 0 ? 'text-2xl text-destructive' : 'text-2xl text-emerald-600'}>R {summary.profitOrLoss.toLocaleString()}</strong></CardContent></Card></div>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Scale className="h-5 w-5 text-primary" /> Event register</CardTitle><CardDescription>Each event is immutable and can be reconciled using its reference and effective date.</CardDescription></CardHeader><CardContent>{isLoading ? <div className="flex justify-center p-16"><Loader2 className="animate-spin text-primary" /></div> : events.length === 0 ? <p className="py-12 text-center text-muted-foreground">No asset accounting events recorded.</p> : <div className="space-y-3">{events.map((event) => <div key={event.id} className="rounded-md border p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><div className="font-bold capitalize">{String(event.eventType || '').replaceAll('_', ' ')}</div><p className="text-xs text-muted-foreground">Event: {event.eventDate} · Effective: {event.effectiveDate} · Ref: {event.reference}</p></div><Badge variant="outline">R {Number(event.amount || 0).toLocaleString()}</Badge></div>{event.bookValue !== undefined && <p className="mt-2 text-sm">Book value: R {Number(event.bookValue).toLocaleString()} · <span className={Number(event.profitOrLoss || 0) < 0 ? 'text-destructive' : 'text-emerald-600'}>{Number(event.profitOrLoss || 0) >= 0 ? 'Profit' : 'Loss'}: R {Math.abs(Number(event.profitOrLoss || 0)).toLocaleString()}</span></p>}<div className="mt-3 grid gap-1 text-xs text-muted-foreground">{(event.journalLines || []).map((line: any, index: number) => <div key={index} className="flex justify-between"><span>{line.account}</span><span>Dr {Number(line.debit || 0).toLocaleString()} / Cr {Number(line.credit || 0).toLocaleString()}</span></div>)}</div></div>)}</div>}</CardContent></Card>
  </div>;
}