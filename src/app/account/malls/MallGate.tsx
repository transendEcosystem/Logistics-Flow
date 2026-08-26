
'use client';

import React from 'react';
import { Card, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { type Resource } from '@/hooks/use-permissions';
import { 
    PackageSearch, Warehouse, Truck, Network, Building2, Landmark, 
    ShoppingCart, Search, PlusCircle, ArrowRight, Info, Loader2, HandCoins
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface MallConfig {
    id: string;
    title: string;
    description: string;
    icon: any;
    resource: Resource;
    permission: 'transact' | 'manage' | 'view';
    upgradePlan: string;
    buyLabel: string;
    buyDesc: string;
    sellLabel: string;
    sellDesc: string;
    searchHref: string;
    hubHref: string;
}

const mallConfigs: Record<string, MallConfig> = {
    loads: {
        id: 'loads',
        title: 'Loads Mall',
        description: 'The national clearing house for all local and long-haul freight instructions. Find loads or post freight.',
        icon: PackageSearch,
        resource: 'loads',
        permission: 'transact',
        upgradePlan: 'loads_intelligence',
        buyLabel: 'Explore Loads Intelligence',
        buyDesc: 'Unlock verified live freight records, query route and equipment matches, then respond to the provider.',
        sellLabel: 'Manage Load Shop',
        sellDesc: 'Manage your public freight offer, published loads, carrier responses and commercial execution.',
        searchHref: '/mall/loads',
        hubHref: '/account?view=shop&nodeType=loads',
    },
    warehouse: {
        id: 'warehouse',
        title: 'Warehouse Mall',
        description: 'Map community storage capacity. Calculate handling, storage, and uplift fees across the hub network.',
        icon: Warehouse,
        resource: 'warehouseMall',
        permission: 'transact',
        upgradePlan: 'warehouse_intelligence',
        buyLabel: 'Source Storage',
        buyDesc: 'Find suitable storage and handling capacity for your goods and operating corridor.',
        sellLabel: 'Manage Warehouse Shop',
        sellDesc: 'Manage your public storage offer, enquiries, bookings and commercial execution.',
        searchHref: '/mall/warehouse',
        hubHref: '/account?view=shop&nodeType=warehouse',
    },
    transporter: {
        id: 'transporter',
        title: 'Transport Mall',
        description: 'Long-haul arterial fleet registry. Connect with verified capacity for national corridors.',
        icon: Truck,
        resource: 'transporterMall',
        permission: 'view',
        upgradePlan: 'transporter_intelligence',
        buyLabel: 'Source Capacity',
        buyDesc: 'Find verified fleet capacity for the corridors, equipment and service requirements you need.',
        sellLabel: 'Manage Transport Shop',
        sellDesc: 'Manage your public fleet offer, load responses and commercial execution.',
        searchHref: '/mall/transporter',
        hubHref: '/account?view=shop&nodeType=transport',
    },
    supplier: {
        id: 'supplier',
        title: 'Supplier Mall',
        description: 'Registry of verified spares, service, and consumable providers.',
        icon: Building2,
        resource: 'supplierMall',
        permission: 'view',
        upgradePlan: 'supplier_intelligence',
        buyLabel: 'Search Suppliers',
        buyDesc: 'Find verified products and services by category, specification and supplier capability.',
        sellLabel: 'Manage Supplier Shop',
        sellDesc: 'Manage your public catalogue, customer enquiries, orders and fulfilment activity.',
        searchHref: '/mall/supplier',
        hubHref: '/account?view=shop&nodeType=supplier',
    },
    finance: {
        id: 'finance',
        title: 'Finance Mall',
        description: 'Connect with 85+ specialized lenders. Source asset finance, working capital, and insurance.',
        icon: Landmark,
        resource: 'financeMall',
        permission: 'view',
        upgradePlan: 'finance_intelligence',
        buyLabel: 'Search for Funding',
        buyDesc: 'Explore funding options aligned to your operating need, evidence and repayment position.',
        sellLabel: 'Manage Finance Shop',
        sellDesc: 'Manage lending products, applicant opportunities and commercial execution.',
        searchHref: '/mall/finance',
        hubHref: '/account?view=shop&nodeType=finance',
    },
    'buy-sell': {
        id: 'buy-sell',
        title: 'Buy & Sell Mall',
        description: 'The national marketplace for new and used vehicles. Trade assets within a secure ecosystem.',
        icon: ShoppingCart,
        resource: 'buySellMall',
        permission: 'transact',
        upgradePlan: 'buy_sell_intelligence',
        buyLabel: 'Search Inventory',
        buyDesc: 'Browse verified vehicle and equipment listings for your operational requirements.',
        sellLabel: 'Manage Marketplace Shop',
        sellDesc: 'Manage your public listings, buyer offers and transaction activity.',
        searchHref: '/mall/buy-sell',
        hubHref: '/account?view=shop&nodeType=buy-sell',
    },
};

export function MallGate({ mallId }: { mallId: string }) {
    const router = useRouter();
    const config = mallConfigs[mallId.trim()];

    if (!config) return <div className="p-12 text-center italic text-muted-foreground">Mall configuration "{mallId}" not found.</div>;

    return (
            <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-500 text-left">
                <div className="text-left space-y-2">
                    <h1 className="text-3xl font-black font-headline flex items-center gap-3 text-left text-foreground">
                        <config.icon className="h-8 w-8 text-primary" />
                        Welcome to {config.title}
                    </h1>
                    <p className="text-muted-foreground text-left leading-relaxed">{config.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left text-foreground">
                    <Card className="hover:border-primary border-2 transition-all cursor-pointer group shadow-xl bg-white text-left" onClick={() => router.push(config.searchHref)}>
                        <CardHeader className="p-8 pb-4 text-left">
                            <div className="bg-muted p-4 rounded-2xl w-fit group-hover:bg-primary transition-colors text-left">
                                <Search className="h-8 w-8 text-foreground group-hover:text-white" />
                            </div>
                            <CardTitle className="text-2xl font-black mt-6 text-left">{config.buyLabel}</CardTitle>
                            <CardDescription className="text-base mt-2 leading-relaxed text-left">{config.buyDesc}</CardDescription>
                        </CardHeader>
                        <CardFooter className="p-8 pt-0 flex justify-end text-left">
                            <ArrowRight className="h-6 w-6 text-primary" />
                        </CardFooter>
                    </Card>

                    <Card className="hover:border-primary border-2 transition-all cursor-pointer group shadow-xl bg-white text-left" onClick={() => router.push(config.hubHref)}>
                        <CardHeader className="p-8 pb-4 text-left text-foreground">
                            <div className="bg-muted p-4 rounded-2xl w-fit group-hover:bg-primary transition-colors text-left text-foreground">
                                {config.id === 'finance' ? <HandCoins className="h-8 w-8 text-foreground group-hover:text-white" /> : <PlusCircle className="h-8 w-8 text-foreground group-hover:text-white" />}
                            </div>
                            <CardTitle className="text-2xl font-black mt-6 text-left text-foreground">{config.sellLabel}</CardTitle>
                            <CardDescription className="text-base mt-2 leading-relaxed text-left text-foreground">{config.sellDesc}</CardDescription>
                        </CardHeader>
                        <CardFooter className="p-8 pt-0 flex justify-end text-left text-foreground">
                            <ArrowRight className="h-6 w-6 text-primary" />
                        </CardFooter>
                    </Card>
                </div>

                <Alert className="bg-primary/5 border-primary/20 p-6 text-left shadow-sm">
                    <Info className="h-6 w-6 text-primary" />
                    <div className="ml-2 text-left">
                        <AlertTitle className="font-bold text-lg text-foreground">How this helps your business</AlertTitle>
                        <AlertDescription className="text-sm text-muted-foreground leading-relaxed mt-1">
                            Start by understanding verified member offers in the mall. Use the relevant board to filter live opportunities, then manage your own shop back office so enquiries, responses and commercial activity can be executed in one place. Your questionnaire provides the matching data that makes these introductions more relevant.
                        </AlertDescription>
                    </div>
                </Alert>
            </div>
    );
}
