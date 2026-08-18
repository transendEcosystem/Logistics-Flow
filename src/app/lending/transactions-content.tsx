
'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Repeat } from "lucide-react";
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { getClientSideAuthToken } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDateSafe } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// API Helper
async function performAdminAction(token: string, action: string, payload: any) {
    const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
        throw new Error(result.error || `API Error for action: ${action}`);
    }
    return result;
}

export default function TransactionsContent() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);

    const forceRefresh = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");
            
            // Fetch both transactions and clients in parallel
            const [transactionsRes, clientsRes] = await Promise.all([
                performAdminAction(token, 'getLendingData', { collectionName: 'transactions' }),
                performAdminAction(token, 'getLendingData', { collectionName: 'lendingClients' })
            ]);
            
            // Set clients first to build the map
            const clientData = clientsRes.data || [];
            setClients(clientData);
            const localClientMap = new Map(clientData.map((c: any) => [c.id, c.name]));

            // Enrich transactions with client names
            const enrichedTransactions = (transactionsRes.data || []).map((tx: any) => ({
                ...tx,
                clientName: localClientMap.get(tx.clientId) || tx.clientId,
            }));

            setTransactions(enrichedTransactions);

        } catch (e: any) {
            setError(e.message);
            toast({ variant: 'destructive', title: 'Error loading data', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);
    
    useEffect(() => {
        forceRefresh();
    }, [forceRefresh]);

    const columns: ColumnDef<any>[] = useMemo(() => [
        { 
            header: 'Date',
            cell: ({ row }) => formatDateSafe(row.original.date, "dd MMM yyyy, HH:mm")
        },
        { 
            header: 'Client',
            cell: ({ row }) => <div>{row.original.clientName || 'Unknown Client'}</div>
        },
        { accessorKey: 'description', header: 'Description' },
        { 
            accessorKey: 'type', 
            header: 'Type',
            cell: ({ row }) => <Badge variant={row.original.type === 'credit' ? 'default' : 'destructive'} className="capitalize">{row.original.type}</Badge>
        },
        { 
            accessorKey: 'amount', 
            header: <div className="text-right">Amount</div>,
            cell: ({ row }) => <div className="text-right font-mono">{formatCurrency(row.original.amount)}</div> 
        },
    ], []);
    
    if (error) {
        return <Card className="bg-destructive/10 border-destructive text-destructive-foreground"><CardHeader><CardTitle>Error</CardTitle></CardHeader><CardContent>{error}</CardContent></Card>
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Repeat className="h-6 w-6" />
                    Lending Transactions
                </CardTitle>
                <CardDescription>A complete ledger of all disbursements, repayments, fees, and adjustments in the lending portfolio.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : (
                    <DataTable columns={columns} data={transactions} />
                )}
            </CardContent>
        </Card>
    );
}
