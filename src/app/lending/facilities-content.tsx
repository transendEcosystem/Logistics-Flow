'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { 
    Loader2, PlusCircle, Banknote, Edit, Trash2, CheckCircle, XCircle, MoreVertical, 
    Landmark, RefreshCcw, ChevronDown, ChevronRight, Zap, Gavel, UserPlus, Info, 
    CheckCircle2, FileSignature, Scale, Clock, User, ArrowRightLeft 
} from "lucide-react";
import { getClientSideAuthToken, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, cn, fetchFromAdminAPI, formatDateSafe } from '@/lib/utils';
import { EditFacilityWizard } from './edit-facility';
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogHeader, 
    AlertDialogTitle, 
    AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { InitializeSubFacilityModal } from './InitializeSubFacilityModal';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

interface FacilitiesContentProps {
    mode?: 'client-global' | 'debtor' | 'facilities-suppliers';
}

/**
 * MASTER FACILITIES LEDGER (V19.1)
 * High-fidelity oversight for Global Ceilings and partitioned Sub-Nodes.
 */
export default function FacilitiesContent({ mode = 'client-global' }: FacilitiesContentProps) {
    const [facilities, setFacilities] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [debtors, setDebtors] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [selectedMasterId, setSelectedMasterId] = useState<string | null>(null);
    const [isSubModalOpen, setIsSubModalOpen] = useState(false);
    const { toast } = useToast();
    
    const [view, setView] = useState<'list' | 'wizard'>('list');
    const [selectedFacility, setSelectedFacility] = useState<any | null>(null);
    const [facilityToDelete, setFacilityToDelete] = useState<any | null>(null);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

    const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);
    const debtorMap = useMemo(() => new Map(debtors.map(d => [d.id, d.name])), [debtors]);
    const supplierMap = useMemo(() => new Map(suppliers.map(s => [s.id, s.name])), [suppliers]);

    const forceRefresh = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;
            
            const [facilitiesRes, clientsRes, debtorsRes, suppliersRes] = await Promise.all([
                fetchFromAdminAPI(token, 'getLendingData', { collectionName: 'facilities', limit: 100 }),
                fetchFromAdminAPI(token, 'getLendingData', { collectionName: 'lendingClients', limit: 100 }),
                fetchFromAdminAPI(token, 'getLendingData', { collectionName: 'lendingDebtors', limit: 100 }),
                fetchFromAdminAPI(token, 'getLendingData', { collectionName: 'lendingSuppliers', limit: 100 })
            ]);
            
            setFacilities(facilitiesRes.data || []);
            setClients(clientsRes.data || []);
            setDebtors(debtorsRes.data || []);
            setSuppliers(suppliersRes.data || []);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Sync Failed', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);
    
    useEffect(() => { forceRefresh(); }, [forceRefresh]);

    const toggleExpand = (id: string) => {
        const next = new Set(expandedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedIds(next);
    };

    const handleStatusUpdate = async (facility: any, status: string) => {
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;
            await fetchFromAdminAPI(token, 'updateFacilityStatus', { facilityId: facility.id, status });
            toast({ title: "Node Updated" });
            forceRefresh();
        } catch (e) {
            toast({ variant: 'destructive', title: "Update Failed" });
        }
    };

    const handleDelete = async () => {
        if (!facilityToDelete) return;
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;
            await fetchFromAdminAPI(token, 'deleteLendingFacility', { facilityId: facilityToDelete.id });
            toast({ title: 'Facility Expunged' });
            forceRefresh();
        } catch (e) {
            toast({ variant: 'destructive', title: "Delete Failed" });
        } finally {
            setFacilityToDelete(null);
            setIsDeleteAlertOpen(false);
        }
    };

    const filteredGlobals = useMemo(() => {
        return facilities.filter(f => {
            const isGlobal = f.facilityClass === 'global' || !f.parentId;
            if (mode === 'client-global') return isGlobal && f.ownerType === 'client';
            if (mode === 'debtor') return isGlobal && f.ownerType === 'debtor';
            if (mode === 'facilities-suppliers') return isGlobal && f.ownerType === 'supplier';
            return isGlobal;
        }).map(f => ({
            ...f,
            ownerName: f.ownerType === 'client' ? clientMap.get(f.clientId) : (f.ownerType === 'supplier' ? supplierMap.get(f.sourceDealerId) : debtorMap.get(f.debtorId))
        })).sort((a,b) => (b.limit || 0) - (a.limit || 0));
    }, [facilities, mode, clientMap, debtorMap, supplierMap]);

    const selectedMaster = useMemo(() => {
        return filteredGlobals.find(f => f.id === selectedMasterId);
    }, [filteredGlobals, selectedMasterId]);

    if (view === 'wizard') {
        return (
            <EditFacilityWizard 
                facility={selectedFacility} 
                clients={clients} 
                debtors={debtors} 
                suppliers={suppliers}
                onSave={() => { forceRefresh(); setView('list'); }} 
                onBack={() => setView('list')}
                initialOwnerType={mode === 'client-global' ? 'client' : (mode === 'debtor' ? 'debtor' : 'supplier')}
                initialFacilityClass="global"
            />
        );
    }

    return (
        <div className="space-y-8 text-left text-foreground">
            <InitializeSubFacilityModal 
                parent={selectedMaster} 
                clients={clients}
                isOpen={isSubModalOpen} 
                onOpenChange={setIsSubModalOpen} 
                onComplete={forceRefresh} 
            />

            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent className="text-left text-foreground">
                    <AlertDialogHeader className="text-left text-foreground">
                        <AlertDialogTitle>Expunge Authority Node?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently remove the facility from the ledger.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="text-left">
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className={cn(buttonVariants({ variant: 'destructive' }))}>Confirm Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 text-left text-foreground">
                <div className="text-left text-foreground">
                    <h1 className="text-3xl font-black font-headline tracking-tight flex items-center gap-3 text-left">
                        {mode === 'client-global' ? <Scale className="h-8 w-8 text-primary" /> : <Landmark className="h-8 w-8 text-primary" />}
                        {mode === 'client-global' ? 'Client Facilities' : (mode === 'debtor' ? 'Debtor Registry Ceilings' : 'Supplier Credit Matrix')}
                    </h1>
                    <p className="text-muted-foreground mt-1 text-left">Management of master limits and partitioned agreement nodes.</p>
                </div>
                <div className="flex gap-2 text-left text-foreground">
                    <Button variant="outline" size="sm" onClick={forceRefresh} disabled={isLoading} className="gap-2">
                        <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} /> Sync Matrix
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setIsSubModalOpen(true)} 
                        disabled={!selectedMasterId}
                        className={cn("gap-2 font-bold h-10 px-6", selectedMasterId && "border-primary text-primary bg-primary/5")}
                    >
                        {mode === 'debtor' ? <UserPlus className="h-4 w-4" /> : <FileSignature className="h-4 w-4" />}
                        {mode === 'debtor' ? 'Client Allocation' : 'Agreement Facility'}
                    </Button>
                    <Button onClick={() => { setSelectedFacility(null); setView('wizard'); }} className="gap-2 font-bold shadow-lg h-10 px-6 text-white text-left">
                        <PlusCircle className="h-4 w-4" /> New Master Facility
                    </Button>
                </div>
            </div>

            <Card className="border-none shadow-xl bg-white overflow-hidden text-left text-foreground text-left">
                <Table>
                    <TableHeader className="bg-slate-900">
                        <TableRow className="hover:bg-slate-900 border-none">
                            <TableHead className="w-12 text-center text-white text-[10px] uppercase font-black tracking-widest">Select</TableHead>
                            <TableHead className="w-10"></TableHead>
                            <TableHead className="text-white font-black uppercase text-[10px] tracking-widest py-4 text-left">Fiduciary Entity</TableHead>
                            <TableHead className="text-white font-black uppercase text-[10px] tracking-widest py-4 text-right">Limit Ceiling</TableHead>
                            <TableHead className="text-white font-black uppercase text-[10px] tracking-widest py-4 text-center">Status</TableHead>
                            <TableHead className="text-white font-black uppercase text-[10px] tracking-widest py-4 text-right">Audit</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={6} className="h-64 text-center"><Loader2 className="animate-spin h-10 w-10 text-primary mx-auto" /></TableCell></TableRow>
                        ) : filteredGlobals.length > 0 ? filteredGlobals.map((global) => {
                            const isExpanded = expandedIds.has(global.id);
                            const isChecked = selectedMasterId === global.id;
                            const subs = facilities.filter(f => f.parentId === global.id);
                            
                            const totalPartitioned = subs.reduce((sum, s) => sum + (s.limit || 0), 0);
                            const availableBalance = (global.limit || 0) - totalPartitioned;

                            return (
                                <React.Fragment key={global.id}>
                                    <TableRow className={cn("group hover:bg-slate-50 transition-colors text-left", isChecked && "bg-primary/5")}>
                                        <TableCell className="text-center">
                                            <Checkbox 
                                                checked={isChecked} 
                                                onCheckedChange={(checked) => setSelectedMasterId(checked ? global.id : null)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => toggleExpand(global.id)} className="h-8 w-8 text-primary">
                                                {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                                            </Button>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-left text-foreground">
                                                <span className="font-black text-sm text-slate-900">{global.ownerName || 'Unknown Node'}</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="outline" className="capitalize text-[8px] h-3.5 font-black border-primary/20 text-primary uppercase">
                                                        {global.ownerType} Master
                                                    </Badge>
                                                    <span className="text-[9px] text-muted-foreground font-mono uppercase text-left">ID: {global.id.slice(-6)}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-black text-lg text-foreground">
                                            {formatCurrency(global.limit)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge className={cn("capitalize text-[9px] font-black border-none text-white", global.status === 'active' ? 'bg-green-600' : 'bg-slate-400')}>
                                                {global.status || 'Active'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right text-foreground">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="text-left">
                                                    <DropdownMenuItem onClick={() => { setSelectedFacility(global); setView('wizard'); }}><Edit className="h-4 w-4 mr-2" /> Adjust Ceiling</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => handleStatusUpdate(global, global.status === 'inactive' ? 'active' : 'inactive')}>
                                                        {global.status === 'inactive' ? <><CheckCircle className="h-4 w-4 mr-2 text-green-600" /> Reactivate</> : <><XCircle className="h-4 w-4 mr-2 text-amber-600" /> Suspend</>}
                                                    </DropdownMenuItem>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                                                <Trash2 className="h-4 w-4 mr-2" /> Expunge Node
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent className="text-left text-foreground">
                                                            <AlertDialogHeader className="text-left">
                                                                <AlertDialogTitle className="text-left text-foreground">Confirm Permanent Deletion</AlertDialogTitle>
                                                                <AlertDialogDescription className="text-left text-foreground">This will remove the facility from the ledger. This action is immutable.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter className="text-left">
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => { setFacilityToDelete(global); handleDelete(); }} className={cn(buttonVariants({ variant: 'destructive' }))}>Delete Node</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                    
                                    {isExpanded && (
                                        <TableRow className="bg-slate-50 border-y-2 border-primary/10 text-left">
                                            <TableCell colSpan={6} className="p-0">
                                                <div className="p-8 space-y-6 text-left animate-in slide-in-from-top-2 duration-300">
                                                    <div className="flex justify-between items-center text-left">
                                                        <div className="text-left text-foreground">
                                                            <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2 text-left">
                                                                <Zap className="h-4 w-4 fill-current" /> Authorization Ledger: {global.ownerName}
                                                            </h4>
                                                            <p className="text-[10px] text-muted-foreground mt-1 text-left text-foreground">Specific sub-partitions approved under this ceiling.</p>
                                                        </div>
                                                    </div>

                                                    {subs.length > 0 ? (
                                                        <div className="border rounded-xl bg-white shadow-inner overflow-hidden text-left">
                                                            <Table>
                                                                <TableHeader className="bg-muted/50">
                                                                    <TableRow>
                                                                        <TableHead className="text-[9px] font-black uppercase py-2 text-left text-foreground">Agreement Node & Audit Trail</TableHead>
                                                                        <TableHead className="text-[9px] font-black uppercase py-2 text-right text-foreground">Sub-Limit</TableHead>
                                                                        <TableHead className="text-[9px] font-black uppercase py-2 text-right text-foreground">Actions</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {subs.map(sub => (
                                                                        <TableRow key={sub.id} className="hover:bg-slate-50 transition-colors text-left">
                                                                            <TableCell>
                                                                                <div className="flex flex-col text-left text-foreground">
                                                                                    <Badge variant="outline" className="capitalize text-[10px] font-black border-slate-300 w-fit text-left">
                                                                                        {mode === 'debtor' ? (clientMap.get(sub.associatedClientId) || 'Member Allocation') : (sub.type?.replace(/_/g, ' ') || 'Agreement')}
                                                                                    </Badge>
                                                                                    <div className="flex items-center gap-2 mt-1.5 text-[9px] text-muted-foreground font-bold uppercase tracking-widest text-left">
                                                                                        <div className="flex items-center gap-1 text-left"><Clock className="h-2.5 w-2.5" /> {formatDateSafe(sub.createdAt, "dd MMM yyyy, HH:mm")}</div>
                                                                                        <Separator orientation="vertical" className="h-2.5 bg-slate-300" />
                                                                                        <div className="flex items-center gap-1 text-left text-foreground"><User className="h-2.5 w-2.5" /> {sub.createdByName || 'System Auto'}</div>
                                                                                    </div>
                                                                                </div>
                                                                            </TableCell>
                                                                            <TableCell className="text-right font-black text-sm text-foreground text-left">
                                                                                {formatCurrency(sub.limit)}
                                                                            </TableCell>
                                                                            <TableCell className="text-right text-foreground">
                                                                                <div className="flex justify-end gap-1 text-left text-foreground">
                                                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => { setSelectedFacility(sub); setView('wizard'); }}><Edit className="h-3.5 w-3.5" /></Button>
                                                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setFacilityToDelete(sub); setIsDeleteAlertOpen(true); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                                                                                </div>
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                                <TableFooter className="bg-slate-50 border-t">
                                                                    <TableRow>
                                                                        <TableCell className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-right">
                                                                            Remaining Available Ceiling
                                                                        </TableCell>
                                                                        <TableCell className="text-right font-black text-sm text-primary">
                                                                            {formatCurrency(availableBalance)}
                                                                        </TableCell>
                                                                        <TableCell />
                                                                    </TableRow>
                                                                </TableFooter>
                                                            </Table>
                                                        </div>
                                                    ) : (
                                                        <div className="py-12 text-center border-2 border-dashed rounded-xl bg-white/50 opacity-40">
                                                            <p className="text-[10px] font-bold uppercase tracking-widest text-center text-foreground">No Partitions Allocated</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </React.Fragment>
                            );
                        }) : (
                            <TableRow>
                                <TableCell colSpan={6} className="py-32 text-center text-muted-foreground text-left text-foreground">
                                    <div className="flex flex-col items-center gap-4 opacity-20 text-center text-foreground">
                                        <Landmark className="h-16 w-16" />
                                        <p className="text-sm font-bold uppercase tracking-widest text-center">No facilities matched.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
