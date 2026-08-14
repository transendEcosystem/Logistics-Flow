'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Truck, Handshake, ShieldCheck, Search, FileText, CheckCircle, XCircle, ArrowRight, RefreshCcw, DollarSign, Database, Gavel } from 'lucide-react';
import { getClientSideAuthToken } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDateSafe, cn } from '@/lib/utils';
import Link from 'next/link';

async function performAdminAction(token: string, action: string, payload?: any) {
    const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
        cache: 'no-store'
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || `API Error: ${action}`);
    return result;
}

export default function LoadsOversight() {
    const [agreements, setAgreements] = useState<any[]>([]);
    const [loads, setLoads] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
    const { toast } = useToast();

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;

            const [agreementsRes, loadsRes] = await Promise.all([
                performAdminAction(token, 'getBrokerAgreements'),
                performAdminAction(token, 'getGlobalLoads')
            ]);

            setAgreements(agreementsRes.data || []);
            setLoads(loadsRes.data || []);
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Oversight Load Failed", description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleVerifyAgreement = async (agreement: any, status: 'verified' | 'rejected') => {
        setIsActionLoading(agreement.id);
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;

            await performAdminAction(token, 'updateBrokerAgreementStatus', { 
                path: agreement.path, 
                status 
            });

            toast({ title: `Appointment ${status.charAt(0).toUpperCase() + status.slice(1)}` });
            loadData();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Action Failed", description: e.message });
        } finally {
            setIsActionLoading(null);
        }
    };

    const agreementColumns: ColumnDef<any>[] = [
        { 
            header: 'Member / Primary',
            cell: ({row}) => (
                <div className="flex flex-col text-left">
                    <span className="font-bold text-foreground">{row.original.brokerName}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{row.original.brokerId}</span>
                </div>
            )
        },
        { 
            header: 'Legal Basis',
            cell: ({row}) => (
                <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-foreground">{row.original.providerName}</span>
                    <span className="text-[9px] text-primary font-black uppercase">Clause: {row.original.subcontractingClause || 'MISSING'}</span>
                </div>
            )
        },
        { 
            header: 'Audit Documents',
            cell: ({row}) => (
                <div className="flex flex-col gap-1 text-left">
                    <Button variant="ghost" size="sm" asChild className="h-7 text-[9px] font-black uppercase text-primary gap-1 justify-start">
                        <a href={row.original.primaryContractUrl} target="_blank" rel="noopener noreferrer">
                            <FileText className="h-3 w-3" /> Primary Contract
                        </a>
                    </Button>
                    <Button variant="ghost" size="sm" asChild className="h-7 text-[9px] font-black uppercase text-primary gap-1 justify-start">
                        <a href={row.original.subcontractorAgreementUrl} target="_blank" rel="noopener noreferrer">
                            <ShieldCheck className="h-3 w-3" /> Trust Binding
                        </a>
                    </Button>
                </div>
            )
        },
        { 
            header: 'Status',
            cell: ({row}) => (
                <Badge variant={row.original.status === 'verified' ? 'default' : 'secondary'} className="capitalize text-[10px] font-black">
                    {row.original.status}
                </Badge>
            )
        },
        {
            id: 'actions',
            header: <div className="text-right">Audit Action</div>,
            cell: ({ row }) => (
                <div className="flex justify-end gap-2">
                    {row.original.status === 'pending' && (
                        <>
                            <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700 text-white" onClick={() => handleVerifyAgreement(row.original, 'verified')} disabled={!!isActionLoading}>
                                {isActionLoading === row.original.id ? <Loader2 className="h-3 w-3 animate-spin"/> : <CheckCircle className="h-4 w-4 mr-1" />}
                                Verify
                            </Button>
                            <Button size="sm" variant="destructive" className="h-8" onClick={() => handleVerifyAgreement(row.original, 'rejected')} disabled={!!isActionLoading}>
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                            </Button>
                        </>
                    )}
                </div>
            )
        }
    ];

    const loadColumns: ColumnDef<any>[] = [
        { 
            header: 'Freight Flow',
            cell: ({row}) => (
                <div className="flex items-center gap-2 font-bold text-sm text-foreground text-left">
                    {row.original.origin} <ArrowRight className="h-3 w-3 opacity-30" /> {row.original.destination}
                </div>
            )
        },
        { 
            header: 'Broker',
            cell: ({row}) => <span className="text-xs font-medium">{row.original.brokerName}</span>
        },
        { 
            header: 'Platform Yield',
            cell: ({row}) => (
                <div className="flex flex-col text-left">
                    <span className="font-black text-green-700">{formatCurrency(row.original.platformFee)}</span>
                    <span className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter">2.5% Success Fee</span>
                </div>
            )
        },
        { 
            header: 'Status',
            cell: ({row}) => <Badge className="capitalize text-[9px] font-black tracking-widest">{row.original.status}</Badge>
        }
    ];

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-sm font-black uppercase tracking-widest text-muted-foreground text-left">Synchronizing Loads Mall Data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 text-left text-foreground">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 text-left">
                <div className="text-left text-foreground">
                    <h1 className="text-3xl font-black font-headline tracking-tight flex items-center gap-3 text-left">
                        <Truck className="h-8 w-8 text-primary" />
                        Loads Mall Oversight
                    </h1>
                    <p className="text-muted-foreground mt-1 text-left">Management of subcontractor authorizations and national freight registry.</p>
                </div>
                <Button variant="outline" onClick={loadData} className="gap-2 text-left">
                    <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    Refresh Mall Data
                </Button>
            </div>

            <Tabs defaultValue="authorizations" className="w-full text-left text-foreground">
                <TabsList className="bg-muted/50 p-1 h-auto flex-wrap justify-start text-left">
                    <TabsTrigger value="authorizations" className="gap-2 px-6 py-2.5 font-bold uppercase tracking-widest text-[10px]">
                        <Gavel className="h-3.5 w-3.5" /> Legal Rights Queue
                    </TabsTrigger>
                    <TabsTrigger value="registry" className="gap-2 px-6 py-2.5 font-bold uppercase tracking-widest text-[10px]">
                        <Database className="h-3.5 w-3.5" /> Global Loads Board
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="authorizations" className="mt-8 text-left text-foreground">
                    <Card className="border-none shadow-xl text-left">
                        <CardHeader className="border-b bg-muted/10 text-left">
                            <CardTitle className="text-lg flex items-center gap-2 text-foreground text-left">
                                <Handshake className="h-5 w-5 text-primary" />
                                Subcontractor Appointments Audit
                            </CardTitle>
                            <CardDescription className="text-left">Verify primary contract rights and no-circumvention trust bindings.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 text-left">
                            <DataTable columns={agreementColumns} data={agreements} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="registry" className="mt-8 text-left text-foreground">
                    <Card className="border-none shadow-xl text-left">
                        <CardHeader className="border-b bg-muted/10 text-left">
                            <CardTitle className="text-lg flex items-center gap-2 text-foreground text-left">
                                <Database className="h-5 w-5 text-primary" />
                                National Freight Audit
                            </CardTitle>
                            <CardDescription className="text-left">Comprehensive view of all loads currently active or historical in the ecosystem.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 text-left">
                            <DataTable columns={loadColumns} data={loads} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}