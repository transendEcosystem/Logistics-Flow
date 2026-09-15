'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Loader2, Save, RefreshCw, Phone, Mail, AlarmClock, CalendarClock,
    CheckCircle2, AlertTriangle, Clock, Trash2, Settings2, ListChecks,
    PlayCircle, SkipForward, XCircle, ArrowRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getClientSideAuthToken } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { cn, formatDateSafe } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users } from 'lucide-react';

async function performAdminAction(token: string, action: string, payload?: any) {
    const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || 'API Failure');
    return result;
}

const POLICY_FIELDS: { key: string; label: string; hint: string }[] = [
    { key: 'emailFollowUpHours', label: 'Email follow-up (hours)', hint: 'Hours to wait after an email before a follow-up task appears.' },
    { key: 'whatsappFollowUpHours', label: 'WhatsApp / SMS follow-up (hours)', hint: 'Instant channels usually warrant a faster chase.' },
    { key: 'socialFollowUpHours', label: 'Social / LinkedIn DM follow-up (hours)', hint: 'Applies to LinkedIn and other social messages.' },
    { key: 'callFollowUpHours', label: 'Phone call follow-up (hours)', hint: 'Also used when a contact is escalated to a call.' },
    { key: 'defaultFollowUpHours', label: 'Default follow-up (hours)', hint: 'Used for any channel not listed above.' },
];

const BUCKET_META: Record<string, { label: string; icon: any; className: string }> = {
    overdue: { label: 'Overdue', icon: AlertTriangle, className: 'text-destructive' },
    due_today: { label: 'Due today', icon: AlarmClock, className: 'text-amber-500' },
    upcoming: { label: 'Upcoming', icon: CalendarClock, className: 'text-muted-foreground' },
};

function TaskRow({ task, onAction, onSend, onAssign, staff, busyId }: { task: any; onAction: (task: any, mode: string, extra?: any) => void; onSend: (task: any) => void; onAssign: (task: any, staffId: string) => void; staff: any[]; busyId: string | null }) {
    const meta = BUCKET_META[task.bucket] || BUCKET_META.upcoming;
    const Icon = meta.icon;
    const isCall = task.actionType === 'call';
    const busy = busyId === task.id;

    const contactHref = isCall
        ? (task.contactPhone ? `tel:${String(task.contactPhone).replace(/\s/g, '')}` : null)
        : (task.contactEmail ? `mailto:${task.contactEmail}?subject=${encodeURIComponent(`Following up: ${task.lastSubject || task.companyName || ''}`)}` : null);

    return (
        <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                    <Icon className={cn('h-4 w-4 shrink-0', meta.className)} />
                    <span className="font-semibold">{task.companyName || 'Unnamed record'}</span>
                    <Badge variant={isCall ? 'default' : 'secondary'} className="gap-1">
                        {isCall ? <Phone className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                        {isCall ? 'Call' : 'Email'}
                    </Badge>
                    {task.followUpNumber ? <Badge variant="outline">Follow-up #{task.followUpNumber}</Badge> : null}
                    {task.source === 'manual' ? <Badge variant="outline">Manual</Badge> : null}
                </div>
                <p className="text-sm text-muted-foreground">{task.title}</p>
                <p className="text-xs text-muted-foreground">
                    Due {formatDateSafe(task.dueAt || task.dueDate, 'dd MMM yyyy HH:mm')}
                    {task.lastOutreachAt ? ` · last contacted ${formatDateSafe(task.lastOutreachAt, 'dd MMM yyyy')}` : ''}
                    {task.recordCollection ? ` · ${task.recordCollection}` : ''}
                </p>
                {contactHref ? (
                    <a href={contactHref} className="text-xs font-medium text-primary hover:underline">
                        {isCall ? task.contactPhone : task.contactEmail}
                    </a>
                ) : (
                    <p className="text-xs text-destructive">No {isCall ? 'phone number' : 'email address'} on the record.</p>
                )}
                <div className="flex items-center gap-1.5 pt-1">
                    <Users className="h-3 w-3 text-muted-foreground shrink-0" />
                    <Select value={task.assigneeId || 'none'} onValueChange={(v) => onAssign(task, v)}>
                        <SelectTrigger className="h-7 w-[180px] text-xs">
                            <SelectValue placeholder="Unallocated" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Unallocated</SelectItem>
                            {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
                {!isCall && (task.contactEmail || task.contactPhone) ? (
                    <Button size="sm" disabled={busy} onClick={() => onSend(task)}>
                        {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Mail className="mr-1 h-3.5 w-3.5" />} Send Follow-Up
                    </Button>
                ) : null}
                {isCall && task.contactPhone ? (
                    <Button size="sm" asChild disabled={busy} onClick={() => onAction(task, 'sent')}>
                        <a href={`tel:${String(task.contactPhone).replace(/\s/g, '')}`}>
                            <Phone className="mr-1 h-3.5 w-3.5" /> Call Now
                        </a>
                    </Button>
                ) : null}
                <Button size="sm" variant="outline" disabled={busy} onClick={() => onAction(task, 'snooze', { hours: 24 })}>
                    <Clock className="mr-1 h-3.5 w-3.5" /> Snooze 24h
                </Button>
                <Button size="sm" variant="secondary" disabled={busy} onClick={() => onAction(task, 'complete')}>
                    {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1 h-3.5 w-3.5" />} Done
                </Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => onAction(task, 'dismiss')}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
            </div>
        </div>
    );
}

export default function FollowUpRegister() {
    const { toast } = useToast();
    const [tasks, setTasks] = useState<any[]>([]);
    const [summary, setSummary] = useState<{ overdue: number; dueToday: number; upcoming: number }>({ overdue: 0, dueToday: 0, upcoming: 0 });
    const [policy, setPolicy] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [batchQueue, setBatchQueue] = useState<string[] | null>(null);
    const [batchIndex, setBatchIndex] = useState(0);
    const [staff, setStaff] = useState<any[]>([]);

    const load = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error('Authentication failed.');
            const [register, policyResult, staffResult] = await Promise.all([
                performAdminAction(token, 'getFollowUpRegister', {}),
                performAdminAction(token, 'getCommunicationPolicy', {}),
                performAdminAction(token, 'getPlatformStaff', {}).catch(() => ({ data: [] })),
            ]);
            setTasks(register.data || []);
            setSummary(register.summary || { overdue: 0, dueToday: 0, upcoming: 0 });
            setPolicy(policyResult.data);
            setStaff(staffResult.data || []);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Could not load the register', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => { load(); }, [load]);

    const handleAssign = useCallback(async (task: any, staffId: string) => {
        const assigneeId = staffId === 'none' ? null : staffId;
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, assigneeId } : t));
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error('Authentication failed.');
            await performAdminAction(token, 'updateFollowUpTask', { taskId: task.id, mode: 'assign', assigneeId });
            toast({ title: 'Record allocated' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Assignment failed', description: e.message });
        }
    }, [toast]);

    const handleAction = useCallback(async (task: any, mode: string, extra?: any) => {
        setBusyId(task.id);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error('Authentication failed.');
            await performAdminAction(token, 'updateFollowUpTask', { taskId: task.id, mode, ...extra });
            setTasks(prev => prev.filter(t => t.id !== task.id));
            toast({ title: mode === 'complete' ? 'Task completed' : mode === 'snooze' ? 'Snoozed for 24 hours' : 'Task dismissed' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Action failed', description: e.message });
        } finally {
            setBusyId(null);
        }
    }, [toast]);

    // One-click "Send Follow-Up": fetches the pre-written message for this stage,
    // opens the recipient's own WhatsApp/Outlook with it already filled in, then
    // marks the task sent and schedules the next follow-up automatically.
    const handleSend = useCallback(async (task: any) => {
        setBusyId(task.id);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error('Authentication failed.');
            const prepared = await performAdminAction(token, 'prepareFollowUpMessage', { taskId: task.id });
            const { mailtoLink, whatsappLink } = prepared.data || {};
            const link = task.contactPhone ? (whatsappLink || mailtoLink) : mailtoLink;
            if (!link) {
                toast({ variant: 'destructive', title: 'No contact channel available', description: 'This record has no email or phone number.' });
                return;
            }
            window.open(link, '_blank');
            await performAdminAction(token, 'updateFollowUpTask', { taskId: task.id, mode: 'sent', channel: task.contactPhone ? 'WhatsApp' : 'Email' });
            setTasks(prev => prev.filter(t => t.id !== task.id));
            toast({ title: 'Follow-up prepared and sent', description: 'The next follow-up has been scheduled automatically.' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Could not prepare message', description: e.message });
        } finally {
            setBusyId(null);
        }
    }, [toast]);

    const grouped = useMemo(() => ({
        overdue: tasks.filter(t => t.bucket === 'overdue'),
        due_today: tasks.filter(t => t.bucket === 'due_today'),
        upcoming: tasks.filter(t => t.bucket === 'upcoming'),
    }), [tasks]);

    const actionable = useMemo(() => [...grouped.overdue, ...grouped.due_today], [grouped]);

    // Batch Mode: step through every actionable task one at a time so a whole
    // day's worth of follow-ups becomes one click per record instead of hunting
    // through the list. Uses task IDs (not object refs) so the queue stays valid
    // as tasks get removed from `tasks` on each send/skip.
    const startBatch = useCallback(() => {
        if (actionable.length === 0) return;
        setBatchQueue(actionable.map(t => t.id));
        setBatchIndex(0);
    }, [actionable]);

    const stopBatch = useCallback(() => {
        setBatchQueue(null);
        setBatchIndex(0);
    }, []);

    const currentBatchTask = useMemo(() => {
        if (!batchQueue || batchQueue.length === 0) return null;
        const id = batchQueue[batchIndex];
        return tasks.find(t => t.id === id) || null;
    }, [batchQueue, batchIndex, tasks]);

    const advanceBatch = useCallback(() => {
        setBatchIndex(prev => {
            const next = prev + 1;
            if (!batchQueue || next >= batchQueue.length) {
                setBatchQueue(null);
                return 0;
            }
            return next;
        });
    }, [batchQueue]);

    const handleBatchSend = useCallback(async (task: any) => {
        setBusyId(task.id);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error('Authentication failed.');
            if (task.actionType === 'call') {
                if (task.contactPhone) window.open(`tel:${String(task.contactPhone).replace(/\s/g, '')}`, '_self');
                await performAdminAction(token, 'updateFollowUpTask', { taskId: task.id, mode: 'sent', channel: 'Phone' });
            } else {
                const prepared = await performAdminAction(token, 'prepareFollowUpMessage', { taskId: task.id });
                const { mailtoLink, whatsappLink } = prepared.data || {};
                const link = task.contactPhone ? (whatsappLink || mailtoLink) : mailtoLink;
                if (!link) {
                    toast({ variant: 'destructive', title: 'No contact channel available', description: 'Skipping this record.' });
                    advanceBatch();
                    return;
                }
                window.open(link, '_blank');
                await performAdminAction(token, 'updateFollowUpTask', { taskId: task.id, mode: 'sent', channel: task.contactPhone ? 'WhatsApp' : 'Email' });
            }
            setTasks(prev => prev.filter(t => t.id !== task.id));
            advanceBatch();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Could not prepare message', description: e.message });
        } finally {
            setBusyId(null);
        }
    }, [toast, advanceBatch]);

    const handleBatchSkip = useCallback(() => {
        advanceBatch();
    }, [advanceBatch]);

    const savePolicy = useCallback(async () => {
        setIsSaving(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error('Authentication failed.');
            const result = await performAdminAction(token, 'saveCommunicationPolicy', { policy });
            setPolicy(result.data);
            toast({ title: 'Communication policy saved', description: 'New outreach will use these intervals.' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Save failed', description: e.message });
        } finally {
            setIsSaving(false);
        }
    }, [policy, toast]);

    if (isLoading) {
        return <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Follow-Up Register</h1>
                    <p className="mt-2 text-muted-foreground">
                        Every outreach you send is timed against the communication policy. When the interval elapses, the record appears here as a task to email or call.
                    </p>
                </div>
                <Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
            </div>

            {batchQueue ? (
                <Card className="border-primary">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <PlayCircle className="h-4 w-4 text-primary" /> Batch Mode &middot; {batchIndex + 1} of {batchQueue.length}
                            </CardTitle>
                            <Button size="sm" variant="ghost" onClick={stopBatch}><XCircle className="mr-1 h-3.5 w-3.5" /> Exit batch</Button>
                        </div>
                        <CardDescription>Send or skip each task below &mdash; the next one loads automatically.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {currentBatchTask ? (
                            <div className="space-y-3">
                                <TaskRow task={currentBatchTask} onAction={handleAction} onSend={handleBatchSend} onAssign={handleAssign} staff={staff} busyId={busyId} />
                                <div className="flex justify-end">
                                    <Button size="sm" variant="outline" onClick={handleBatchSkip} disabled={busyId === currentBatchTask.id}>
                                        <SkipForward className="mr-1 h-3.5 w-3.5" /> Skip for now
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <p className="py-6 text-center text-sm text-muted-foreground">Batch complete &mdash; nothing left in the queue.</p>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="flex justify-end">
                    <Button onClick={startBatch} disabled={actionable.length === 0}>
                        <PlayCircle className="mr-2 h-4 w-4" /> Start Batch ({actionable.length})
                    </Button>
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
                <Card><CardHeader className="pb-2"><CardDescription>Overdue</CardDescription><CardTitle className="text-3xl text-destructive">{summary.overdue}</CardTitle></CardHeader></Card>
                <Card><CardHeader className="pb-2"><CardDescription>Due today</CardDescription><CardTitle className="text-3xl text-amber-500">{summary.dueToday}</CardTitle></CardHeader></Card>
                <Card><CardHeader className="pb-2"><CardDescription>Upcoming</CardDescription><CardTitle className="text-3xl">{summary.upcoming}</CardTitle></CardHeader></Card>
            </div>

            <Tabs defaultValue="due">
                <TabsList>
                    <TabsTrigger value="due"><ListChecks className="mr-2 h-4 w-4" />Action now ({actionable.length})</TabsTrigger>
                    <TabsTrigger value="upcoming"><CalendarClock className="mr-2 h-4 w-4" />Upcoming ({grouped.upcoming.length})</TabsTrigger>
                    <TabsTrigger value="policy"><Settings2 className="mr-2 h-4 w-4" />Policy</TabsTrigger>
                </TabsList>

                <TabsContent value="due" className="mt-4 space-y-3">
                    {actionable.length === 0 ? (
                        <Alert>
                            <CheckCircle2 className="h-4 w-4" />
                            <AlertTitle>Nothing outstanding</AlertTitle>
                            <AlertDescription>No follow-ups are due. New tasks appear automatically once the policy interval elapses after an outreach.</AlertDescription>
                        </Alert>
                    ) : actionable.map(task => (
                        <TaskRow key={task.id} task={task} onAction={handleAction} onSend={handleSend} onAssign={handleAssign} staff={staff} busyId={busyId} />
                    ))}
                </TabsContent>

                <TabsContent value="upcoming" className="mt-4 space-y-3">
                    {grouped.upcoming.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">No scheduled follow-ups yet.</p>
                    ) : grouped.upcoming.map(task => (
                        <TaskRow key={task.id} task={task} onAction={handleAction} onSend={handleSend} onAssign={handleAssign} staff={staff} busyId={busyId} />
                    ))}
                </TabsContent>

                <TabsContent value="policy" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Communication Policy</CardTitle>
                            <CardDescription>
                                Set how long to wait after each type of message before a follow-up task is raised. Changes apply to outreach sent from now on.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div>
                                    <Label className="text-base">Automatic follow-up tasks</Label>
                                    <p className="text-sm text-muted-foreground">Turn off to stop new tasks being created. Existing tasks are kept.</p>
                                </div>
                                <Switch checked={policy?.enabled !== false} onCheckedChange={(checked) => setPolicy((p: any) => ({ ...p, enabled: checked }))} />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                {POLICY_FIELDS.map(field => (
                                    <div key={field.key} className="space-y-1.5">
                                        <Label htmlFor={field.key}>{field.label}</Label>
                                        <Input
                                            id={field.key}
                                            type="number"
                                            min={1}
                                            value={policy?.[field.key] ?? ''}
                                            onChange={(e) => setPolicy((p: any) => ({ ...p, [field.key]: e.target.value }))}
                                        />
                                        <p className="text-xs text-muted-foreground">{field.hint}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="escalateToCallAfterFollowUps">Escalate to a phone call after</Label>
                                    <Input
                                        id="escalateToCallAfterFollowUps"
                                        type="number"
                                        min={0}
                                        value={policy?.escalateToCallAfterFollowUps ?? ''}
                                        onChange={(e) => setPolicy((p: any) => ({ ...p, escalateToCallAfterFollowUps: e.target.value }))}
                                    />
                                    <p className="text-xs text-muted-foreground">Number of unanswered follow-ups before the task becomes &quot;call them&quot;. Set 0 to never escalate.</p>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="maxFollowUps">Maximum follow-ups per record</Label>
                                    <Input
                                        id="maxFollowUps"
                                        type="number"
                                        min={0}
                                        value={policy?.maxFollowUps ?? ''}
                                        onChange={(e) => setPolicy((p: any) => ({ ...p, maxFollowUps: e.target.value }))}
                                    />
                                    <p className="text-xs text-muted-foreground">Stop chasing after this many follow-ups. Set 0 for unlimited.</p>
                                </div>
                            </div>

                            <Button onClick={savePolicy} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Policy
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
