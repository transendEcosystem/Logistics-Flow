
'use client';

import React, { useState } from 'react';
import { Card, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePermissions, type Resource } from '@/hooks/use-permissions';
import { PremiumFeaturePrompt } from '@/components/PremiumFeaturePrompt';
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
    sellHref?: string;
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
        buyLabel: 'Search for Loads',
        buyDesc: 'Find available freight and match your capacity.',
        sellLabel: 'Setup Brokerage Node',
        sellDesc: 'Authorize your node to post and clear freight.',
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
        buyDesc: 'Find warehousing hubs and calculate storage costs.',
        sellLabel: 'Setup Warehouse Node',
        sellDesc: 'List your available pallet positions and handling fees.',
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
        buyDesc: 'Scan the forensic haulier registry.',
        sellLabel: 'Setup Fleet Node',
        sellDesc: 'Declare your fleet and service corridors.',
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
        buyDesc: 'Find parts and services by category.',
        sellLabel: 'Setup Supplier Node',
        sellDesc: 'Publish your digital branch to the community.',
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
        buyDesc: 'Scan the capital registry for matched lenders.',
        sellLabel: 'Apply for Finance',
        sellDesc: 'Submit a formal enquiry to the funding division.',
        sellHref: '/funding',
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
        buyDesc: 'Browse verified vehicle and equipment listings.',
        sellLabel: 'Setup Marketplace Node',
        sellDesc: 'List your assets for sale and manage handshakes.',
    },
};

export function MallGate({ mallId }: { mallId: string }) {
    const { can } = usePermissions();
    const router = useRouter();
    const config = mallConfigs[mallId.trim()];
    const [intent, setIntent] = useState<'select' | 'buy' | 'sell' | null>('select');

    if (!config) return <div className="p-12 text-center italic text-muted-foreground">Mall configuration "{mallId}" not found.</div>;

    // Check basic view permission for the mall resource
    const hasAccess = can('view', config.resource);

    if (!hasAccess) {
        return (
            <div className="max-w-4xl mx-auto py-12 animate-in fade-in zoom-in duration-500 text-left">
                <PremiumFeaturePrompt 
                    icon={config.icon}
                    title={config.title}
                    description={config.description}
                    planId={config.upgradePlan}
                />
            </div>
        );
    }

    if (intent === 'select') {
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
                    <Card className="hover:border-primary border-2 transition-all cursor-pointer group shadow-xl bg-white text-left" onClick={() => router.push(config.id === 'finance' ? '/intelligence/finance' : (config.id === 'buy-sell' ? '/mall/buy-sell' : `/mall/${config.id}`))}>
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

                    <Card className="hover:border-primary border-2 transition-all cursor-pointer group shadow-xl bg-white text-left" onClick={() => router.push(config.sellHref || `/account?view=shop&subview=wizard&nodeType=${config.id}`)}>
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
                        <AlertTitle className="font-bold text-lg text-foreground">Industrial Node Integration</AlertTitle>
                        <AlertDescription className="text-sm text-muted-foreground leading-relaxed mt-1">
                            Your Node is the engine that powers your presence in this mall. Setting up your node once ensures your capacity is correctly mapped for all relevant community searches.
                        </AlertDescription>
                    </div>
                </Alert>
            </div>
        );
    }

    return (
        <div className="text-center py-20 flex flex-col items-center gap-4 text-left text-foreground">
            <Loader2 className="animate-spin h-8 w-8 text-primary" />
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Opening Hub...</p>
        </div>
    );
}
