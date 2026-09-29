
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

    const { data: firestoreShop, isLoading: isShopLoading } = useDoc(shopRef);
    const { data: products, isLoading: areProductsLoading } = useCollection(productsQuery);
    const [apiShop, setApiShop] = useState<any>(null);
    const [isApiLoading, setIsApiLoading] = useState(false);

    useEffect(() => {
        if (!isShopLoading && !firestoreShop && shopId && isClient) {
            setIsApiLoading(true);
            fetch('/api/getApprovedShops')
                .then(res => res.json())
                .then(res => {
                    if (res.success && Array.isArray(res.data)) {
                        const found = res.data.find((s: any) => s.id === shopId);
                        if (found) setApiShop(found);
                    }
                })
                .catch(err => console.error("Failed to fetch fallback shop:", err))
                .finally(() => setIsApiLoading(false));
        }
    }, [isShopLoading, firestoreShop, shopId, isClient]);

    const shop = firestoreShop || apiShop;
    const isLoading = !isClient || isShopLoading || areProductsLoading || (isApiLoading && !shop);

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
    return (
        <div className="min-h-screen bg-slate-50/30 pb-16">
            <div className="bg-slate-900 text-white py-3 border-b border-white/10">
                <div className="container mx-auto px-4 flex items-center justify-between text-xs font-semibold">
                    <Link href={`/shops${shop?.nodeType ? `?mall=${shop.nodeType}` : ''}`} className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors">
                        <Store className="h-3.5 w-3.5 text-primary" /> ← Return to {shop?.nodeType ? `${shop.nodeType[0].toUpperCase()}${shop.nodeType.slice(1)} Mall Directory` : 'Public Shops Directory'}
                    </Link>
                    <Link href="/mall" className="text-slate-400 hover:text-white transition-colors">
                        All Ecosystem Malls
                    </Link>
                </div>
            </div>
            <ShopPreview shop={shop} products={products || []} />
        </div>
    );
}
