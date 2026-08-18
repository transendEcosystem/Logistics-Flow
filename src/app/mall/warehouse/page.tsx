'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import data from "@/lib/placeholder-images.json";
import { Warehouse, ArrowRight, Search, MapPin, Loader2, Database, ShieldCheck, Calculator, Banknote, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as gtag from '@/lib/gtag';
import { Badge } from "@/components/ui/badge";
import { formatCurrency, cn } from "@/lib/utils";

const { placeholderImages } = data;
const warehouseMallImage = placeholderImages.find(p => p.id === 'mall-division');

export default function WarehouseMallPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [shops, setShops] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchShops = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/getApprovedShops');
            const result = await response.json();
            // Filter only warehouse nodes for this mall
            const warehouseShops = (result.data || []).filter((s: any) => s.nodeType === 'warehouse' || s.category?.toLowerCase().includes('warehouse'));
            setShops(warehouseShops);
        } catch (e) {
            console.error("Failed to load community hubs", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchShops();
    }, []);

    const filteredShops = useMemo(() => {
        return shops.filter(shop => {
            return !searchTerm || 
                shop.shopName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                shop.category?.toLowerCase().includes(searchTerm.toLowerCase());
        });
    }, [shops, searchTerm]);

    return (
        <div className="bg-slate-50 min-h-screen text-left text-foreground">
            <section className="relative w-full h-80 bg-slate-900 flex items-center justify-center">
                {warehouseMallImage && (
                    <Image
                        src={warehouseMallImage.imageUrl}
                        alt="Warehouse Mall"
                        fill
                        className="object-cover opacity-40"
                        priority
                        data-ai-hint="warehouse logistics"
                    />
                )}
                <div className="relative z-10 container mx-auto px-4 text-center text-white">
                    <Badge className="bg-primary/20 text-primary border-primary/30 mb-6 py-1.5 px-6 font-black uppercase tracking-widest text-[10px]">Storage Infrastructure</Badge>
                    <h1 className="text-4xl md:text-6xl font-black font-headline text-white text-center">Warehouse Mall</h1>
                    <p className="mt-4 text-lg text-slate-300 max-w-3xl mx-auto text-center">Breaking the storage constraint. Connect with verified community hubs and managed space.</p>
                </div>
            </section>
            
            <section className="py-12 bg-white border-b sticky top-16 z-20 shadow-sm text-left">
                <div className="container mx-auto px-4 text-left">
                     <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-4 items-end text-left text-foreground">
                        <div className="flex-1 w-full space-y-2 text-left">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Search Member Hubs</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                                <Input 
                                    placeholder="Search by facility name or region..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="h-12 pl-10 text-lg bg-white"
                                />
                            </div>
                        </div>
                        <Button asChild size="lg" variant="outline" className="h-12 px-8 border-2 font-bold gap-2">
                            <Link href="/intelligence/warehouse">
                                <Database className="h-5 w-5 text-primary" />
                                Scan Full Registry
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>

             <section className="py-16 md:py-24 text-left">
                <div className="container mx-auto px-4 text-left">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            <p className="text-lg font-bold text-muted-foreground uppercase tracking-widest">Retrieving Community Nodes...</p>
                        </div>
                    ) : filteredShops.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                            {filteredShops.map(shop => (
                                <Card key={shop.id} className="group overflow-hidden border-none shadow-lg hover:shadow-2xl transition-all bg-white flex flex-col text-left">
                                    <div className="relative aspect-video bg-muted overflow-hidden">
                                        {shop.heroBannerUrl ? (
                                            <Image src={shop.heroBannerUrl} alt={shop.shopName} fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-muted-foreground opacity-20">
                                                <Warehouse className="h-12 w-12" />
                                            </div>
                                        )}
                                        <div className="absolute top-3 left-3">
                                            <Badge className="bg-primary text-white font-black text-[10px] uppercase border-none tracking-widest">{shop.availablePallets?.toLocaleString() || 'X'} Pallets</Badge>
                                        </div>
                                    </div>
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-2xl font-black group-hover:text-primary transition-colors">{shop.shopName}</CardTitle>
                                        <CardDescription className="line-clamp-2 min-h-[40px]">{shop.shopDescription || 'Specialized industrial storage hub.'}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow space-y-4">
                                        <div className="flex justify-between items-center text-xs font-bold border-b pb-2">
                                            <span className="text-muted-foreground uppercase tracking-widest">Base Rate</span>
                                            <span className="text-primary font-black">{formatCurrency(shop.monthlyStorageFee)}/mo</span>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="bg-slate-50 border-t p-6">
                                        <Button asChild className="w-full h-11 font-black uppercase text-xs tracking-widest">
                                            <Link href={`/mall/supplier/${shop.id}`}>
                                                Calculate & Inquire <ArrowRight className="ml-2 h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="max-w-2xl mx-auto text-center py-20 bg-white rounded-3xl border-2 border-dashed">
                            <Warehouse className="mx-auto h-16 w-16 text-muted-foreground opacity-20 mb-4" />
                            <h3 className="text-2xl font-black uppercase tracking-tight">No Active Storage Nodes</h3>
                            <p className="text-muted-foreground mt-2 px-8">
                                Use the industrial registry search to find capacity from our discovered warehouse records.
                            </p>
                            <Button asChild className="mt-8 h-12 px-10 font-bold gap-2" variant="outline">
                                <Link href="/intelligence/warehouse">
                                    <Database className="h-5 w-5" />
                                    Scan Forensic Registry
                                </Link>
                            </Button>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
