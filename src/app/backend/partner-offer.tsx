'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Gift, DollarSign, TrendingUp, Handshake, CheckCircle, ShoppingBasket, Award } from 'lucide-react';
import React from 'react';
import { useConfig } from '@/hooks/use-config';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function PartnerOffer() {
    const { data: isaConfig, isLoading: isIsaLoading } = useConfig<any>('isaPitch');
    const { data: salesIncentives, isLoading: isIncentivesLoading } = useConfig<any>('salesIncentives');
    const { data: mallCommissions } = useConfig<any>('mallCommissions');
    const { data: marketplaceFees } = useConfig<any>('marketplaceFees');

    const isLoading = isIsaLoading || isIncentivesLoading;

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
    const exampleMarketplacePlatformCommission = 10; // R10, which is 25% of R40

    // Dynamic rates from config
    const isaMembershipShare = isaConfig?.membershipCommission || 30;
    const isaFinanceShare = isaConfig?.financeMallCommission || 20;
    const isaSupplierShare = isaConfig?.supplierMallCommission || 20;
    const isaBuySellShare = isaConfig?.buySellMallCommission || 20;
    const isaMarketplaceShare = isaConfig?.marketplaceCommission || 50;
    
    const partnerTiers = salesIncentives?.partnerTiers || [];

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
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">The Independent Sales Agent (ISA) Partnership</h1>
                <p className="text-lg text-muted-foreground mt-2">This is our value proposition for foundational partners. It's more than a referral program; it's a true business partnership.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Gift className="h-6 w-6 text-primary"/>The Core Offer: A Foundation of Partnership</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-lg">As a founding ISA partner, you receive a <strong className="text-primary">Free Lifetime Premium Membership</strong>. This is our commitment to you, representing a significant value (e.g., over R60,000 over 10 years) and ensuring you have full access to the ecosystem you're helping to build, at no cost, forever.</p>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><DollarSign className="h-6 w-6 text-primary"/>Benefit #1: Recurring Revenue Stream</CardTitle>
                        <CardDescription>Earn a stable, growing income from memberships.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p>You earn a base commission of <strong className="text-primary">{isaMembershipShare}%</strong> on all membership and subscription fees from every member you bring into the network. This is a recurring annuity for as long as they remain a member.</p>
                        
                        <p>Assuming an average total monthly membership & subscription fee of <strong className="font-mono">{formatCurrency(exampleMembershipFee)}</strong>, your annual earning per member is <strong className="font-mono text-primary">{formatCurrency(isaAnnualSubscriptionShare)}</strong>.</p>
                        
                         <div className="p-4 border rounded-lg bg-background">
                            <h4 className="font-semibold flex items-center gap-2 mb-2"><Award className="h-5 w-5 text-amber-500" />Potential Annual Recurring Income</h4>
                             <Table>
                                <TableHeader><TableRow><TableHead>Network Size</TableHead><TableHead className="text-right">Potential Income</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {potentialEarnings.map((tier: any, index: number) => (
                                        <TableRow key={index}>
                                            <TableCell>{tier.members} Members</TableCell>
                                            <TableCell className="text-right font-bold text-green-600">{formatCurrency(tier.annualRecurring)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><TrendingUp className="h-6 w-6 text-primary"/>Benefit #2: Transactional Revenue Share</CardTitle>
                         <CardDescription>Unlock high-upside potential from ecosystem activity.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p>Your earning potential goes far beyond subscriptions. You earn a significant share of the revenue Logistics Flow generates from your network's activity across all our Malls.</p>
                        <ul className="text-sm space-y-4 pt-2">
                            <li className="flex items-start gap-3">
                                <CheckCircle className="h-4 w-4 text-green-600 mt-1 shrink-0" />
                                <div>
                                    <strong className="font-semibold">Finance Mall:</strong> A member from your network finances a <strong className="font-mono">{formatCurrency(exampleDealSize)}</strong> trailer. Logistics Flow earns a {exampleOriginationFeePercent}% fee ({formatCurrency(exampleDealCommission)}). Your {isaFinanceShare}% share earns you <strong className="text-green-600">{formatCurrency(isaExampleDealShare)}</strong>.
                                </div>
                            </li>
                             <li className="flex items-start gap-3">
                                <CheckCircle className="h-4 w-4 text-green-600 mt-1 shrink-0" />
                                <div>
                                    <strong className="font-semibold">Supplier Mall:</strong> Your network collectively spends {formatCurrency(exampleSupplierSpend)} on parts. Logistics Flow earns a {supplierMallPlatformCommission*100}% commission ({formatCurrency(supplierPlatformEarnings)}). Your {isaSupplierShare}% share could earn you <strong className="text-green-600">{formatCurrency(isaSupplierEarnings)}</strong>.
                                </div>
                            </li>
                             <li className="flex items-start gap-3">
                                <CheckCircle className="h-4 w-4 text-green-600 mt-1 shrink-0" />
                                <div>
                                    <strong className="font-semibold">Buy & Sell Mall:</strong> A member sells a used truck for {formatCurrency(exampleTruckSale)}. Logistics Flow earns a {buySellMallPlatformCommission*100}% success fee ({formatCurrency(buySellPlatformEarnings)}). Your {isaBuySellShare}% share nets you <strong className="text-green-600">{formatCurrency(isaBuySellEarnings)}</strong>.
                                </div>
                            </li>
                        </ul>
                         <p className="text-sm text-muted-foreground pt-4 border-t">This model applies across all malls. Your income grows exponentially as your network's activity on the platform grows.</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ShoppingBasket className="h-6 w-6 text-primary" />Benefit #3: Earn from Value-Added Products</CardTitle>
                    <CardDescription>Generate recurring funds by selling essential services to your network.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p>The Marketplace is a curated collection of high-demand, third-party products that we offer to our members, often at a discount. As an ISA, you sell these products to your network and earn a commission on every sale.</p>
                     <ul className="text-sm space-y-4 pt-2">
                        <li className="flex items-start gap-3">
                            <CheckCircle className="h-4 w-4 text-green-600 mt-1 shrink-0" />
                            <div>
                                <strong className="font-semibold">Example: Subscription Product Sales.</strong> A subscription product costs {formatCurrency(exampleMarketplaceProductPrice)}/month. Logistics Flow earns a {formatCurrency(exampleMarketplacePlatformCommission)} (25%) commission. We share {isaMarketplaceShare}% of our commission with you, the ISA.
                            </div>
                        </li>
                         <li className="flex items-start gap-3">
                            <CheckCircle className="h-4 w-4 text-green-600 mt-1 shrink-0" />
                            <div>
                                <strong className="font-semibold">The Model in Action:</strong> If you sell 20 products a month, by the end of the year you will have 240 active subscriptions. This generates <strong className="text-green-600">{formatCurrency(passiveIncomeExample)} per month</strong> in passive, recurring income for you.
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <CheckCircle className="h-4 w-4 text-green-600 mt-1 shrink-0" />
                            <div>
                                <strong className="font-semibold">Expand Your Portfolio:</strong> This applies to products like RAF Assist, Open Loyalty Funeral/Roadside Assist, specialized liability cover, and more. Each product you sell adds another layer to your income.
                            </div>
                        </li>
                    </ul>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Handshake className="h-6 w-6 text-primary"/>How It Works: A Simple 3-Step Partnership</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h4 className="font-bold text-lg">Step 1: We Empower You</h4>
                        <p className="text-muted-foreground">We provide you with your lifetime premium membership, a unique referral code, and access to your personal ISA dashboard to track sign-ups, activity, and earnings in real-time.</p>
                    </div>
                     <div>
                        <h4 className="font-bold text-lg">Step 2: You Activate Your Network</h4>
                        <p className="text-muted-foreground">You introduce Logistics Flow to your community. Your pitch is simple: invite them to join an ecosystem that saves them money, helps them find work, and gives them access to better financing. We equip you with offers and materials to make signing up irresistible.</p>
                    </div>
                     <div>
                        <h4 className="font-bold text-lg">Step 3: You Earn Automatically</h4>
                        <p className="text-muted-foreground">Every time a member from your network pays a subscription, completes a transaction, or buys a product, your share is automatically calculated and credited to your wallet. It's a transparent, seamless process designed for your success.</p>
                    </div>
                </CardContent>
                <CardFooter>
                    <p className="text-lg font-semibold">We succeed when our partners and members succeed. This is a true win-win-win model.</p>
                </CardFooter>
            </Card>
        </div>
    );
}
