'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, Target, Lightbulb, CheckCircle, Handshake } from "lucide-react";
import Image from 'next/image';
import data from '@/lib/placeholder-images.json';
import { Button } from "@/components/ui/button";
import Link from "next/link";

const { placeholderImages } = data;

const heroImage = placeholderImages.find(p => p.id === 'about-hero');

const corePillars = [
    {
        title: "Commerce",
        description: "Enabling transporters and suppliers to create digital storefronts, sell products, and transact within a trusted network.",
    },
    {
        title: "Community",
        description: "Leveraging collective buying power and data contributions to negotiate group discounts and benefits for all members.",
    },
    {
        title: "Capital",
        description: "Using real-world operational data from platform activity to create a more accurate risk profile, unlocking access to flexible funding solutions.",
    },
];

export default function PitchCompanyProfile() {
    return (
        <div className="space-y-12">
            <section className="relative w-full h-64 rounded-xl overflow-hidden">
                 {heroImage && (
                    <Image
                        src={heroImage.imageUrl}
                        alt={heroImage.description}
                        fill
                        className="object-cover"
                        priority
                        data-ai-hint={heroImage.imageHint}
                    />
                )}
                <div className="absolute inset-0 bg-black/60" />
                <div className="relative h-full flex flex-col items-center justify-center text-center text-primary-foreground z-10 p-4">
                    <Building className="h-16 w-16 mb-4" />
                    <h1 className="text-4xl md:text-5xl font-bold font-headline">Company Profile: Logistics Flow</h1>
                    <p className="mt-4 text-lg md:text-xl max-w-3xl">Digitizing the logistics ecosystem to create a continuous flow of commerce, capital, and opportunity.</p>
                </div>
            </section>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <Target className="h-6 w-6 text-primary" />
                        Our Mission
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-lg text-muted-foreground">
                        Our mission is to break the constraints that hold back transport businesses. By creating a unified digital platform, we empower every member of the logistics community—from independent transporters to large suppliers—with the tools to increase efficiency, reduce costs, access capital, and grow their business.
                    </p>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-8 items-start">
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                            <Lightbulb className="h-6 w-6 text-destructive" />
                            The Problem: A Fragmented Industry
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-muted-foreground">The transport sector is the backbone of the economy, yet it operates in a fragmented, inefficient, and capital-constrained environment. Businesses face:</p>
                        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                            <li><span className="font-semibold text-foreground">High Operating Costs:</span> Lack of collective buying power means paying premium prices for parts, fuel, and services.</li>
                            <li><span className="font-semibold text-foreground">Limited Access to Capital:</span> Traditional lenders don't understand the industry, making it difficult to secure funding for growth or asset acquisition.</li>
                            <li><span className="font-semibold text-foreground">Inefficient Operations:</span> Empty miles, manual processes, and a lack of real-time data eat into profit margins.</li>
                             <li><span className="font-semibold text-foreground">Digital Divide:</span> Many businesses lack the resources to build a professional online presence, limiting their market reach.</li>
                        </ul>
                    </CardContent>
                </Card>
                 <Card className="h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                           <CheckCircle className="h-6 w-6 text-green-600" />
                            The Solution: A Unified Ecosystem
                        </CardTitle>
                    </CardHeader>
                     <CardContent className="space-y-4">
                        <p className="text-muted-foreground">Logistics Flow tackles these challenges head-on by integrating three core pillars into a single platform:</p>
                        <div className="space-y-3 pt-2">
                            {corePillars.map(pillar => (
                                <div key={pillar.title}>
                                    <h4 className="font-semibold text-foreground">{pillar.title}</h4>
                                    <p className="text-sm text-muted-foreground">{pillar.description}</p>
                                </div>
                            ))}
                        </div>
                         <p className="text-muted-foreground pt-4 border-t">This creates a powerful feedback loop: commercial activity generates data, which validates creditworthiness and unlocks capital for further growth.</p>
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <Handshake className="h-6 w-6 text-primary" />
                        Partnership & Investment Opportunity
                    </CardTitle>
                </CardHeader>
                <CardContent>
                     <p className="text-lg text-muted-foreground mb-6">
                        We are seeking strategic partners and investors who share our vision. By joining us, you can participate in a high-growth platform that is fundamentally changing the way the logistics industry operates.
                    </p>
                    <div className="flex flex-wrap gap-4">
                        <Button asChild size="lg">
                            <Link href="/adminaccount?view=pitch-investor-offer">View Investor Offer</Link>
                        </Button>
                         <Button asChild size="lg" variant="outline">
                            <Link href="/adminaccount?view=pitch-partner">View Partner Pitch</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>

        </div>
    );
}