
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useConfig } from '@/hooks/use-config';
import { Loader2, Sparkles, Video, Truck, Search, DollarSign, Percent, Code, Edit } from 'lucide-react';
import * as React from "react";
import Link from 'next/link';

const formatPrice = (price?: number, per?: string) => {
    if (typeof price !== 'number') return 'N/A';
    if (price === 0) return 'Free';
    
    const formattedPrice = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(price);
    return per ? `${formattedPrice}/${per}` : formattedPrice;
};

const aiTools = [
    { name: 'AI Freight Matcher', icon: Truck, priceKey: 'aiFreightMatcher', per: 'mo', stats: { searches: 1245, matches: 312 } },
    { name: 'AI SEO Booster', icon: Search, priceKey: 'seoBooster', per: 'mo', stats: { uses: 450, keywords: '8k+' } },
    { name: 'AI Designer', icon: Sparkles, priceKey: 'aiImageGenerator', per: 'image', stats: { uses: 890, assets: 1780 } },
    { name: 'AI Image Enhancer', icon: Edit, priceKey: 'imageEnhancer', per: 'image', stats: { uses: 230, assets: 230 } },
    { name: 'AI Video Ads', icon: Video, priceKey: 'aiVideoGenerator', per: 'video', stats: { uses: 95, assets: 95 } },
    { name: 'API Access', icon: Code, priceKey: 'apiAccessPerCall', per: 'call', stats: { uses: '15k+', integrations: 7 } },
];


export default function TechDivisionContent() {
     const { data: pricing, isLoading } = useConfig<any>('techPricing');

    return (
         <div className="space-y-8">
            <h1 className="text-2xl font-bold">Tech Division Dashboard</h1>
            
            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            ) : pricing ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {aiTools.map(tool => {
                        const Icon = tool.icon;
                        const price = pricing[tool.priceKey];

                        return (
                            <Card key={tool.name}>
                                <CardHeader>
                                     <div className="flex items-center gap-3">
                                        <Icon className="h-7 w-7 text-primary" />
                                        <CardTitle>{tool.name}</CardTitle>
                                    </div>
                                    <CardDescription>
                                        Usage statistics and current pricing for this component.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="p-3 bg-muted/50 rounded-md">
                                        <p className="text-xs font-semibold text-muted-foreground">Current Price</p>
                                        <p className="text-xl font-bold">{formatPrice(price, tool.per)}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {Object.entries(tool.stats).map(([key, value]) => (
                                            <div key={key}>
                                                 <p className="text-xs font-semibold text-muted-foreground capitalize">{key}</p>
                                                 <p className="text-lg font-bold">{value}</p>
                                            </div>
                                        ))}
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
                        <p>Could not load pricing data for Tech components. Please configure it in the <Link href="/backend?view=revenue-tech-pricing" className="underline text-primary">Revenue settings</Link>.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
