
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import data from "@/lib/placeholder-images.json";
import { Recycle, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as gtag from '@/lib/gtag';

const { placeholderImages } = data;

const repurposeMallImage = placeholderImages.find(p => p.id === 'product-tires');

const featuredItems = [
    { 
        id: "used-alternators-batch",
        name: "Used Alternators (Batch of 10)", 
        category: "Electrical Components",
        condition: "Refurbishable",
        image: placeholderImages.find(p => p.id === 'tech-division'),
    },
    { 
        id: "decommissioned-seats",
        name: "Decommissioned Truck Seats", 
        category: "Cabin Interior",
        condition: "For Upholstery/Parts",
        image: placeholderImages.find(p => p.id === 'product-truck-seat'),
    },
]

export default function RepurposeMallPage() {

    const handleItemClick = (itemId: string) => {
        if (!process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID) return;
        gtag.event({
            action: 'view_repurpose_item',
            category: 'Repurpose Mall',
            label: itemId,
            value: 0
        });
    };

    return (
        <div>
            <section className="relative w-full h-80 bg-card">
                {repurposeMallImage && (
                    <Image
                        src={repurposeMallImage.imageUrl}
                        alt="Repurpose Mall"
                        fill
                        className="object-cover"
                        priority
                        data-ai-hint={repurposeMallImage.imageHint}
                    />
                )}
                <div className="absolute inset-0 bg-black/60" />
                <div className="relative h-full flex flex-col items-center justify-center text-center text-primary-foreground z-10 p-4">
                    <h1 className="text-4xl md:text-5xl font-bold font-headline">Repurpose Mall</h1>
                    <p className="mt-4 text-lg md:text-xl max-w-3xl">Give a second life to decommissioned assets, parts, and components.</p>
                </div>
            </section>
            
             <section id="featured-items" className="py-16 md:py-24 bg-background">
                <div className="container mx-auto px-4">
                     <div className="text-center max-w-3xl mx-auto mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold font-headline">Available for Repurposing</h2>
                        <p className="mt-4 text-lg text-muted-foreground">
                           Find value in used and decommissioned assets. A marketplace for parts harvesters, refurbishes, and creative recyclers.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {featuredItems.map(item => (
                             <Link href={`/mall/repurpose/${item.id}`} key={item.id} className="block group" onClick={() => handleItemClick(item.id)}>
                                <Card className="overflow-hidden shadow-md hover:shadow-lg transition-all h-full flex flex-col group-hover:border-primary">
                                    {item.image && (
                                        <div className="relative aspect-video">
                                            <Image
                                                src={item.image.imageUrl}
                                                alt={item.name}
                                                fill
                                                className="object-cover"
                                                data-ai-hint={item.image.imageHint}
                                            />
                                        </div>
                                    )}
                                    <CardHeader>
                                        <CardTitle className="text-xl">{item.name}</CardTitle>
                                        <CardDescription>{item.category}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow">
                                        <p className="text-sm">Condition: <span className="font-semibold">{item.condition}</span></p>
                                    </CardContent>
                                    <CardFooter>
                                         <p className="text-sm font-semibold text-primary flex items-center gap-2">
                                           View Listing <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                        </p>
                                    </CardFooter>
                                </Card>
                            </Link>
                        ))}
                    </div>
                    <div className="text-center mt-16">
                        <Button size="lg" onClick={() => {if (!process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID) return; gtag.event({ action: 'list_asset_click', category: 'Repurpose Mall', label: 'Footer CTA', value: 0 })}}>
                           List Your Decommissioned Assets
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
}
