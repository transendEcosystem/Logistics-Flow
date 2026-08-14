'use client';

import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button, buttonVariants } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useCollection, getClientSideAuthToken, useMemoFirebase } from '@/firebase';
import { collection, deleteDoc, doc } from 'firebase/firestore';
import { Loader2, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { usePermissions } from '@/hooks/use-permissions';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

const formatDate = (date: any) => {
  if (!date) return 'N/A';
  const d = date.toDate ? date.toDate() : new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';
  return format(d, 'dd MMM yyyy');
};

const loadSchema = z.object({
  origin: z.string().min(1, 'Origin is required'),
  destination: z.string().min(1, 'Destination is required'),
  cargoDescription: z.string().min(1, 'Description is required'),
  weight: z.coerce.number().positive(),
  pallets: z.coerce.number().int().positive().optional(),
  rate: z.coerce.number().positive().optional(),
  pickupDate: z.string().min(1, 'Pickup date is required'),
  deliveryDate: z.string().min(1, 'Delivery date is required'),
});
type LoadFormValues = z.infer<typeof loadSchema>;

function LoadDialog({ loadBoard, load, onComplete, children }: { loadBoard: any, load?: any, onComplete: () => void, children: React.ReactNode }) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const form = useForm<LoadFormValues>({
    resolver: zodResolver(loadSchema),
  });

  React.useEffect(() => {
    if(isOpen) {
        form.reset({
            origin: load?.origin || '',
            destination: load?.destination || '',
            cargoDescription: load?.cargoDescription || '',
            weight: load?.weight || 0,
            pallets: load?.pallets || undefined,
            rate: load?.rate || undefined,
            pickupDate: load?.pickupDate ? format(new Date(load.pickupDate), 'yyyy-MM-dd') : '',
            deliveryDate: load?.deliveryDate ? format(new Date(load.deliveryDate), 'yyyy-MM-dd') : '',
        });
    }
  }, [isOpen, load, form]);

  const onSubmit = async (values: LoadFormValues) => {
    setIsSaving(true);
    try {
        const token = await getClientSideAuthToken();
        if (!token) throw new Error("Authentication failed.");
        
        const path = `companies/${loadBoard.companyId}/loadBoards/${loadBoard.id}/loads`;
        const dataToSave = { 
            ...values, 
            status: 'active',
            postedAt: { _methodName: 'serverTimestamp' },
            updatedAt: { _methodName: 'serverTimestamp' }
        };

        const response = await fetch(load ? '/api/updateUserDoc' : '/api/addUserDoc', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(load ? { path: `${path}/${load.id}`, data: dataToSave } : { collectionPath: path, data: dataToSave }),
        });

        if(!response.ok) throw new Error((await response.json()).error || 'Failed to save load.');

        toast({ title: load ? 'Load Updated!' : 'Load Posted!' });
        onComplete();
        setIsOpen(false);
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: e.message });
    } finally {
        setIsSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="max-w-xl">
            <DialogHeader>
                <DialogTitle>{load ? 'Edit Load' : 'Post New Load'}</DialogTitle>
                <DialogDescription>Enter the details for your available freight.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="origin" render={({ field }) => <FormItem><FormLabel>Origin</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>} />
                        <FormField control={form.control} name="destination" render={({ field }) => <FormItem><FormLabel>Destination</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>} />
                    </div>
                    <FormField control={form.control} name="cargoDescription" render={({ field }) => <FormItem><FormLabel>Cargo Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage/></FormItem>} />
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        <FormField control={form.control} name="weight" render={({ field }) => <FormItem><FormLabel>Weight (tons)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>} />
                        <FormField control={form.control} name="pallets" render={({ field }) => <FormItem><FormLabel># of Pallets (Optional)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>} />
                        <FormField control={form.control} name="rate" render={({ field }) => <FormItem><FormLabel>Rate (R/km, optional)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>} />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="pickupDate" render={({ field }) => <FormItem><FormLabel>Pickup Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage/></FormItem>} />
                        <FormField control={form.control} name="deliveryDate" render={({ field }) => <FormItem><FormLabel>Delivery Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage/></FormItem>} />
                    </div>
                     <DialogFooter className="pt-4">
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            {load ? 'Save Changes' : 'Post Load'}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    </Dialog>
  )
}

function StepLoads({ loadBoard }: { loadBoard: any }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [deletingId, setDeletingId] = useState<string|null>(null);

    const loadsQuery = useMemoFirebase(() => {
        if (!firestore || !loadBoard?.companyId || !loadBoard?.id) return null;
        return collection(firestore, `companies/${loadBoard.companyId}/loadBoards/${loadBoard.id}/loads`);
    }, [firestore, loadBoard?.companyId, loadBoard?.id]);

    const { data: loads, isLoading, forceRefresh } = useCollection(loadsQuery);
    
    const { can } = usePermissions();
    const canManageLoads = can('manage', 'loads');

    const handleDelete = async (loadId: string) => {
        setDeletingId(loadId);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Auth failed");
            await fetch('/api/deleteUserDoc', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: `companies/${loadBoard.companyId}/loadBoards/${loadBoard.id}/loads/${loadId}`})
            });
            toast({ title: "Load Deleted" });
            forceRefresh();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Delete Failed", description: e.message });
        } finally {
            setDeletingId(null);
        }
    }

    const columns: ColumnDef<any>[] = useMemo(() => [
        { accessorKey: 'origin', header: 'Origin' },
        { accessorKey: 'destination', header: 'Destination' },
        { accessorKey: 'cargoDescription', header: 'Cargo' },
        { accessorKey: 'weight', header: 'Weight (t)', cell: ({row}) => `${row.original.weight}t`},
        { accessorKey: 'pickupDate', header: 'Pickup', cell: ({row}) => formatDate(row.original.pickupDate)},
        { accessorKey: 'deliveryDate', header: 'Delivery', cell: ({row}) => formatDate(row.original.deliveryDate)},
        { id: 'actions', header: <div className="text-right">Actions</div>, cell: ({row}) => (
            <div className="flex justify-end gap-2">
                <LoadDialog loadBoard={loadBoard} load={row.original} onComplete={forceRefresh}>
                    <Button variant="ghost" size="icon" disabled={!canManageLoads}>
                        <Edit className="h-4 w-4" />
                    </Button>
                </LoadDialog>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={!canManageLoads || !!deletingId}>
                            {deletingId === row.original.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4 text-destructive" />}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this load.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(row.original.id)} className={buttonVariants({ variant: "destructive" })}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        )},
    ], [canManageLoads, deletingId, loadBoard, forceRefresh]);
    
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">Posted Loads</h3>
                 <LoadDialog loadBoard={loadBoard} onComplete={forceRefresh}>
                    <Button disabled={!canManageLoads}><PlusCircle className="mr-2 h-4 w-4" /> Post New Load</Button>
                </LoadDialog>
            </div>
            
            {isLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : (
                <DataTable columns={columns} data={loads || []} />
            )}
        </div>
    );
}

export function LoadWizard({ loadBoard, onUpdate }: { loadBoard: any, onUpdate: () => void }) {
    return (
        <div className="space-y-6">
            <StepLoads loadBoard={loadBoard} />
        </div>
    );
}
