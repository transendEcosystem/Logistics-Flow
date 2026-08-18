'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ArrowRight, CheckCircle, Percent, Gift } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import data from "@/lib/placeholder-images.json";

const { placeholderImages } = data;
const wctaHeroImage = placeholderImages.find(p => p.id === 'wcta-mall-hero');

const wctaBenefits = [
    "Advocacy and representation for transport operators in the Western Cape.",
    "Exclusive networking opportunities with industry leaders.",
    "Access to training, compliance resources, and industry updates.",
    "A unified voice to address challenges in the logistics sector.",
];

const logisticsFlowBenefits = [
    "Create your own professional online shop to sell products or services.",
    "Access a network of suppliers, buyers, and funding partners in our Malls.",
    "Utilize AI-powered tools to optimize your operations and reduce costs.",
    "Build a trusted profile to unlock better financing opportunities.",
];


export default function WCTAMembershipPage() {
    
    const standardLfPrice = 500;
    const wctaMembershipPrice = 100;
    const lfMembershipPrice = 100;
    const bundlePrice = 200;
    const totalSavings = (wctaMembershipPrice + standardLfPrice) - bundlePrice;

    return (
        <div>
            <section className="relative w-full h-72 bg-card">
                {wctaHeroImage && (
                    <Image
                        src={wctaHeroImage.imageUrl}
                        alt="WCTA Membership"
                        fill
                        className="object-cover"
                        priority
                        data-ai-hint={wctaHeroImage.imageHint}
                    />
                )}
                <div className="absolute inset-0 bg-black/60" />
                <div className="relative h-full flex flex-col items-center justify-center text-center text-primary-foreground z-10 p-4">
                    <div className="mb-4">
                         <Image src="/wcta/wcta-logo.png" alt="WCTA Logo" width={150} height={60} />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold font-headline">WCTA Member Portal</h1>
                    <p className="mt-4 text-lg md:text-xl max-w-3xl">Exclusive benefits and a special bundled offer for members of the Western Cape Truckers Alliance.</p>
                </div>
            </section>
            
            <section className="py-16 md:py-24 bg-background">
                <div className="container mx-auto px-4 max-w-6xl">
                    <div className="text-center max-w-3xl mx-auto mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold font-headline">Your Membership Options</h2>
                        <p className="mt-4 text-lg text-muted-foreground">As a WCTA member, you have access to an exclusive bundled deal, combining the power of the Alliance with the tools of Logistics Flow.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                        {/* WCTA Membership Card */}
                        <Card className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="text-2xl font-bold">WCTA Membership</CardTitle>
                                <div className="text-3xl font-bold text-primary">R{wctaMembershipPrice}<span className="text-base font-normal text-muted-foreground">/month</span></div>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="mb-4 text-muted-foreground">The core benefits of being part of the Western Cape Truckers Alliance.</p>
                                <ul className="list-none space-y-3">
                                    {wctaBenefits.map((benefit, index) => (
                                        <li key={index} className="flex items-start">
                                            <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-1 flex-shrink-0" />
                                            <span className="text-muted-foreground">{benefit}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>

                        {/* Logistics Flow Membership Card */}
                        <Card className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="text-2xl font-bold">Logistics Flow Membership</CardTitle>
                                <div className="text-3xl font-bold text-primary">R{lfMembershipPrice}<span className="text-base font-normal text-muted-foreground">/month</span></div>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="mb-4 text-muted-foreground">Access the full suite of digital tools to grow your business. (Standard value: R500/month)</p>
                                <ul className="list-none space-y-3">
                                    {logisticsFlowBenefits.map((benefit, index) => (
                                        <li key={index} className="flex items-start">
                                            <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-1 flex-shrink-0" />
                                            <span className="text-muted-foreground">{benefit}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Bundle Deal Card */}
                    <div className="mt-12">
                        <Card className="shadow-2xl border-2 border-primary bg-primary/5">
                             <CardHeader className="items-center text-center">
                                <div className="bg-primary p-3 rounded-full w-fit mb-4 text-primary-foreground">
                                    <Gift className="h-8 w-8" />
                                </div>
                                <CardTitle className="text-3xl font-bold">WCTA Member Exclusive Bundle</CardTitle>
                                <CardDescription className="text-lg">Get both memberships for a fraction of the cost.</CardDescription>
                            </CardHeader>
                            <CardContent className="text-center space-y-4">
                                <p className="text-5xl font-extrabold text-primary">R{bundlePrice}<span className="text-xl font-normal text-muted-foreground">/month</span></p>
                                <p className="font-semibold text-lg">Includes WCTA Membership + Full Logistics Flow Membership</p>
                                <p className="text-primary font-bold bg-primary/10 py-2 px-4 rounded-md inline-block">You save over R{totalSavings.toFixed(0)} every month!</p>
                            </CardContent>
                            <CardFooter className="flex-col gap-4 pt-6">
                                <Button asChild size="lg" className="w-full max-w-sm">
                                    <Link href="/join?ref=WCTA">
                                        Claim Your Bundle Deal <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </section>
        </div>
    )
}