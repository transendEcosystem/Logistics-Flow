'use client';

import { Suspense, useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Search, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const mallLabels: Record<string, string> = {
    distribution: 'Distribution Shops', finance: 'Finance Shops', 'buy-sell': 'Seller Shops', 'sa-auction': 'Auction & Salvage Shops',
};

function PublicShopsContent() {
    const firestore = useFirestore();
    const params = useSearchParams();
    const mall = params.get('mall') || '';
    const [searchTerm, setSearchTerm] = useState('');
    const [hasSearched, setHasSearched] = useState(false);

    const shopsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'shops'), where('status', '==', 'approved'));
    }, [firestore]);

    const { data: shops, isLoading, error } = useCollection(shopsQuery);
    const matchingShops = useMemo(() => (shops || []).filter(shop => {
        const profile = `${shop.shopName || ''} ${shop.shopType || ''} ${shop.category || ''} ${shop.shopDescription || ''}`.toLowerCase();
        const matchesMall = !mall || (mall === 'distribution' && /(distribution|courier|transporter|delivery)/.test(profile)) || (mall === 'finance' && /(finance|lender|funding|insurance)/.test(profile)) || (mall === 'buy-sell' && /(seller|vehicle|asset|marketplace)/.test(profile)) || (mall === 'sa-auction' && /(auction|salvage|asset)/.test(profile));
        return matchesMall && profile.includes(searchTerm.toLowerCase());
    }), [shops, mall, searchTerm]);
    const title = mallLabels[mall] || 'Member Shops';

    return (
        <div className="container mx-auto px-4 py-16">
            <div className="text-center max-w-3xl mx-auto mb-12">
                <h1 className="text-4xl md:text-5xl font-bold font-headline">{title}</h1>
                <p className="mt-4 text-lg md:text-xl text-muted-foreground">
                    Search and evaluate verified member Shops before engaging a provider.
                </p>
            </div>

            <Card className="mx-auto mb-10 max-w-3xl"><CardContent className="grid gap-3 p-5 md:grid-cols-[1fr_auto]"><Input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Provider name, service, product or capability" onKeyDown={event => event.key === 'Enter' && setHasSearched(true)} /><Button onClick={() => setHasSearched(true)}><Search className="mr-2 h-4 w-4" />Search Shops</Button></CardContent></Card>

            {isLoading && (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            )}

            {error && (
                <div className="text-center py-20 text-destructive">
                    <p>An error occurred while loading shops. Please try again later.</p>
                    <p className="text-sm">{error.message}</p>
                </div>
            )}

            {!isLoading && shops && hasSearched && (
                matchingShops.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {matchingShops.map(shop => (
                            <Card key={shop.id} className="flex flex-col">
                                <CardHeader>
                                    <CardTitle>{shop.shopName}</CardTitle>
                                    <CardDescription>{shop.category}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <p className="text-sm text-muted-foreground line-clamp-3">
                                        {shop.shopDescription}
                                    </p>
                                </CardContent>
                                <CardFooter>
                                    <Button asChild className="w-full">
                                        <Link href={`/shops/${shop.id}`}>
                                            Visit Shop
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 border-2 border-dashed rounded-lg">
                        <Store className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-xl font-semibold">No Matching Shops</h3>
                        <p className="mt-2 text-muted-foreground">Try broadening your provider, service or capability search.</p>
                    </div>
                )
            )}
            {!isLoading && !hasSearched && <div className="text-center py-20 border-2 border-dashed rounded-lg"><Store className="mx-auto h-12 w-12 text-muted-foreground" /><h3 className="mt-4 text-xl font-semibold">Search Verified Shops</h3><p className="mt-2 text-muted-foreground">Enter a query to find providers in this mall.</p></div>}
        </div>
    );
}

export default function PublicShopsPage() {
    return <Suspense fallback={<div className="py-20 text-center text-muted-foreground">Loading Shops...</div>}><PublicShopsContent /></Suspense>;
}
