'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Truck, CheckCircle, ShieldCheck, Zap, Users, BarChart3, Search, Landmark, DollarSign, TrendingUp, ShoppingBasket } from "lucide-react";
import React from "react";
import { useConfig } from '@/hooks/use-config';
import { Loader2 } from 'lucide-react';

export default function TransporterOffer({ partner }: { partner?: any }) {
    const { data: isaConfig, isLoading: isIsaLoading } = useConfig<any>('isaPitch');

    if (isIsaLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        )
    }

    const isaMembershipShare = isaConfig?.membershipCommission || 30;
    const isaFinanceShare = isaConfig?.financeMallCommission || 20;
    const isaMarketplaceShare = isaConfig?.marketplaceCommission || 50;

    return (
        <div className="space-y-8 text-left text-foreground">
            <div className="text-left">
                <h1 className="text-3xl font-bold font-headline text-left">The Transporter Sourcing & Freight Engine</h1>
                <p className="text-lg text-muted-foreground mt-2 text-left">Buy operational inputs at direct discounts across 24,000+ suppliers, and sell your transport capacity directly in your shop.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 text-left">
                <Card className="flex flex-col text-left border-emerald-100 bg-emerald-50/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-left text-emerald-800 text-lg"><Search className="h-5 w-5 text-emerald-600"/>1. Intelligence (Buyer)</CardTitle>
                        <CardDescription className="text-left font-semibold text-emerald-700">24,000+ Suppliers across 22 Input Categories</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 flex-grow text-left text-sm text-slate-700">
                        <p>Search and filter verified suppliers across 22 operational categories (tyres, fuel, spares, maintenance, tracking, insurance).</p>
                        <p className="font-bold text-emerald-900 mt-2">Buy inputs at community-negotiated direct discounts to slash cost-per-kilometer.</p>
                    </CardContent>
                </Card>

                <Card className="flex flex-col text-left border-blue-100 bg-blue-50/20">
                    <CardHeader className="text-left">
                        <CardTitle className="flex items-center gap-2 text-left text-blue-800 text-lg"><Truck className="h-5 w-5 text-blue-600"/>2. Transactions (Seller)</CardTitle>
                        <CardDescription className="text-left font-semibold text-blue-700">Sell Transport Services via Your Shop</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 flex-grow text-left text-sm text-slate-700">
                        <p>List and sell your transport capacity, truck routes, and freight services directly to cargo owners and shippers.</p>
                        <p className="font-bold text-blue-900 mt-2">Wallet-backed or financed payments eliminate bad debt and empty return legs.</p>
                    </CardContent>
                </Card>

                <Card className="flex flex-col text-left border-purple-100 bg-purple-50/20">
                    <CardHeader className="text-left">
                        <CardTitle className="flex items-center gap-2 text-left text-purple-800 text-lg"><Zap className="h-5 w-5 text-purple-600"/>3. Anonymized ML</CardTitle>
                        <CardDescription className="text-left font-semibold text-purple-700">Internal AI Route & Load Matching</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 flex-grow text-left text-sm text-slate-700">
                        <p>Platform telemetry is analyzed in a strictly anonymized format reserved for internal machine learning.</p>
                        <p className="font-bold text-purple-900 mt-2">Automated load matching maximizes fleet utilization and return-leg profitability.</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="text-left">
                <CardHeader className="text-left">
                    <CardTitle className="flex items-center gap-2 text-left"><ShoppingBasket className="h-6 w-6 text-primary" />Benefit #3: Earn from Value-Added Products</CardTitle>
                    <CardDescription className="text-left">Protect your peers and earn splits.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-left">
                    <p className="text-sm text-muted-foreground">Offer essential driver benefits and liability cover to your contractors with an immediate <strong className="text-primary">{isaMarketplaceShare}% commission split</strong>.</p>
                </CardContent>
                <CardFooter className="bg-slate-50 border-t p-6 text-left">
                    <div className="flex items-center gap-3 text-left text-foreground">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        <p className="text-sm font-bold text-left">Activate "Intelligence Access" for R100/mo to view the full haulier registry.</p>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
