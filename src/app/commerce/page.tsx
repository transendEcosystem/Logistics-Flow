'use client';

import Image from "next/image";
import data from "@/lib/placeholder-images.json";
import { 
  Store, 
  PackageSearch, 
  ShoppingCart, 
  ArrowRight, 
  CheckCircle, 
  Zap, 
  ShieldCheck, 
  Handshake,
  ArrowDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import Link from "next/link";
import React from "react";
import { useUser } from "@/firebase";

const { placeholderImages } = data;
const commerceHero = placeholderImages.find(p => p.id === 'marketplace-division');

export default function CommerceLandingPage() {
  const { user } = useUser();
  const ctaLink = user ? '/account' : '/join';

  return (
    <div className="bg-background text-left text-foreground">
        {/* HERO */}
        <section className="relative w-full h-[60vh] bg-slate-900 flex items-center justify-center text-white">
            {commerceHero && (
                <Image
                    src={commerceHero.imageUrl}
                    alt="Commerce Mechanism"
                    fill
                    className="object-cover opacity-30"
                    priority
                />
            )}
            <div className="container relative z-10 mx-auto px-4 text-center">
                <Badge className="bg-primary text-white mb-6 py-1.5 px-6 font-black uppercase tracking-widest text-[10px] border-none shadow-xl">Commercial Mechanism</Badge>
                <h1 className="text-4xl md:text-7xl font-black font-headline tracking-tighter text-white uppercase leading-[0.9] mb-8">The Commerce <br/><span className="text-primary">Engine</span>.</h1>
                <p className="text-lg md:text-2xl text-slate-300 max-w-2xl mx-auto leading-relaxed font-medium">We've digitized the industrial handshake. Discover how our three core marketplaces turn capacity into capital.</p>
                <div className="mt-12 animate-bounce opacity-30">
                    <ArrowDown className="mx-auto h-8 w-8" />
                </div>
            </div>
        </section>

        {/* THE THREE MECHANISMS */}
        <section className="py-24 bg-white">
            <div className="container mx-auto px-4">
                <div className="space-y-32 max-w-6xl mx-auto">
                    
                    {/* 1. DIGITAL SHOPS */}
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        <div className="space-y-6 text-left">
                            <div className="bg-primary/10 p-4 rounded-2xl w-fit"><Store className="h-10 w-10 text-primary" /></div>
                            <h2 className="text-4xl font-black font-headline text-slate-900 uppercase">1. Digital Shop Nodes</h2>
                            <p className="text-lg text-muted-foreground leading-relaxed">
                                Establish your digital branch within the South African logistics grid. Our shop mechanism allows vendors to publish verified product catalogues directly to over 5,400+ transport decision makers.
                            </p>
                            <ul className="space-y-3 pt-4">
                                <li className="flex items-center gap-3 font-bold text-sm text-slate-700 uppercase"><CheckCircle className="h-5 w-5 text-primary" /> Verified Product Catalogues</li>
                                <li className="flex items-center gap-3 font-bold text-sm text-slate-700 uppercase"><CheckCircle className="h-5 w-5 text-primary" /> Direct RFQ Inbound Signals</li>
                                <li className="flex items-center gap-3 font-bold text-sm text-slate-700 uppercase"><CheckCircle className="h-5 w-5 text-primary" /> Escrow-Backed Settlement</li>
                            </ul>
                            <div className="pt-6">
                                <Button asChild size="lg" className="font-black uppercase tracking-widest h-14 px-10 shadow-lg">
                                    <Link href="/mall/supplier">Explore Supplier Mall <ArrowRight className="ml-2 h-5 w-5"/></Link>
                                </Button>
                            </div>
                        </div>
                        <div className="relative aspect-video rounded-[2rem] overflow-hidden shadow-2xl border-8 border-slate-100">
                             <Image src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800" alt="Digital Shop" fill className="object-cover" />
                        </div>
                    </div>

                    {/* 2. THE LOAD BOARD */}
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        <div className="relative aspect-video rounded-[2rem] overflow-hidden shadow-2xl border-8 border-slate-100 md:order-1 order-2">
                             <Image src="https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&q=80&w=800" alt="Load Board" fill className="object-cover" />
                        </div>
                        <div className="space-y-6 text-left md:order-2 order-1">
                            <div className="bg-primary/10 p-4 rounded-2xl w-fit"><PackageSearch className="h-10 w-10 text-primary" /></div>
                            <h2 className="text-4xl font-black font-headline text-slate-900 uppercase">2. The Load Board</h2>
                            <p className="text-lg text-muted-foreground leading-relaxed">
                                Eliminate empty return miles. Our clearing house mechanism matches available freight with verified haulier capacity in real-time, using AI to prioritize the most efficient corridor routes.
                            </p>
                             <ul className="space-y-3 pt-4">
                                <li className="flex items-center gap-3 font-bold text-sm text-slate-700 uppercase"><CheckCircle className="h-5 w-5 text-primary" /> Real-Time Freight Matching</li>
                                <li className="flex items-center gap-3 font-bold text-sm text-slate-700 uppercase"><CheckCircle className="h-5 w-5 text-primary" /> Digital Proof of Delivery (POD)</li>
                                <li className="flex items-center gap-3 font-bold text-sm text-slate-700 uppercase"><CheckCircle className="h-5 w-5 text-primary" /> Instant Factoring Access</li>
                            </ul>
                            <div className="pt-6">
                                <Button asChild size="lg" className="font-black uppercase tracking-widest h-14 px-10 shadow-lg">
                                    <Link href="/mall/loads">Explore Loads Mall <ArrowRight className="ml-2 h-5 w-5"/></Link>
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* 3. BUY & SELL BOARD */}
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        <div className="space-y-6 text-left">
                            <div className="bg-primary/10 p-4 rounded-2xl w-fit"><ShoppingCart className="h-10 w-10 text-primary" /></div>
                            <h2 className="text-4xl font-black font-headline text-slate-900 uppercase">3. Buy & Sell Board</h2>
                            <p className="text-lg text-muted-foreground leading-relaxed">
                                Trade heavy-duty assets in a high-trust environment. Our marketplace mechanism connects buyers and sellers directly, bypassing expensive middle-men and providing verified vehicle history.
                            </p>
                             <ul className="space-y-3 pt-4">
                                <li className="flex items-center gap-3 font-bold text-sm text-slate-700 uppercase"><CheckCircle className="h-5 w-5 text-primary" /> Peer-to-Peer Asset Trading</li>
                                <li className="flex items-center gap-3 font-bold text-sm text-slate-700 uppercase"><CheckCircle className="h-5 w-5 text-primary" /> Verified RC1 Documentation</li>
                                <li className="flex items-center gap-3 font-bold text-sm text-slate-700 uppercase"><CheckCircle className="h-5 w-5 text-primary" /> Pre-Vetted Asset Finance</li>
                            </ul>
                            <div className="pt-6">
                                <Button asChild size="lg" className="font-black uppercase tracking-widest h-14 px-10 shadow-lg">
                                    <Link href="/marketplace">Explore Buy & Sell <ArrowRight className="ml-2 h-5 w-5"/></Link>
                                </Button>
                            </div>
                        </div>
                        <div className="relative aspect-video rounded-[2rem] overflow-hidden shadow-2xl border-8 border-slate-100">
                             <Image src="https://images.unsplash.com/photo-1592838064575-70ed626d3a44?auto=format&fit=crop&q=80&w=800" alt="Marketplace" fill className="object-cover" />
                        </div>
                    </div>

                </div>
            </div>
        </section>

        {/* TRUST BANNER */}
        <section className="py-24 bg-slate-900 text-white border-t border-white/5">
            <div className="container mx-auto px-4 text-center">
                <div className="max-w-2xl mx-auto space-y-8">
                    <div className="bg-primary/20 p-4 rounded-full w-fit mx-auto border border-primary/30"><ShieldCheck className="h-12 w-12 text-primary" /></div>
                    <h3 className="text-3xl font-black uppercase tracking-tight text-white">Secure Handshake Integrity.</h3>
                    <p className="text-slate-400 text-lg leading-relaxed">
                        Every commercial mechanism in the grid is protected by our forensic identity shield. You are transacting with verified community members only.
                    </p>
                    <div className="pt-8 flex flex-col sm:flex-row justify-center gap-4">
                        <Button asChild size="lg" className="h-16 px-12 text-lg font-black uppercase tracking-tight shadow-xl text-white">
                            <Link href={ctaLink}>Activate My Digital Node</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    </div>
  );
}
