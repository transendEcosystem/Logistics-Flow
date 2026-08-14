
'use client';

import FreightMatcher from "@/app/tech/freight-matcher";
import Image from "next/image";
import data from "@/lib/placeholder-images.json";
import LoadCalculator from "@/app/tech/load-calculator";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Truck } from "lucide-react";
import Link from "next/link";
import { useUser } from "@/firebase";

const { placeholderImages } = data;
const techImage = placeholderImages.find(p => p.id === "tech-home");

export default function LoadsMallPage() {
    const { user } = useUser();
    const postLoadHref = user ? '/account?view=load-board' : '/join?redirect=/account?view=load-board';

    return (
        <div>
            <section className="relative w-full h-80 bg-card">
                {techImage && (
                    <Image
                        src={techImage.imageUrl}
                        alt="Loads Mall"
                        fill
                        className="object-cover"
                        priority
                        data-ai-hint={techImage.imageHint}
                    />
                )}
                <div className="absolute inset-0 bg-black/60" />
                <div className="relative h-full flex flex-col items-center justify-center text-center text-primary-foreground z-10 p-4">
                    <h1 className="text-4xl md:text-5xl font-bold font-headline">Loads Mall</h1>
                    <p className="mt-4 text-lg md:text-xl max-w-3xl">Find available loads, reduce empty miles, and maximize your profitability.</p>
                </div>
            </section>

            <section className="py-16 md:py-24 bg-background">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                        <div className="lg:col-span-2 space-y-8">
                             <FreightMatcher />
                             <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Truck /> Post Your Own Load</CardTitle>
                                    <CardDescription>Have available freight? Post it to our network to find reliable transporters quickly.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button asChild>
                                        <Link href={postLoadHref}>
                                            Post a Load
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                         <div className="lg:col-span-1 space-y-8">
                           <LoadCalculator />
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
