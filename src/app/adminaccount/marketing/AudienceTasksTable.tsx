
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ClipboardList, RefreshCcw, CheckCircle, Circle } from 'lucide-react';
import { getClientSideAuthToken } from '@/firebase';
import { formatDateSafe, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function AudienceTasksTable({ audience }: { audience: string }) {
    const [tasks, setTasks] = useState<any[]>([]);
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
                body: JSON.stringify({ action: 'getAudienceTasks', payload: { type: apiType } }),
            });
            const result = await response.json();
            setTasks(result.data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [audience]);

    useEffect(() => { loadData(); }, [loadData]);

    const columns: ColumnDef<any>[] = [
        { accessorKey: 'partnerName', header: 'Partner / Lead' },
        { accessorKey: 'title', header: 'Task' },
        { 
            accessorKey: 'status', 
            header: 'Status', 
            cell: ({row}) => (
                <div className="flex items-center gap-2">
                    {row.original.status === 'completed' ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Circle className="h-4 w-4 text-amber-500" />}
                    <span className="capitalize text-xs">{row.original.status}</span>
                </div>
            )
        },
        { accessorKey: 'dueDate', header: 'Due', cell: ({row}) => formatDateSafe(row.original.dueDate, "dd MMM") },
        { accessorKey: 'assigneeName', header: 'Assignee', cell: ({row}) => <Badge variant="secondary" className="text-[10px]">{row.original.assigneeName}</Badge> },
    ];

    return (
        <div className="space-y-4 text-left">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" /> Active Tasks & Reminders</h3>
                    <p className="text-xs text-muted-foreground">Managing follow-ups for {audience}.</p>
                </div>
                <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
                    <RefreshCcw className={cn("h-3 w-3 mr-2", isLoading && "animate-spin")} />
                    Refresh Tasks
                </Button>
            </div>
            {isLoading ? <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div> : <DataTable columns={columns} data={tasks} />}
        </div>
    );
}
