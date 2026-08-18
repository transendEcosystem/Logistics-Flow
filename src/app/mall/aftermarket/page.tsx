
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import data from "@/lib/placeholder-images.json";
import { Wrench, Search, Star, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as gtag from '@/lib/gtag';

const { placeholderImages } = data;

const aftermarketMallImage = placeholderImages.find(p => p.id === 'product-engine-oil');

const featuredBrands = [
    { 
        id: "power-plus-performance",
        name: "PowerPlus Performance", 
        category: "Performance Upgrades",
        rating: 4.7,
        image: placeholderImages.find(p => p.id === 'tech-division'),
    },
    { 
        id: "rhino-accessories",
        name: "Rhino Accessories", 
        category: "Exterior & Interior Accessories",
        rating: 4.8,
        image: placeholderImages.find(p => p.id === 'hero-home'),
    },
]

export default function AftermarketMallPage() {

    const handleBrandClick = (brandId: string) => {
        if (!process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID) return;
        gtag.event({
            action: 'view_aftermarket_brand',
            category: 'Aftermarket Mall',
            label: brandId,
            value: 0
        });
    };

    return (
        <div>
            <section className="relative w-full h-80 bg-card">
                {aftermarketMallImage && (
                    <Image
                        src={aftermarketMallImage.imageUrl}
                        alt="Aftermarket Mall"
                        fill
                        className="object-cover"
                        priority
                        data-ai-hint={aftermarketMallImage.imageHint}
                    />
                )}
                <div className="absolute inset-0 bg-black/60" />
                <div className="relative h-full flex flex-col items-center justify-center text-center text-primary-foreground z-10 p-4">
                    <h1 className="text-4xl md:text-5xl font-bold font-headline">Aftermarket Mall</h1>
                    <p className="mt-4 text-lg md:text-xl max-w-3xl">Your source for aftermarket parts, performance upgrades, and custom accessories.</p>
                </div>
            </section>
            
            <section id="search-brands" className="py-16 md:py-24 bg-background">
                <div className="container mx-auto px-4">
                     <div className="max-w-4xl mx-auto">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Search className="h-6 w-6"/>
                                    Find a Brand or Product
                                </CardTitle>
                                <CardDescription>Search for specific parts, accessories, or performance brands.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Input placeholder="Product or brand name..." className="md:col-span-2" />
                                    <Select>
                                        <SelectTrigger>
                                            <SelectValue placeholder="All Categories" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="performance">Performance</SelectItem>
                                            <SelectItem value="lighting">Lighting</SelectItem>
                                            <SelectItem value="accessories">Accessories</SelectItem>
                                            <SelectItem value="interior">Interior</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button className="w-full md:col-span-3">Search Aftermarket</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

             <section id="featured-brands" className="py-16 md:py-24 bg-card">
                <div className="container mx-auto px-4">
                     <div className="text-center max-w-3xl mx-auto mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold font-headline">Featured Aftermarket Brands</h2>
                        <p className="mt-4 text-lg text-muted-foreground">
                            Leading brands for customizing and upgrading your fleet.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {featuredBrands.map(brand => (
                            <Link href={`/mall/aftermarket/${brand.id}`} key={brand.id} className="block group" onClick={() => handleBrandClick(brand.id)}>
                                <Card className="overflow-hidden shadow-md hover:shadow-lg transition-all h-full flex flex-col group-hover:border-primary">
                                    {brand.image && (
                                        <div className="relative aspect-video">
                                            <Image
                                                src={brand.image.imageUrl}
                                                alt={brand.name}
                                                fill
                                                className="object-cover"
                                                data-ai-hint={brand.image.imageHint}
                                            />
                                        </div>
                                    )}
                                    <CardHeader>
                                        <CardTitle className="text-xl">{brand.name}</CardTitle>
                                        <CardDescription>{brand.category}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow">
                                        <div className="flex items-center gap-1">
                                            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                                            <span className="font-semibold">{brand.rating.toFixed(1)}</span>
                                            <span className="text-sm text-muted-foreground">/ 5.0</span>
                                        </div>
                                    </CardContent>
                                     <CardFooter>
                                        <p className="text-sm font-semibold text-primary flex items-center gap-2">
                                            View Brand <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                        </p>
                                    </CardFooter>
                                </Card>
                            </Link>
                        ))}
                    </div>
                    <div className="text-center mt-16">
                        <Button size="lg" onClick={() => {if (!process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID) return; gtag.event({ action: 'feature_brand_click', category: 'Aftermarket Mall', label: 'Footer CTA', value: 0 })}}>
                            Are you a brand? Get Featured!
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
}
