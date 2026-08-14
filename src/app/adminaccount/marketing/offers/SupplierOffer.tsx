'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Store, Banknote, Handshake, CheckCircle, TrendingUp, DollarSign, ShieldCheck, Loader2, Zap, Search, ShoppingBasket } from "lucide-react";
import React from 'react';
import { useConfig } from '@/hooks/use-config';
import { formatCurrency } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { ArrowRight } from "lucide-react";

export default function SupplierOffer() {
    const { data: isaConfig, isLoading: isIsaLoading } = useConfig<any>('isaPitch');

    if (isIsaLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        )
    }

    const isaMembershipShare = isaConfig?.membershipCommission || 30;
    const isaSupplierShare = isaConfig?.supplierMallCommission || 20;
    const isaMarketplaceShare = isaConfig?.marketplaceCommission || 50;

    return (
        <div className="space-y-8 text-left text-foreground">
            <div className="text-left">
                <h1 className="text-3xl font-bold font-headline text-left">The Intelligence-Driven Supplier Offer</h1>
                <p className="text-lg text-muted-foreground mt-2 text-left">Become a data-powered partner with direct access to your most profitable customers.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 text-left">
                <Card className="flex flex-col text-left">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-left"><DollarSign className="h-6 w-6 text-primary"/>Benefit #1: Recurring Revenue Stream</CardTitle>
                        <CardDescription className="text-left">Monetize your existing customer base.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-grow text-left">
                        <p className="text-sm text-muted-foreground">Refer your transport clients to the platform. You earn a <strong className="text-primary">{isaMembershipShare}% recurring share</strong> of their membership fees for as long as they stay active.</p>
                    </CardContent>
                </Card>
                 <Card className="flex flex-col text-left">
                    <CardHeader className="text-left">
                        <CardTitle className="flex items-center gap-2 text-left"><TrendingUp className="h-6 w-6 text-primary"/>Benefit #2: Transactional Revenue Share</CardTitle>
                         <CardDescription className="text-left">Earn from every purchase in your network.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-grow text-left">
                        <p className="text-sm text-muted-foreground">You participate in platform revenue whenever your network members transact. You receive a <strong className="text-primary">{isaSupplierShare}% share</strong> of platform commissions on their spend.</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="text-left">
                <CardHeader className="text-left">
                    <CardTitle className="flex items-center gap-2 text-left"><ShoppingBasket className="h-6 w-6 text-primary" />Benefit #3: Earn from Value-Added Products</CardTitle>
                    <CardDescription className="text-left">Sell specialized insurance and industry services.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-left">
                    <p className="text-sm text-muted-foreground">Offer high-demand reseller products like specialized liability cover to your network and earn an immediate <strong className="text-primary">{isaMarketplaceShare}% commission split</strong>.</p>
                </CardContent>
                <CardFooter className="bg-slate-50 border-t p-6 text-left">
                    <div className="flex items-center gap-3 text-left">
                        <Zap className="h-5 w-5 text-primary fill-primary" />
                        <p className="text-sm font-bold text-left text-foreground">Activate "Intelligence Access" for R100/mo to unlock full forensic haulier data.</p>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
