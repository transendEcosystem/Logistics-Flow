
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, RefreshCcw, User, Clock, ArrowRight, Tag, MapPin } from 'lucide-react';
import { getClientSideAuthToken } from '@/firebase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { formatDateSafe, cn } from '@/lib/utils';
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

export default function SearchIntelligence() {
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;
            const data = await fetchFromAdminAPI(token, 'getGlobalSearchLogs');
            setLogs(data || []);
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Log Fetch Failed", description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => { loadData(); }, [loadData]);

    const columns: ColumnDef<any>[] = [
        {
            header: 'Engaging Member',
            cell: ({ row }) => (
                <div className="flex flex-col text-left">
                    <span className="font-bold text-foreground">{row.original.companyName}</span>
                    <span className="text-[10px] text-muted-foreground font-mono uppercase">{row.original.companyId}</span>
                </div>
            )
        },
        {
            header: 'Query Logic',
            cell: ({ row }) => (
                <div className="flex flex-col text-left">
                    <div className="flex items-center gap-2">
                        <Tag className="h-3.5 w-3.5 text-primary" />
                        <span className="font-bold text-sm text-slate-900">{row.original.searchTerm || row.original.category || 'General Registry Scan'}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[8px] h-3.5 uppercase font-black">{row.original.type || 'Registry'}</Badge>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">{row.original.resultCount || 0} Matches Found</span>
                    </div>
                </div>
            )
        },
        {
            header: 'Geographic Scope',
            cell: ({ row }) => {
                const vars = row.original.variables;
                if (!vars || (!vars.province && !vars.city)) return <span className="text-[10px] text-muted-foreground italic">National</span>;
                return (
                    <div className="flex items-center gap-1.5 text-slate-700">
                        <MapPin className="h-3 w-3 text-primary" />
                        <span className="text-[10px] font-bold uppercase truncate max-w-[150px]">
                            {vars.suburb ? `${vars.suburb}, ` : ''}{vars.city || vars.province}
                        </span>
                    </div>
                );
            }
        },
        {
            header: 'Timestamp',
            cell: ({ row }) => (
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span className="text-[10px] font-bold uppercase">{formatDateSafe(row.original.timestamp, "dd MMM, HH:mm")}</span>
                </div>
            )
        },
        {
            id: 'actions',
            header: <div className="text-right">Audit</div>,
            cell: ({ row }) => (
                <div className="text-right">
                    <Button variant="ghost" size="sm" asChild className="h-8 text-[10px] font-black uppercase">
                        <Link href={`/backend?view=wallet&memberId=${row.original.companyId}`}>
                            View Profile <ArrowRight className="ml-1 h-3 w-3" />
                        </Link>
                    </Button>
                </div>
            )
        }
    ];

    if (isLoading) return <div className="flex justify-center p-32"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

    return (
        <div className="space-y-8 text-left text-foreground">
            <div className="flex justify-between items-end">
                <div className="text-left">
                    <h1 className="text-3xl font-black font-headline tracking-tight flex items-center gap-3 text-left">
                        <Search className="h-8 w-8 text-primary" />
                        Search Intelligence Ledger
                    </h1>
                    <p className="text-muted-foreground mt-1">Forensic logs of who is searching the registry and what terms are driving engagement.</p>
                </div>
                <Button variant="outline" onClick={loadData} className="gap-2">
                    <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    Refresh Logs
                </Button>
            </div>

            <Card className="border-none shadow-xl bg-white overflow-hidden text-left">
                <CardContent className="pt-6">
                    <DataTable columns={columns} data={logs} />
                </CardContent>
            </Card>
        </div>
    );
}
