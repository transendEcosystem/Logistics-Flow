'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Loader2, Save, RefreshCw, Phone, Mail, AlarmClock, CalendarClock,
    CheckCircle2, AlertTriangle, Clock, Trash2, Settings2, ListChecks
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

function TaskRow({ task, onAction, busyId }: { task: any; onAction: (task: any, mode: string, extra?: any) => void; busyId: string | null }) {
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
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={busy} onClick={() => onAction(task, 'snooze', { hours: 24 })}>
                    <Clock className="mr-1 h-3.5 w-3.5" /> Snooze 24h
                </Button>
                <Button size="sm" disabled={busy} onClick={() => onAction(task, 'complete')}>
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

    const load = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error('Authentication failed.');
            const [register, policyResult] = await Promise.all([
                performAdminAction(token, 'getFollowUpRegister', {}),
                performAdminAction(token, 'getCommunicationPolicy', {}),
            ]);
            setTasks(register.data || []);
            setSummary(register.summary || { overdue: 0, dueToday: 0, upcoming: 0 });
            setPolicy(policyResult.data);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Could not load the register', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => { load(); }, [load]);

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

    const grouped = useMemo(() => ({
        overdue: tasks.filter(t => t.bucket === 'overdue'),
        due_today: tasks.filter(t => t.bucket === 'due_today'),
        upcoming: tasks.filter(t => t.bucket === 'upcoming'),
    }), [tasks]);

    const actionable = useMemo(() => [...grouped.overdue, ...grouped.due_today], [grouped]);

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
                        <TaskRow key={task.id} task={task} onAction={handleAction} busyId={busyId} />
                    ))}
                </TabsContent>

                <TabsContent value="upcoming" className="mt-4 space-y-3">
                    {grouped.upcoming.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">No scheduled follow-ups yet.</p>
                    ) : grouped.upcoming.map(task => (
                        <TaskRow key={task.id} task={task} onAction={handleAction} busyId={busyId} />
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
