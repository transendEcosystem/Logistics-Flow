
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    Zap, Play, Pause, RotateCcw, ShieldCheck, Mail, Users, Clock, 
    AlertTriangle, CheckCircle2, Activity, Settings2, ArrowRight, Loader2, ListOrdered, Info, Save
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getClientSideAuthToken, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { cn, formatCurrency, formatDateSafe } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const defaultPolicy = [
    { label: 'Digital Handshake', waitHours: 0, template: 'digital-handshake' },
    { label: 'The Wedge', waitHours: 72, template: 'the-wedge' },
    { label: 'The Signal', waitHours: 48, template: 'the-signal' },
    { label: 'The Break-Up', waitHours: 48, template: 'the-break-up' }
];

async function performAdminAction(token: string, action: string, payload?: any) {
    const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || "API Failure");
    return result.data;
}

export default function EngagementPipeline() {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [status, setStatus] = useState<'idle' | 'running' | 'paused'>('idle');
    const [queue, setQueue] = useState<any[]>([]);
    const [isSavingPolicy, setIsSavingPolicy] = useState(false);
    const [isLoadingQueue, setIsLoadingQueue] = useState(false);

    const policyRef = useMemoFirebase(() => firestore ? doc(firestore, 'configuration', 'engagementPolicy') : null, [firestore]);
    const { data: policyData, isLoading: isPolicyLoading } = useDoc<any>(policyRef);

    const currentPolicy = useMemo(() => policyData?.steps || defaultPolicy, [policyData]);

    const loadQueue = useCallback(async () => {
        setIsLoadingQueue(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;
            const data = await performAdminAction(token, 'getPipelineQueue');
            setQueue(data || []);
        } catch (e) {
            console.warn("Queue load failed", e);
        } finally {
            setIsLoadingQueue(false);
        }
    }, []);

    useEffect(() => {
        loadQueue();
        const interval = setInterval(() => {
            if (status === 'running') loadQueue();
        }, 30000); 
        return () => clearInterval(interval);
    }, [status, loadQueue]);

    const handleSavePolicy = async (newSteps: any[]) => {
        setIsSavingPolicy(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;
            await fetch('/api/updateConfigDoc', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: 'configuration/engagementPolicy', data: { steps: newSteps } })
            });
            toast({ title: "Policy Updated" });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Save Failed" });
        } finally {
            setIsSavingPolicy(false);
        }
    };

    const runAutoPilot = async () => {
        if (status === 'running') {
            setStatus('paused');
            return;
        }
        
        setStatus('running');
        toast({ title: "Auto-Pilot Active", description: "System is now monitoring and dispatching due follow-ups." });
    };

    const dispatchNextInQueue = async () => {
        if (queue.length === 0) return;
        const item = queue[0];
        
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;
            
            await performAdminAction(token, 'dispatchPipelineStep', {
                leadId: item.id,
                stepIndex: (item.currentPipelineStep || 0) + 1,
                email: item.email,
                subject: `Logistics Flow: Follow-up for ${item.companyName || item.firstName}`,
                html: `<p>Automated Follow-up Content</p>`,
                collection: item.type === 'lead' ? 'leads' : 'partners'
            });

            toast({ title: "Dispatch Success", description: `Sent to ${item.companyName || item.firstName}` });
            loadQueue();
        } catch (e: any) {
            console.error("Auto-Pilot Dispatch Error:", e);
        }
    };

    useEffect(() => {
        if (status === 'running' && queue.length > 0) {
            const timer = setTimeout(dispatchNextInQueue, 5000); 
            return () => clearTimeout(timer);
        }
    }, [status, queue]);

    return (
        <div className="space-y-8 text-left text-foreground">
            <div className="flex justify-between items-end">
                <div className="text-left">
                    <h1 className="text-3xl font-black font-headline tracking-tight flex items-center gap-3">
                        <Zap className={cn("h-8 w-8 text-primary", status === 'running' && "animate-pulse")} />
                        Engagement Auto-Pilot
                    </h1>
                    <p className="text-muted-foreground mt-1 text-left">High-velocity automated follow-ups with forensic bounce tracking.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant={status === 'running' ? "destructive" : "default"} size="lg" className="font-black uppercase text-xs tracking-widest px-8 shadow-xl" onClick={runAutoPilot}>
                        {status === 'running' ? <><Pause className="mr-2 h-4 w-4" /> Stop Engine</> : <><Play className="mr-2 h-4 w-4" /> Start Auto-Pilot</>}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6 text-left text-foreground">
                    <Card className="border-none shadow-xl bg-white overflow-hidden text-left">
                        <CardHeader className="bg-slate-50 border-b text-left">
                            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-left">
                                <ListOrdered className="h-4 w-4 text-primary" />
                                Dispatch Queue ({queue.length} Due)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 text-left">
                            {isLoadingQueue ? (
                                <div className="py-20 text-center text-foreground text-center"><Loader2 className="animate-spin h-8 w-8 text-primary mx-auto" /></div>
                            ) : queue.length > 0 ? (
                                <div className="divide-y text-left">
                                    {queue.map(item => (
                                        <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left">
                                            <div className="flex flex-col text-left">
                                                <span className="font-bold text-sm text-left">{item.companyName || `${item.firstName} ${item.lastName}`}</span>
                                                <span className="text-[10px] text-muted-foreground font-mono text-left">{item.email}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-left">
                                                <Badge variant="outline" className="text-[9px] font-black uppercase text-left">Step {(item.currentPipelineStep || 0) + 1}</Badge>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-destructive uppercase text-right text-destructive">Overdue</p>
                                                    <p className="text-[9px] text-muted-foreground text-right">{formatDateSafe(item.nextStepDueAt, "dd MMM")}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-24 text-center space-y-4">
                                    <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 opacity-20" />
                                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest text-center">Queue Clear</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Alert className="bg-primary/5 border-primary/20 p-6 rounded-2xl shadow-sm text-left text-foreground">
                        <Info className="h-6 w-6 text-primary" />
                        <div className="ml-2 text-left">
                            <AlertTitle className="font-black text-primary uppercase text-xs text-left">Forensic Integrity Protection</AlertTitle>
                            <AlertDescription className="text-xs text-muted-foreground leading-relaxed mt-1 text-left">
                                The Auto-Pilot respects SendGrid rate limits by trickling dispatches. Conversion signals (signups) automatically stop the pipeline for that record.
                            </AlertDescription>
                        </div>
                    </Alert>
                </div>

                <div className="space-y-6 text-left">
                    <Card className="shadow-lg border-none bg-slate-900 text-white text-left">
                        <CardHeader className="text-left text-white">
                            <CardTitle className="text-lg flex items-center gap-2 text-left text-white">
                                <Settings2 className="h-5 w-5 text-primary" />
                                Cadence Policy
                            </CardTitle>
                            <CardDescription className="text-slate-400 text-left">Rules for automated follow-up.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 text-left text-white">
                            {currentPolicy.map((step: any, i: number) => (
                                <div key={i} className="space-y-2 text-left text-white">
                                    <div className="flex justify-between items-center text-left text-white">
                                        <Label className="text-[10px] font-black uppercase text-slate-500 text-left text-white">Step {i}: {step.label}</Label>
                                        <Badge variant="outline" className="text-[9px] border-white/10 text-slate-400 text-left">{step.waitHours}h Wait</Badge>
                                    </div>
                                    <Input 
                                        type="number" 
                                        defaultValue={step.waitHours} 
                                        className="h-8 bg-white/5 border-white/10 text-xs font-mono text-white text-left" 
                                        placeholder="Wait hours..."
                                    />
                                </div>
                            ))}
                            <Button className="w-full h-10 font-bold gap-2 text-white" onClick={() => handleSavePolicy(currentPolicy)} disabled={isSavingPolicy}>
                                {isSavingPolicy ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
                                Save Dispatch Policy
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
