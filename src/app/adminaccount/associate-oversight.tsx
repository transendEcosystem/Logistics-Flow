
'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, Users, TrendingUp, DollarSign, ExternalLink, Activity, Search, RefreshCcw, ArrowRight, UserCheck, Info, AlertCircle, MousePointer2, Handshake } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { Badge } from '@/components/ui/badge';
import { getClientSideAuthToken } from '@/firebase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn, formatCurrency, formatDateSafe } from '@/lib/utils';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

async function fetchFromAdminAPI(token: string, action: string, payload?: any) {
    const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
        throw new Error(result.error || `API Error for action: ${action}`);
    }
    return result.data;
}

export default function AssociateOversight() {
    const [associates, setAssociates] = useState<any[]>([]);
    const [activity, setActivity] = useState<any[]>([]);
    const [selectedAssociate, setSelectedAssociate] = useState<any | null>(null);
    const [associateNetwork, setAssociateNetwork] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingNetwork, setIsLoadingNetwork] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const { toast } = useToast();

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");
            
            const [membersRes, activityRes] = await Promise.all([
                fetchFromAdminAPI(token, 'getMembers'),
                fetchFromAdminAPI(token, 'getAuditLogs')
            ]);
            
            // Filter members who are associates
            const associateMembers = (membersRes || []).filter((m: any) => 
                m.declaredRole === 'associate' || m.role === 'associate'
            );
            
            // Get social activity logs
            const socialActivity = (activityRes || []).filter((log: any) => 
                log.action?.startsWith('social_') || log.action === 'associate_click'
            );
            
            setAssociates(associateMembers);
            setActivity(socialActivity);
            setHasLoaded(true);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Load Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    const loadAssociateNetwork = useCallback(async (associate: any) => {
        if (!associate) return;
        setIsLoadingNetwork(true);
        setSelectedAssociate(associate);
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;
            
            const [membersRes, leadsRes] = await Promise.all([
                fetchFromAdminAPI(token, 'getMembers'),
                fetchFromAdminAPI(token, 'getLeads')
            ]);
            
            const memberNetwork = (membersRes || []).filter((m: any) => m.referrerId === associate.id);
            const leadNetwork = (leadsRes || []).filter((l: any) => l.referrerId === associate.id);
            
            setAssociateNetwork([...memberNetwork, ...leadNetwork]);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Network Load Error', description: e.message });
        } finally {
            setIsLoadingNetwork(false);
        }
    }, [toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const stats = useMemo(() => {
        const totalEarnings = associates.reduce((sum, a) => sum + (a.walletBalance || 0), 0);
        const availablePayouts = associates.reduce((sum, a) => sum + (a.availableBalance || 0), 0);
        const totalActivity = activity.length;

        return {
            count: associates.length,
            totalEarnings,
            availablePayouts,
            totalActivity
        };
    }, [associates, activity]);

    const columns: ColumnDef<any>[] = [
        {
            header: 'Associate Identity',
            cell: ({ row }) => (
                <div className="flex flex-col text-left">
                    <span className="font-bold text-foreground text-left">{row.original.companyName || `${row.original.firstName} ${row.original.lastName}`}</span>
                    <span className="text-[10px] text-muted-foreground font-mono text-left">{row.original.id}</span>
                </div>
            )
        },
        {
            header: 'Forensic Yield',
            cell: ({ row }) => (
                <div className="flex flex-col text-left">
                    <div className="flex items-center gap-1.5 text-blue-600">
                        <MousePointer2 className="h-3 w-3" />
                        <span className="font-bold text-xs">{row.original.totalClicksGenerated || 0} Clicks</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-primary mt-0.5">
                        <Handshake className="h-3 w-3" />
                        <span className="font-bold text-xs">{row.original.referralCount || 0} Handshakes</span>
                    </div>
                </div>
            )
        },
        {
            header: 'Earnings Ledger',
            cell: ({ row }) => (
                <div className="flex flex-col text-left">
                    <span className="font-bold text-green-700">{formatCurrency(row.original.availableBalance)}</span>
                    <span className="text-[9px] text-muted-foreground uppercase font-black tracking-tighter">Available for Payout</span>
                </div>
            )
        },
        {
            header: 'Activity Status',
            cell: ({ row }) => {
                const recentPost = activity.find(log => log.companyId === row.original.id);
                return (
                    <div className="flex flex-col text-left">
                        {recentPost ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1.5 py-0.5 px-2 text-left">
                                <Activity className="h-3 w-3" />
                                Active {formatDateSafe(recentPost.timestamp, "dd/MM")}
                            </Badge>
                        ) : (
                            <Badge variant="secondary" className="opacity-50">Idle</Badge>
                        )}
                    </div>
                );
            }
        },
        {
            id: 'actions',
            header: <div className="text-right">Actions</div>,
            cell: ({ row }) => (
                <div className="flex justify-end gap-2 text-foreground">
                    <Button variant="ghost" size="icon" onClick={() => loadAssociateNetwork(row.original)} className="h-8 w-8 text-foreground">
                        <Users className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" asChild className="h-8 text-[10px] font-black uppercase text-foreground">
                        <Link href={`/backend?view=wallet&memberId=${row.original.id}`}>
                            Verify & Pay
                        </Link>
                    </Button>
                </div>
            )
        }
    ];

    if (isLoading && !hasLoaded) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-left">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-sm font-black uppercase tracking-widest text-muted-foreground text-left">Mapping Associate Performance...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 text-left text-foreground">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 text-left">
                <div className="text-left text-foreground">
                    <h1 className="text-3xl font-black font-headline tracking-tight text-left">Associate Monitoring</h1>
                    <p className="text-muted-foreground text-left">Strategic oversight of creator influence and yield distribution.</p>
                </div>
                <Button variant="outline" onClick={loadData} disabled={isLoading} className="gap-2 text-foreground text-left">
                    <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    Refresh Stats
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-left text-foreground">
                <Card className="bg-primary/5 border-primary/20 text-left text-foreground">
                    <CardHeader className="pb-2 text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left">Authorized Associates</p>
                    </CardHeader>
                    <CardContent className="text-left text-foreground">
                        <div className="text-3xl font-black text-primary text-left">{stats.count}</div>
                    </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-100 text-left text-foreground">
                    <CardHeader className="pb-2 text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left">Accrued Commission</p>
                    </CardHeader>
                    <CardContent className="text-left text-foreground">
                        <div className="text-3xl font-black text-green-700 text-left">{formatCurrency(stats.totalEarnings)}</div>
                    </CardContent>
                </Card>
                <Card className="bg-amber-50 border-amber-100 text-left text-foreground">
                    <CardHeader className="pb-2 text-left text-foreground">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left text-foreground">Pending Payouts</p>
                    </CardHeader>
                    <CardContent className="text-left text-foreground">
                        <div className="text-3xl font-black text-amber-700 text-left text-foreground">{formatCurrency(stats.availablePayouts)}</div>
                    </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-100 text-left text-foreground">
                    <CardHeader className="pb-2 text-left text-foreground text-foreground">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left text-foreground text-foreground">Logged Campaigns</p>
                    </CardHeader>
                    <CardContent className="text-left text-foreground text-foreground text-foreground">
                        <div className="text-3xl font-black text-blue-700 text-left text-foreground text-foreground">{stats.totalActivity}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left text-foreground">
                <div className="lg:col-span-2 space-y-6 text-left text-foreground">
                    <Card className="shadow-xl border-none text-left text-foreground">
                        <CardHeader className="text-left border-b bg-muted/20 text-foreground">
                            <CardTitle className="text-xl font-bold flex items-center gap-2 text-left text-foreground">
                                <Handshake className="h-5 w-5 text-primary" />
                                Active Yield Roster
                            </CardTitle>
                            <CardDescription className="text-left text-muted-foreground text-foreground">Live snapshots of Associate clicks, handshakes, and payouts.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 text-left text-foreground">
                            <DataTable columns={columns} data={associates} />
                        </CardContent>
                    </Card>
                    
                    {selectedAssociate && (
                        <Card className="shadow-2xl border-primary/20 bg-white animate-in slide-in-from-bottom-4 duration-500 text-left text-foreground">
                            <CardHeader className="border-b bg-slate-900 text-white text-left text-white">
                                <div className="flex justify-between items-center text-left text-white">
                                    <div className="text-left text-white">
                                        <CardTitle className="text-lg font-black uppercase tracking-widest flex items-center gap-2 text-left text-white">
                                            <TrendingUp className="h-5 w-5 text-primary" />
                                            Referred Network: {selectedAssociate.companyName || selectedAssociate.firstName}
                                        </CardTitle>
                                        <CardDescription className="text-slate-400 text-left text-white">Viewing specific nodes.</CardDescription>
                                    </div>
                                    <button className="text-white hover:text-primary transition-colors text-foreground text-white" onClick={() => setSelectedAssociate(null)}>Close</button>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6 text-left text-foreground">
                                {isLoadingNetwork ? (
                                    <div className="py-20 text-center text-left text-foreground"><Loader2 className="animate-spin h-10 w-10 text-primary mx-auto" /></div>
                                ) : associateNetwork.length > 0 ? (
                                    <DataTable 
                                        columns={[
                                            { header: 'Entity', cell: ({row}) => <span className="font-bold text-foreground text-left">{row.original.companyName || `${row.original.firstName} ${row.original.lastName}`}</span> },
                                            { header: 'Type', cell: ({row}) => <Badge variant="outline" className="text-[9px] uppercase">{row.original.membershipId ? 'Member' : 'Lead'}</Badge> },
                                            { header: 'Date', cell: ({row}) => <span className="text-xs text-muted-foreground text-foreground">{formatDateSafe(row.original.createdAt)}</span> },
                                            { header: 'Status', cell: ({row}) => <Badge variant={row.original.status === 'active' ? 'default' : 'secondary'} className="capitalize">{row.original.status}</Badge> }
                                        ]} 
                                        data={associateNetwork} 
                                    />
                                ) : (
                                    <div className="py-20 text-center text-muted-foreground italic text-left text-foreground">No network activity recorded.</div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="space-y-6 text-left text-foreground">
                    <Card className="shadow-lg border-none text-left text-foreground">
                        <CardHeader className="text-left text-foreground">
                            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-left text-foreground">
                                <Activity className="h-4 w-4 text-primary" />
                                Recent Yield Signals
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 text-left text-foreground">
                             <ScrollArea className="h-[400px] border-t text-foreground">
                                <div className="divide-y text-left text-foreground">
                                    {activity.map(log => (
                                        <div key={log.id} className="p-4 space-y-2 text-left bg-white hover:bg-slate-50 transition-colors">
                                            <div className="flex justify-between items-start text-left text-foreground">
                                                <div className="flex items-center gap-2 text-left text-foreground">
                                                    <Badge className={cn("border-none uppercase text-[8px] h-4", log.action === 'associate_click' ? "bg-blue-600 text-white" : "bg-primary text-white")}>
                                                        {log.action === 'associate_click' ? 'CLICK' : 'POST'}
                                                    </Badge>
                                                    <span className="text-xs font-bold text-left">{log.userName || 'System'}</span>
                                                </div>
                                                <span className="text-[9px] font-mono text-muted-foreground text-left">
                                                    {formatDateSafe(log.timestamp, "dd MMM, HH:mm")}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground leading-tight italic text-left text-foreground">
                                                {log.details}
                                            </p>
                                        </div>
                                    ))}
                                    {activity.length === 0 && (
                                        <div className="p-12 text-center text-muted-foreground opacity-50 space-y-2 text-left text-foreground">
                                            <Activity className="h-8 w-8 mx-auto" />
                                            <p className="text-xs font-bold uppercase tracking-widest text-center">No signals recorded yet</p>
                                        </div>
                                    )}
                                </div>
                             </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
