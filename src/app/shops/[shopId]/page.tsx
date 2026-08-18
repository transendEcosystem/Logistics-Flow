
'use client';

import { useDoc, useCollection, useFirestore } from '@/firebase';
import { useMemoFirebase } from '@/hooks/use-memo-firebase';
import { collection, doc, query } from 'firebase/firestore';
import { Loader2, Store } from 'lucide-react';
import { notFound, useParams } from 'next/navigation';
import { ShopPreview } from '@/components/shop-preview';
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function PublicShopPage() {
    const params = useParams();
    const shopId = params?.shopId as string;
    const firestore = useFirestore();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Stabilize the document reference
    const shopRef = useMemoFirebase(() => {
        if (!firestore || !shopId || !isClient) return null;
        return doc(firestore, 'shops', shopId);
    }, [firestore, shopId, isClient]);
    
    // Stabilize the products query
    const productsQuery = useMemoFirebase(() => {
        if (!firestore || !shopId || !isClient) return null;
        return query(collection(firestore, `shops/${shopId}/products`));
    }, [firestore, shopId, isClient]);

    const { data: shop, isLoading: isShopLoading } = useDoc(shopRef);
    const { data: products, isLoading: areProductsLoading } = useCollection(productsQuery);
    
    const isLoading = !isClient || isShopLoading || areProductsLoading;

    if (isLoading) {
         return (
            <div className="flex flex-col justify-center items-center h-screen gap-4 bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Initializing Commercial Profile...</p>
            </div>
        );
    }
    
    // If loading is complete but no document is found in the public root
    if (!shop && !isShopLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen space-y-6 px-4 text-center">
                <div className="bg-muted p-6 rounded-full">
                    <Store className="h-16 w-16 text-muted-foreground opacity-30" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-3xl font-black font-headline">Profile Not Synchronized</h1>
                    <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                        This commercial profile exists internally but hasn't been published to the public registry yet. 
                        If you are the owner, please request an Admin Sync.
                    </p>
                </div>
                <div className="flex gap-4 pt-4">
                    <Button asChild variant="outline" className="px-8">
                        <Link href="/">Return Home</Link>
                    </Button>
                    <Button asChild className="px-8">
                        <Link href="/signin">Sign In to Dashboard</Link>
                    </Button>
                </div>
            </div>
        );
    }

    // Render the shop preview with the fetched data
    return <ShopPreview shop={shop} products={products || []} />;
}
