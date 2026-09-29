'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { getClientSideAuthToken } from '@/firebase';
import { cn, fetchFromAdminAPI, formatCurrency } from '@/lib/utils';
import { CheckCircle2, FileSignature, FileText, Loader2, PlayCircle, RefreshCcw, Rocket, Send, ShieldCheck, User } from 'lucide-react';

async function callApi(path: string, method: string, payload?: any) {
  const token = await getClientSideAuthToken();
  if (!token) throw new Error('Authentication required.');
  const response = await fetch(path, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.error || 'Request failed.');
  return result;
}

export default function FacilityBookingControl() {
  const { toast } = useToast();
  const [cases, setCases] = useState<any[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [detail, setDetail] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [interestRate, setInterestRate] = useState('16.5');
  const [termMonths, setTermMonths] = useState('60');
  const [firstInstalmentDate, setFirstInstalmentDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));

  const loadCases = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error('Authentication required.');
      const result = await fetchFromAdminAPI(token, 'getLendingData', { collectionName: 'lendingApplications', limit: 250 });
      setCases((result.data || []).filter((item: any) => item.caseType === 'agreement_facility_case'));
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Load failed', description: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const loadDetail = useCallback(async (caseId: string) => {
    if (!caseId) { setDetail(null); return; }
    try {
      const result = await callApi(`/api/admin/lending/facility-letter?caseId=${encodeURIComponent(caseId)}`, 'GET');
      setDetail(result.data);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Unable to load case', description: error.message });
    }
  }, [toast]);

  useEffect(() => { loadCases(); }, [loadCases]);
  useEffect(() => { loadDetail(selectedCaseId); }, [selectedCaseId, loadDetail]);

  const decision = detail?.creditCase?.creditCommitteeDecision;
  const letter = detail?.letter;
  const stages = detail?.stages || [];
  const state = detail?.state || {};

  const run = async (action: () => Promise<void>) => {
    setIsBusy(true);
    try { await action(); } catch (error: any) {
      toast({ variant: 'destructive', title: 'Action failed', description: error.message });
    } finally { setIsBusy(false); }
  };

  const seedSimulation = () => run(async () => {
    const result = await callApi('/api/admin/lending/simulate', 'POST', {});
    toast({ title: 'Simulation case created', description: 'A synthetic client, global facility and agreement case are ready.' });
    await loadCases();
    setSelectedCaseId(result.caseId);
  });

  const recordDecision = () => run(async () => {
    await callApi('/api/admin/lending/credit-committee', 'POST', { applicationId: selectedCaseId }).catch(() => null);
    await callApi('/api/admin/lending/credit-committee', 'PATCH', {
      applicationId: selectedCaseId,
      outcome: 'approved_subject_to_conditions',
      clientFacilityLimit: Number(detail?.creditCase?.amountRequested || 0) * 2,
      agreementFacilityLimit: Number(detail?.creditCase?.amountRequested || 0),
      rationale: 'Simulated committee approval based on declared cashflow, asset equity and conduct.',
      conditions: 'Comprehensive insurance with lender interest noted\nLandlord waiver for premises',
      collateralRequirements: 'Cession of insurance policy',
      securityRequirements: 'Notarial bond over financed asset',
      suretyRequirements: 'Unlimited surety by Thandi Mokoena',
    });
    toast({ title: 'Credit decision recorded' });
    await loadDetail(selectedCaseId);
  });

  const issueLetter = () => run(async () => {
    await callApi('/api/admin/lending/facility-letter', 'POST', { caseId: selectedCaseId, interestRate: Number(interestRate), termMonths: Number(termMonths), firstInstalmentDate });
    toast({ title: 'Facility letter issued', description: 'The client can now sign in and accept it.' });
    await loadDetail(selectedCaseId);
  });

  const openDocumentPack = async () => {
    const token = await getClientSideAuthToken();
    if (!token) { toast({ variant: 'destructive', title: 'Authentication required' }); return; }
    const response = await fetch(`/api/admin/lending/documents?caseId=${encodeURIComponent(selectedCaseId)}&format=html`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      toast({ variant: 'destructive', title: 'Unable to generate documents', description: result.error || 'Request failed.' });
      return;
    }
    const html = await response.text();
    const preview = window.open('', '_blank');
    if (preview) { preview.document.write(html); preview.document.close(); }
  };

  const completeStage = (stageId: string) => run(async () => {
    await callApi('/api/admin/lending/facility-letter', 'PATCH', { caseId: selectedCaseId, stageId });
    await loadDetail(selectedCaseId);
  });

  const goLive = () => run(async () => {
    const result = await callApi('/api/admin/lending/go-live', 'POST', { caseId: selectedCaseId });
    toast({ title: 'Agreement is live', description: `Agreement ${result.agreementId} is now in the debtors book.` });
    await loadDetail(selectedCaseId);
    await loadCases();
  });

  const selectedCase = useMemo(() => cases.find((item) => item.id === selectedCaseId), [cases, selectedCaseId]);

  return (
    <div className="space-y-6 text-left text-foreground">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3"><FileSignature className="h-8 w-8 text-primary" /> Facility & Booking Control</h1>
          <p className="text-muted-foreground mt-1">Issue the facility letter, track client acceptance, control booking, and release the agreement to live.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadCases} disabled={isLoading} className="gap-2 font-bold"><RefreshCcw className={cn('h-4 w-4', isLoading && 'animate-spin')} /> Sync</Button>
          <Button onClick={seedSimulation} disabled={isBusy} className="gap-2 font-bold text-white"><PlayCircle className="h-4 w-4" /> Seed simulation case</Button>
        </div>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader className="border-b bg-muted/10"><CardTitle className="text-lg">Agreement facility cases</CardTitle><CardDescription>Select a case to drive it through credit, letter, booking and go-live.</CardDescription></CardHeader>
        <CardContent className="pt-6">
          {isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : cases.length === 0 ? (
            <p className="text-sm text-muted-foreground">No agreement facility cases yet. Seed a simulation case to see the full workflow.</p>
          ) : (
            <div className="grid gap-2">
              {cases.map((item) => (
                <button key={item.id} onClick={() => setSelectedCaseId(item.id)} className={cn('flex items-center justify-between rounded-xl border-2 p-4 text-left transition-all', selectedCaseId === item.id ? 'border-primary bg-primary/5' : 'bg-white hover:bg-slate-50')}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black">{item.companyName || 'Unnamed client'}</span>
                      {item.isSyntheticData && <Badge variant="outline" className="text-[9px] font-black uppercase border-amber-400 text-amber-700 bg-amber-50">Simulated</Badge>}
                    </div>
                    <span className="text-xs text-muted-foreground capitalize">{String(item.facilityAgreementType || '').replace(/-/g, ' ')} · {formatCurrency(item.amountRequested)}</span>
                  </div>
                  <Badge variant="secondary" className="capitalize">{String(item.facilityLetterStatus || item.status || 'submitted').replace(/_/g, ' ')}</Badge>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedCase && detail && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-6">
          <Card className="border-none shadow-lg">
            <CardHeader className="border-b bg-muted/10"><CardTitle className="text-lg flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Credit decision</CardTitle></CardHeader>
            <CardContent className="space-y-4 pt-6">
              {decision?.outcome === 'approved_subject_to_conditions' ? (
                <>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="block text-[10px] font-black uppercase text-muted-foreground">Client facility limit</span><strong>{formatCurrency(decision.clientFacilityLimit)}</strong></div>
                    <div><span className="block text-[10px] font-black uppercase text-muted-foreground">Agreement facility limit</span><strong className="text-primary">{formatCurrency(decision.agreementFacilityLimit)}</strong></div>
                  </div>
                  {['conditions', 'collateralRequirements', 'securityRequirements', 'suretyRequirements'].map((key) => (
                    (decision as any)[key]?.length > 0 && (
                      <div key={key}>
                        <span className="block text-[10px] font-black uppercase text-muted-foreground mb-1">{key.replace(/([A-Z])/g, ' $1')}</span>
                        <ul className="list-disc pl-5 text-sm space-y-1">{(decision as any)[key].map((line: string) => <li key={line}>{line}</li>)}</ul>
                      </div>
                    )
                  ))}
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">No committee decision recorded on this case yet.</p>
                  <Button onClick={recordDecision} disabled={isBusy} variant="outline" className="gap-2 font-bold">Record simulated approval</Button>
                </div>
              )}
              <Separator />
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Interest rate (%)</Label><Input value={interestRate} onChange={(event) => setInterestRate(event.target.value)} /></div>
                  <div className="space-y-1"><Label className="text-xs">Term (months)</Label><Input value={termMonths} onChange={(event) => setTermMonths(event.target.value)} /></div>
                  <div className="space-y-1"><Label className="text-xs">First instalment</Label><Input type="date" value={firstInstalmentDate} onChange={(event) => setFirstInstalmentDate(event.target.value)} /></div>
                </div>
                <Button onClick={issueLetter} disabled={isBusy || !decision || Boolean(letter)} className="w-full gap-2 font-bold text-white"><Send className="h-4 w-4" /> {letter ? 'Facility letter issued' : 'Issue facility letter to client'}</Button>
                <Button variant="outline" onClick={openDocumentPack} disabled={!decision} className="w-full gap-2 font-bold"><FileText className="h-4 w-4" /> Preview full document pack</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader className="border-b bg-muted/10">
              <div className="flex items-center justify-between">
                <div><CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5 text-primary" /> Facility letter & booking</CardTitle><CardDescription>Stages complete in order. The client signs the letter in their own portal.</CardDescription></div>
                {letter && <Badge className="capitalize">{letter.status}</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {!letter ? <p className="text-sm text-muted-foreground">Issue the facility letter to begin the booking process.</p> : (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold"><span>Booking progress</span><span>{detail.progress}%</span></div>
                    <Progress value={detail.progress} />
                  </div>
                  <pre className="max-h-48 overflow-y-auto rounded-xl border bg-slate-50 p-4 text-[11px] leading-relaxed whitespace-pre-wrap">{letter.body}</pre>
                  <div className="space-y-2">
                    {stages.map((stage: any) => {
                      const done = state[stage.id]?.completed;
                      const isNext = detail.nextStage?.id === stage.id;
                      return (
                        <div key={stage.id} className={cn('flex items-center justify-between gap-3 rounded-lg border p-3', done ? 'bg-emerald-50 border-emerald-200' : isNext ? 'border-primary/40 bg-primary/5' : 'bg-white')}>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {done && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                              <span className="text-sm font-bold">{stage.label}</span>
                              <Badge variant="outline" className="text-[9px] uppercase font-black">{stage.actor}</Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{stage.description}</p>
                          </div>
                          {!done && (
                            <Button size="sm" variant={isNext ? 'default' : 'outline'} disabled={isBusy || !isNext} onClick={() => completeStage(stage.id)} className={cn('shrink-0 font-bold', isNext && 'text-white')}>
                              {stage.actor === 'client' ? 'Record client action' : 'Complete'}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <Button onClick={goLive} disabled={isBusy || !detail.readyForLive} className="w-full h-12 gap-2 font-black uppercase tracking-widest text-white"><Rocket className="h-4 w-4" /> Release to live</Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
