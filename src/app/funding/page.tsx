'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ArrowRight, CheckCircle, Landmark, Book, FileText, Repeat, Loader2, Globe, Zap, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import data from "@/lib/placeholder-images.json";
import { useUser } from "@/firebase";
import * as React from "react";
import * as gtag from '@/lib/gtag';
import { Badge } from "@/components/ui/badge";

const { placeholderImages } = data;

const fundingHeroImage = placeholderImages.find(p => p.id === 'funding-division');

export default function FundingPage() {
    const { user } = useUser();

    return (
        <div className="text-left text-foreground bg-slate-50 min-h-screen">
            <section className="relative w-full h-[40vh] bg-slate-900 flex items-center justify-center overflow-hidden">
                {fundingHeroImage && (
                    <Image
                        src={fundingHeroImage.imageUrl}
                        alt="Funding Hub"
                        fill
                        className="object-cover opacity-40"
                        priority
                        data-ai-hint="finance skyscraper"
                    />
                )}
                <div className="relative h-full flex flex-col items-center justify-center text-center text-white z-10 p-4">
                    <Badge className="bg-primary/20 text-primary border-primary/30 mb-4 px-4 py-1 uppercase font-black text-[10px] tracking-widest">Capital Division</Badge>
                    <h1 className="text-4xl md:text-6xl font-black font-headline uppercase leading-none text-white text-center">Fueling Industrial <br/><span className="text-primary">Growth</span>.</h1>
                    <p className="mt-6 text-lg text-slate-300 max-w-2xl mx-auto text-center">Access flexible capital through our relationship-driven in-house division or our broad marketplace network.</p>
                </div>
            </section>

             <section className="py-16 md:py-24 bg-white border-b">
                <div className="container mx-auto px-4">
                     <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 text-left">
                        {/* PATH 1: DIRECT */}
                        <Card className="border-none shadow-2xl bg-white overflow-hidden text-left flex flex-col">
                            <CardHeader className="p-8 pb-4">
                                <div className="bg-primary/10 p-3 rounded-xl w-fit mb-4"><Landmark className="h-8 w-8 text-primary" /></div>
                                <CardTitle className="text-2xl font-black uppercase">Direct In-House Path</CardTitle>
                                <CardDescription className="text-base leading-relaxed">
                                    Apply directly to the Logistics Flow funding division. We use your real-world platform activity to approve deals that traditional banks often miss.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="px-8 pb-8 flex-grow space-y-4">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-xs font-bold uppercase text-slate-600"><CheckCircle className="h-4 w-4 text-primary" /> 25 Years Industrial Expertise</div>
                                    <div className="flex items-center gap-3 text-xs font-bold uppercase text-slate-600"><CheckCircle className="h-4 w-4 text-primary" /> Forensic Performance Data Audit</div>
                                    <div className="flex items-center gap-3 text-xs font-bold uppercase text-slate-600"><CheckCircle className="h-4 w-4 text-primary" /> Direct Fiduciary Handshake</div>
                                </div>
                            </CardContent>
                            <CardFooter className="p-8 bg-slate-50 border-t">
                                <Button asChild size="lg" className="w-full h-14 font-black uppercase tracking-tight shadow-xl">
                                    <Link href="/funding/apply?origination=direct">
                                        Start Direct Application <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>

                        {/* PATH 2: MARKET */}
                        <Card className="border-none shadow-2xl bg-white overflow-hidden text-left flex flex-col">
                            <CardHeader className="p-8 pb-4">
                                <div className="bg-blue-100 p-3 rounded-xl w-fit mb-4"><Globe className="h-8 w-8 text-blue-600" /></div>
                                <CardTitle className="text-2xl font-black uppercase">Market Broadcast Path</CardTitle>
                                <CardDescription className="text-base leading-relaxed">
                                    Broadcast your requirement to our network of 85+ specialized lenders. Compare rates and terms to find the perfect fit for your specific asset class.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="px-8 pb-8 flex-grow space-y-4">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-xs font-bold uppercase text-slate-600"><CheckCircle className="h-4 w-4 text-blue-600" /> Multi-Lender Rate Comparison</div>
                                    <div className="flex items-center gap-3 text-xs font-bold uppercase text-slate-600"><CheckCircle className="h-4 w-4 text-blue-600" /> 85+ Specialized Finance Partners</div>
                                    <div className="flex items-center gap-3 text-xs font-bold uppercase text-slate-600"><CheckCircle className="h-4 w-4 text-blue-600" /> Automated Matching Logic</div>
                                </div>
                            </CardContent>
                            <CardFooter className="p-8 bg-slate-50 border-t">
                                <Button asChild size="lg" variant="outline" className="w-full h-14 font-black uppercase tracking-tight border-2">
                                    <Link href="/mall/finance">
                                        Enter Finance Mall <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </section>
            
            <section className="py-24 bg-slate-900 text-white">
                <div className="container mx-auto px-4 text-center">
                    <div className="max-w-2xl mx-auto space-y-8">
                        <div className="bg-primary/20 p-4 rounded-full w-fit mx-auto border border-primary/30"><ShieldCheck className="h-12 w-12 text-primary" /></div>
                        <h3 className="text-3xl font-black uppercase tracking-tight text-white text-center">Forensic Vetting Protocol.</h3>
                        <p className="text-slate-400 text-lg leading-relaxed text-center">
                            Every application—Direct or Market—undergoes our V13.1 forensic audit. This ensures that your business standing is correctly mapped, maximizing your probability of authorization.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    )
}
