'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Gift, DollarSign, TrendingUp, Handshake, CheckCircle, ShoppingBasket, Award } from 'lucide-react';
import React from 'react';
import { useConfig } from '@/hooks/use-config';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function PartnerOffer() {
    const { data: isaConfig, isLoading } = useConfig<any>('isaPitch');
    const { data: mallCommissions } = useConfig<any>('mallCommissions');
    const { data: marketplaceFees } = useConfig<any>('marketplaceFees');


    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        )
    }

    // Static examples for illustration on the pitch page
    const exampleMembershipFee = 500;
    const exampleDealSize = 400000;
    const exampleOriginationFeePercent = 1;
    const exampleSupplierSpend = 50000;
    const exampleTruckSale = 250000;
    const exampleMarketplaceProductPrice = 40;
    const exampleMarketplacePlatformCommission = 10;

    // Dynamic rates from config
    const isaMembershipShare = isaConfig?.membershipCommission || 30;
    const isaFinanceShare = isaConfig?.financeMallCommission || 20;
    const isaSupplierShare = isaConfig?.supplierMallCommission || 20;
    const isaBuySellShare = isaConfig?.buySellMallCommission || 20;
    const isaMarketplaceShare = isaConfig?.marketplaceCommission || 50;
    
    // Derived example calculations
    const annualSubscriptionRevenue = exampleMembershipFee * 12;
    const isaAnnualSubscriptionShare = annualSubscriptionRevenue * (isaMembershipShare / 100);

    const exampleDealCommission = exampleDealSize * (exampleOriginationFeePercent / 100);
    const isaExampleDealShare = exampleDealCommission * (isaFinanceShare / 100);
    
    const supplierMallPlatformCommission = (mallCommissions?.supplierMall || 2.5) / 100;
    const supplierPlatformEarnings = exampleSupplierSpend * supplierMallPlatformCommission;
    const isaSupplierEarnings = supplierPlatformEarnings * (isaSupplierShare / 100);
    
    const buySellMallPlatformCommission = (mallCommissions?.buySellMall || 1) / 100;
    const buySellPlatformEarnings = exampleTruckSale * buySellMallPlatformCommission;
    const isaBuySellEarnings = buySellPlatformEarnings * (isaBuySellShare / 100);

    const isaMarketplaceEarnings = exampleMarketplacePlatformCommission * (isaMarketplaceShare / 100);
    const passiveIncomeExample = 240 * isaMarketplaceEarnings;


    const potentialEarnings = [
        { members: 10, annualRecurring: 10 * isaAnnualSubscriptionShare },
        { members: 50, annualRecurring: 50 * isaAnnualSubscriptionShare },
        { members: 100, annualRecurring: 100 * isaAnnualSubscriptionShare },
    ];


    return (
        <div className="space-y-8 text-left text-foreground">
            <div className="text-left">
                <h1 className="text-3xl font-bold font-headline text-left">The ISA Partnership Offer</h1>
                <p className="text-lg text-muted-foreground mt-2 text-left">This is our value proposition for foundational partners. It's more than a referral program; it's a true business partnership.</p>
            </div>

            <Card className="border-primary border-2 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Gift className="h-6 w-6 text-primary"/>The Core Offer: A Foundation of Partnership</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-lg leading-relaxed">
                        As a founding ISA partner, you receive a <strong className="text-primary">Free Lifetime Premium Membership</strong>. This ensures you have full, unrestricted access to the entire "Industrial Brain"—all forensic registries, matching tools, and funding channels—at no cost, forever.
                    </p>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-8 text-left">
                <Card className="flex flex-col text-left">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-left"><DollarSign className="h-6 w-6 text-primary"/>Benefit #1: Recurring Revenue Stream</CardTitle>
                        <CardDescription className="text-left">Earn a stable, growing income from memberships.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-grow text-left">
                        <p className="text-sm">You earn a base commission of <strong className="text-primary">{isaMembershipShare}%</strong> on all monthly membership fees from every member you refer. This is a recurring annuity.</p>
                        
                        <p className="text-sm">Assuming an average monthly fee of <strong className="font-mono">{formatCurrency(exampleMembershipFee)}</strong>, your annual earning per member is <strong className="font-mono text-primary">{formatCurrency(isaAnnualSubscriptionShare)}</strong>.</p>
                        
                         <div className="p-4 border rounded-lg bg-slate-50 text-left">
                            <h4 className="font-bold text-xs uppercase tracking-widest text-muted-foreground mb-3">Projected Annual Annuity</h4>
                             <Table>
                                <TableHeader><TableRow><TableHead className="text-[10px] uppercase">Network Size</TableHead><TableHead className="text-right text-[10px] uppercase">Income</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {potentialEarnings.map((tier: any, index: number) => (
                                        <TableRow key={index}>
                                            <TableCell className="text-sm font-medium">{tier.members} Members</TableCell>
                                            <TableCell className="text-right font-bold text-green-600">{formatCurrency(tier.annualRecurring)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
                 <Card className="flex flex-col text-left">
                    <CardHeader className="text-left">
                        <CardTitle className="flex items-center gap-2 text-left"><TrendingUp className="h-6 w-6 text-primary"/>Benefit #2: Transactional Revenue Share</CardTitle>
                         <CardDescription className="text-left">Unlock high-upside potential from ecosystem activity.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-grow text-left">
                        <p className="text-sm">Participate in platform revenue whenever your network members buy tires, parts, or access finance.</p>
                        <ul className="text-xs space-y-3 pt-2 text-left">
                            <li className="flex items-start gap-3 text-left">
                                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                                <div>
                                    <strong className="font-semibold text-left">Finance Mall:</strong> A member finances a <strong className="font-mono">{formatCurrency(exampleDealSize)}</strong> trailer. You earn <strong className="text-green-600">{formatCurrency(isaExampleDealShare)}</strong>.
                                </div>
                            </li>
                             <li className="flex items-start gap-3 text-left">
                                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                                <div>
                                    <strong className="font-semibold text-left">Supplier Mall:</strong> Your network spends {formatCurrency(exampleSupplierSpend)} on spares. You earn <strong className="text-green-600">{formatCurrency(isaSupplierEarnings)}</strong>.
                                </div>
                            </li>
                             <li className="flex items-start gap-3 text-left">
                                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                                <div>
                                    <strong className="font-semibold text-left">Buy & Sell Mall:</strong> A member sells a truck for {formatCurrency(exampleTruckSale)}. You earn <strong className="text-green-600">{formatCurrency(isaBuySellEarnings)}</strong>.
                                </div>
                            </li>
                        </ul>
                    </CardContent>
                </Card>
            </div>

            <Card className="text-left">
                <CardHeader className="text-left">
                    <CardTitle className="flex items-center gap-2 text-left"><ShoppingBasket className="h-6 w-6 text-primary" />Benefit #3: Earn from Value-Added Products</CardTitle>
                    <CardDescription className="text-left">Generate recurring funds by selling essential services to your network.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-left">
                    <p className="text-sm">The Marketplace allows you to resell high-demand third-party products like RAF Assist or specialized liability cover for direct commission splits.</p>
                     <ul className="text-xs space-y-3 pt-2 text-left">
                        <li className="flex items-start gap-3 text-left">
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                            <div>
                                <strong className="font-semibold text-left">Passive Subscription Engine:</strong> Sell 20 products a month. By the end of the year, your 240 active subscriptions generate <strong className="text-green-600">{formatCurrency(passiveIncomeExample)} per month</strong> in recurring passive income.
                            </div>
                        </li>
                    </ul>
                </CardContent>
            </Card>

            <Card className="bg-slate-50 border-none text-left">
                <CardHeader className="text-left">
                    <CardTitle className="flex items-center gap-2 text-left text-foreground text-left"><Handshake className="h-6 w-6 text-primary"/>The Partnership Path</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 text-left">
                    <div className="text-left">
                        <h4 className="font-bold text-sm uppercase tracking-widest text-primary text-left">Step 1: Authorization</h4>
                        <p className="text-xs text-muted-foreground mt-1 text-left">We provide you with a unique referral node and a real-time dashboard to track your network growth and earnings.</p>
                    </div>
                     <div className="text-left">
                        <h4 className="font-bold text-sm uppercase tracking-widest text-primary text-left">Step 2: Digitalization</h4>
                        <p className="text-xs text-muted-foreground mt-1 text-left">You introduce Logistics Flow to your existing community. We equip you with forensic pitch materials to make the transition high-value and low-friction.</p>
                    </div>
                     <div className="text-left">
                        <h4 className="font-bold text-sm uppercase tracking-widest text-primary text-left">Step 3: Revenue Flow</h4>
                        <p className="text-xs text-muted-foreground mt-1 text-left">Every subscription, transaction, and product sale within your node is automatically credited to your wallet. We handle the technical load; you own the relationship.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
