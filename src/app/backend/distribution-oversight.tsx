
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Network, RefreshCcw, Search, ArrowRight, ShieldCheck, MapPin } from 'lucide-react';
import { getClientSideAuthToken } from '@/firebase';
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
    if (!response.ok || !result.success) throw new Error(result.error || `API Error for action: ${action}`);
    return result;
}

export default function DistributionOversight() {
    const [records, setRecords] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;
            // Distributors are mapped under 'distributor' in registry
            const res = await performAdminAction(token, 'searchRegistry', { type: 'distributor', limit: 500 });
            setRecords(res.data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const columns: ColumnDef<any>[] = [
        {
            header: 'Distribution Identity',
            cell: ({ row }) => (
                <div className="flex flex-col text-left">
                    <span className="font-bold text-foreground">{row.original.companyName}</span>
                    <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="outline" className="text-[8px] h-3.5 uppercase font-black border-primary/20 text-primary">Urban Spoke</Badge>
                        <span className="text-[9px] text-muted-foreground font-mono">{row.original.id}</span>
                    </div>
                </div>
            )
        },
        {
            header: 'Operational Hub',
            cell: ({ row }) => (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold">
                    <MapPin className="h-3.5 w-3.5" />
                    {row.original.address || 'Inner-City Grid'}
                </div>
            )
        },
        {
            header: 'Status',
            cell: ({ row }) => <Badge variant={row.original.status === 'active' ? 'default' : 'secondary'} className="capitalize text-[10px] font-black">{row.original.status}</Badge>
        },
        {
            id: 'actions',
            header: <div className="text-right">Actions</div>,
            cell: ({ row }) => (
                <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" asChild className="h-8 text-[10px] font-black uppercase">
                        <Link href={`/adminaccount?view=wallet&memberId=${row.original.id}`}>
                            Audit <ArrowRight className="ml-1 h-3 w-3" />
                        </Link>
                    </Button>
                </div>
            )
        }
    ];

    if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

    return (
        <div className="space-y-8 text-left text-foreground">
            <div className="flex justify-between items-end">
                <div className="text-left">
                    <h1 className="text-3xl font-black font-headline tracking-tight flex items-center gap-3">
                        <Network className="h-8 w-8 text-primary" />
                        Distribution Mall Oversight
                    </h1>
                    <p className="text-muted-foreground mt-1">Management of local urban fleet capacity and inner-city spoke nodes.</p>
                </div>
                <Button variant="outline" onClick={loadData} disabled={isLoading}>
                    <RefreshCcw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                    Refresh Mall
                </Button>
            </div>

            <Card className="border-none shadow-xl">
                <CardContent className="pt-6">
                    <DataTable columns={columns} data={records} />
                </CardContent>
            </Card>
        </div>
    );
}
