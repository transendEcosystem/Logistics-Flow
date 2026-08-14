'use client';

import Image from "next/image";
import data from "@/lib/placeholder-images.json";
import { 
  CheckCircle, 
  ArrowRight, 
  Store, 
  Handshake, 
  Building,
  BrainCircuit,
  ShieldCheck,
  Landmark,
  ShoppingBasket,
  Search,
  Zap,
  PackageSearch,
  ShoppingCart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import React from "react";
import { useUser } from "@/firebase";

const { placeholderImages } = data;
const aboutHeroImage = placeholderImages.find(p => p.id === 'about-hero');

export default function AboutPage() {
  const { user } = useUser();
  const ctaLink = user ? '/account' : '/join';

  return (
    <div className="bg-background text-left text-foreground">
        {/* HERO SECTION - THE MISSION */}
        <section className="relative w-full h-96 bg-slate-900 text-white flex items-center justify-center">
            {aboutHeroImage && (
                <Image
                    src={aboutHeroImage.imageUrl}
                    alt="Industrial Marketplace"
                    fill
                    className="object-cover opacity-20"
                    priority
                />
            )}
            <div className="container relative mx-auto px-4 text-center z-10 flex flex-col items-center text-white">
                <Badge className="bg-primary text-white mb-6 py-1 px-4 font-black uppercase tracking-widest text-[10px] border-none shadow-xl">The Commerce Engine</Badge>
                <h1 className="text-4xl md:text-7xl font-black font-headline tracking-tighter text-white uppercase leading-none text-center">The Industrial <br/><span className="text-primary">Ecosystem</span>.</h1>
                <p className="mt-6 text-xl max-w-3xl mx-auto text-slate-300 leading-relaxed font-medium text-center text-white">We provide the digital infrastructure to connect, verify, and transact in the South African transport industry.</p>
            </div>
        </section>

        {/* THE THREE PILLARS - TRADING WITH EYES OPEN */}
        <section className="py-24 bg-white border-b">
            <div className="container mx-auto px-4">
                <div className="text-center max-w-3xl mx-auto mb-20 space-y-4 text-center">
                    <h2 className="text-3xl md:text-5xl font-black font-headline text-slate-900 uppercase text-center">Trading with Eyes Open.</h2>
                    <p className="text-lg text-muted-foreground leading-relaxed text-center">
                        We've digitized the logistics workflow into three core mechanisms designed to remove information constraints and drive your growth.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-12 max-w-7xl mx-auto text-left">
                    {/* COMMERCE */}
                    <div className="space-y-6 text-left flex flex-col h-full p-8 bg-slate-50 rounded-[2rem] border-2 border-transparent hover:border-primary/20 transition-all shadow-sm">
                        <div className="bg-primary/10 p-5 rounded-3xl w-fit"><ShoppingBasket className="h-10 w-10 text-primary" /></div>
                        <h3 className="text-2xl font-black uppercase text-slate-900 text-left">1. Commerce</h3>
                        <p className="text-muted-foreground leading-relaxed text-left flex-grow">
                            Our primary mission is to help you sell more. Whether you are a supplier of parts or a haulier of freight, our Malls and Shops provide the terminal to list your branch and execute commercial handshakes.
                        </p>
                        <div className="pt-6 border-t border-slate-200">
                            <Button asChild variant="default" className="w-full font-black uppercase tracking-widest h-14 shadow-lg group">
                                <Link href="/commerce">Explore Mechanism <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
                            </Button>
                        </div>
                    </div>

                    {/* INTELLIGENCE */}
                    <div className="space-y-6 text-left flex flex-col h-full p-8 bg-slate-50 rounded-[2rem] border-2 border-transparent hover:border-primary/20 transition-all shadow-sm">
                        <div className="bg-primary/10 p-5 rounded-3xl w-fit"><BrainCircuit className="h-10 w-10 text-primary" /></div>
                        <h3 className="text-2xl font-black uppercase text-slate-900 text-left">2. Intelligence</h3>
                        <p className="text-muted-foreground leading-relaxed text-left flex-grow">
                            Intelligence is the fuel for your commerce. We've mapped the grid to provide you with the forensic leads and AI matching needed to speak directly to decision makers.
                        </p>
                        <div className="pt-6 border-t border-slate-200">
                            <Button asChild variant="default" className="w-full font-black uppercase tracking-widest h-14 shadow-lg group">
                                <Link href="/resources">Access Intelligence <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
                            </Button>
                        </div>
                    </div>

                    {/* CAPITAL */}
                    <div className="space-y-6 text-left flex flex-col h-full p-8 bg-slate-50 rounded-[2rem] border-2 border-transparent hover:border-primary/20 transition-all shadow-sm">
                        <div className="bg-primary/10 p-5 rounded-3xl w-fit"><Landmark className="h-10 w-10 text-primary" /></div>
                        <h3 className="text-2xl font-black uppercase text-slate-900 text-left">3. Capital</h3>
                        <p className="text-muted-foreground leading-relaxed text-left flex-grow">
                            Data is the new collateral. By analyzing your platform activity and standing, we unlock asset finance and working capital where traditional banks fail to see the pulse of the industry.
                        </p>
                        <div className="pt-6 border-t border-slate-200">
                            <Button asChild variant="default" className="w-full font-black uppercase tracking-widest h-14 shadow-lg group">
                                <Link href="/funding">Source Capital <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* SYNDICATE POWER */}
        <section className="py-24 bg-slate-50">
            <div className="container mx-auto px-4">
                <div className="grid md:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
                    <div className="space-y-6 text-left">
                        <Badge className="bg-amber-100 text-amber-700 border-none px-4 py-1 font-black uppercase tracking-widest text-[10px]">The Value Reveal</Badge>
                        <h3 className="text-4xl md:text-5xl font-black font-headline text-slate-900 leading-none uppercase text-left">Collective <br/>Buying Power.</h3>
                        <p className="text-xl text-muted-foreground leading-relaxed text-left">
                            Logistics Flow acts as a community syndicate. We use the **anonymized contributions** of our members to demonstrate collective volume and negotiate massive discounts on essential overheads.
                        </p>
                        <div className="pt-4 grid grid-cols-2 gap-4 text-left">
                            <div className="space-y-1 text-left">
                                <p className="text-2xl font-black text-primary">7.5%</p>
                                <p className="text-[10px] font-black uppercase text-muted-foreground">Tire & Spares Savings</p>
                            </div>
                            <div className="space-y-1 text-left">
                                <p className="text-2xl font-black text-primary">12%</p>
                                <p className="text-[10px] font-black uppercase text-muted-foreground">Yield Improvement</p>
                            </div>
                        </div>
                        <div className="pt-6">
                            <Button asChild size="lg" className="h-16 px-12 font-black uppercase tracking-tight shadow-xl text-white">
                                <Link href="/contribute">Learn How to Contribute Data <ArrowRight className="ml-2 h-5 w-5"/></Link>
                            </Button>
                        </div>
                    </div>
                    <div className="bg-slate-900 rounded-[3rem] p-12 text-white shadow-2xl text-left relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10"><Zap className="h-40 w-40 text-primary" /></div>
                        <h4 className="text-primary font-black text-xs uppercase tracking-[0.2em] mb-8 text-left">The Flow Protocol</h4>
                        <div className="space-y-8 relative z-10 text-left text-sm text-slate-400 leading-relaxed">
                            <p>We believe that when information flows freely, capital follows. By establishing your digital branch on our grid, you are moving from a single point of failure to a networked economy of growth.</p>
                            <p>Our platform handles the compliance, the discovery, and the introduction. You handle the deal.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* FINAL TRUST BAR */}
        <section className="py-24 bg-white">
            <div className="container mx-auto px-4 text-center">
                <div className="max-w-2xl mx-auto space-y-8 text-center">
                    <div className="bg-slate-100 p-4 rounded-full w-fit mx-auto"><ShieldCheck className="h-10 w-10 text-slate-600" /></div>
                    <h3 className="text-2xl font-black uppercase text-slate-900 text-center">Verified Handshake Integrity.</h3>
                    <p className="text-muted-foreground leading-relaxed text-center">
                        Every member of Logistics Flow is verified through our forensic scavenger protocol. You aren't just joining an app; you're plugging into a high-trust industrial grid.
                    </p>
                    <div className="pt-8 text-center">
                        <Button asChild size="lg" className="h-16 px-12 text-lg font-black uppercase tracking-tight shadow-xl text-white">
                            <Link href={ctaLink}>Open My Digital Branch</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    </div>
  );
}
