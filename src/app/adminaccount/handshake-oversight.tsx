
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, Handshake, Zap, Clock, ArrowRight, RefreshCcw, CheckCircle, XCircle, Search, Filter, Info, AlertTriangle, TrendingUp, Save, Edit } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { Badge } from '@/components/ui/badge';
import { getClientSideAuthToken } from '@/firebase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn, formatCurrency, formatDateSafe } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';

async function fetchFromAdminAPI(token: string, action: string, payload?: any) {
    const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
        cache: 'no-store'
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || `API Error for action: ${action}`);
    return result.data;
}

function ResultDialog({ handshake, onUpdate }: { handshake: any, onUpdate: () => void }) {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState(handshake.status || 'pending');
    const [resultNote, setResultNote] = useState(handshake.result || '');

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;

            await fetchFromAdminAPI(token, 'updateHandshakeResult', {
                pingId: handshake.id,
                status,
                result: resultNote
            });

            toast({ title: "Result Recorded" });
            onUpdate();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Save Failed" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <DialogContent className="text-left text-foreground">
            <DialogHeader>
                <DialogTitle>Audit Handshake Outcome</DialogTitle>
                <DialogDescription>Record the final performance result of this commercial introduction.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 text-left">
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Current Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="bg-white"><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pending">Awaiting Contact</SelectItem>
                            <SelectItem value="negotiating">Negotiation Active</SelectItem>
                            <SelectItem value="closed">Deal Concluded</SelectItem>
                            <SelectItem value="lost">No Match / Lost</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Forensic Note (Result)</Label>
                    <Textarea 
                        value={resultNote} 
                        onChange={e => setResultNote(e.target.value)} 
                        placeholder="e.g. Member closed R50k tire deal."
                        className="bg-white"
                    />
                </div>
            </div>
            <DialogFooter>
                <Button onClick={handleSave} disabled={isSaving} className="w-full">
                    {isSaving ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : <Save className="h-4 w-4 mr-2" />}
                    Save Outcome
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}

export default function HandshakeOversight() {
    const { toast } = useToast();
    const [handshakes, setHandshakes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;
            const data = await fetchFromAdminAPI(token, 'getGlobalHandshakes');
            setHandshakes(data || []);
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Registry Error", description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => { loadData(); }, [loadData]);

    const stats = useMemo(() => {
        const total = handshakes.length;
        const conversions = handshakes.filter(h => h.status === 'closed').length;
        const unclaimedHits = handshakes.filter(h => !h.isClaimed).length;
        
        return { total, conversions, unclaimedHits };
    }, [handshakes]);

    const columns: ColumnDef<any>[] = [
        {
            header: 'Introduction Node',
            cell: ({ row }) => (
                <div className="flex flex-col text-left">
                    <span className="font-bold text-foreground text-left">{row.original.engagerName}</span>
                    <div className="flex items-center gap-1.5 mt-1">
                        <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                        <span className="text-xs font-medium">{row.original.targetName}</span>
                    </div>
                </div>
            )
        },
        {
            header: 'Standing',
            cell: ({ row }) => (
                <div className="flex flex-col text-left">
                    {row.original.isClaimed ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[8px] h-4 uppercase font-black">Member Handshake</Badge>
                    ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[8px] h-4 uppercase font-black animate-pulse">Upsell Opportunity</Badge>
                    )}
                </div>
            )
        },
        {
            header: 'Yield Note',
            cell: ({ row }) => <span className="text-xs text-muted-foreground italic text-left">"{row.original.result || 'Pending...'}"</span>
        },
        {
            header: 'Next Follow-up',
            cell: ({ row }) => {
                const isOverdue = new Date(row.original.nextFollowUpAt) < new Date();
                return (
                    <div className="flex items-center gap-2 text-left">
                        <Clock className={cn("h-3 w-3", isOverdue ? "text-destructive" : "text-muted-foreground")} />
                        <span className={cn("text-[10px] font-bold uppercase", isOverdue && "text-destructive")}>
                            {formatDateSafe(row.original.nextFollowUpAt, "dd MMM")}
                        </span>
                    </div>
                );
            }
        },
        {
            id: 'actions',
            header: <div className="text-right">Actions</div>,
            cell: ({ row }) => (
                <div className="flex justify-end gap-1 text-left">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                        </DialogTrigger>
                        <ResultDialog handshake={row.original} onUpdate={loadData} />
                    </Dialog>
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={`/adminaccount?view=wallet&memberId=${row.original.engagerId}`}><ArrowRight className="h-4 w-4" /></Link>
                    </Button>
                </div>
            )
        }
    ];

    if (isLoading) return <div className="flex justify-center p-32"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

    return (
        <div className="space-y-8 text-left text-foreground">
            <div className="flex justify-between items-end">
                <div className="text-left text-foreground">
                    <h1 className="text-3xl font-black font-headline tracking-tight flex items-center gap-3 text-left">
                        <Handshake className="h-8 w-8 text-primary" />
                        Handshake Oversight
                    </h1>
                    <p className="text-muted-foreground mt-1 text-left">Monitoring industrial introductions and performance yields.</p>
                </div>
                <Button variant="outline" onClick={loadData} className="gap-2 text-foreground">
                    <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    Refresh Ledger
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                <Card className="bg-primary/5 border-primary/20 text-left">
                    <CardHeader className="pb-2 text-left"><p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Introductions Created</p></CardHeader>
                    <CardContent><div className="text-3xl font-black text-left">{stats.total}</div></CardContent>
                </Card>
                <Card className="bg-amber-50 border-amber-200 text-left">
                    <CardHeader className="pb-2 text-left"><p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Upsell Potential (Unclaimed)</p></CardHeader>
                    <CardContent><div className="text-3xl font-black text-amber-700 text-left">{stats.unclaimedHits}</div></CardContent>
                </Card>
                <Card className="bg-green-50 border-green-100 text-left text-foreground">
                    <CardHeader className="pb-2 text-left"><p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Concluded Deals</p></CardHeader>
                    <CardContent><div className="text-3xl font-black text-green-700 text-left">{stats.conversions}</div></CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-xl bg-white overflow-hidden text-left">
                <CardContent className="pt-6 text-left">
                    <DataTable columns={columns} data={handshakes} />
                </CardContent>
            </Card>
        </div>
    );
}
