
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ArrowRight, Search, BarChart, Truck, Gift } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import data from "@/lib/placeholder-images.json";
import * as React from "react";
import * as gtag from '@/lib/gtag';

const { placeholderImages } = data;

const marketplaceHeroImage = placeholderImages.find(p => p.id === 'marketplace-division');

const serviceCategories = [
    { 
        id: "digital-marketing",
        name: "Digital Marketing", 
        description: "Grow your online presence with SEO and Pay-Per-Click partner programs.",
        icon: Search,
    },
    { 
        id: "data-services",
        name: "Data & Analytics", 
        description: "Leverage data insights and marketing services to make smarter decisions.",
        icon: BarChart,
    },
    { 
        id: "logistics-networks",
        name: "Logistics & Courier Networks", 
        description: "Join or utilize established courier and agent networks to expand your reach.",
        icon: Truck,
    },
    { 
        id: "loyalty-incentives",
        name: "Loyalty & Incentives", 
        description: "Access or offer powerful programs like RAF Assist, Open Loyalty Funeral/Roadside Assist, and the Mahala Hub.",
        icon: Gift,
    },
];

const formatPrice = (price: number) => {
    if (typeof price !== 'number' || isNaN(price)) return 'R 0';
    const parts = price.toFixed(0).toString().split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `R ${integerPart}`;
};

export default function MarketplacePage() {

    const handleCategoryClick = (categoryId: string, userType: 'buyer' | 'seller') => {
        if (!process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID) return;
        gtag.event({
            action: userType === 'buyer' ? 'explore_service_category' : 'join_service_category',
            category: 'Marketplace',
            label: categoryId,
            value: 0
        });
    };

    return (
        <div>
             <section className="relative w-full h-80 bg-card">
                {marketplaceHeroImage && (
                    <Image
                        src={marketplaceHeroImage.imageUrl}
                        alt={marketplaceHeroImage.description}
                        fill
                        className="object-cover"
                        priority
                        data-ai-hint={marketplaceHeroImage.imageHint}
                    />
                )}
                <div className="absolute inset-0 bg-black/60" />
                <div className="relative h-full flex flex-col items-center justify-center text-center text-primary-foreground z-10 p-4">
                    <h1 className="text-4xl md:text-5xl font-bold font-headline">Create Your Opportunity Flow</h1>
                    <p className="mt-4 text-lg md:text-xl max-w-3xl">
                        Your network is your most valuable asset. The Marketplace gives you the tools to resell high-demand products and services—from digital marketing to specialized insurance—to your network, breaking the constraint of a single revenue stream and creating a new flow of passive income.
                    </p>
                </div>
            </section>
            
            <section className="py-16 md:py-24 bg-background">
                <div className="container mx-auto px-4">
                     <div className="text-center max-w-3xl mx-auto mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold font-headline">Our Partner Service Categories</h2>
                        <p className="mt-4 text-lg text-muted-foreground">
                           Our reseller network is comprised of service providers with established partner programs. We connect you with opportunities in:
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                        {serviceCategories.map(category => {
                            const Icon = category.icon;
                            const buyerLink = category.id === 'loyalty-incentives' ? '/incentives' : '/mall';
                            return (
                                <Card key={category.name} className="flex flex-col">
                                    <CardHeader className="flex-row items-start gap-4">
                                        <div className="bg-primary/10 p-3 rounded-lg">
                                            <Icon className="h-8 w-8 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-xl">{category.name}</CardTitle>
                                            <CardDescription className="mt-1">{category.description}</CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-grow">
                                        {/* Content can be added here if needed in the future */}
                                    </CardContent>
                                    <CardFooter className="flex flex-col sm:flex-row gap-2 pt-4">
                                        <Button asChild variant="outline" className="w-full" onClick={() => handleCategoryClick(category.id, 'buyer')}>
                                            <Link href={buyerLink}>
                                               I want to Buy
                                            </Link>
                                        </Button>
                                         <Button asChild variant="default" className="w-full" onClick={() => handleCategoryClick(category.id, 'seller')}>
                                            <Link href={`/join?role=partner-reseller&type=${category.id}`}>
                                               I want to Sell
                                            </Link>
                                        </Button>
                                    </CardFooter>
                                </Card>
                            )
                        })}
                    </div>
                </div>
            </section>
        </div>
    );
}
