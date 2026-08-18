
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useConfig } from '@/hooks/use-config';
import { Loader2, FileText, Heart, LifeBuoy, Gift, DollarSign, Percent } from 'lucide-react';
import * as React from "react";
import Link from 'next/link';

const formatPrice = (price?: number) => {
    if (typeof price !== 'number') return 'N/A';
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(price);
};

const products = [
    { id: 'rafAssist', name: 'RAF Assist', icon: FileText },
    { id: 'olRoadside', name: 'OL Roadside Assist', icon: LifeBuoy },
    { id: 'olFuneral', name: 'OL Funeral', icon: Heart },
    { id: 'mahalaHub', name: 'Mahala Hub', icon: Gift },
];

export default function MarketplaceDivisionContent() {
    const { data: feeConfig, isLoading } = useConfig<any>('marketplaceFees');

    return (
        <div className="space-y-8">
            <h1 className="text-2xl font-bold">Marketplace Division Dashboard</h1>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            ) : feeConfig ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {products.map(product => {
                        const Icon = product.icon;
                        const config = feeConfig[product.id];
                        
                        return (
                            <Card key={product.id}>
                                <CardHeader>
                                    <div className="flex items-center gap-4">
                                        <Icon className="h-8 w-8 text-primary" />
                                        <CardTitle>{product.name}</CardTitle>
                                    </div>
                                    <CardDescription>Pricing and commission for this reseller product.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                     <div className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                                        <span className="font-medium flex items-center gap-2"><DollarSign className="h-4 w-4"/>Monthly Price</span>
                                        <span className="font-bold text-lg">{formatPrice(config?.monthlyPrice)}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                                        <span className="font-medium flex items-center gap-2"><Percent className="h-4 w-4"/>Annual Discount</span>
                                        <span className="font-bold text-lg">{config?.annualDiscount || 0}%</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                                        <span className="font-medium flex items-center gap-2"><Percent className="h-4 w-4"/>Platform Commission</span>
                                        <span className="font-bold text-lg">{config?.commissionRate || 0}%</span>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-destructive">Configuration Missing</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>Could not load pricing data for Marketplace products. Please configure it in the <Link href="/backend?view=revenue-marketplace-fees" className="underline text-primary">Revenue settings</Link>.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
