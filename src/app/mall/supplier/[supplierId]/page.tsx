
'use client';

import React, { useMemo, useState } from 'react';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Store, ShoppingCart, ArrowLeft, ShieldCheck, Mail, Phone, Globe, Package, Handshake, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notFound, useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { getClientSideAuthToken } from '@/firebase';

export default function SupplierProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const supplierId = params.supplierId as string;
    const firestore = useFirestore();
    const [isEngaging, setIsEngaging] = useState(false);

    const shopRef = useMemoFirebase(() => {
        if (!firestore || !supplierId) return null;
        return doc(firestore, 'shops', supplierId);
    }, [firestore, supplierId]);
    
    const partnerRef = useMemoFirebase(() => {
        if (!firestore || !supplierId) return null;
        return doc(firestore, 'partners', supplierId);
    }, [firestore, supplierId]);

    const leadRef = useMemoFirebase(() => {
        if (!firestore || !supplierId) return null;
        return doc(firestore, 'leads', supplierId);
    }, [firestore, supplierId]);

    const { data: shop, isLoading: isShopLoading } = useDoc(shopRef);
    const { data: partner, isLoading: isPartnerLoading } = useDoc(partnerRef);
    const { data: lead, isLoading: isLeadLoading } = useDoc(leadRef);
    
    const productsQuery = useMemoFirebase(() => {
        if (!firestore || !supplierId) return null;
        return query(collection(firestore, `shops/${supplierId}/products`));
    }, [firestore, supplierId]);
    const { data: products, isLoading: areProductsLoading } = useCollection(productsQuery);
    
    const supplier = shop || partner || lead;
    const isLoading = isShopLoading || isPartnerLoading || isLeadLoading || areProductsLoading;
    const isActuallyNotFound = !isLoading && !supplier;

    const handleInitiateHandshake = async () => {
        if (!supplier) return;
        setIsEngaging(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) {
                router.push(`/signin?redirect=/mall/supplier/${supplierId}`);
                return;
            }

            const response = await fetch('/api/recordEngagement', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ 
                    targetId: supplierId, 
                    targetName: supplier.companyName || 'Supplier',
                    targetType: shop ? 'shop' : (partner ? 'partner' : 'lead')
                })
            });

            if (!response.ok) throw new Error("Handshake failed.");

            toast({ 
                title: "Handshake Initiated!", 
                description: "The supplier has been notified and the interest is logged in your dashboard." 
            });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error", description: e.message });
        } finally {
            setIsEngaging(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4 bg-slate-50">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Opening Digital Branch...</p>
            </div>
        );
    }

    if (isActuallyNotFound) {
        notFound();
    }
    
    const name = shop?.shopName || supplier.companyName || 'Industrial Supplier';
    const email = supplier.email || supplier.marketingManager?.email || supplier.ceo?.email || 'N/A';
    const phone = supplier.phone || supplier.mobile || supplier.marketingManager?.mobile || 'N/A';

    return (
        <div className="bg-slate-50 min-h-screen py-16 md:py-24 text-left text-foreground">
             <div className="container mx-auto px-4">
                <Button variant="ghost" onClick={() => router.back()} className="mb-6 gap-2 text-muted-foreground hover:text-primary">
                    <ArrowLeft className="h-4 w-4" /> Back to Mall
                </Button>

                <div className="max-w-6xl mx-auto border-none rounded-[2rem] overflow-hidden shadow-2xl bg-white text-left">
                    <div className="relative h-64 md:h-80 bg-slate-900 text-white">
                         {shop?.heroBannerUrl && <Image src={shop.heroBannerUrl} alt={name} fill className="object-cover opacity-50" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent z-10" />
                        <div className="absolute bottom-0 left-0 p-8 md:p-12 z-20 w-full">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                <div className="flex items-center gap-6">
                                    <div className="bg-white p-4 rounded-3xl shadow-xl">
                                        <Store className="h-12 w-12 text-primary" />
                                    </div>
                                    <div className="space-y-1">
                                        <Badge className="bg-primary text-white border-none uppercase font-black text-[10px] tracking-widest px-3 mb-2">Verified Supplier</Badge>
                                        <h1 className="text-3xl md:text-5xl font-black text-white font-headline leading-none uppercase">{name}</h1>
                                        <div className="flex items-center gap-2 text-slate-300 font-bold text-sm">
                                            <Globe className="h-4 w-4" /> {supplier.industrial_category || 'Industrial Sector'}
                                        </div>
                                    </div>
                                </div>
                                <Button 
                                    className="h-14 px-10 font-black uppercase tracking-tight shadow-xl shadow-primary/20 text-white" 
                                    size="lg"
                                    onClick={handleInitiateHandshake}
                                    disabled={isEngaging}
                                >
                                    {isEngaging ? <Loader2 className="mr-2 animate-spin" /> : <Handshake className="mr-2 h-6 w-6" />}
                                    Initiate Handshake
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 md:p-12 grid md:grid-cols-3 gap-12 text-left">
                        <div className="md:col-span-2 space-y-12 text-left text-foreground">
                            <div className="space-y-4">
                                <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                                    <ShieldCheck className="h-6 w-6 text-primary" />
                                    Professional Standing
                                </h2>
                                <p className="text-lg leading-relaxed text-slate-600 whitespace-pre-wrap italic">
                                    {shop?.shopDescription || supplier.minedServiceWording || supplier.notes || "This supplier is a verified participant in the South African transport grid."}
                                </p>
                            </div>

                            <Separator />

                            {products && products.length > 0 && (
                                <div className="space-y-6">
                                    <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2 text-left">
                                        <Package className="h-6 w-6 text-primary" />
                                        Available Inventory
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        {products.map(p => (
                                            <Card key={p.id} className="overflow-hidden border-none shadow-lg bg-slate-50 group hover:shadow-xl transition-all">
                                                <div className="aspect-square relative bg-muted">
                                                     {p.imageUrls?.[0] ? <Image src={p.imageUrls[0]} alt={p.name} fill className="object-cover" /> : <div className="h-full w-full flex items-center justify-center opacity-10"><ShoppingCart className="h-12 w-12" /></div>}
                                                </div>
                                                <CardContent className="p-4">
                                                    <p className="font-black text-sm uppercase text-slate-900 truncate">{p.name}</p>
                                                    <p className="text-[10px] font-bold text-primary mt-1">EST: {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(p.price)}</p>
                                                </CardContent>
                                                <CardFooter className="p-4 pt-0">
                                                    <Button className="w-full text-xs font-bold" variant="secondary">Inquire</Button>
                                                </CardFooter>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-8 text-left text-foreground">
                            <Card className="shadow-lg border-primary/10 overflow-hidden bg-white">
                                <CardHeader className="bg-slate-50 border-b p-6">
                                    <CardTitle className="text-sm font-black uppercase tracking-widest text-left">Registry Node Details</CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-4">
                                    <div className="space-y-1 text-left">
                                        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Account Lead</p>
                                        <p className="font-bold text-foreground">{supplier.marketingManager?.name || supplier.ceo?.name || supplier.contactPerson || 'Identity Verified'}</p>
                                    </div>
                                    <div className="space-y-1 text-left">
                                        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Company Node</p>
                                        <p className="text-xs font-bold">{email}</p>
                                        <p className="text-xs font-mono text-muted-foreground">{phone}</p>
                                    </div>
                                </CardContent>
                                <CardFooter className="bg-slate-50 border-t p-6">
                                    <Button className="w-full font-black uppercase text-xs tracking-widest gap-2" variant="outline" onClick={handleInitiateHandshake}>
                                        <Zap className="h-3.5 w-3.5 text-primary" /> Active Direct Loop
                                    </Button>
                                </CardFooter>
                            </Card>
                        </div>
                    </div>
                </div>
             </div>
        </div>
    );
}
