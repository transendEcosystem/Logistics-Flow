'use client';

import { useEffect, useState } from 'react';
import { INTERNAL_AGENTS, AGENT_DEFAULT_BRIEFS, InternalAgentId, AgentRunStatus } from '@/lib/agent-operations';
import { getClientSideAuthToken } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Bot, Check, X, Play, RefreshCcw, Loader2, Search } from 'lucide-react';

interface AgentRun {
  id: string;
  agentId: InternalAgentId;
  brief: string;
  status: AgentRunStatus;
  createdAt: string;
  error?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  videoUrl?: string;
  mediaStatus?: string;
  mediaError?: string;
  output?: {
    summary: string;
    findings: Array<{ statement: string; basis: string; sourceUrl: string | null }>;
    deliverables: Array<{ title: string; content: string }>;
    nextActions: string[];
    videoPrompt?: string;
  };
}

async function requestOperations(payload?: object, query = '') {
  const token = await getClientSideAuthToken();
  if (!token) throw new Error('Sign in as an administrator.');
  const response = await fetch(`/api/admin/agent-operations${query}`, {
    method: payload ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
    cache: 'no-store',
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.error || 'Agent operation failed.');
  return result;
}

export default function AgentOperationsContent() {
  const [agentId, setAgentId] = useState<InternalAgentId>('research-qualification');
  const [brief, setBrief] = useState(AGENT_DEFAULT_BRIEFS['research-qualification']);
  const [recordId, setRecordId] = useState('');
  const [collection, setCollection] = useState('leads');
  const [records, setRecords] = useState<Array<{ id: string; name: string; website: string }>>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordsError, setRecordsError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [recordSearch, setRecordSearch] = useState('');
  const [recordsLimited, setRecordsLimited] = useState(false);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reload = async () => {
    const result = await requestOperations();
    setRuns(result.runs);
  };
  useEffect(() => { reload().catch(reason => setError(reason.message)); }, []);
  useEffect(() => {
    let active = true;
    setRecordsLoading(true);
    setRecordsError('');
    const parameters = new URLSearchParams({ action: 'records', collection, search: recordSearch });
    requestOperations(undefined, `?${parameters}`).then(result => {
      if (!active) return;
      setRecords(result.records);
      setRecordsLimited(result.limited);
    }).catch(reason => {
      if (!active) return;
      setRecords([]);
      setRecordsError(reason.message);
    }).finally(() => { if (active) setRecordsLoading(false); });
    return () => { active = false; };
  }, [collection, recordSearch]);
  const perform = async (payload: object) => {
    setBusy(true);
    setError('');
    try {
      const result = await requestOperations(payload);
      if (result.runId) setSelectedId(result.runId);
      await reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Operation failed.');
      await reload().catch(() => undefined);
    } finally { setBusy(false); }
  };
  const selected = runs.find(run => run.id === selectedId);

  return (
    <div className="space-y-6 text-left">
      <header className="flex items-center justify-between gap-4 border-b pb-4">
        <h1 className="flex items-center gap-2 text-2xl font-headline font-bold"><Bot className="h-6 w-6" />Agent Operations</h1>
        <Badge variant="outline">Outbound approval required</Badge>
      </header>
      {error && <p role="alert" className="rounded-md border border-destructive p-3 text-destructive">{error}</p>}
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section className="space-y-4">
          <div className="space-y-2"><Label htmlFor="agent-select">Agent</Label><Select value={agentId} onValueChange={value => { setAgentId(value as InternalAgentId); setBrief(AGENT_DEFAULT_BRIEFS[value as InternalAgentId]); }} disabled={busy}><SelectTrigger id="agent-select"><SelectValue /></SelectTrigger><SelectContent>{INTERNAL_AGENTS.map(agent => <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor="agent-brief">Campaign / company brief</Label><Textarea id="agent-brief" value={brief} onChange={event => setBrief(event.target.value)} rows={8} /></div>
          <div className="space-y-2"><Label htmlFor="record-collection">CRM collection</Label><Select value={collection} onValueChange={value => { setCollection(value); setRecordId(''); setRecords([]); setRecordsLoading(true); setSearchText(''); setRecordSearch(''); }} disabled={busy}><SelectTrigger id="record-collection"><SelectValue /></SelectTrigger><SelectContent>{['leads', 'suppliers', 'transporters', 'companies', 'partners', 'strategic_partners'].map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent></Select></div>
          <form className="space-y-2" onSubmit={event => { event.preventDefault(); setRecordId(''); setRecordSearch(searchText.trim()); }}>
            <Label htmlFor="record-search">Company Name Search</Label>
            <div className="flex gap-2"><Input id="record-search" placeholder="Company name starts with..." value={searchText} onChange={event => setSearchText(event.target.value)} disabled={busy} /><Button type="submit" variant="outline" size="icon" disabled={busy || recordsLoading} title="Search companies" aria-label="Search companies"><Search className="h-4 w-4" /></Button></div>
          </form>
          <div className="space-y-2"><Label htmlFor="agent-record">Company / Record</Label><Select value={recordId} onValueChange={value => { setRecordId(value); if (!brief.trim()) setBrief(AGENT_DEFAULT_BRIEFS[agentId]); }} disabled={busy || recordsLoading || !records.length}><SelectTrigger id="agent-record" className="h-auto min-h-10 [&>span]:whitespace-normal [&>span]:break-words"><SelectValue placeholder={recordsLoading ? 'Loading companies...' : records.length ? 'Select a company...' : 'No matching companies'} /></SelectTrigger><SelectContent>{records.map(record => <SelectItem key={record.id} value={record.id}><span className="block whitespace-normal break-words">{record.name}</span>{record.website && <span className="block whitespace-normal break-all text-xs text-muted-foreground">{record.website}</span>}</SelectItem>)}</SelectContent></Select></div>
          {recordsError && <p role="alert" className="text-sm text-destructive">{recordsError}</p>}
          {recordsLimited && <p className="text-sm text-muted-foreground">More companies available. Narrow the company-name search.</p>}
          <Button disabled={busy || recordsLoading || !records.some(record => record.id === recordId) || brief.trim().length < 20} onClick={() => perform({ action: 'run', agentId, brief, recordId, collection })}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}Run Agent</Button>
          <div className="flex items-center justify-between border-t pt-4"><h2 className="font-semibold">Recent Runs</h2><Button variant="ghost" size="icon" title="Refresh runs" aria-label="Refresh runs" disabled={busy} onClick={() => reload().catch(reason => setError(reason.message))}><RefreshCcw className="h-4 w-4" /></Button></div>
          {!runs.length && <p className="text-sm text-muted-foreground">No runs yet.</p>}
          {runs.map(run => <button key={run.id} onClick={() => setSelectedId(run.id)} className={`w-full rounded-md border p-3 text-left ${selectedId === run.id ? 'border-primary' : ''}`}><span className="block text-sm font-semibold">{INTERNAL_AGENTS.find(agent => agent.id === run.agentId)?.name}</span><span className="block text-xs">{run.status.replace(/_/g, ' ')} | {new Date(run.createdAt).toLocaleString()}</span></button>)}
        </section>
        <section className="min-w-0 space-y-5 border-t pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          {!selected && <p className="text-muted-foreground">Select a run.</p>}
          {selected && <>
            <h2 className="text-lg font-semibold">{INTERNAL_AGENTS.find(agent => agent.id === selected.agentId)?.name}</h2>
            <Badge variant="outline">{selected.status.replace(/_/g, ' ')}</Badge>
            {selected.error && <p role="alert" className="text-destructive">{selected.error}</p>}
            {selected.output && <>
              <p>{selected.output.summary}</p>
              <h3 className="font-semibold">Findings</h3>
              {selected.output.findings.map((finding, index) => <div key={index} className="space-y-1 border-b pb-3"><Badge variant="outline">{finding.basis.replace(/_/g, ' ')}</Badge><p>{finding.statement}</p>{finding.sourceUrl && <a className="break-all text-sm text-primary underline" href={finding.sourceUrl} target="_blank" rel="noopener noreferrer">{finding.sourceUrl}</a>}</div>)}
              {selected.output.deliverables.map((deliverable, index) => <div key={index} className="space-y-2"><h3 className="font-semibold">{deliverable.title}</h3><pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">{deliverable.content}</pre></div>)}
              <h3 className="font-semibold">Next Actions</h3><ul className="list-disc space-y-1 pl-5">{selected.output.nextActions.map((action, index) => <li key={index}>{action}</li>)}</ul>
              {selected.status === 'awaiting_approval' && <div className="flex gap-3 border-t pt-4"><Button disabled={busy} onClick={() => perform({ action: 'review', runId: selected.id, decision: 'approved' })}><Check className="mr-2 h-4 w-4" />Approve Output</Button><Button variant="outline" disabled={busy} onClick={() => perform({ action: 'review', runId: selected.id, decision: 'rejected' })}><X className="mr-2 h-4 w-4" />Reject</Button></div>}
              {selected.reviewedAt && <p className="text-xs text-muted-foreground">Reviewed {new Date(selected.reviewedAt).toLocaleString()} | {selected.reviewedBy}</p>}
              {selected.agentId === 'social-video' && selected.output.videoPrompt && selected.status === 'approved' && !selected.videoUrl && <Button disabled={busy || selected.mediaStatus === 'rendering'} onClick={() => perform({ action: 'render-video', runId: selected.id })}><Play className="mr-2 h-4 w-4" />{selected.mediaStatus === 'rendering' ? 'Rendering Video' : 'Generate Video'}</Button>}
              {selected.mediaError && <p role="alert" className="text-destructive">{selected.mediaError}</p>}
              {selected.videoUrl && <div className="space-y-3"><video controls preload="metadata" src={selected.videoUrl} className="aspect-video w-full bg-black" /><Badge variant="outline">Media: {selected.mediaStatus?.replace(/_/g, ' ')}</Badge><a className="ml-3 text-primary underline" href={selected.videoUrl} target="_blank" rel="noopener noreferrer">Open video</a>{selected.mediaStatus === 'awaiting_approval' && <div className="flex gap-3"><Button disabled={busy} onClick={() => perform({ action: 'review-media', runId: selected.id, decision: 'approved' })}><Check className="mr-2 h-4 w-4" />Approve Video</Button><Button variant="outline" disabled={busy} onClick={() => perform({ action: 'review-media', runId: selected.id, decision: 'rejected' })}><X className="mr-2 h-4 w-4" />Reject Video</Button></div>}</div>}
            </>}
          </>}
        </section>
      </div>
    </div>
  );
}