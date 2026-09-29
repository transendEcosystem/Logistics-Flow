'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Search, Store, MapPin, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const mallLabels: Record<string, string> = {
    supplier: 'Supplier Shops',
    transporter: 'Transport Shops',
    loads: 'Load & Freight Shops',
    warehouse: 'Warehouse & Storage Shops',
    distribution: 'Distribution & Courier Shops',
    finance: 'Finance & Lending Shops',
    'buy-sell': 'Buy & Sell Asset Shops',
    'sa-auction': 'Auction & Salvage Shops',
};

function PublicShopsContent() {
    const firestore = useFirestore();
    const params = useSearchParams();
    const mall = params.get('mall') || '';
    const [searchTerm, setSearchTerm] = useState('');
    const [apiShops, setApiShops] = useState<any[]>([]);
    const [isApiLoading, setIsApiLoading] = useState(true);

    const shopsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'shops'));
    }, [firestore]);

    const { data: firestoreShops, isLoading: isFirestoreLoading } = useCollection(shopsQuery);

    useEffect(() => {
        let isMounted = true;
        fetch('/api/getApprovedShops')
            .then(res => res.json())
            .then(res => {
                if (isMounted && res.success && Array.isArray(res.data)) {
                    setApiShops(res.data);
                }
            })
            .catch(err => console.error("Failed to fetch shops API:", err))
            .finally(() => {
                if (isMounted) setIsApiLoading(false);
            });
        return () => { isMounted = false; };
    }, []);

    const allShops = useMemo(() => {
        const map = new Map<string, any>();
        (apiShops || []).forEach(s => { if (s.id) map.set(s.id, s); });
        (firestoreShops || []).forEach(s => { if (s.id) map.set(s.id, { ...map.get(s.id), ...s }); });
        return Array.from(map.values());
    }, [apiShops, firestoreShops]);

    const matchingShops = useMemo(() => {
        const normalizedMall = mall.toLowerCase();
        const term = searchTerm.toLowerCase().trim();

        return allShops.filter(shop => {
            const nodeType = String(shop.nodeType || '').toLowerCase();
            const shopType = String(shop.shopType || '').toLowerCase();
            const category = String(shop.category || '').toLowerCase();
            const name = String(shop.shopName || '').toLowerCase();
            const desc = String(shop.shopDescription || shop.aboutText || '').toLowerCase();
            const profile = `${name} ${shopType} ${nodeType} ${category} ${desc}`;

            let matchesMall = true;
            if (normalizedMall) {
                if (normalizedMall === 'supplier') {
                    matchesMall = nodeType === 'supplier' || shopType === 'vendor' || shopType === 'supplier' || /(supplier|vendor|parts|equipment|spares)/.test(profile);
                } else if (normalizedMall === 'transporter') {
                    matchesMall = nodeType === 'transport' || shopType === 'transporter' || /(transporter|haulier|fleet|truck|freight)/.test(profile);
                } else if (normalizedMall === 'loads') {
                    matchesMall = nodeType === 'loads' || shopType === 'loads' || shopType === 'broker' || /(loads|broker|freight|clearing)/.test(profile);
                } else if (normalizedMall === 'warehouse') {
                    matchesMall = nodeType === 'warehouse' || shopType === 'warehouse' || /(warehouse|storage|pallets|depot)/.test(profile);
                } else if (normalizedMall === 'distribution') {
                    matchesMall = nodeType === 'distribution' || shopType === 'distribution' || /(distribution|courier|transporter|delivery|parcel)/.test(profile);
                } else if (normalizedMall === 'finance') {
                    matchesMall = nodeType === 'finance' || shopType === 'finance' || /(finance|lender|funding|lending|insurance)/.test(profile);
                } else if (normalizedMall === 'buy-sell') {
                    matchesMall = nodeType === 'buy-sell' || shopType === 'buy-sell' || /(seller|vehicle|asset|marketplace|dealer|trade)/.test(profile);
                } else if (normalizedMall === 'sa-auction') {
                    matchesMall = nodeType === 'sa-auction' || /(auction|salvage|repo)/.test(profile);
                } else {
                    matchesMall = profile.includes(normalizedMall);
                }
            }

            const matchesSearch = !term || profile.includes(term);
            return matchesMall && matchesSearch;
        });
    }, [allShops, mall, searchTerm]);

    const title = mallLabels[mall] || 'Member Shops';
    const isLoading = isApiLoading && isFirestoreLoading && allShops.length === 0;

    return (
        <div className="container mx-auto px-4 py-16">
            <div className="text-center max-w-3xl mx-auto mb-12">
                <Badge variant="outline" className="mb-3 font-bold uppercase tracking-widest text-[10px] bg-primary/5 text-primary border-primary/20">
                    <Store className="h-3 w-3 mr-1" /> Public Directory
                </Badge>
                <h1 className="text-4xl md:text-5xl font-black font-headline tracking-tight">{title}</h1>
                <p className="mt-4 text-lg md:text-xl text-muted-foreground">
                    Search and evaluate verified member Shops before engaging a provider.
                </p>
            </div>

            <Card className="mx-auto mb-10 max-w-3xl shadow-lg border-2">
                <CardContent className="grid gap-3 p-5 md:grid-cols-[1fr_auto]">
                    <Input 
                        value={searchTerm} 
                        onChange={event => setSearchTerm(event.target.value)} 
                        placeholder="Provider name, service, product or capability..." 
                        className="h-11 border-2 font-medium bg-white"
                    />
                    <Button size="lg" className="h-11 px-6 font-bold uppercase tracking-wider">
                        <Search className="mr-2 h-4 w-4" /> Filter Shops
                    </Button>
                </CardContent>
            </Card>

            {isLoading && (
                <div className="flex flex-col justify-center items-center py-20 gap-3">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Scanning Shop Registry...</p>
                </div>
            )}

            {!isLoading && (
                matchingShops.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {matchingShops.map(shop => (
                            <Card key={shop.id} className="flex flex-col shadow-md hover:shadow-xl transition-all border-2">
                                <CardHeader className="space-y-2">
                                    <div className="flex justify-between items-start gap-2">
                                        <CardTitle className="text-xl font-bold font-headline">{shop.shopName}</CardTitle>
                                        <Badge variant="secondary" className="uppercase text-[9px] font-black shrink-0">{shop.shopType || shop.nodeType || 'Shop'}</Badge>
                                    </div>
                                    <CardDescription className="text-xs font-medium flex items-center gap-1">
                                        <Store className="h-3 w-3 text-primary" /> {shop.category || 'Logistics Provider'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow space-y-3">
                                    <p className="text-sm text-muted-foreground line-clamp-3">
                                        {shop.aboutText || shop.shopDescription || 'Verified Logistics Flow commercial node.'}
                                    </p>
                                    {shop.serviceZones && (
                                        <p className="text-xs text-slate-600 font-medium flex items-center gap-1">
                                            <MapPin className="h-3 w-3 text-primary shrink-0" /> <span className="truncate">{shop.serviceZones}</span>
                                        </p>
                                    )}
                                </CardContent>
                                <CardFooter className="pt-2 border-t bg-slate-50/50">
                                    <Button asChild className="w-full font-bold uppercase tracking-wider">
                                        <Link href={`/shops/${shop.id}`}>
                                            Visit Shop <Sparkles className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 border-2 border-dashed rounded-2xl bg-muted/10 max-w-xl mx-auto space-y-4">
                        <Store className="mx-auto h-12 w-12 text-muted-foreground opacity-40" />
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tight">No Active {title} Yet</h3>
                            <p className="mt-2 text-muted-foreground text-sm max-w-md mx-auto">
                                Be the first commercial provider to publish a verified {mall ? (mallLabels[mall] || mall) : 'Shop'} profile in this Mall and receive direct network RFQs.
                            </p>
                        </div>
                        <Button asChild size="lg" className="font-bold uppercase text-xs tracking-wider px-8">
                            <Link href={`/account?view=shop${mall ? `&nodeType=${mall}` : ''}`}>
                                Open {title.replace(/Shops$/, 'Shop')} <Sparkles className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                )
            )}
        </div>
    );
}

export default function PublicShopsPage() {
    return (
        <Suspense fallback={<div className="py-20 text-center text-muted-foreground">Loading Shops...</div>}>
            <PublicShopsContent />
        </Suspense>
    );
}
