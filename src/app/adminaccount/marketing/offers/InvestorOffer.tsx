'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, TrendingUp, Handshake, Database, Zap, ShieldCheck, Search, ArrowRight, Info } from 'lucide-react';
import React from 'react';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

/**
 * THE TRIPLE ENGINE PITCH: INVESTOR EDITION
 * Re-structured for the "Intelligence, Transaction, Data" model.
 * Strategic home: /adminaccount -> Marketing Library -> Investors -> Offer
 */
export default function InvestorOffer() {
    return (
        <div className="space-y-12 text-left text-foreground">
            <div className="text-left space-y-4">
                <Badge className="bg-primary/10 text-primary border-primary/20 py-1.5 px-4 font-black uppercase tracking-widest text-[10px]">Strategic Opportunity</Badge>
                <h1 className="text-4xl md:text-6xl font-black font-headline tracking-tighter uppercase leading-[0.9]">The Triple Engine <br/>of <span className="text-primary">Logistics Flow</span>.</h1>
                <p className="text-xl text-muted-foreground max-w-3xl leading-relaxed">
                    We are not just a marketplace. We are a **Data-as-a-Service (DaaS)** ecosystem built on three interconnected value layers that transform industrial constraints into proprietary IP.
                </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                {/* ENGINE 1: INTELLIGENCE */}
                <Card className="border-none shadow-xl bg-white flex flex-col hover:-translate-y-2 transition-transform duration-300">
                    <CardHeader>
                        <div className="bg-purple-100 p-3 rounded-2xl w-fit mb-4"><Search className="h-8 w-8 text-purple-600" /></div>
                        <CardTitle className="text-xl font-black uppercase">1. Intelligence</CardTitle>
                        <CardDescription className="text-xs font-bold uppercase tracking-widest text-purple-600">The Discovery Layer</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Mapping the "Information Divide." We provide absolute transparency for 22,000+ verified records, removing the gatekeeper constraint and accelerating the industrial handshake.
                        </p>
                    </CardContent>
                </Card>

                {/* ENGINE 2: TRANSACTION */}
                <Card className="border-none shadow-xl bg-white flex flex-col hover:-translate-y-2 transition-transform duration-300">
                    <CardHeader>
                        <div className="bg-green-100 p-3 rounded-2xl w-fit mb-4"><DollarSign className="h-8 w-8 text-green-600" /></div>
                        <CardTitle className="text-xl font-black uppercase">2. Transaction</CardTitle>
                        <CardDescription className="text-xs font-bold uppercase tracking-widest text-green-600">The Commerce Layer</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            A high-velocity terminal where capacity meets demand. Malls, Clearing Houses, and Marketplaces deliver immediate ROI through community-negotiated savings and automated deal flow.
                        </p>
                    </CardContent>
                </Card>

                {/* ENGINE 3: DATA (THE IP) */}
                <Card className="border-2 border-primary shadow-2xl bg-primary/5 flex flex-col hover:-translate-y-2 transition-transform duration-300 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12"><Database className="h-20 w-20" /></div>
                    <CardHeader>
                        <div className="bg-primary p-3 rounded-2xl w-fit mb-4 shadow-lg"><Zap className="h-8 w-8 text-white" /></div>
                        <CardTitle className="text-xl font-black uppercase">3. Data Harvest</CardTitle>
                        <CardDescription className="text-xs font-bold uppercase tracking-widest text-primary">The Proprietary IP layer</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <p className="text-sm text-foreground font-medium leading-relaxed">
                            <strong>Our "Secret Sauce."</strong> Every transaction and search logs a signal. We harvest, clean, and anonymize this data into a massive industrial brain for high-margin resale to institutional analysts.
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Separator className="my-12" />

            <div className="grid md:grid-cols-2 gap-16 items-center text-left">
                <div className="space-y-6 text-left">
                    <h3 className="text-3xl font-black font-headline uppercase leading-none">Anonymization <br/>as a Commodity.</h3>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                        Data sovereignty is the future. By harvesting behavioral patterns (who is buying what) and operational metrics (fleet performance), we build a predictive map of the South African economy.
                    </p>
                    <ul className="space-y-4">
                        <li className="flex items-start gap-3">
                            <ShieldCheck className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                            <div className="text-left">
                                <p className="font-bold uppercase text-sm">Resale Ready Silos</p>
                                <p className="text-sm text-muted-foreground">Packaged market intelligence for consulting firms and lenders.</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-3 text-left">
                            <ShieldCheck className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                            <div className="text-left">
                                <p className="font-bold uppercase text-sm">In-House Alpha</p>
                                <p className="text-sm text-muted-foreground text-left">Using harvested metrics to de-risk our own capital deployment.</p>
                            </div>
                        </li>
                    </ul>
                </div>
                <Card className="bg-slate-900 text-white border-none p-10 rounded-[3rem] shadow-2xl text-left">
                    <CardHeader className="p-0 mb-8 text-left">
                        <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px] mb-4">Investment Metric</p>
                        <CardTitle className="text-3xl font-black uppercase text-white">Equity Potential</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 space-y-6 text-left">
                        <div className="flex justify-between items-baseline border-b border-white/10 pb-4 text-left">
                            <span className="text-slate-400 text-sm font-bold uppercase">Year 3 Proj. Revenue</span>
                            <span className="text-2xl font-black text-primary">R 43.2M</span>
                        </div>
                        <div className="flex justify-between items-baseline border-b border-white/10 pb-4 text-left">
                            <span className="text-slate-400 text-sm font-bold uppercase">Harvested Nodes</span>
                            <span className="text-2xl font-black text-primary">50,000+</span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed italic pt-4 text-left">
                            "The exit value of Logistics Flow is driven not by the transaction fees, but by the depth and exclusivity of the harvested industrial dataset."
                        </p>
                    </CardContent>
                </Card>
            </div>

            <CardFooter className="bg-slate-50 border-t p-12 rounded-[2rem] flex flex-col md:flex-row justify-between items-center gap-8 text-left">
                <div className="text-left">
                    <h4 className="text-xl font-black uppercase text-left">Ready for a Deep Dive?</h4>
                    <p className="text-muted-foreground text-left">Access our complete 48-month data valuation model.</p>
                </div>
                <Button size="lg" className="h-16 px-12 text-lg font-black uppercase tracking-tight shadow-xl text-white">
                    Request Full Prospectus <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
            </CardFooter>
        </div>
    );
}