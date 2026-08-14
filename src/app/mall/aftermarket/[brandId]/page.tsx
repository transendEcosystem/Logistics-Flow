
'use client';

import data from "@/lib/placeholder-images.json";
import { Wrench, CheckCircle, Star } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";

const { placeholderImages } = data;

const featuredBrands = [
    { 
        id: "power-plus-performance",
        name: "PowerPlus Performance", 
        category: "Performance Upgrades",
        rating: 4.7,
        image: placeholderImages.find(p => p.id === 'tech-division'),
        about: "PowerPlus Performance specializes in ECU tuning, high-flow exhausts, and upgraded turbochargers for most major truck brands. Unlock more power and efficiency from your fleet.",
        products: ["ECU Remapping Services", "Performance Exhaust Systems", "Upgraded Turbochargers", "High-Flow Air Intakes"],
        website: "www.powerplus.example.com",
    },
    { 
        id: "rhino-accessories",
        name: "Rhino Accessories", 
        category: "Exterior & Interior Accessories",
        rating: 4.8,
        image: placeholderImages.find(p => p.id === 'hero-home'),
        about: "From rugged bullbars and custom lighting to luxurious seat covers and floor mats, Rhino Accessories helps you customize your truck for work and comfort.",
        products: ["Bullbars & Grille Guards", "LED Light Bars", "Custom Seat Covers", "Heavy-Duty Floor Mats"],
        website: "www.rhino-acc.example.com",
    },
]


export default function AftermarketBrandPage({ params }: { params: { brandId: string } }) {

    const brand = featuredBrands.find(s => s.id === params.brandId);

    if (!brand) {
        notFound();
    }
    
    return (
        <div className="py-16 md:py-24 bg-background">
             <div className="container mx-auto px-4">
                <div className="max-w-6xl mx-auto border rounded-xl overflow-hidden shadow-2xl bg-background">
                    {/* Header */}
                    <div className="relative h-48 md:h-64">
                            {brand.image && (
                            <Image
                                src={brand.image.imageUrl}
                                alt={brand.name}
                                fill
                                className="object-cover"
                                data-ai-hint={brand.image.imageHint}
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                        <div className="absolute bottom-0 left-0 p-6">
                            <div className="flex items-center gap-4">
                                <div className="bg-background p-3 rounded-lg shadow-md">
                                    <Wrench className="h-10 w-10 text-primary" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-white font-headline">{brand.name}</h1>
                                    <p className="text-white/90">{brand.category}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-6 md:p-8 grid md:grid-cols-3 gap-8">
                        <div className="md:col-span-2">
                            <h2 className="text-xl font-semibold font-headline">About This Brand</h2>
                            <p className="mt-2 text-muted-foreground">
                                {brand.about}
                            </p>

                            <h3 className="mt-8 text-xl font-semibold font-headline">Popular Products</h3>
                            <div className="mt-4 grid grid-cols-2 gap-4">
                                {brand.products.map(prod => (
                                    <div key={prod} className="flex items-center gap-2 p-3 bg-card rounded-md border">
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                        <span>{prod}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-card p-6 rounded-lg border">
                            <h3 className="text-xl font-semibold font-headline">Brand Website</h3>
                            <a href={`https://${brand.website}`} target="_blank" rel="noopener noreferrer" className="mt-2 text-primary hover:underline break-all">{brand.website}</a>
                            
                            <h3 className="mt-6 text-xl font-semibold font-headline">Community Rating</h3>
                            <div className="flex items-center gap-1 mt-2">
                                {[...Array(5)].map((_, i) => (
                                    <Star 
                                        key={i} 
                                        className={`h-5 w-5 ${i < Math.floor(brand.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-yellow-400/50'}`} 
                                    />
                                ))}
                                <span className="ml-2 text-sm text-muted-foreground">({brand.rating.toFixed(1)}/5)</span>
                            </div>
                            <Button asChild className="w-full mt-6">
                               <a href={`https://${brand.website}`} target="_blank" rel="noopener noreferrer">Visit Website</a>
                            </Button>
                        </div>
                    </div>
                </div>
             </div>
        </div>
    );
}
