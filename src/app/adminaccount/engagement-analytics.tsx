'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getClientSideAuthToken } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCcw, ChartNoAxesCombined, MailOpen, MousePointerClick, Clock3 } from 'lucide-react';

interface RegistrySummary {
  registry: string;
  label: string;
  sent: number;
  opened: number;
  clicked: number;
  openRate: number | null;
  readToClickRatio: number | null;
  meanReadToActionMinutes: number | null;
  medianReadToActionMinutes: number | null;
  timedActions: number;
  contentTypes: Array<{ contentType: string; sent: number; opened: number; clicked: number }>;
}

const registryOptions = [
  ['all', 'All Registries'], ['leads', 'Leads'], ['partners', 'Partners'], ['strategic_partners', 'Strategic Partners'],
  ['suppliers', 'Suppliers'], ['transporters', 'Transporters'], ['finance_co', 'Finance Companies'], ['investors', 'Investors'],
  ['isa_agents', 'ISA Agents'], ['digital_associates', 'Digital Associates'], ['developers', 'Developers'], ['drivers', 'Drivers'],
];

const percentage = (value: number | null) => value === null ? '—' : `${(value * 100).toFixed(1)}%`;
const duration = (minutes: number | null) => minutes === null ? '—' : minutes < 60 ? `${minutes} min` : `${(minutes / 60).toFixed(1)} hr`;

export default function EngagementAnalytics() {
  const [registry, setRegistry] = useState('all');
  const [days, setDays] = useState('30');
  const [rows, setRows] = useState<RegistrySummary[]>([]);
  const [openMetricNote, setOpenMetricNote] = useState('');
  const [actionMetricNote, setActionMetricNote] = useState('');
  const [sampledEvents, setSampledEvents] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error('Administrator authentication required.');
      const params = new URLSearchParams({ registry, days });
      const response = await fetch(`/api/admin/engagement-analytics?${params}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not load engagement metrics.');
      setRows(result.registries || []);
      setOpenMetricNote(result.openMetricNote || '');
      setActionMetricNote(result.actionMetricNote || '');
      setSampledEvents(result.sampledEvents || 0);
      setTruncated(Boolean(result.truncated));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load engagement metrics.'); }
    finally { setBusy(false); }
  }, [registry, days]);

  useEffect(() => { load(); }, [load]);

  const aggregate = useMemo(() => rows.reduce((total, row) => ({
    sent: total.sent + row.sent,
    opened: total.opened + row.opened,
    clicked: total.clicked + row.clicked,
    actionMinutes: total.actionMinutes + (row.meanReadToActionMinutes ?? 0) * row.timedActions,
    timedActions: total.timedActions + row.timedActions,
  }), { sent: 0, opened: 0, clicked: 0, actionMinutes: 0, timedActions: 0 }), [rows]);
  const openRate = aggregate.sent ? aggregate.opened / aggregate.sent : null;
  const readToClick = aggregate.opened ? aggregate.clicked / aggregate.opened : null;
  const meanActionMinutes = aggregate.timedActions ? Math.round(aggregate.actionMinutes / aggregate.timedActions) : null;

  return (
    <div className="space-y-6 text-left">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-4">
        <div><h1 className="flex items-center gap-2 text-2xl font-headline font-bold"><ChartNoAxesCombined className="h-6 w-6 text-primary" />Engagement Analytics</h1><p className="mt-1 text-sm text-muted-foreground">Compare tracked email engagement across registries and content types.</p></div>
        <div className="flex items-end gap-3">
          <div className="space-y-1"><Label htmlFor="engage-registry">Registry</Label><Select value={registry} onValueChange={setRegistry}><SelectTrigger id="engage-registry" className="w-48"><SelectValue /></SelectTrigger><SelectContent>{registryOptions.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label htmlFor="engage-days">Period</Label><Select value={days} onValueChange={setDays}><SelectTrigger id="engage-days" className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="7">Last 7 days</SelectItem><SelectItem value="30">Last 30 days</SelectItem><SelectItem value="90">Last 90 days</SelectItem><SelectItem value="365">Last 12 months</SelectItem></SelectContent></Select></div>
          <Button variant="outline" size="icon" onClick={load} disabled={busy} title="Refresh analytics" aria-label="Refresh analytics">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}</Button>
        </div>
      </header>
      {error && <p role="alert" className="rounded border border-destructive p-3 text-sm text-destructive">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Emails sent</CardTitle></CardHeader><CardContent className="text-3xl font-black">{aggregate.sent}</CardContent></Card>
        <Card><CardHeader className="flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Tracked open rate</CardTitle><MailOpen className="h-4 w-4 text-primary" /></CardHeader><CardContent className="text-3xl font-black">{percentage(openRate)}<p className="mt-1 text-xs font-normal text-muted-foreground">{aggregate.opened} / {aggregate.sent} sent</p></CardContent></Card>
        <Card><CardHeader className="flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Click-to-open ratio</CardTitle><MousePointerClick className="h-4 w-4 text-primary" /></CardHeader><CardContent className="text-3xl font-black">{percentage(readToClick)}<p className="mt-1 text-xs font-normal text-muted-foreground">{aggregate.clicked} / {aggregate.opened} opened</p></CardContent></Card>
        <Card><CardHeader className="flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Mean open-to-click time</CardTitle><Clock3 className="h-4 w-4 text-primary" /></CardHeader><CardContent className="text-3xl font-black">{duration(meanActionMinutes)}<p className="mt-1 text-xs font-normal text-muted-foreground">{aggregate.timedActions} timed recipient(s)</p></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle className="text-base">Registry breakdown</CardTitle></CardHeader><CardContent className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="p-2">Registry</th><th className="p-2">Sent</th><th className="p-2">Opened</th><th className="p-2">Clicked</th><th className="p-2">Open rate</th><th className="p-2">Click / open</th><th className="p-2">Median time</th></tr></thead><tbody>{rows.map(row => <tr key={row.registry} className="border-b last:border-0"><td className="p-2 font-semibold">{row.label}</td><td className="p-2">{row.sent}</td><td className="p-2">{row.opened}</td><td className="p-2">{row.clicked}</td><td className="p-2">{percentage(row.openRate)}</td><td className="p-2">{percentage(row.readToClickRatio)}</td><td className="p-2">{duration(row.medianReadToActionMinutes)}</td></tr>)}</tbody></table></CardContent></Card>
      {registry !== 'all' && rows[0] && <Card><CardHeader><CardTitle className="text-base">Content performance · {rows[0].label}</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{rows[0].contentTypes.map(item => <Badge key={item.contentType} variant="outline">{item.contentType}: {item.sent} sent · {item.opened} opened · {item.clicked} clicked</Badge>)}</CardContent></Card>}
      <div className="space-y-2 rounded-md border bg-muted/20 p-4 text-xs text-muted-foreground"><p>{openMetricNote}</p><p>{actionMetricNote}</p><p>Tracked events in selected period: {sampledEvents}{truncated ? ' (sample capped at 10,000; narrow the period to inspect a smaller set).' : ''}. Manual email launches are not counted as sent until they are routed through tracked dispatch.</p></div>
    </div>
  );
}