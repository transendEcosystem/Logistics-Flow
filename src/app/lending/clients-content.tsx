
'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getClientSideAuthToken, useUser } from '@/firebase';
import { 
  Loader2, PlusCircle, Users, Edit, Trash2, Eye, Database, SearchCode, History, RotateCcw, 
  Download, Upload, Zap, Search, Globe, ShieldCheck, Scale, FileCheck 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import Link from 'next/link';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { EditClientWizard } from './edit-client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn, downloadDataAsCSV, formatDateSafe } from '@/lib/utils';
import AudienceCommunicationsTable from '@/app/adminaccount/marketing/AudienceCommunicationsTable';
import { Separator } from '@/components/ui/separator';

import { EnrichPartnerButton } from '@/app/adminaccount/marketing/EnrichPartnerButton';
import { PartnerOversightDialog } from '@/app/adminaccount/marketing/PartnerOversightDialog';
import { AddCommunicationLogDialog } from '@/app/adminaccount/marketing/AddCommunicationLogDialog';
import { CommunicationLogDialog } from '@/app/adminaccount/marketing/CommunicationLogDialog';

async function performAdminAction(token: string, action: string, payload: any) {
    const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
        cache: 'no-store'
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
        throw new Error(result.error || `API Error for action: ${action}`);
    }
    return result;
}

export default function ClientsContent() {
    const { toast } = useToast();
    const [clients, setClients] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [view, setView] = useState<'list' | 'wizard'>('list');
    const [selectedClient, setSelectedClient] = useState<any | null>(null);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [clientToDelete, setClientToDelete] = useState<any | null>(null);

    const forceRefresh = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");
            const result = await performAdminAction(token, 'getLendingData', { collectionName: 'lendingClients' });
            setClients(result.data || []);
        } catch (e: any) {
            setError(e.message);
            toast({ variant: 'destructive', title: 'Error loading clients', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);
    
    useEffect(() => {
        forceRefresh();
    }, [forceRefresh]);

    const handleEdit = (client: any) => {
        setSelectedClient(client);
        setView('wizard');
    };

    const handleAddNew = () => {
        setSelectedClient(null);
        setView('wizard');
    };
    
    const handleBackToList = () => {
        setView('list');
        setSelectedClient(null);
    };

    const handleSaveSuccess = () => {
        forceRefresh();
        handleBackToList();
    };

    const handleDelete = async () => {
        if (!clientToDelete) return;
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");
            await performAdminAction(token, 'deleteLendingPartner', { collection: 'lendingClients', partnerId: clientToDelete.id });
            toast({ title: 'Client Deleted' });
            forceRefresh();
            setClientToDelete(null);
            setIsDeleteAlertOpen(false);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: e.message });
        }
    };

    const columns: ColumnDef<any>[] = useMemo(() => [
        { 
            accessorKey: 'name', 
            header: 'Client Entity',
            cell: ({row}) => (
                <div className="flex flex-col text-left">
                    <span className="font-bold text-foreground text-left">{row.original.name}</span>
                    <div className="flex items-center gap-1.5 mt-0.5 text-left">
                        <Badge variant="outline" className="text-[8px] h-3.5 uppercase font-black border-primary/20 text-primary">Member Node</Badge>
                        <span className="text-[9px] text-muted-foreground font-mono uppercase text-left">{row.original.id.slice(-6)}</span>
                    </div>
                </div>
            )
        },
        { 
            header: 'Fidelity', 
            cell: ({row}) => (
                <div className="flex items-center gap-1.5 text-left">
                    {row.original.website ? <Globe className="h-3.5 w-3.5 text-primary" /> : <Globe className="h-3.5 w-3.5 text-muted-foreground opacity-20" />}
                    {row.original.email ? <Zap className="h-3.5 w-3.5 text-amber-500 fill-current" /> : <Zap className="h-3.5 w-3.5 text-muted-foreground opacity-20" />}
                    {row.original.auditStatus === 'completed' && <FileCheck className="h-3.5 w-3.5 text-green-600" />}
                </div>
            )
        },
        { 
            accessorKey: 'status', 
            header: 'Status', 
            cell: ({ row }) => (
                <Badge variant={row.original.status === 'active' ? 'default' : 'outline'} className="capitalize text-[10px] font-black text-left">
                    {row.original.status}
                </Badge>
            )
        },
        { id: 'actions', header: <div className="text-right">Audit</div>, cell: ({ row }) => (
            <div className="flex justify-end items-center gap-1 text-left">
                <EnrichPartnerButton partner={row.original} onUpdate={forceRefresh} />
                <Button asChild variant="ghost" size="icon" title="Digital Scorecard">
                    <Link href={`/lending/clients/${row.original.id}?tab=analysis`}>
                        <Scale className="h-4 w-4 text-primary" />
                    </Link>
                </Button>
                <AddCommunicationLogDialog partnerId={row.original.id} collection="lendingClients" onLogAdded={forceRefresh} />
                <CommunicationLogDialog partnerId={row.original.id} partnerName={row.original.name} />
                <PartnerOversightDialog partner={row.original} onUpdate={forceRefresh} />
                
                <Separator orientation="vertical" className="h-4 mx-1" />
                
                <Button asChild variant="ghost" size="icon" title="View Detail"><Link href={`/lending/clients/${row.original.id}`}><Eye className="h-4 w-4" /></Link></Button>
                <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)} title="Edit Record"><Edit className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => { setClientToDelete(row.original); setIsDeleteAlertOpen(true); }} title="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
        ) },
    ], [forceRefresh]);
    
    if (view === 'wizard') {
        return <EditClientWizard client={selectedClient} targetCollection="lendingClients" onSave={handleSaveSuccess} onBack={handleBackToList} />;
    }

    return (
        <div className="space-y-8 text-left text-foreground">
            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent className="text-left text-foreground">
                    <AlertDialogHeader className="text-left">
                        <AlertDialogTitle className="text-left">Expunge Client Record?</AlertDialogTitle>
                        <AlertDialogDescription className="text-left">Permanent removal of "{clientToDelete?.name}" from the client portfolio.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="text-left">
                        <AlertDialogCancel onClick={() => setClientToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className={buttonVariants({ variant: "destructive" })}>Confirm Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 text-left">
                <div className="text-left text-foreground">
                    <h1 className="text-3xl font-black font-headline tracking-tight flex items-center gap-3 text-left">
                        <Users className="h-8 w-8 text-primary" />
                        Client Portfolio
                    </h1>
                    <p className="text-muted-foreground mt-1 text-left">Strategic list of primary borrowers approved for platform facilities.</p>
                </div>
            </div>

            <Card className="border-none shadow-xl bg-white text-left text-foreground">
                <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/10 text-left p-6">
                    <div className="text-left">
                        <CardTitle className="text-lg font-bold text-left text-foreground">Active Clients</CardTitle>
                        <CardDescription className="text-left text-foreground">Verified entities with authorized capital limits.</CardDescription>
                    </div>
                    <div className="flex gap-2 text-left">
                        <Button variant="outline" size="sm" onClick={forceRefresh} disabled={isLoading} className="gap-2 text-foreground">
                            <RotateCcw className={cn("h-4 w-4", isLoading && "animate-spin")} /> Sync Portfolio
                        </Button>
                        <Button onClick={handleAddNew} size="sm" className="gap-2 font-bold text-white shadow-lg">
                            <PlusCircle className="h-4 w-4" /> Add Client
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="pt-6 text-left text-foreground">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground text-center">Synchronizing Ledger...</p>
                        </div>
                    ) : (
                        <DataTable columns={columns} data={clients} />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
