'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function PublicShopsPage() {
    const firestore = useFirestore();

    const shopsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'shops'), where('status', '==', 'approved'));
    }, [firestore]);

    const { data: shops, isLoading, error } = useCollection(shopsQuery);

    return (
        <div className="container mx-auto px-4 py-16">
            <div className="text-center max-w-3xl mx-auto mb-12">
                <h1 className="text-4xl md:text-5xl font-bold font-headline">TransConnect Shops</h1>
                <p className="mt-4 text-lg md:text-xl text-muted-foreground">
                    Discover products and services from trusted vendors in our community.
                </p>
            </div>

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

            {!isLoading && shops && (
                shops.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {shops.map(shop => (
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
                        <h3 className="mt-4 text-xl font-semibold">The Marketplace is Growing</h3>
                        <p className="mt-2 text-muted-foreground">No shops have been approved yet. Check back soon!</p>
                    </div>
                )
            )}
        </div>
    );
}
