'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ArrowRight, DollarSign, ShoppingBasket, Store, Cpu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import data from "@/lib/placeholder-images.json";
import { divisions } from "@/lib/data";
import { useUser } from "@/firebase";
import * as React from "react";
import { useState } from "react";
import * as gtag from '@/lib/gtag';
import { HomeIntentModal } from "@/app/home-intent-modal";

const { placeholderImages } = data;

const heroImage = placeholderImages.find(p => p.id === 'hero-home');
const values = [
    { title: "Efficiency", description: "Streamline operations with smart, data-driven tools.", image: placeholderImages.find(p => p.id === 'value-efficiency')! },
    { title: "Community", description: "Leverage collective power for better deals and opportunities.", image: placeholderImages.find(p => p.id === 'value-community')! },
    { title: "Innovation", description: "Access cutting-edge technology designed for the transport sector.", image: placeholderImages.find(p => p.id === 'value-innovation')! },
    { title: "Integrity", description: "Operate within a transparent ecosystem built on trust.", image: placeholderImages.find(p => p.id === 'value-integrity')! },
];

const iconComponents: { [key: string]: React.ElementType } = {
  DollarSign,
  ShoppingBasket,
  Store,
  Cpu,
};


export default function HomePage() {
  const { user } = useUser();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleJoinClick = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    if (process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID) {
      gtag.event({
        action: 'click_join_from_hero',
        category: 'Engagement',
        label: 'Homepage Hero CTA',
        value: 1
      });
    }
    setIsModalOpen(true);
  };
  
  const ctaLink = user ? '/account' : '#';

  return (
    <div>
        <HomeIntentModal isOpen={isModalOpen} onOpenChange={setIsModalOpen} />
      {/* Hero Section */}
      <section className="relative w-full h-[60vh] md:h-[70vh] bg-card text-card-foreground">
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
          <h1 className="text-4xl md:text-6xl font-extrabold font-headline leading-tight">
            The Digital Ecosystem for the Transport Industry
          </h1>
          <p className="mt-4 text-lg md:text-xl max-w-3xl">
            Unlocking capital, creating opportunity, and maximizing efficiency for your logistics business.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Button asChild size="lg" onClick={handleJoinClick}>
              <Link href={ctaLink}>
                Join for Free <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-transparent text-white border-white hover:bg-white hover:text-black">
              <Link href="/about">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Core Values Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-headline">Built on a Foundation of Trust</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              We are committed to building a transparent and fair ecosystem. Our platform is founded on four core values that guide every decision we make.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value) => (
              <Card key={value.title} className="text-center shadow-md hover:shadow-xl transition-shadow">
                <CardHeader>
                    <div className="relative aspect-square w-full rounded-t-lg overflow-hidden mb-4">
                         <Image
                            src={value.image.imageUrl}
                            alt={value.image.description}
                            fill
                            className="object-cover"
                            data-ai-hint={value.image.imageHint}
                        />
                    </div>
                  <CardTitle className="font-headline">{value.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Divisions Section */}
      <section className="py-16 md:py-24 bg-card">
        <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-12">
                <h2 className="text-3xl md:text-4xl font-bold font-headline">One Platform, Four Divisions</h2>
                <p className="mt-4 text-lg text-muted-foreground">
                    A complete suite of tools to address the key challenges in the transport industry.
                </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {divisions.map((division) => {
              const IconComponent = iconComponents[division.icon];
              return (
                <Card key={division.id} className="group relative shadow-lg hover:shadow-primary/20 transition-shadow">
                  <CardHeader className="flex-row items-start gap-4">
                    {IconComponent && <IconComponent className="h-10 w-10 text-primary flex-shrink-0 mt-1" />}
                    <div className="flex-1">
                      <CardTitle>{division.title}</CardTitle>
                      <CardDescription className="mt-1">{division.description}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{division.longDescription}</p>
                  </CardContent>
                   <CardFooter>
                        <Button asChild variant="outline">
                            <Link href={`/${division.id}`}>
                                Explore {division.title} <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
       <section className="py-20 md:py-32 bg-background">
            <div className="container mx-auto px-4 text-center">
                <h2 className="text-3xl md:text-4xl font-bold font-headline">Ready to Transform Your Business?</h2>
                <p className="mt-4 text-lg max-w-2xl mx-auto text-muted-foreground">
                    Join a growing community of transport professionals who are building a more efficient and profitable future. Your free account is just a click away.
                </p>
                <div className="mt-8">
                     <Button asChild size="lg" onClick={handleJoinClick}>
                        <Link href={ctaLink}>
                            Get Started Now <ArrowRight className="ml-2 h-5 w-5" />
                        </Link>
                    </Button>
                </div>
            </div>
        </section>
    </div>
  );
}
