
'use client';

import { Suspense } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Filter, Handshake, Target, Sparkles, UserPlus, Loader2 } from "lucide-react";
import Image from "next/image";
import data from "@/lib/placeholder-images.json";
import Link from "next/link";
import { useUser } from "@/firebase";
import { useSearchParams } from "next/navigation";
import * as gtag from '@/lib/gtag';


const { placeholderImages } = data;

const financierHeroImage = placeholderImages.find(p => p.id === 'funding-division');

const benefits = [
    {
        icon: <Target className="h-8 w-8 text-primary" />,
        title: "High-Quality Leads",
        description: "Receive applications from transport businesses that have been pre-screened and matched to your specific lending criteria. Spend less time searching and more time funding."
    },
    {
        icon: <Filter className="h-8 w-8 text-primary" />,
        title: "Reduce Acquisition Costs",
        description: "Our platform acts as your origination channel, significantly lowering the cost and effort required to find qualified, relevant borrowers in the transport sector."
    },
    {
        icon: <Handshake className="h-8 w-8 text-primary" />,
        title: "Streamlined Deal Flow",
        description: "Access a consistent flow of deals complete with the initial data you need to make an informed decision, all through a single, efficient platform."
    }
]

function ForFinanciersContent() {
    const { user, isUserLoading } = useUser();
    const searchParams = useSearchParams();
    const financierType = searchParams.get('type');

    let ctaLink = '/join?role=financier';
    if (financierType) {
        ctaLink += `&type=${financierType}`;
    }

    if (user) {
        ctaLink = "/account";
    }

    const handleJoinClick = () => {
        if (!process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID) return;
        gtag.event({
            action: 'join_as_financier',
            category: 'For Financiers',
            label: financierType || 'generic',
            value: 1
        });
    };

    return (
        <div>
            <section className="relative w-full h-80 bg-card">
                {financierHeroImage && (
                    <Image
                        src={financierHeroImage.imageUrl}
                        alt="Partner with TransConnect"
                        fill
                        className="object-cover"
                        priority
                        data-ai-hint={financierHeroImage.imageHint}
                    />
                )}
                <div className="absolute inset-0 bg-black/60" />
                <div className="relative h-full flex flex-col items-center justify-center text-center text-primary-foreground z-10 p-4">
                    <h1 className="text-4xl md:text-5xl font-bold font-headline">A Smarter Way to Lend</h1>
                    <p className="mt-4 text-lg md:text-xl max-w-3xl">Join the TransConnect network to access a targeted stream of qualified finance opportunities from the heart of the transport industry.</p>
                </div>
            </section>

            <section className="py-16 md:py-24 bg-background">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold font-headline">Why Partner With Us?</h2>
                        <p className="mt-4 text-lg text-muted-foreground">
                            Stop sifting through unqualified leads. We bring the right borrowers directly to you. By understanding the unique needs of the transport sector, we connect you with businesses that fit your profile.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {benefits.map(benefit => (
                            <Card key={benefit.title} className="text-center">
                                <CardHeader>
                                    <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                                        {benefit.icon}
                                    </div>
                                    <CardTitle>{benefit.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground">{benefit.description}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>
            
            <section id="how-it-works" className="py-16 md:py-24 bg-card">
                 <div className="container mx-auto px-4">
                     <div className="max-w-4xl mx-auto text-center">
                        <h2 className="text-3xl md:text-4xl font-bold font-headline">A Simple, Powerful Partnership</h2>
                        <p className="mt-4 text-lg text-muted-foreground">
                           Joining our network is free and simple. Once you register, you'll gain access to your secure partner dashboard to build your lending profile and start receiving matched deals.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 text-left">
                            <Card>
                                <CardHeader>
                                    <CardTitle>1. Register Your Account</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground">Create your free account to get access to the partner portal.</p>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader>
                                    <CardTitle>2. Build Your Profile</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground">Inside your secure dashboard, define your lending criteria, products, and target market.</p>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader>
                                    <CardTitle>3. Receive Matched Deals</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground">Get notified when a new application matches your profile. No more chasing cold leads.</p>
                                </CardContent>
                            </Card>
                        </div>
                        
                         <Button asChild size="lg" className="mt-12" disabled={isUserLoading} onClick={handleJoinClick}>
                            <Link href={ctaLink}>
                                {user ? "Go to Your Dashboard" : "Join Our Network Today"}
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                        </Button>
                     </div>
                 </div>
            </section>
        </div>
    )
}

export default function ForFinanciersPage() {
    return (
        <Suspense fallback={<div className="flex w-full h-[80vh] items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <ForFinanciersContent />
        </Suspense>
    )
}
