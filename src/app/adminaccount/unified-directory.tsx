
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, Search, Database, Globe, UserCheck, ShieldAlert, Send, RefreshCcw, RotateCcw, Sparkles, Zap, ShieldCheck } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { Badge } from '@/components/ui/badge';
import { getClientSideAuthToken } from '@/firebase';
import { Button } from '@/components/ui/button';
import { PartnerOversightDialog } from './marketing/PartnerOversightDialog';
import MemberActionMenu from '@/app/backend/member-action-menu';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { cn, formatDateSafe } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

async function performAdminAction(token: string, action: string, payload?: any) {
    const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, payload }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
        throw new Error(result.error || `API Error for action: ${action}`);
    }
    return result.data;
}

export default function UnifiedDirectory() {
    const [members, setMembers] = useState<any[]>([]);
    const [leads, setLeads] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");
            
            const [membersRes, leadsRes] = await Promise.all([
                performAdminAction(token, 'getMembers'),
                performAdminAction(token, 'getLeads')
            ]);
            
            setMembers(membersRes || []);
            setLeads(leadsRes || []);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Load Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => { loadData(); }, [loadData]);

    const combinedData = useMemo(() => {
        const enrichedMembers = members.map(m => ({ ...m, source: 'Member', status: m.status || 'active' }));
        const enrichedLeads = leads.map(l => ({ ...l, source: 'Lead', status: l.status || 'new' }));
        
        return [...enrichedMembers, ...enrichedLeads].sort((a,b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
        });
    }, [members, leads]);

    const columns: ColumnDef<any>[] = [
        {
            header: 'Entity Name',
            cell: ({ row }) => (
                <div className="flex flex-col text-left">
                    <span className="font-bold text-foreground text-left">{row.original.companyName || `${row.original.firstName} ${row.original.lastName}`}</span>
                    <div className="flex items-center gap-2 mt-1">
                         <Badge variant={row.original.source === 'Member' ? 'default' : 'outline'} className="text-[10px] uppercase h-4">
                            {row.original.source}
                        </Badge>
                        <span className="text-[10px] font-black text-muted-foreground uppercase">{row.original.entryType || row.original.type || 'General'}</span>
                    </div>
                </div>
            )
        },
        {
            header: 'Data Fidelity',
            cell: ({ row }) => {
                const isHealed = !!(row.original.minedServiceWording || row.original.notes);
                const hasContacts = !!(row.original.marketingManager?.email || row.original.email);
                
                return (
                    <div className="flex items-center gap-2 text-left">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <div className={cn("p-1 rounded-md transition-colors", isHealed ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground/30")}>
                                        <Sparkles className="h-4 w-4" />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent className="text-[10px] font-bold">
                                    {isHealed ? "Forensic Technical Data Mined" : "Unmined Node"}
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger>
                                    <div className={cn("p-1 rounded-md transition-colors", hasContacts ? "bg-blue-100 text-blue-600" : "bg-muted text-muted-foreground/30")}>
                                        <ShieldCheck className="h-4 w-4" />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent className="text-[10px] font-bold">
                                    {hasContacts ? "Direct Stakeholder Verified" : "Contacts Missing"}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                )
            }
        },
        {
            header: 'Fiduciary / Referral Node',
            cell: ({ row }) => (
                <div className="flex flex-col text-left">
                    <p className="text-xs font-bold text-primary">{row.original.referrerName || 'Direct Node'}</p>
                    <p className="text-[9px] text-muted-foreground font-mono uppercase">{row.original.referrerId || 'SYSTEM'}</p>
                </div>
            )
        },
        {
            header: 'Engagement Result',
            cell: ({ row }) => {
                if (!row.original.lastOutreachSubject) return <span className="text-xs text-muted-foreground italic">No Outreach</span>;
                return (
                    <div className="flex flex-col text-left">
                        <Badge variant="outline" className="text-[9px] h-4 uppercase font-bold border-primary/20 text-primary w-fit">{row.original.lastOutreachSubject}</Badge>
                        {row.original.lastOpenedAt && (
                            <div className="flex items-center gap-1 text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 mt-1 w-fit">
                                <UserCheck className="h-2.5 w-2.5" /> Read
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => (
                <Badge variant={['active', 'qualified'].includes(row.original.status) ? 'default' : 'secondary'} className="capitalize text-[10px]">
                    {row.original.status}
                </Badge>
            )
        },
        {
            id: 'actions',
            header: <div className="text-right">Actions</div>,
            cell: ({ row }) => (
                <div className="flex justify-end gap-1">
                    {row.original.source === 'Lead' ? (
                        <>
                            <Button variant="ghost" size="icon" asChild title="Engage">
                                <Link href={`/adminaccount?view=marketing-suppliers&subview=management&engage=${row.original.id}`}>
                                    <Send className="h-4 w-4 text-primary" />
                                </Link>
                            </Button>
                            <PartnerOversightDialog partner={row.original} onUpdate={loadData} />
                        </>
                    ) : (
                        <MemberActionMenu member={row.original} onUpdate={loadData} />
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6 text-left">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                <Card className="bg-primary/5 border-primary/10">
                    <CardContent className="pt-6 text-left">
                        <div className="flex items-center gap-4 text-left">
                            <Database className="h-8 w-8 text-primary" />
                            <div className="text-left">
                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-left">Aggregated Snap</p>
                                <p className="text-2xl font-black text-left">{combinedData.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-100">
                    <CardContent className="pt-6 text-left">
                        <div className="flex items-center gap-4">
                            <UserCheck className="h-8 w-8 text-blue-600" />
                            <div className="text-left">
                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-left">Active Members</p>
                                <p className="text-2xl font-black text-blue-700 text-left">{members.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-amber-50 border-amber-100">
                    <CardContent className="pt-6 text-left">
                        <div className="flex items-center gap-4">
                            <Globe className="h-8 w-8 text-amber-600" />
                            <div className="text-left">
                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-left">Provisional Leads</p>
                                <p className="text-2xl font-black text-amber-700 text-left">{leads.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="text-left">
                <CardHeader className="flex flex-row items-center justify-between text-left">
                    <div className="text-left">
                        <CardTitle className="flex items-center gap-2 text-left text-foreground font-black font-headline"><Users className="h-6 w-6 text-primary" /> Unified Industry Directory</CardTitle>
                        <CardDescription className="text-left text-muted-foreground">Forensic view of all platform entities and their referring partners.</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading} className="text-foreground">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RotateCcw className="mr-2 h-4 w-4" />}
                        Sync Registry
                    </Button>
                </CardHeader>
                <CardContent className="text-left">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="animate-spin h-10 w-10 text-primary mx-auto" />
                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Mapping Master Directory...</p>
                        </div>
                    ) : (
                        <DataTable columns={columns} data={combinedData} />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
