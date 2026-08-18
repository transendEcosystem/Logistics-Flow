
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import data from "@/lib/placeholder-images.json";
import { ArrowRight, Boxes, FileText, Heart, Shield, LifeBuoy, Gift, Handshake } from "lucide-react";
import * as React from "react";
import * as gtag from '@/lib/gtag';

const { placeholderImages } = data;

const incentivesHeroImage = placeholderImages.find(p => p.id === 'incentives-hero');

const products = [
    {
        id: "ecosystem-membership",
        icon: <Boxes className="h-8 w-8 text-primary" />,
        title: "Refer New Members",
        description: "Invite other businesses to join Logistics Flow. You earn reward points for every new member who signs up for a paid plan through your referral.",
        linkUrl: "/account?view=referrals", // This page would need to be created
        isExternal: false,
    },
    {
        id: "raf-assist",
        icon: <FileText className="h-8 w-8 text-primary" />,
        title: "Offer RAF Assist",
        description: "Help members navigate the Road Accident Fund claims process. Earn a commission for every successful referral to this valuable service.",
        linkUrl: "/brochures/raf-assist.pdf",
        isExternal: true,
    },
    {
        id: "open-loyalty-funeral",
        icon: <Heart className="h-8 w-8 text-primary" />,
        title: "Promote Funeral Plans",
        description: "Provide peace of mind by offering funeral benefit plans tailored for the transport community. Earn for every policy sold.",
        linkUrl: "/brochures/open-loyalty-funeral.pdf",
        isExternal: true,
    },
    {
        id: "open-loyalty-roadside-assist",
        icon: <LifeBuoy className="h-8 w-8 text-primary" />,
        title: "Sell Roadside Assist",
        description: "Offer an essential roadside assistance package that gets drivers back on the road faster. A valuable product with great earning potential.",
        linkUrl: "/brochures/open-loyalty-roadside-assist.pdf",
        isExternal: true,
    },
    {
        id: "open-loyalty-liability",
        icon: <Shield className="h-8 w-8 text-primary" />,
        title: "Introduce Liability Cover",
        description: "Connect businesses with specialized liability coverage designed to protect them from financial loss, and earn on each policy.",
        linkUrl: "/brochures/open-loyalty-liability.pdf",
        isExternal: true,
    },
    {
        id: "mahala-hub",
        icon: <Gift className="h-8 w-8 text-primary" />,
        title: "Share Mahala Hub Deals",
        description: "Promote exclusive deals and discounts from the Mahala Hub. It's a powerful tool to attract new members and earn rewards.",
        linkUrl: "/brochures/mahala-hub.pdf",
        isExternal: true,
    }
];

export default function IncentivesPage() {
    
    const handleJoinClick = () => {
        if (!process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID) return;
        gtag.event({
            action: 'join_from_incentives',
            category: 'Incentives',
            label: 'Footer CTA',
            value: 1
        });
    };

    return (
        <div>
            <section className="relative w-full h-80 bg-card">
                {incentivesHeroImage && (
                    <Image
                        src={incentivesHeroImage.imageUrl}
                        alt={incentivesHeroImage.description}
                        fill
                        className="object-cover"
                        priority
                        data-ai-hint={incentivesHeroImage.imageHint}
                    />
                )}
                <div className="absolute inset-0 bg-black/60" />
                <div className="relative h-full flex flex-col items-center justify-center text-center text-primary-foreground z-10 p-4">
                    <h1 className="text-4xl md:text-5xl font-bold font-headline">Referral & Incentive Program</h1>
                    <p className="mt-4 text-lg md:text-xl max-w-3xl">Earn points and commission by sharing the value of Logistics Flow with your network.</p>
                </div>
            </section>

            <section id="opportunity" className="py-16 md:py-24 bg-background">
                <div className="container mx-auto px-4 text-center">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-bold font-headline">Earning Opportunities</h2>
                        <p className="mt-4 text-lg text-muted-foreground">
                            Our referral program allows every Logistics Flow member to earn by recommending our high-demand services and memberships. Top performers can qualify for our ISA program to unlock higher commission tiers.
                        </p>
                    </div>
                </div>
            </section>

            <section id="products" className="py-16 md:py-24 bg-card">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold font-headline">Available Products</h2>
                        <p className="mt-4 text-lg text-muted-foreground">
                           A portfolio of valuable products and services that are easy to share and beneficial to your network.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {products.map((product) => (
                            <Card key={product.title} className="flex flex-col">
                                <CardHeader className="items-center text-center">
                                    <div className="bg-primary/10 p-4 rounded-full mb-4">
                                        {product.icon}
                                    </div>
                                    <CardTitle>{product.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="text-center flex-grow">
                                    <p className="text-muted-foreground">{product.description}</p>
                                </CardContent>
                                <CardFooter>
                                    <Button asChild className="w-full" variant="outline">
                                        <Link 
                                            href={product.linkUrl} 
                                            target={product.isExternal ? "_blank" : "_self"} 
                                            rel={product.isExternal ? "noopener noreferrer" : ""}
                                        >
                                            Find Out More <ArrowRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            <section className="py-16 md:py-24 bg-background">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold font-headline">Start Earning Today</h2>
                    <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                        Your referral dashboard is waiting in your account. Join Logistics Flow to get your unique sharing links and start earning rewards.
                    </p>
                    <Button asChild size="lg" className="mt-8" onClick={handleJoinClick}>
                        <Link href="/join">
                            Join Logistics Flow for Free <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </section>
        </div>
    );
}
