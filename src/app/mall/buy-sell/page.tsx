
'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Loader2, Truck, MapPin, Tag, Filter, ArrowRight, Lock, Sparkles, ShoppingCart, Landmark } from 'lucide-react';
import { useUser, getClientSideAuthToken } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import Link from 'next/link';
import { formatCurrency, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function BuySellMall() {
    const { user, isUserLoading } = useUser();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [listings, setListings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const isPaid = user?.companyData?.membershipId && user.companyData.membershipId !== 'free';

    const handleSearch = async () => {
        setIsLoading(true);
        setHasSearched(true);
        try {
            const token = await getClientSideAuthToken();
            const response = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Authorization': token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'searchListings', payload: { term: searchTerm } }),
            });
            const result = await response.json();
            setListings(result.data || []);
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Search Error", description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-slate-50 min-h-screen text-left">
            <section className="bg-slate-900 text-white py-16 text-center">
                <div className="container mx-auto px-4">
                    <Badge className="mb-4 bg-primary/20 text-primary border-primary/30 py-1.5 px-4 text-[10px] font-black uppercase tracking-widest">Buy & Sell Mall</Badge>
                    <h1 className="text-4xl md:text-6xl font-black font-headline text-white">Vehicle Inventory</h1>
                    <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto text-center">Search new and used heavy-duty assets from verified community members.</p>
                </div>
            </section>

            <section className="container mx-auto px-4 -mt-10 mb-12">
                <Card className="max-w-4xl mx-auto shadow-2xl border-none">
                    <CardContent className="p-6 flex flex-col md:flex-row gap-4 items-end text-left">
                        <div className="flex-1 space-y-2 w-full text-left">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Asset Keyword</Label>
                            <Input 
                                placeholder="e.g. Scania R500, Side-Tipper, 34-ton Trailer..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="h-12 bg-white"
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                        <Button className="h-12 px-10 font-bold gap-2 w-full md:w-auto" onClick={handleSearch} disabled={isLoading}>
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Search className="h-4 w-4" />}
                            Search Inventory
                        </Button>
                    </CardContent>
                </Card>
            </section>

            <div className="container mx-auto px-4 py-8">
                {!hasSearched ? (
                    <div className="text-center py-20 opacity-20">
                        <Truck className="h-24 w-24 mx-auto mb-4" />
                        <p className="text-xl font-bold uppercase tracking-widest text-center">Enter a keyword to scan inventory</p>
                    </div>
                ) : isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        <p className="font-bold text-muted-foreground uppercase tracking-widest text-center">Scanning the Mall...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                        {listings.map(item => (
                            <Card key={item.id} className="overflow-hidden border-none shadow-lg hover:shadow-2xl transition-all group bg-white text-left">
                                <div className="relative aspect-video bg-muted">
                                    {item.photos?.[0]?.url ? (
                                        <Image src={item.photos[0].url} alt={item.make} fill className="object-cover" />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-muted-foreground opacity-20"><Truck className="h-16 w-16" /></div>
                                    )}
                                    <div className="absolute top-3 left-3">
                                        <Badge className="bg-primary text-white font-black text-[10px] uppercase border-none">{item.classification || 'Vehicle'}</Badge>
                                    </div>
                                </div>
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-xl font-black">{item.year} {item.make} {item.model}</CardTitle>
                                    <CardDescription className="flex items-center gap-1.5 font-bold text-primary">
                                        <MapPin className="h-3 w-3" /> {item.location || 'South Africa'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex justify-between items-end border-b pb-4">
                                        <div className="text-left">
                                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Price (Excl. VAT)</p>
                                            <p className="text-2xl font-black text-foreground">{formatCurrency(item.price)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Mileage</p>
                                            <p className="font-bold">{item.mileage?.toLocaleString() || 0} km</p>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="bg-slate-50 border-t flex flex-col gap-2">
                                    <Button asChild className="w-full h-11 font-bold gap-2" variant={isPaid ? "default" : "secondary"}>
                                        <Link href={isPaid ? `/mall/buy-sell/conclusion/${item.id}` : "/pricing"}>
                                            {isPaid ? <><ShoppingCart className="h-4 w-4" /> Start Transaction</> : <><Lock className="h-4 w-4" /> Unlock to Purchase</>}
                                        </Link>
                                    </Button>
                                    <Button asChild variant="outline" className="w-full h-11 font-bold gap-2">
                                        <Link href={isPaid ? `/funding/apply?type=vehicles&amount=${item.price}` : "/pricing"}>
                                            <Landmark className="h-4 w-4" /> Apply for Finance
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                        {listings.length === 0 && (
                            <div className="col-span-full text-center py-20 text-muted-foreground italic text-center">No assets found matching your criteria.</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
