
'use client';

import data from "@/lib/placeholder-images.json";
import { University, Landmark, HandCoins, Building, Users, Sparkles, Building2, ArrowRight } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import Link from "next/link";
import * as React from "react";
import * as gtag from '@/lib/gtag';

const { placeholderImages } = data;

const categoryDetails = {
    banks: { 
        id: "banks",
        name: "Banks", 
        description: "Explore financing options from major financial institutions for established businesses.",
        icon: University,
        partners: [
            { name: "Standard Bank", description: "Offering vehicle and asset finance solutions for commercial clients.", logo: "https://placehold.co/100x40?text=Standard+Bank" },
            { name: "FNB", description: "Comprehensive business banking including asset finance and working capital loans.", logo: "https://placehold.co/100x40?text=FNB" },
            { name: "Absa", description: "Specialized transport and logistics financing division.", logo: "https://placehold.co/100x40?text=Absa" },
        ]
    },
    "niche-lenders": { 
        id: "niche-lenders",
        name: "Niche Lenders", 
        description: "Connect with specialized lenders who deeply understand the transport industry.",
        icon: Landmark,
        partners: [
            { name: "TransConnect Funding", description: "Our own division, offering flexible solutions where traditional banks can't.", logo: "https://placehold.co/100x40?text=TransConnect" },
            { name: "Fleet-Finance SA", description: "Experts in financing for large fleets and owner-operators.", logo: "https://placehold.co/100x40?text=Fleet-Finance" },
        ]
    },
    "debt-funders": { 
        id: "debt-funders",
        name: "Debt Funders", 
        description: "Find alternative debt financing for growth, expansion, or large-scale asset acquisition.",
        icon: Building,
        partners: []
    },
    "ngos-and-grants": { 
        id: "ngos-and-grants",
        name: "NGOs & Grants", 
        description: "Access funding from non-governmental organizations and grant programs aimed at supporting transport businesses.",
        icon: HandCoins,
        partners: []
    },
    "individuals": {
        id: "individuals",
        name: "Individuals (P2P & Crowdfunding)",
        description: "Source capital directly from individual investors and peer-to-peer platforms.",
        icon: Users,
        partners: []
    }
};

const financeMallImage = placeholderImages.find(p => p.id === 'funding-division');

const processSteps = [
    {
        title: "1. Complete One Application",
        description: "Fill out our smart online application. We'll ask for the necessary details about your business and funding needs just once."
    },
    {
        title: "2. We Match, You Choose",
        description: "Our system runs your application against our network's criteria and finds the best potential matches. We present you with the options."
    },
    {
        title: "3. Get Funded",
        description: "Engage directly with the financiers who are ready to fund you. We facilitate the introduction and help you close the deal."
    }
]

export default function FinancierCategoryPage({ params }: { params: { category: string } }) {
    
    const category = categoryDetails[params.category as keyof typeof categoryDetails];

    if (!category) {
        notFound();
    }

    const handleJoinNetworkClick = () => {
        gtag.event({
            action: 'join_financier_network',
            category: 'Finance Mall Category',
            label: category.id,
            value: 0
        });
    };
    
    const Icon = category.icon;

    return (
        <div>
             <section className="relative w-full h-80 bg-card">
                {financeMallImage && (
                    <Image
                        src={financeMallImage.imageUrl}
                        alt={category.name}
                        fill
                        className="object-cover"
                        priority
                        data-ai-hint={financeMallImage.imageHint}
                    />
                )}
                <div className="absolute inset-0 bg-black/60" />
                <div className="relative h-full flex flex-col items-center justify-center text-center text-primary-foreground z-10 p-4">
                    <div className="bg-background/20 backdrop-blur-sm p-4 rounded-full mb-4 border border-white/20">
                        <Icon className="h-12 w-12 text-white" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold font-headline">Borrowing from {category.name}</h1>
                    <p className="mt-4 text-lg md:text-xl max-w-3xl">You're in the right place. We simplify the process of finding the right funding from {category.name.toLowerCase()} by connecting you with the best options for your transport business.</p>
                </div>
            </section>
            
            <section className="py-16 md:py-24 bg-background">
                <div className="container mx-auto px-4">
                     <div className="text-center max-w-3xl mx-auto mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold font-headline">The Smart Way to Get Financed</h2>
                        <p className="mt-4 text-lg text-muted-foreground">
                            Stop applying to multiple lenders one by one. Our intelligent platform connects you with the right financier for your needs, saving you time and effort.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
                        {processSteps.map(step => (
                             <Card key={step.title} className="bg-card">
                                <CardHeader>
                                    <CardTitle className="text-xl">{step.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground">{step.description}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="text-center">
                         <Button asChild size="lg">
                            <Link href="/funding">
                                Start Your Application
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>

            <section className="py-16 md:py-24 bg-card">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-3xl mx-auto mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold font-headline">Our Partner Network in this Category</h2>
                        <p className="mt-4 text-lg text-muted-foreground">
                            We work with a diverse range of financiers to increase your chances of success. Here are some of the partners in our network.
                        </p>
                    </div>

                    {category.partners.length > 0 ? (
                        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
                            {category.partners.map(partner => (
                               <Image key={partner.name} src={partner.logo} alt={`${partner.name} logo`} width={150} height={60} className="object-contain" />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center max-w-2xl mx-auto bg-background p-10 rounded-lg border">
                             <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-xl font-semibold">Partners Coming Soon</h3>
                            <p className="text-muted-foreground mt-2">
                                We are actively expanding our network in this category. As our network grows, so do your funding opportunities.
                            </p>
                        </div>
                    )}

                    <div className="text-center mt-16">
                        <Button size="lg" variant="outline" asChild onClick={handleJoinNetworkClick}>
                           <Link href={`/for-financiers?type=${category.id}`}>
                                <Sparkles className="mr-2 h-5 w-5" />
                                Are you a financier? Join Our Network
                           </Link>
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    )
}
