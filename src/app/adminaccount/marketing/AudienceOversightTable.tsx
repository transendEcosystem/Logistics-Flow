'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Globe, RefreshCcw, Search, Sparkles, CheckCircle2, UserCheck, Smartphone, Send, Database } from 'lucide-react';
import { getClientSideAuthToken } from '@/firebase';
import { formatDateSafe, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function AudienceOversightTable({ audience }: { audience: string }) {
    const [records, setRecords] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;
            const apiType = audience === 'isa' ? 'isa' : (audience === 'finance' ? 'finance' : (audience === 'drivers' ? 'driver' : audience.slice(0, -1)));
            const response = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'searchRegistry', payload: { type: apiType, limit: 200 } }),
            });
            const result = await response.json();
            setRecords(result.data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [audience]);

    useEffect(() => { loadData(); }, [loadData]);

    const columns: ColumnDef<any>[] = [
        { 
            header: 'Entity Name', 
            cell: ({row}) => (
                <div className="flex flex-col text-left">
                    <span className="font-bold text-foreground">{row.original.companyName || row.original.company_name || row.original.trading_name || `${row.original.firstName} ${row.original.lastName}`}</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-mono">{row.original.id}</span>
                </div>
            )
        },
        { 
            header: 'Data Fidelity', 
            cell: ({row}) => (
                <div className="flex items-center gap-2">
                    {row.original.website ? <Globe className="h-4 w-4 text-primary" /> : <Globe className="h-4 w-4 text-muted-foreground opacity-20" />}
                    {row.original.minedServiceWording || row.original.notes ? <Sparkles className="h-4 w-4 text-primary" /> : <Sparkles className="h-4 w-4 text-muted-foreground opacity-20" />}
                    {row.original.email ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <CheckCircle2 className="h-4 w-4 text-muted-foreground opacity-20" />}
                </div>
            )
        },
        { 
            header: 'Interaction Tracking', 
            cell: ({row}) => (
                <div className="flex flex-col gap-1 items-start">
                    {row.original.lastOpenedAt && (
                        <div className="flex items-center gap-1 text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 w-fit">
                            <UserCheck className="h-2.5 w-2.5" />
                            Email Read {formatDateSafe(row.original.lastOpenedAt, "dd/MM")}
                        </div>
                    )}
                    {row.original.lastAccessedAt && (
                        <div className="flex items-center gap-1 text-[9px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 w-fit">
                            <Smartphone className="h-2.5 w-2.5" />
                            App Accessed {formatDateSafe(row.original.lastAccessedAt, "dd/MM")}
                        </div>
                    )}
                    {!row.original.lastOpenedAt && !row.original.lastAccessedAt && (
                        <span className="text-[10px] text-muted-foreground italic text-left">No engagement logs</span>
                    )}
                </div>
            )
        },
        { 
            header: 'Status', 
            cell: ({row}) => (
                <div className="flex flex-col gap-1 items-start text-left">
                    <Badge variant="outline" className="capitalize text-[9px] font-black tracking-widest">{row.original.status}</Badge>
                </div>
            )
        },
        { 
            header: 'Platform Staff', 
            cell: ({row}) => (
                <div className="text-xs italic text-muted-foreground text-left">
                    {row.original.assigneeId ? 'Allocated Node' : 'Unassigned'}
                </div>
            )
        },
    ];

    return (
        <Card className="text-left shadow-xl border-none">
             <CardHeader className="flex items-center justify-between flex-row text-left border-b bg-muted/20">
                <div className="text-left text-foreground">
                    <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2"><Database className="h-5 w-5 text-primary" /> Forensic Oversight Timeline</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">Tracking engagement opens and link landings for {audience}.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading} className="text-foreground">
                    <RefreshCcw className={cn("h-3 w-3 mr-2", isLoading && "animate-spin")} />
                    Refresh Feed
                </Button>
            </CardHeader>
            <CardContent className="pt-6 text-left">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center p-20 gap-4 text-center text-foreground">
                        <Loader2 className="animate-spin h-10 w-10 text-primary mx-auto" />
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground text-center">Aggregating Interaction Logs...</p>
                    </div>
                ) : (
                    <DataTable columns={columns} data={records} />
                )}
            </CardContent>
        </Card>
    );
}