'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SalesTransactionHub } from '@/app/account/sales/transaction-hub';
import React from 'react';

/**
 * VEHICLE TRANSACTION PAGE
 * Serves as the public conclusion hub for the Buy & Sell Mall.
 */
function VehicleTransactionPage() {
    const params = useParams();
    const router = useRouter();
    const vehicleId = params?.vehicleId as string;
    const firestore = useFirestore();

    const vehicleRef = useMemoFirebase(() => {
        if (!firestore || !vehicleId) return null;
        // Search collection group for the vehicle
        return doc(firestore, 'vehicleListings', vehicleId);
    }, [firestore, vehicleId]);

    const { data: vehicle, isLoading, error } = useDoc(vehicleRef);

    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center h-screen gap-4 bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Initializing Secure Transaction...</p>
            </div>
        );
    }

    if (error || !vehicle) {
        return (
            <div className="flex flex-col items-center justify-center h-screen space-y-4 px-4 text-center">
                <h1 className="text-2xl font-bold">Listing Not Found</h1>
                <p className="text-muted-foreground">The vehicle you are looking for is no longer active in the marketplace.</p>
                <Button onClick={() => router.push('/marketplace')} variant="outline">Return to Mall</Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-16">
            <SalesTransactionHub vehicle={vehicle} onBack={() => router.push('/marketplace')} />
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" /></div>}>
            <VehicleTransactionPage />
        </Suspense>
    );
}
