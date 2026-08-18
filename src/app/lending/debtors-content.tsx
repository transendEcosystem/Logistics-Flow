'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getClientSideAuthToken, useUser } from '@/firebase';
import { 
  Loader2, PlusCircle, Users, Edit, Trash2, Eye, Database, SearchCode, History, RotateCcw, 
  Download, Upload, Zap, Search, Globe, ShieldCheck, Scale, FileCheck, FileSignature, UserPlus, RefreshCcw 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import Link from 'next/link';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { EditClientWizard } from './edit-client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DebtorDiscoveryEngine from './debtor-discovery';
import { BulkImportDialog } from '@/app/adminaccount/marketing/BulkImportDialog';
import { cn, downloadDataAsCSV, formatDateSafe, fetchFromAdminAPI } from '@/lib/utils';
import AudienceCommunicationsTable from '@/app/adminaccount/marketing/AudienceCommunicationsTable';
import { Separator } from '@/components/ui/separator';

import { EnrichPartnerButton } from '@/app/adminaccount/marketing/EnrichPartnerButton';
import { PartnerOversightDialog } from '@/app/adminaccount/marketing/PartnerOversightDialog';
import { AddCommunicationLogDialog } from '@/app/adminaccount/marketing/AddCommunicationLogDialog';
import { CommunicationLogDialog } from '@/app/adminaccount/marketing/CommunicationLogDialog';
import { InitializeSubFacilityModal } from './InitializeSubFacilityModal';

export default function DebtorsContent() {
    const { toast } = useToast();
    const [debtors, setDebtors] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [facilities, setFacilities] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [view, setView] = useState<'list' | 'wizard'>('list');
    const [selectedDebtor, setSelectedDebtor] = useState<any | null>(null);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [debtorToDelete, setDebtorToDelete] = useState<any | null>(null);
    
    // FACILITY HANDSHAKE STATE
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isSubModalOpen, setIsSubModalOpen] = useState(false);

    const forceRefresh = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");
            
            // RESOURCE CAPPING: Hard 100 record limit
            const [debtorsRes, clientsRes, facilitiesRes] = await Promise.all([
                fetchFromAdminAPI(token, 'getLendingData', { collectionName: 'lendingDebtors', limit: 100 }),
                fetchFromAdminAPI(token, 'getLendingData', { collectionName: 'lendingClients', limit: 100 }),
                fetchFromAdminAPI(token, 'getLendingData', { collectionName: 'facilities', limit: 100 })
            ]);
            
            setDebtors(debtorsRes.data || []);
            setClients(clientsRes.data || []);
            setFacilities(facilitiesRes.data || []);
        } catch (e: any) {
            setError(e.message);
            toast({ variant: 'destructive', title: 'Error loading debtors', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);
    
    useEffect(() => { forceRefresh(); }, [forceRefresh]);

    const activeSelection = useMemo(() => {
        if (selectedIds.length !== 1) return null;
        return debtors.find(d => d.id === selectedIds[0]);
    }, [selectedIds, debtors]);

    const parentFacility = useMemo(() => {
        if (!activeSelection) return null;
        return facilities.find(f => f.debtorId === activeSelection.id && f.facilityClass === 'global');
    }, [activeSelection, facilities]);

    const handleEdit = (debtor: any) => {
        setSelectedDebtor(debtor);
        setView('wizard');
    };

    const handleAddNew = () => {
        setSelectedDebtor(null);
        setView('wizard');
    };
    
    const handleBackToList = () => {
        setView('list');
        setSelectedDebtor(null);
    };

    const handleSaveSuccess = () => {
        forceRefresh();
        handleBackToList();
    };

    const handleDelete = async () => {
        if (!debtorToDelete) return;
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");
            await fetchFromAdminAPI(token, 'deleteLendingPartner', { collection: 'lendingDebtors', partnerId: debtorToDelete.id });
            toast({ title: 'Debtor Deleted' });
            forceRefresh();
            setDebtorToDelete(null);
            setIsDeleteAlertOpen(false);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: e.message });
        }
    };

    const columns: ColumnDef<any>[] = useMemo(() => [
        { 
            accessorKey: 'name', 
            header: 'Debtor Entity',
            cell: ({row}) => (
                <div className="flex flex-col text-left">
                    <span className="font-bold text-foreground text-left">{row.original.name}</span>
                    <div className="flex items-center gap-1.5 mt-0.5 text-left text-foreground">
                        <Badge variant="outline" className="text-[8px] h-3.5 uppercase font-black border-primary/20 text-primary">Cessionary Node</Badge>
                        <span className="text-[9px] text-muted-foreground font-mono uppercase text-left">{row.original.id.slice(-6)}</span>
                    </div>
                </div>
            )
        },
        { 
            header: 'Fidelity', 
            cell: ({row}) => (
                <div className="flex items-center gap-1.5 text-left text-foreground">
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
            <div className="flex justify-end items-center gap-1 text-left text-foreground">
                <EnrichPartnerButton partner={row.original} onUpdate={forceRefresh} />
                <AddCommunicationLogDialog partnerId={row.original.id} collection="lendingDebtors" onLogAdded={forceRefresh} />
                <CommunicationLogDialog partnerId={row.original.id} partnerName={row.original.name} />
                <PartnerOversightDialog partner={row.original} onUpdate={forceRefresh} />
                <Separator orientation="vertical" className="h-4 mx-1" />
                <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)} title="Edit Record"><Edit className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => { setDebtorToDelete(row.original); setIsDeleteAlertOpen(true); }} title="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
        ) },
    ], [forceRefresh]);
    
    if (view === 'wizard') {
        return <EditClientWizard client={selectedDebtor} targetCollection="lendingDebtors" onSave={handleSaveSuccess} onBack={handleBackToList} />;
    }

    return (
        <div className="space-y-8 text-left text-foreground">
            <InitializeSubFacilityModal 
                parent={parentFacility ? { ...parentFacility, ownerName: activeSelection?.name } : null} 
                clients={clients}
                isOpen={isSubModalOpen} 
                onOpenChange={setIsSubModalOpen} 
                onComplete={forceRefresh} 
            />

            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent className="text-left text-foreground text-foreground">
                    <AlertDialogHeader className="text-left text-foreground text-foreground text-foreground">
                        <AlertDialogTitle className="text-left text-foreground text-foreground">Expunge Debtor Record?</AlertDialogTitle>
                        <AlertDialogDescription className="text-left text-foreground text-foreground">Permanent removal of "{debtorToDelete?.name}" from the registry.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="text-left text-foreground">
                        <AlertDialogCancel onClick={() => setDebtorToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className={buttonVariants({ variant: "destructive" })}>Confirm Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 text-left text-foreground">
                <div className="text-left text-foreground text-foreground">
                    <h1 className="text-3xl font-black font-headline tracking-tight flex items-center gap-3 text-left">
                        <Users className="h-8 w-8 text-primary" />
                        Debtor Registry
                    </h1>
                    <p className="text-muted-foreground mt-1 text-left text-foreground text-foreground">Specialized portfolio of cessionaries for Factoring and Rights Discounting.</p>
                </div>
            </div>

            <Tabs defaultValue="registry" className="w-full text-left text-foreground text-foreground">
                <TabsList className="bg-muted/30 p-1 h-auto flex-wrap justify-start text-left">
                    <TabsTrigger value="registry" className="gap-2 px-6 py-2.5 font-bold uppercase tracking-widest text-[10px]">
                        <Database className="h-3.5 w-3.5" /> Registry Ledger
                    </TabsTrigger>
                    <TabsTrigger value="discovery" className="gap-2 px-6 py-2.5 font-bold uppercase tracking-widest text-[10px]">
                        <SearchCode className="h-3.5 w-3.5" /> Debtor Scouting (AI)
                    </TabsTrigger>
                    <TabsTrigger value="oversight" className="gap-2 px-6 py-2.5 font-bold uppercase tracking-widest text-[10px]">
                        <History className="h-3.5 w-3.5" /> Audit Timeline
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="registry" className="mt-8 space-y-6 text-left">
                    <Card className="border-none shadow-xl bg-white text-left text-foreground">
                        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/10 text-left p-6">
                            <div className="text-left text-foreground">
                                <CardTitle className="text-lg font-bold text-left">Authorized Debtors</CardTitle>
                                <CardDescription className="text-left text-foreground">Cessionaries required for confirmed debt perfection.</CardDescription>
                            </div>
                            <div className="flex gap-2 text-left text-foreground">
                                <Button variant="outline" size="sm" onClick={forceRefresh} disabled={isLoading} className="gap-2">
                                    <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} /> Refresh
                                </Button>
                                
                                {selectedIds.length === 1 && (
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => {
                                            if (!parentFacility) {
                                                toast({ variant: 'destructive', title: "Master Ceiling Missing", description: "Establish a master ceiling for this debtor in the Facilities ledger first." });
                                                return;
                                            }
                                            setIsSubModalOpen(true);
                                        }}
                                        className={cn("gap-2 font-bold h-9 border-primary text-primary bg-primary/5 animate-in slide-in-from-right-2")}
                                    >
                                        <UserPlus className="h-4 w-4" /> Client Allocation
                                    </Button>
                                )}

                                <Button onClick={handleAddNew} size="sm" className="gap-2 font-bold text-white shadow-lg text-left">
                                    <PlusCircle className="h-4 w-4" /> Add Debtor
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6 text-left text-foreground text-foreground">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                                    <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground text-center">Synchronizing Ledger...</p>
                                </div>
                            ) : (
                                <DataTable columns={columns} data={debtors} onSelectionChange={setSelectedIds} />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="discovery" className="mt-8">
                    <DebtorDiscoveryEngine />
                </TabsContent>

                <TabsContent value="oversight" className="mt-8">
                    <Card className="border-none shadow-xl bg-white text-left text-foreground">
                        <CardHeader className="border-b bg-muted/10 text-left">
                            <CardTitle className="text-lg font-bold flex items-center gap-2 text-left">
                                <History className="h-5 w-5 text-primary" /> Relationship Activity Stream
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 text-left text-foreground">
                            <AudienceCommunicationsTable audience="debtor" />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
