'use client';

import { useConfig } from '@/hooks/use-config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Cpu, Truck, Calculator, ArrowRight } from 'lucide-react';
import LoadCalculator from './load-calculator';
import Image from 'next/image';
import data from '@/lib/placeholder-images.json';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';

const { placeholderImages } = data;
const techImage = placeholderImages.find(p => p.id === "tech-home");

const formatPrice = (price?: number, perUnit = false, unit = "month") => {
    if (typeof price !== 'number' || isNaN(price)) return 'N/A';
    if (price === 0) return 'Free';
    const formatted = formatCurrency(price);
    return perUnit ? `${formatted.split('.')[0]}/${unit}` : formatted;
};

export default function TechPage() {
    const { data: pricing, isLoading } = useConfig<any>('techPricing');

    return (
        <div className="bg-background min-h-full">
            <div className="container mx-auto px-4 py-16">
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <div className="inline-block bg-primary/10 p-4 rounded-full mb-4">
                        <Cpu className="h-12 w-12 text-primary" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold font-headline">Create Your Information Flow</h1>
                    <p className="mt-4 text-lg md:text-xl text-muted-foreground">
                        Inefficiency is a constraint on your profitability. Our Tech Division provides AI-powered tools, like the Freight Matcher, to break the constraint of wasted capacity and empty miles, creating a seamless flow of data-driven decisions that boost your bottom line.
                    </p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-12 items-center my-16 md:my-24">
                    <div className="relative aspect-video rounded-lg overflow-hidden shadow-2xl">
                        {techImage && (
                        <Image
                            src={techImage.imageUrl}
                            alt={techImage.description}
                            fill
                            className="object-cover"
                            data-ai-hint={techImage.imageHint}
                        />
                        )}
                    </div>
                    <div>
                        <span className="text-primary font-semibold">TECH-POWERED</span>
                        <h2 className="text-3xl md:text-4xl font-bold font-headline mt-2">Smarter, Faster, Further</h2>
                        <p className="mt-4 text-lg text-muted-foreground">
                        Our advanced technology suite, featuring an AI-powered freight matching system, helps you eliminate guesswork, reduce empty miles, and maximize your profitability. Find the perfect load in real-time.
                        </p>
                    </div>
                </div>

                 {isLoading ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                 ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
                        <Card className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Truck className="h-6 w-6"/>AI Freight Matcher</CardTitle>
                                <CardDescription>Our premium tool to find matching loads instantly. Requires a subscription.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                               <div className="p-6 bg-muted/50 rounded-lg text-center">
                                    {isLoading ? (
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    ) : (
                                        <>
                                            <p className="text-4xl font-bold text-primary">{formatCurrency(pricing?.aiFreightMatcher || 0)}</p>
                                            <p className="text-sm text-muted-foreground">per month</p>
                                        </>
                                    )}
                               </div>
                               <p className="text-sm text-muted-foreground mt-4">
                                Subscribe to the AI Freight Matcher to get unlimited access to our intelligent load board, reducing your empty miles and boosting your revenue.
                               </p>
                            </CardContent>
                            <CardFooter>
                                <Button asChild className="w-full">
                                    <Link href="/mall/loads">
                                        Go to Loads Mall <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                        <LoadCalculator />
                    </div>
                 )}
            </div>
        </div>
    );
}
