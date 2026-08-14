'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    Loader2, ClipboardList, CheckCircle, FileText, Send, Landmark, 
    ArrowRight, UserCheck, ShieldCheck, Zap, Info, Search, Building, Clock, Mail, Phone, FileSignature,
    AlertTriangle, RefreshCcw, Lock, Tag, SearchCode, Database, Banknote, ListChecks, ArrowUpRight,
    Activity, Scale
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getClientSideAuthToken, useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDateSafe, cn } from '@/lib/utils';
import { collectionGroup, query, orderBy, limit, where } from 'firebase/firestore';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function LenderDeskContent() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    // 1. FETCH ALL ENQUIRIES (The Unified Intake Ledger)
    const enquiriesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collectionGroup(firestore, 'enquiries'), orderBy('updatedAt', 'desc'), limit(500));
    }, [firestore]);
    const { data: allEnquiries, isLoading, forceRefresh } = useCollection(enquiriesQuery);

    // 2. UNIFIED TRIAGE LOGIC
    const triageItems = useMemo(() => {
        if (!allEnquiries) return [];
        return allEnquiries.filter((enquiry: any) => {
            const isNew = enquiry.status === 'pending';
            const hasGaps = !enquiry.userIdUrl || !enquiry.afsDocUrl;
            return isNew || hasGaps;
        });
    }, [allEnquiries]);

    const activeReviewItems = useMemo(() => {
        if (!allEnquiries) return [];
        return allEnquiries.filter((enquiry: any) => enquiry.status === 'under_review');
    }, [allEnquiries]);

    const columns: ColumnDef<any>[] = [
        {
            header: 'Entity / Channel',
            cell: ({ row }) => (
                <div className="flex flex-col text-left">
                    <span className="font-bold text-foreground text-left">{row.original.companyLegalName || row.original.name || 'Provisional Borrower'}</span>
                    <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant={row.original.originationType === 'direct' ? 'default' : 'outline'} className={cn(
                            "text-[8px] h-3.5 uppercase font-black px-1.5",
                            row.original.originationType === 'market' && "border-primary/30 text-primary"
                        )}>
                            {row.original.originationType || 'Direct'}
                        </Badge>
                        <span className="text-[9px] text-muted-foreground font-mono uppercase text-left">{row.original.id.slice(-6)}</span>
                    </div>
                </div>
            )
        },
        {
            header: 'Forensic Health',
            cell: ({ row }) => {
                const missingDocs = [];
                if (!row.original.userIdUrl) missingDocs.push('ID');
                if (!row.original.afsDocUrl) missingDocs.push('AFS');
                if (row.original.entityType?.includes('Pty') && !row.original.registrationDocUrl) missingDocs.push('CIPC');

                return (
                    <div className="flex flex-col gap-1.5 items-start text-left text-foreground">
                        {missingDocs.length > 0 ? (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[8px] h-4 uppercase font-black">
                                <AlertTriangle className="h-2.5 w-2.5 mr-1" /> Missing: {missingDocs.join(', ')}
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[8px] h-4 uppercase font-black">
                                <CheckCircle className="h-2.5 w-2.5 mr-1" /> Data Secure
                            </Badge>
                        )}
                        <div className="flex items-center gap-1">
                             <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <div className={cn("p-1 rounded bg-muted/40", row.original.hasJudgements && "bg-destructive/10 text-destructive")}>
                                            <Scale className="h-3 w-3" />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="text-[10px] font-bold uppercase">
                                        {row.original.hasJudgements ? 'Exception: Judgements' : 'Registry Clean'}
                                    </TooltipContent>
                                </Tooltip>
                             </TooltipProvider>
                        </div>
                    </div>
                );
            }
        },
        {
            header: 'Enquiry Value',
            cell: ({ row }) => (
                <div className="flex flex-col text-left">
                    <span className="font-black text-primary text-sm">{formatCurrency(row.original.amountRequested)}</span>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">{row.original.fundingNeed?.replace(/-/g, ' ')}</span>
                </div>
            )
        },
        {
            header: 'Audit Status',
            cell: ({ row }) => (
                <Badge variant={row.original.status === 'under_review' ? 'default' : 'secondary'} className="capitalize text-[9px] font-black tracking-widest text-left">
                    {row.original.status?.replace(/_/g, ' ')}
                </Badge>
            )
        },
        {
            id: 'actions',
            header: <div className="text-right">Audit</div>,
            cell: ({ row }) => (
                <div className="text-right">
                    <Button variant="ghost" size="sm" asChild className="h-8 text-[10px] font-black uppercase tracking-widest gap-1.5 text-left text-foreground">
                        <Link href={`/lending/clients/${row.original.companyId}`}>
                            Open Case <ArrowUpRight className="h-3 w-3" />
                        </Link>
                    </Button>
                </div>
            )
        }
    ];

    if (isUserLoading || isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-left">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Synchronizing Master Ledger...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 text-left text-foreground">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 text-left">
                <div className="text-left text-foreground">
                    <h1 className="text-3xl font-black font-headline tracking-tight flex items-center gap-3 text-left">
                        <ListChecks className="h-8 w-8 text-primary" />
                        Master Action Ledger
                    </h1>
                    <p className="text-muted-foreground mt-1 text-left">Unified triage for Direct and Mall-originated funding requests.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => forceRefresh()} className="gap-2 text-foreground">
                    <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    Refresh Ledger
                </Button>
            </div>

            <Tabs defaultValue="triage" className="w-full text-left text-foreground">
                <TabsList className="bg-muted/30 p-1 h-auto flex-wrap justify-start border border-muted text-left">
                    <TabsTrigger value="triage" className="gap-2 px-6 py-2.5 font-bold uppercase tracking-widest text-[10px]">
                        <Zap className="h-3.5 w-3.5" /> Pending Triage ({triageItems.length})
                    </TabsTrigger>
                    <TabsTrigger value="active" className="gap-2 px-6 py-2.5 font-bold uppercase tracking-widest text-[10px]">
                        <Activity className="h-3.5 w-3.5" /> Under Analysis ({activeReviewItems.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="triage" className="mt-8 text-left text-foreground">
                    <Card className="border-none shadow-xl bg-white overflow-hidden text-left">
                        <CardHeader className="bg-slate-50 border-b p-6 text-left">
                            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-left">
                                <Info className="h-4 w-4 text-primary" />
                                Actionable Intake Queue
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 text-left">
                            {triageItems.length > 0 ? (
                                <DataTable columns={columns} data={triageItems} />
                            ) : (
                                <div className="py-24 text-center space-y-4">
                                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 opacity-20" />
                                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest text-center">Intake Clear</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="active" className="mt-8 text-left text-foreground">
                    <Card className="border-none shadow-xl bg-white overflow-hidden text-left">
                        <CardContent className="pt-6">
                            {activeReviewItems.length > 0 ? (
                                <DataTable columns={columns} data={activeReviewItems} />
                            ) : (
                                <div className="py-20 text-center border-2 border-dashed rounded-2xl bg-muted/10 text-left">
                                    <Clock className="h-10 w-10 mx-auto text-muted-foreground opacity-30" />
                                    <p className="text-sm font-bold text-muted-foreground mt-4 text-center">No active analysis sessions in progress.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
