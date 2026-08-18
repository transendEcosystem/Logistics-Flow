'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, Truck, Edit } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { VehicleWizard } from './vehicle-wizard';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const formatCurrency = (price: number) => {
    if (typeof price !== 'number') return 'N/A';
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(price);
};

const statusColors: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  draft: 'secondary',
  pending_review: 'outline',
  approved: 'default',
  sold: 'destructive',
};

export default function VehicleListingsContent() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [view, setView] = useState<'list' | 'wizard'>('list');
    const [selectedListing, setSelectedListing] = useState<any | null>(null);

    const userDocRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, `users/${user.uid}`);
    }, [firestore, user]);
    const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

    const companyId = userData?.companyId;

    const listingsQuery = useMemoFirebase(() => {
        if (!firestore || !companyId) return null;
        return query(collection(firestore, `companies/${companyId}/vehicleListings`));
    }, [firestore, companyId]);

    const { data: listings, isLoading: areListingsLoading, forceRefresh } = useCollection(listingsQuery);

    const handleEdit = (listing: any) => {
        setSelectedListing(listing);
        setView('wizard');
    }

    const handleBackToList = () => {
        setView('list');
        setSelectedListing(null);
    }
    
    const handleSaveSuccess = () => {
        forceRefresh();
        handleBackToList();
    }
    
    const columns: ColumnDef<any>[] = useMemo(() => [
        { accessorKey: 'make', header: 'Make' },
        { accessorKey: 'model', header: 'Model' },
        { accessorKey: 'year', header: 'Year' },
        { accessorKey: 'price', header: 'Price', cell: ({ row }) => formatCurrency(row.original.price) },
        { accessorKey: 'status', header: 'Status', cell: ({ row }) => <Badge variant={statusColors[row.original.status] || 'secondary'} className="capitalize">{row.original.status}</Badge> },
        { id: 'actions', header: 'Actions', cell: ({ row }) => (
            <div className="text-right">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)}>
                    <Edit className="h-4 w-4"/>
                </Button>
            </div>
        )},
    ], [handleEdit]);

    const isLoading = isUserLoading || isUserDataLoading || areListingsLoading;
    
    if(view === 'wizard') {
        return <VehicleWizard listing={selectedListing} companyId={companyId} onBack={handleBackToList} onSaveSuccess={handleSaveSuccess} />;
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Truck /> My Vehicle Listings
                    </CardTitle>
                    <CardDescription>
                        Manage the vehicles you have listed for sale in the Buy & Sell Mall.
                    </CardDescription>
                </div>
                <Button onClick={() => setView('wizard')}><PlusCircle className="mr-2 h-4 w-4" /> Add Vehicle</Button>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : (
                    <DataTable columns={columns} data={listings || []} />
                )}
            </CardContent>
        </Card>
    );
}
