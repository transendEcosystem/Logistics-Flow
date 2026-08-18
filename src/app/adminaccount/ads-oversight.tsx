
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Zap, RefreshCcw, CheckCircle, XCircle, Eye, ExternalLink, MousePointer2 } from 'lucide-react';
import { getClientSideAuthToken } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDateSafe, cn } from '@/lib/utils';

async function performAdminAction(token: string, action: string, payload?: any) {
    const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
        cache: 'no-store'
    });
    return await response.json();
}

export default function AdsOversight() {
    const [ads, setAds] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
    const { toast } = useToast();

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;
            const res = await performAdminAction(token, 'getGlobalAds', {});
            setAds(res.data || []);
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Load Failed", description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleStatus = async (ad: any, status: string) => {
        setIsActionLoading(ad.id);
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;
            await performAdminAction(token, 'updateAdStatus', { adId: ad.id, companyId: ad.companyId, status });
            toast({ title: `Ad ${status.replace('_', ' ')}` });
            loadData();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Update Failed", description: e.message });
        } finally {
            setIsActionLoading(null);
        }
    };

    const columns: ColumnDef<any>[] = [
        { 
            header: 'Campaign / Advertiser', 
            cell: ({row}) => (
                <div className="flex flex-col text-left">
                    <span className="font-bold">{row.original.title}</span>
                    <span className="text-[10px] text-primary font-black uppercase tracking-widest">{row.original.companyName}</span>
                </div>
            )
        },
        { 
            header: 'Consumption Ledger', 
            cell: ({row}) => (
                <div className="flex flex-col text-left">
                    <span className="font-black text-foreground">{(row.original.metrics?.impressions || 0).toLocaleString()} / {row.original.totalInstances?.toLocaleString()}</span>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase">Views Served</p>
                </div>
            )
        },
        { 
            header: 'Yield', 
            cell: ({row}) => (
                <div className="flex items-center gap-2 text-left">
                    <MousePointer2 className="h-3 w-3 text-blue-600" />
                    <span className="font-bold text-blue-700">{row.original.metrics?.clicks || 0}</span>
                </div>
            ) 
        },
        { 
            header: 'Target', 
            cell: ({row}) => <Badge variant="outline" className="capitalize text-[10px] font-black border-primary text-primary">{row.original.targetAudience}</Badge> 
        },
        { 
            header: 'Status', 
            cell: ({row}) => <Badge className="capitalize text-[10px] font-bold">{row.original.status || 'Active'}</Badge> 
        },
        {
            id: 'actions',
            header: <div className="text-right">Action</div>,
            cell: ({ row }) => (
                <div className="flex justify-end gap-2">
                    {row.original.status === 'pending_approval' && (
                        <>
                            <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700 text-white font-bold" onClick={() => handleStatus(row.original, 'active')} disabled={!!isActionLoading}>
                                {isActionLoading === row.original.id ? <Loader2 className="h-3 w-3 animate-spin"/> : <CheckCircle className="h-4 w-4" />}
                                Approve
                            </Button>
                            <Button size="sm" variant="destructive" className="h-8" onClick={() => handleStatus(row.original, 'rejected')} disabled={!!isActionLoading}>
                                <XCircle className="h-4 w-4" />
                            </Button>
                        </>
                    )}
                    <Button variant="ghost" size="icon" asChild>
                        <a href={row.original.creativeUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-8 text-left text-foreground">
            <div className="flex justify-between items-end">
                <div className="text-left">
                    <h1 className="text-3xl font-black font-headline tracking-tight flex items-center gap-3">
                        <Zap className="h-8 w-8 text-primary" />
                        Industrial Ad Oversight
                    </h1>
                    <p className="text-muted-foreground mt-1">Oversight of visibility consumption and behavioral conversion yield.</p>
                </div>
                <Button variant="outline" onClick={loadData} disabled={isLoading}>
                    <RefreshCcw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                    Refresh Ledger
                </Button>
            </div>

            <Card className="border-none shadow-xl bg-white text-left">
                <CardContent className="pt-6 text-left">
                    {isLoading ? <div className="flex justify-center p-20"><Loader2 className="animate-spin h-10 w-10 text-primary mx-auto" /></div> : <DataTable columns={columns} data={ads} />}
                </CardContent>
            </Card>
        </div>
    );
}
