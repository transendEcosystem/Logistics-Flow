
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageSquare, RefreshCcw, Info, UserCheck, Mail } from 'lucide-react';
import { getClientSideAuthToken } from '@/firebase';
import { formatDateSafe, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AudienceCommunicationsTable({ audience }: { audience: string }) {
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;
            
            // Normalize audience type for API
            let apiType = audience.toLowerCase();
            if (apiType.endsWith('s')) apiType = apiType.slice(0, -1);
            if (apiType === 'isa') apiType = 'isa';

            const response = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'getAudienceCommunications', 
                    payload: { type: apiType } 
                }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            setLogs(result.data || []);
        } catch (e) {
            console.error("Communications Load Error:", e);
        } finally {
            setIsLoading(false);
        }
    }, [audience]);

    useEffect(() => { loadData(); }, [loadData]);

    const columns: ColumnDef<any>[] = [
        { 
            header: 'Entity / Partner',
            cell: ({row}) => (
                <div className="flex flex-col text-left">
                    <span className="font-bold">{row.original.partnerName}</span>
                    <Badge variant="outline" className="w-fit text-[8px] h-3.5 uppercase border-primary/20 text-primary mt-1">
                        {row.original.partnerType || 'Registry Record'}
                    </Badge>
                </div>
            )
        },
        { 
            accessorKey: 'type', 
            header: 'Channel', 
            cell: ({row}) => (
                <div className="flex items-center gap-2">
                    {row.original.type === 'Email' ? <Mail className="h-3 w-3 text-blue-500" /> : <MessageSquare className="h-3 w-3 text-green-500" />}
                    <span className="text-xs">{row.original.type}</span>
                </div>
            )
        },
        { accessorKey: 'subject', header: 'Campaign Step' },
        { 
            accessorKey: 'notes', 
            header: 'Details', 
            cell: ({row}) => <div className="text-xs text-muted-foreground truncate max-w-[250px] italic">"{row.original.notes || 'No log details'}"</div> 
        },
        { 
            accessorKey: 'timestamp', 
            header: 'Sent Date', 
            cell: ({row}) => <div className="font-mono text-[10px] text-muted-foreground">{formatDateSafe(row.original.timestamp, "dd MMM, HH:mm")}</div> 
        },
    ];

    return (
        <div className="space-y-4 text-left">
            <div className="flex items-center justify-between">
                <div className="text-left">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-primary" /> 
                        Audience Communication feed
                    </h3>
                    <p className="text-xs text-muted-foreground">Tracking every interaction across the {audience} registry.</p>
                </div>
                <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
                    <RefreshCcw className={cn("h-3 w-3 mr-2", isLoading && "animate-spin")} />
                    Refresh Feed
                </Button>
            </div>
            
            {logs.length > 0 && (
                <Alert className="bg-primary/5 border-primary/20 py-2">
                    <UserCheck className="h-4 w-4 text-primary" />
                    <AlertTitle className="text-xs font-bold uppercase tracking-widest text-primary">Live Tracking Active</AlertTitle>
                    <AlertDescription className="text-[10px]">Interactions are mapped in real-time across both Discovered Leads and Strategic Partners.</AlertDescription>
                </Alert>
            )}

            {isLoading ? (
                <div className="flex flex-col items-center justify-center p-20 gap-4">
                    <Loader2 className="animate-spin h-10 w-10 text-primary" />
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Aggregating Interaction Logs...</p>
                </div>
            ) : (
                <DataTable columns={columns} data={logs} />
            )}
        </div>
    );
}
