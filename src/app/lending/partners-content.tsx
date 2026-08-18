'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, PlusCircle, Handshake, Edit, Trash2, Eye } from "lucide-react";
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { getClientSideAuthToken } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { EditLendingPartnerWizard } from './edit-lending-partner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

const statusColors: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
    draft: 'secondary',
    active: 'default',
    inactive: 'destructive',
};

const partnerTypes = [
    { id: 'supplier', label: 'Suppliers' },
    { id: 'vendor', label: 'Vendors' },
    { id: 'associate', label: 'Affiliates' },
    { id: 'debtor', label: 'Debtors' }
];

export default function PartnersContent() {
    const [partners, setPartners] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const [view, setView] = useState<'list' | 'wizard'>('list');
    const [selectedPartner, setSelectedPartner] = useState<any | null>(null);
    const [partnerTypeToAdd, setPartnerTypeToAdd] = useState<string>('supplier');
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [partnerToDelete, setPartnerToDelete] = useState<any | null>(null);
    
    const forceRefresh = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");
            const result = await performAdminAction(token, 'getLendingData', { collectionName: 'lendingPartners' });
            setPartners(result.data || []);
        } catch (e: any) {
            setError(e.message);
            toast({ variant: 'destructive', title: 'Error loading partners', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);
    
    useEffect(() => {
        forceRefresh();
    }, [forceRefresh]);

    const handleEdit = (partner: any) => {
        setSelectedPartner(partner);
        setView('wizard');
    };

    const handleAddNew = (type: string) => {
        setSelectedPartner(null);
        setPartnerTypeToAdd(type);
        setView('wizard');
    };
    
    const handleBackToList = () => {
        setView('list');
        setSelectedPartner(null);
    };

    const handleSaveSuccess = () => {
        forceRefresh();
        setView('list');
        setSelectedPartner(null);
    };
    
    const handleDelete = async () => {
        if (!partnerToDelete) return;
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");
            await performAdminAction(token, 'deleteLendingPartner', { collection: 'lendingPartners', partnerId: partnerToDelete.id });
            toast({ title: 'Partner Deleted' });
            forceRefresh();
            setPartnerToDelete(null);
            setIsDeleteAlertOpen(false);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: e.message });
        }
    };

    const columns: ColumnDef<any>[] = useMemo(() => [
        { accessorKey: 'name', header: 'Name', cell: ({row}) => <div>{row.original.name}</div> },
        { accessorKey: 'contactPerson', header: 'Contact Person', cell: ({row}) => <div>{row.original.contactPerson}</div> },
        { accessorKey: 'email', header: 'Email', cell: ({row}) => <div>{row.original.email}</div> },
        { accessorKey: 'status', header: 'Status', cell: ({row}) => <Badge className="capitalize">{row.original.status}</Badge>},
        { id: 'actions', header: <div className="text-right">Actions</div>, cell: ({ row }) => (
            <div className="flex justify-end items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)}><Edit className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => { setPartnerToDelete(row.original); setIsDeleteAlertOpen(true); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
        ) },
    ], []);
    
    if (error) {
        return <Card className="bg-destructive/10 border-destructive text-destructive-foreground"><CardHeader><CardTitle>Error</CardTitle></CardHeader><CardContent>{error}</CardContent></Card>
    }

    if (view === 'wizard') {
        const initialData = selectedPartner ? selectedPartner : { type: partnerTypeToAdd };
        return <EditLendingPartnerWizard partner={initialData} onSave={handleSaveSuccess} onBack={handleBackToList} />;
    }

    return (
        <>
            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete partner "{partnerToDelete?.name}".</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPartnerToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className={buttonVariants({ variant: "destructive" })}>Yes, delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Handshake /> Partners</CardTitle>
                    <CardDescription>Manage suppliers, vendors, affiliates, and debtor partners within the lending system.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="supplier" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                            {partnerTypes.map(pt => <TabsTrigger key={pt.id} value={pt.id}>{pt.label}</TabsTrigger>)}
                        </TabsList>
                        {partnerTypes.map(pt => (
                            <TabsContent key={pt.id} value={pt.id} className="mt-4">
                                <div className="flex justify-end mb-4">
                                    <Button onClick={() => handleAddNew(pt.id)}>
                                        <PlusCircle className="mr-2 h-4 w-4"/> Add {pt.label.slice(0, -1)}
                                    </Button>
                                </div>
                                {isLoading ? (
                                    <div className="flex justify-center items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                                ) : (
                                    <DataTable columns={columns} data={partners.filter(p => p.type === pt.id)} />
                                )}
                            </TabsContent>
                        ))}
                    </Tabs>
                </CardContent>
            </Card>
        </>
    );
}
