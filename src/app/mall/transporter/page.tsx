'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import data from "@/lib/placeholder-images.json";
import { Truck, Search, ArrowRight, Lock, ShieldCheck, MapPin, Loader2, Info, Navigation, Database, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as gtag from '@/lib/gtag';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const { placeholderImages } = data;
const transporterMallImage = placeholderImages.find(p => p.id === 'hero-home');

export default function TransporterMallPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [shops, setShops] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchShops = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/getApprovedShops');
            const result = await response.json();
            // Filter only transporter nodes for this mall
            const transporterShops = (result.data || []).filter((s: any) => s.shopType === 'transporter');
            setShops(transporterShops);
        } catch (e) {
            console.error("Failed to load community hauliers", e);
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
            <section className="relative w-full h-64 bg-slate-900 overflow-hidden">
                {transporterMallImage && (
                    <Image
                        src={transporterMallImage.imageUrl}
                        alt="Transporter Mall"
                        fill
                        className="object-cover opacity-40"
                        priority
                        data-ai-hint="truck highway"
                    />
                )}
                <div className="relative h-full flex flex-col items-center justify-center text-center text-white z-10 p-4">
                    <Badge className="bg-primary/20 text-primary border-primary/30 mb-4 px-4 py-1 uppercase font-black text-[10px] tracking-widest">Fleet Network</Badge>
                    <h1 className="text-4xl md:text-5xl font-black font-headline tracking-tight text-white">Transport Mall</h1>
                    <p className="mt-2 text-lg text-slate-300 max-w-2xl mx-auto">Connect with verified community hauliers and manage arterial capacity.</p>
                </div>
            </section>
            
            <section className="py-12 bg-white border-b sticky top-16 z-20 shadow-sm text-left">
                <div className="container mx-auto px-4 text-left">
                     <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-4 items-end text-left text-foreground">
                        <div className="flex-1 w-full space-y-2 text-left">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Filter Active Hauliers</Label>
                            <div className="relative text-left">
                                <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                                <Input 
                                    placeholder="Search by company name or fleet type..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="h-12 pl-10 text-lg bg-white"
                                />
                            </div>
                        </div>
                        <Button asChild size="lg" variant="outline" className="h-12 px-8 border-2 font-bold gap-2">
                            <Link href="/intelligence/transporter">
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
                            <p className="text-lg font-bold text-muted-foreground uppercase tracking-widest">Matching Community Capacity...</p>
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
                                                <Truck className="h-12 w-12" />
                                            </div>
                                        )}
                                        <div className="absolute top-3 left-3">
                                            <Badge className="bg-primary text-white font-black text-[10px] uppercase border-none tracking-widest">Verified Fleet</Badge>
                                        </div>
                                    </div>
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-2xl font-black group-hover:text-primary transition-colors">{shop.shopName}</CardTitle>
                                        <CardDescription className="line-clamp-2 min-h-[40px]">{shop.shopDescription || 'Arterial hub haulier node.'}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow">
                                        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                                            <ShieldCheck className="h-4 w-4 text-green-500" />
                                            <span>RC1 Compliance Verified</span>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="bg-slate-50 border-t p-6">
                                        <Button asChild className="w-full h-11 font-black uppercase text-xs tracking-widest">
                                            <Link href={`/mall/supplier/${shop.id}`}>
                                                View Capacity & Profile <ArrowRight className="ml-2 h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="max-w-2xl mx-auto text-center py-20 bg-white rounded-3xl border-2 border-dashed">
                            <Truck className="mx-auto h-16 w-16 text-muted-foreground opacity-20 mb-4" />
                            <h3 className="text-2xl font-black uppercase tracking-tight">No Active Member Nodes</h3>
                            <p className="text-muted-foreground mt-2 px-8">
                                Use the industrial registry search to find capacity from our 5,420+ discovered records.
                            </p>
                            <Button asChild className="mt-8 h-12 px-10 font-bold gap-2" variant="outline">
                                <Link href="/intelligence/transporter">
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
