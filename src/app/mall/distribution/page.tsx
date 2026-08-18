
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import data from "@/lib/placeholder-images.json";
import { Network, Star, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as gtag from '@/lib/gtag';

const { placeholderImages } = data;

const courierImage = placeholderImages.find(p => p.id === 'distribution-courier');

const featuredPartners = [
    { 
        id: "metro-dispatch",
        name: "Metro Dispatch", 
        focus: "Urban Fixed-Body Delivery",
        rating: 4.9,
        image: placeholderImages.find(p => p.id === 'tech-division'),
    },
    { 
        id: "nationwide-connect",
        name: "Nationwide Connect", 
        focus: "Inter-Provincial Spoke Network",
        rating: 4.7,
        image: placeholderImages.find(p => p.id === 'hero-home'),
    },
]

export default function DistributionMallPage() {

    const handlePartnerClick = (partnerId: string) => {
        if (!process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID) return;
        gtag.event({
            action: 'view_distribution_partner',
            category: 'Distribution Mall',
            label: partnerId,
            value: 0
        });
    };

    return (
        <div className="text-left text-foreground">
            <section className="relative w-full h-80 bg-card">
                {courierImage && (
                    <Image
                        src={courierImage.imageUrl}
                        alt="Distribution Mall"
                        fill
                        className="object-cover"
                        priority
                        data-ai-hint={courierImage.imageHint}
                    />
                )}
                <div className="absolute inset-0 bg-black/60" />
                <div className="relative h-full flex flex-col items-center justify-center text-center text-primary-foreground z-10 p-4">
                    <h1 className="text-4xl md:text-5xl font-bold font-headline">Distribution Mall</h1>
                    <p className="mt-4 text-lg md:text-xl max-w-3xl">Optimize final-mile logistics with specialized fixed-body courier networks.</p>
                </div>
            </section>
            
             <section id="featured-partners" className="py-16 md:py-24 bg-background">
                <div className="container mx-auto px-4">
                     <div className="text-center max-w-3xl mx-auto mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold font-headline">Distribution Partners</h2>
                        <p className="mt-4 text-lg text-muted-foreground">
                            Leverage established fixed-body networks for final-mile, regional, and national distribution to improve urban efficiency.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {featuredPartners.map(partner => (
                             <Link href={`/mall/distribution/${partner.id}`} key={partner.id} className="block group" onClick={() => handlePartnerClick(partner.id)}>
                                <Card className="overflow-hidden shadow-md hover:shadow-lg transition-all h-full flex flex-col group-hover:border-primary">
                                    {partner.image && (
                                        <div className="relative aspect-video">
                                            <Image
                                                src={partner.image.imageUrl}
                                                alt={partner.name}
                                                fill
                                                className="object-cover"
                                                data-ai-hint={partner.image.imageHint}
                                            />
                                        </div>
                                    )}
                                    <CardHeader>
                                        <CardTitle className="text-xl">{partner.name}</CardTitle>
                                        <CardDescription>{partner.focus}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow">
                                        <div className="flex items-center gap-1">
                                            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                                            <span className="font-semibold">{partner.rating.toFixed(1)}</span>
                                            <span className="text-sm text-muted-foreground">/ 5.0</span>
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <p className="text-sm font-semibold text-primary flex items-center gap-2">
                                            View Partner <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                        </p>
                                    </CardFooter>
                                </Card>
                            </Link>
                        ))}
                    </div>
                    <div className="text-center mt-16">
                        <Button size="lg" onClick={() => {if (!process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID) return; gtag.event({ action: 'join_distribution_click', category: 'Distribution Mall', label: 'Footer CTA', value: 0 })}}>
                            Join Our Fixed-Body Network
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
}
