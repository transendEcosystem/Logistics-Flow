'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, Plus, PlusCircle, Truck, Edit, Trash2, Warehouse, Wrench, ArrowLeft, FileText, Handshake, Car, Bus, Monitor, RefreshCcw, ShoppingBag, User, CheckCircle2, ShieldCheck, Filter, Search } from "lucide-react";
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { getClientSideAuthToken, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, fetchFromAdminAPI, cn } from '@/lib/utils';
import { EditAssetWizard } from './edit-asset';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const statusColors: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
    pending_acquisition: 'secondary',
    available: 'default',
    financed: 'outline',
    sold: 'secondary',
    decommissioned: 'destructive'
};

function AssetTypeSelection({ onSelect, onBack }: { onSelect: (type: string) => void, onBack: () => void }) {
    const types = [
        { id: 'Truck', label: 'Truck', icon: Truck },
        { id: 'Trailer', label: 'Trailer', icon: Warehouse },
        { id: 'Car', label: 'Car', icon: Car },
        { id: 'Bus', label: 'Bus', icon: Bus },
        { id: 'Equipment', label: 'Equipment', icon: Wrench },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500 text-left">
            <Card className="border-none shadow-2xl text-left bg-white overflow-hidden">
                <CardHeader className="bg-slate-900 text-white p-8">
                    <div className="flex justify-between items-start">
                        <div className="text-left text-white">
                            <CardTitle className="text-2xl font-black font-headline uppercase">Initialize Asset Node</CardTitle>
                            <CardDescription className="text-slate-400">Select the technical classification for the new registry entry.</CardDescription>
                        </div>
                        <Button variant="ghost" onClick={onBack} className="text-white hover:text-primary"><ArrowLeft className="mr-2 h-4 w-4"/> Back to Registry</Button>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 p-8 text-left text-foreground">
                    {types.map(type => {
                        const Icon = type.icon;
                        return (
                            <div key={type.id} className="group p-6 border-2 rounded-3xl text-center hover:shadow-xl hover:border-primary transition-all cursor-pointer bg-white" onClick={() => onSelect(type.id)}>
                                <div className="bg-primary/5 p-4 rounded-2xl mx-auto group-hover:bg-primary transition-colors">
                                    <Icon className="h-10 w-10 text-primary group-hover:text-white mx-auto" />
                                </div>
                                <h3 className="mt-4 text-sm font-black uppercase tracking-widest">{type.label}</h3>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>
        </div>
    );
}

export default function AssetRegisterContent() {
    const searchParams = useSearchParams();
    const [assets, setAssets] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();
    
    const [view, setView] = useState<'list' | 'wizard' | 'select-type'>('list');
    const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
    const [assetType, setAssetType] = useState<string | null>(null);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [assetToDelete, setAssetToDelete] = useState<any | null>(null);

    const [statusFilter, setStatusFilter] = useState('all');

    const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);
    const supplierMap = useMemo(() => new Map(suppliers.map(s => [s.id, s.name])), [suppliers]);

    const forceRefresh = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");
            
            const [assetsRes, clientsRes, suppliersRes] = await Promise.all([
                fetchFromAdminAPI(token, 'getLendingData', { collectionName: 'lendingAssets', limit: 100 }),
                fetchFromAdminAPI(token, 'getLendingData', { collectionName: 'lendingClients', limit: 100 }),
                fetchFromAdminAPI(token, 'getLendingData', { collectionName: 'lendingSuppliers', limit: 100 })
            ]);
            
            setAssets(assetsRes.data || []);
            setClients(clientsRes.data || []);
            setSuppliers(suppliersRes.data || []);

        } catch (e: any) {
            setError(e.message);
            toast({ variant: 'destructive', title: 'Error loading data', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);
    
    useEffect(() => {
        forceRefresh();
        
        // HANDSHAKE PROTOCOL: Detect intent to add specific asset
        const targetType = searchParams.get('type');
        if (targetType) {
            setAssetType(targetType);
            setView('wizard');
        }
    }, [forceRefresh, searchParams]);

    const handleEdit = (asset: any) => {
        setSelectedAsset(asset);
        setAssetType(asset.classification || null);
        setView('wizard');
    };

    const handleAddNew = () => setView('select-type');
    const handleBackToList = () => { setView('list'); setSelectedAsset(null); setAssetType(null); };
    const handleSaveSuccess = () => { forceRefresh(); handleBackToList(); };
    const handleTypeSelect = (type: string) => { setSelectedAsset(null); setAssetType(type); setView('wizard'); };

    const handleDelete = async () => {
        if (!assetToDelete) return;
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;
            await fetchFromAdminAPI(token, 'deleteLendingAsset', { assetId: assetToDelete.id });
            toast({ title: 'Asset Node Expunged' });
            forceRefresh();
        } catch (e) {
            toast({ variant: 'destructive', title: "Delete Failed", description: e.message });
        } finally {
            setAssetToDelete(null);
            setIsDeleteAlertOpen(false);
        }
    };

    const filteredAssets = useMemo(() => {
        if (statusFilter === 'all') return assets;
        return assets.filter(a => a.status === statusFilter);
    }, [assets, statusFilter]);

    const columns: ColumnDef<any>[] = [
        { 
            header: 'Asset Identity',
            cell: ({row}) => (
                <div className="flex flex-col text-left">
                    <span className="font-bold text-foreground text-left">{row.original.year} {row.original.make} {row.original.model}</span>
                    <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="outline" className="capitalize text-[8px] h-3.5 font-black border-primary/20 text-primary">
                            {row.original.classification || 'Vehicle'}
                        </Badge>
                        <span className="text-[9px] text-muted-foreground font-mono uppercase text-left">ID: {row.original.id.slice(-6)}</span>
                    </div>
                </div>
            )
        },
        { 
            header: 'Acquisition Node',
            cell: ({row}) => {
                const p = row.original;
                const sourceName = p.sourceType === 'dealer' ? supplierMap.get(p.sourceDealerId) : (p.sourceType === 'client' ? clientMap.get(p.sourceClientId) : 'Internal Stock');
                return (
                    <div className="flex flex-col text-left">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                            {p.sourceType === 'dealer' ? <ShoppingBag className="h-3 w-3" /> : <User className="h-3 w-3" />}
                            {sourceName || 'Unmapped Source'}
                        </div>
                        <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">{p.sourceType} Node</span>
                    </div>
                );
            }
        },
        { 
            header: 'Valuation', 
            cell: ({ row }) => (
                <div className="flex flex-col text-right">
                    <span className="font-black text-primary text-sm">{formatCurrency(row.original.costOfSale)}</span>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Excl. VAT</span>
                </div>
            ) 
        },
        { 
            accessorKey: 'status', 
            header: 'Current Standing', 
            cell: ({row}) => (
                <Badge variant={statusColors[row.original.status] || 'secondary'} className="capitalize text-[9px] font-black tracking-widest">
                    {row.original.status?.replace(/_/g, ' ')}
                </Badge>
            ) 
        },
        { id: 'actions', header: <div className="text-right">Audit</div>, cell: ({ row }) => (
            <div className="text-right flex justify-end gap-1">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)}><Edit className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => { setAssetToDelete(row.original); setIsDeleteAlertOpen(true); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
        )},
    ];
    
    if (view === 'select-type') return <AssetTypeSelection onSelect={handleTypeSelect} onBack={handleBackToList} />;
    if (view === 'wizard') return <EditAssetWizard asset={selectedAsset} assetType={assetType} onSave={handleSaveSuccess} onBack={handleBackToList} />;

    return (
        <div className="space-y-8 text-left text-foreground">
            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent className="text-left text-foreground">
                    <AlertDialogHeader className="text-left text-foreground">
                        <AlertDialogTitle>Expunge Asset Node?</AlertDialogTitle>
                        <AlertDialogDescription>Permanent removal of this technical record from the registry.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="text-left">
                        <AlertDialogCancel onClick={() => setAssetToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className={cn(buttonVariants({ variant: "destructive" }))}>Delete Node</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 text-left">
                <div className="text-left">
                    <h1 className="text-3xl font-black font-headline tracking-tight flex items-center gap-3 text-left">
                        <Truck className="h-8 w-8 text-primary" />
                        Asset Register
                    </h1>
                    <p className="text-muted-foreground mt-1 text-left">Fiduciary ledger of all physical collateral and technical data nodes.</p>
                </div>
                <div className="flex gap-2 text-left">
                    <Button variant="outline" size="sm" onClick={forceRefresh} disabled={isLoading} className="gap-2 h-10 px-6 font-bold">
                        <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} /> Refresh
                    </Button>
                    <Button onClick={handleAddNew} size="sm" className="gap-2 font-black uppercase text-[11px] tracking-widest shadow-xl h-10 px-8 text-white text-left">
                        <PlusCircle className="h-4 w-4" /> Move Asset In
                    </Button>
                </div>
            </div>

            <Card className="border-none shadow-xl bg-white text-left text-foreground">
                <CardHeader className="bg-slate-50 border-b p-6 text-left">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left">
                        <div className="text-left">
                            <CardTitle className="text-lg font-bold flex items-center gap-2 text-left">
                                <Search className="h-5 w-5 text-primary" /> Registry Search
                            </CardTitle>
                            <CardDescription className="text-left">Filter by ownership standing and technical class.</CardDescription>
                        </div>
                        <div className="w-full md:w-64 space-y-1.5 text-left">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Standing Filter</Label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="h-10 bg-white"><SelectValue placeholder="All Assets" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Registry Entries</SelectItem>
                                    <SelectItem value="available">Available in Stock</SelectItem>
                                    <SelectItem value="pending_acquisition">In Acquisition Path</SelectItem>
                                    <SelectItem value="financed">Allocated (Financed)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6 text-left">
                    {isLoading ? (
                        <div className="flex justify-center items-center py-20 text-center"><Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" /></div>
                    ) : (
                        <DataTable columns={columns} data={filteredAssets} />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
