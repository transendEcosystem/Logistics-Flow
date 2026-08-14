'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Gift, DollarSign, TrendingUp, Handshake, CheckCircle, ShoppingBasket, Award, Sparkles, Video, ShieldCheck, MousePointer2 } from 'lucide-react';
import React from 'react';
import { useConfig } from '@/hooks/use-config';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function AssociateOffer() {
    const { data: isaConfig, isLoading: isIsaLoading } = useConfig<any>('isaPitch');

    if (isIsaLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        )
    }

    const isaMembershipShare = isaConfig?.membershipCommission || 30;
    
    return (
        <div className="space-y-8 text-left text-foreground">
            <div className="text-left">
                <h1 className="text-3xl font-bold font-headline text-left">The Digital Associate Offer</h1>
                <p className="text-lg text-muted-foreground mt-2 text-left">Empowering creators to monetize the industrial shift through high-fidelity content and yield-based revenue.</p>
            </div>

            <Card className="border-primary border-2 shadow-xl bg-primary/5">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Sparkles className="h-8 w-8 text-primary animate-pulse" />
                        <CardTitle className="text-2xl font-black">Free Access to the AI Studio</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-lg leading-relaxed text-slate-700">
                        Digital Associates receive a <strong className="text-primary font-black">Lifetime Free Membership</strong>. This includes unrestricted access to our 4K Video and Image generators, allowing you to create cinematic logistics content for your channels at no cost.
                    </p>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-8 text-left">
                <Card className="flex flex-col text-left">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-left"><MousePointer2 className="h-6 w-6 text-primary"/>Benefit #1: Engagement Yield</CardTitle>
                        <CardDescription className="text-left">Get rewarded for the traffic you drive.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-grow text-left">
                        <ul className="text-sm space-y-4 text-left">
                            <li className="flex items-start gap-3">
                                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                                <div>
                                    <strong className="font-bold">Handshake Bounties:</strong> Earn a direct payout for every new member who establishes their digital node through your tracking link.
                                </div>
                            </li>
                            <li className="flex items-start gap-3 text-left">
                                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                                <div>
                                    <strong className="font-bold">Click Dividends:</strong> Accumulate small rewards for every unique industrial stakeholder that lands on the platform via your content.
                                </div>
                            </li>
                        </ul>
                    </CardContent>
                </Card>
                 <Card className="flex flex-col text-left">
                    <CardHeader className="text-left">
                        <CardTitle className="flex items-center gap-2 text-left"><TrendingUp className="h-6 w-6 text-primary"/>Benefit #2: The Annuity Layer</CardTitle>
                         <CardDescription className="text-left">Stable, recurring income for life.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-grow text-left">
                        <p className="text-sm">In addition to bounties, you earn a <strong className="text-primary font-black">{isaMembershipShare}% recurring share</strong> of all monthly fees from every member in your network.</p>
                        <p className="text-xs text-muted-foreground italic">Your income grows exponentially as your network matures and adopts more platform tools.</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="text-left bg-slate-900 text-white border-none shadow-2xl">
                <CardHeader className="text-left">
                    <CardTitle className="flex items-center gap-2 text-left text-white"><ShieldCheck className="h-6 w-6 text-primary" />Handshake Integrity</CardTitle>
                </CardHeader>
                <CardContent className="text-left">
                    <p className="text-sm text-slate-400 leading-relaxed">
                        Every Digital Associate is provided with a unique **Forensic Tracking Node**. This ensures that every click and every member you bring into the grid is hard-coded to your account, guaranteeing total payout transparency and commission integrity.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

