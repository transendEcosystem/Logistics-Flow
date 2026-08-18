'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getClientSideAuthToken, useUser } from '@/firebase';
import { 
  Loader2, PlusCircle, Building, Edit, Trash2, Send, Globe, Search, Download, Save, 
  ChevronDown, Smartphone, Phone, Mail, MapPin, FileSignature, RefreshCcw, UserCheck, ShieldCheck, Zap, Wrench
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn, fetchFromAdminAPI } from '@/lib/utils';
import { EditSupplierWizard } from './edit-supplier';
import { EnrichPartnerButton } from '@/app/adminaccount/marketing/EnrichPartnerButton';
import { PartnerOversightDialog } from '@/app/adminaccount/marketing/PartnerOversightDialog';
import { AddCommunicationLogDialog } from '@/app/adminaccount/marketing/AddCommunicationLogDialog';
import { CommunicationLogDialog } from '@/app/adminaccount/marketing/CommunicationLogDialog';
import { InitializeSubFacilityModal } from './InitializeSubFacilityModal';

/**
 * SUPPLIER REGISTRY (DMS)
 * Strategic oversight of authorized asset dealers and equipment manufacturers.
 */
export default function SuppliersContent() {
    const { toast } = useToast();
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [facilities, setFacilities] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [view, setView] = useState<'list' | 'edit'>('list');
    const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [supplierToDelete, setSupplierToDelete] = useState<any | null>(null);
    
    // SELECTION HUB
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isSubModalOpen, setIsSubModalOpen] = useState(false);

    const forceRefresh = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Auth failed.");
            
            const [suppliersRes, facilitiesRes, clientsRes] = await Promise.all([
                fetchFromAdminAPI(token, 'getLendingData', { collectionName: 'lendingSuppliers', limit: 100 }),
                fetchFromAdminAPI(token, 'getLendingData', { collectionName: 'facilities', limit: 100 }),
                fetchFromAdminAPI(token, 'getLendingData', { collectionName: 'lendingClients', limit: 100 })
            ]);
            
            setSuppliers(suppliersRes.data || []);
            setFacilities(facilitiesRes.data || []);
            setClients(clientsRes.data || []);
        } catch (e: any) {
            setError(e.message);
            toast({ variant: 'destructive', title: 'Sync Failed', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);
    
    useEffect(() => { forceRefresh(); }, [forceRefresh]);

    const activeSelection = useMemo(() => {
        if (selectedIds.length !== 1) return null;
        return suppliers.find(s => s.id === selectedIds[0]);
    }, [selectedIds, suppliers]);

    const parentFacility = useMemo(() => {
        if (!activeSelection) return null;
        return facilities.find(f => f.sourceDealerId === activeSelection.id && f.facilityClass === 'global');
    }, [activeSelection, facilities]);

    const handleEdit = (supplier: any) => {
        setSelectedSupplier(supplier);
        setView('edit');
    };

    const handleBackToList = () => {
        setView('list');
        setSelectedSupplier(null);
    };

    const handleDelete = async () => {
        if (!supplierToDelete) return;
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;
            await fetchFromAdminAPI(token, 'deleteLendingPartner', { collection: 'lendingSuppliers', partnerId: supplierToDelete.id });
            toast({ title: 'Node Expunged' });
            forceRefresh();
        } catch (e) {
            toast({ variant: 'destructive', title: "Delete Failed" });
        } finally {
            setIsDeleteOpen(false);
            setSupplierToDelete(null);
        }
    };

    const columns: ColumnDef<any>[] = [
        { 
            header: 'Dealer Entity',
            cell: ({row}) => (
                <div className="flex flex-col text-left">
                    <span className="font-bold text-foreground text-left">{row.original.name}</span>
                    <div className="flex items-center gap-1.5 mt-0.5 text-left">
                        <Badge variant="outline" className="text-[8px] h-3.5 uppercase font-black border-primary/20 text-primary">Authorized Provider</Badge>
                        <span className="text-[9px] text-muted-foreground font-mono uppercase text-left">ID: {row.original.id.slice(-6)}</span>
                    </div>
                </div>
            )
        },
        { 
            header: 'Stakeholder Nodes',
            cell: ({row}) => (
                <div className="flex flex-col gap-1 text-left text-foreground">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700 text-left">
                        <UserCheck className="h-3 w-3 text-primary" /> {row.original.marketingManager?.name || 'N/A'}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground text-left">
                        <Mail className="h-2.5 w-2.5" /> {row.original.email || 'No Email'}
                    </div>
                </div>
            )
        },
        { 
            header: 'Fidelity',
            cell: ({row}) => (
                <div className="flex items-center gap-2 text-left text-foreground">
                    {row.original.website ? <Globe className="h-4 w-4 text-primary" /> : <Globe className="h-4 w-4 text-muted-foreground opacity-20" />}
                    {row.original.address ? <MapPin className="h-4 w-4 text-primary" /> : <MapPin className="h-4 w-4 text-muted-foreground opacity-20" />}
                </div>
            )
        },
        { accessorKey: 'status', header: 'Status', cell: ({row}) => <Badge variant={row.original.status === 'active' ? 'default' : 'outline'} className="capitalize text-[10px] font-black text-left">{row.original.status}</Badge> },
        { id: 'actions', header: <div className="text-right">Audit</div>, cell: ({ row }) => (
            <div className="flex justify-end items-center gap-1 text-left text-foreground text-foreground">
                <EnrichPartnerButton partner={row.original} onUpdate={forceRefresh} />
                <AddCommunicationLogDialog partnerId={row.original.id} collection="lendingSuppliers" onLogAdded={forceRefresh} />
                <CommunicationLogDialog partnerId={row.original.id} partnerName={row.original.name} />
                <PartnerOversightDialog partner={row.original} onUpdate={forceRefresh} />
                <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)}><Edit className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => { setSupplierToDelete(row.original); setIsDeleteOpen(true); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
        ) },
    ];

    if (view === 'edit') return <EditSupplierWizard supplier={selectedSupplier} onSave={() => { forceRefresh(); setView('list'); }} onBack={handleBackToList} />;

    return (
        <div className="space-y-8 text-left text-foreground">
            <InitializeSubFacilityModal 
                parent={parentFacility ? { ...parentFacility, ownerName: activeSelection?.name } : null} 
                clients={clients}
                isOpen={isSubModalOpen} 
                onOpenChange={setIsSubModalOpen} 
                onComplete={forceRefresh} 
            />

            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent className="text-left text-foreground text-foreground">
                    <AlertDialogHeader className="text-left text-foreground text-foreground text-foreground text-left text-foreground">
                        <AlertDialogTitle className="text-left text-foreground text-foreground text-foreground">Expunge Supplier Node?</AlertDialogTitle>
                        <AlertDialogDescription className="text-left text-foreground text-foreground text-foreground">This will permanently remove the dealership from the authorized register.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="text-left text-foreground text-foreground text-left text-foreground">
                        <AlertDialogCancel onClick={() => setSupplierToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className={cn(buttonVariants({ variant: "destructive" }))}>Confirm Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 text-left text-foreground">
                <div className="text-left text-foreground text-left">
                    <h1 className="text-3xl font-black font-headline tracking-tight flex items-center gap-3 text-left">
                        <Building className="h-8 w-8 text-primary" />
                        Supplier Registry (DMS)
                    </h1>
                    <p className="text-muted-foreground mt-1 text-left text-foreground text-foreground text-foreground">Authorized asset dealers and equipment manufacturers for the lending grid.</p>
                </div>
                <div className="flex gap-2 text-left text-foreground text-foreground text-left">
                    <Button variant="outline" size="sm" onClick={forceRefresh} disabled={isLoading} className="gap-2 text-foreground text-foreground text-left">
                        <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} /> Sync Portfolio
                    </Button>
                    
                    {selectedIds.length === 1 && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                                if (!parentFacility) {
                                    toast({ variant: 'destructive', title: "Global Ceiling Missing", description: "Establish a master limit for this supplier in the Facilities ledger first." });
                                    return;
                                }
                                setIsSubModalOpen(true);
                            }}
                            className={cn("gap-2 font-bold h-10 px-6", activeSelection && "border-primary text-primary bg-primary/5 animate-in slide-in-from-right-2")}
                        >
                            <FileSignature className="h-4 w-4" /> Initialize Sub-Facility
                        </Button>
                    )}

                    <Button onClick={() => { setSelectedSupplier(null); setView('edit'); }} className="gap-2 font-bold shadow-lg h-10 px-6 text-white text-left text-white text-left text-left">
                        <PlusCircle className="h-4 w-4" /> Initialize Supplier
                    </Button>
                </div>
            </div>

            <Card className="border-none shadow-xl bg-white overflow-hidden text-left text-foreground text-foreground text-left">
                <CardContent className="pt-6 text-left text-foreground text-foreground text-left text-foreground">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center text-foreground">
                            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto text-left" />
                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground text-center">Mapping Authorized Dealers...</p>
                        </div>
                    ) : (
                        <DataTable columns={columns} data={suppliers} onSelectionChange={setSelectedIds} />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
