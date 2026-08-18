
'use client';

import data from "@/lib/placeholder-images.json";
import { Network, CheckCircle, Star } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";

const { placeholderImages } = data;

const featuredPartners = [
    { 
        id: "metro-dispatch",
        name: "Metro Dispatch", 
        focus: "Urban & Same-Day Delivery",
        rating: 4.9,
        image: placeholderImages.find(p => p.id === 'tech-division'),
        about: "Metro Dispatch offers a high-density network within major urban centers, specializing in rapid, same-day delivery for businesses. Our technology-driven approach ensures reliability and real-time tracking for every parcel.",
        capabilities: ["Same-Day & Next-Day Delivery", "Real-Time Parcel Tracking", "API Integration for Retailers", "White-Label Delivery Services"],
        coverage: "Gauteng, Cape Town, Durban metro areas.",
    },
    { 
        id: "nationwide-connect",
        name: "Nationwide Connect", 
        focus: "Inter-Provincial Network",
        rating: 4.7,
        image: placeholderImages.find(p => p.id === 'hero-home'),
        about: "With hubs in every province, Nationwide Connect provides a reliable backbone for your national distribution needs. We consolidate freight from multiple partners to create efficient long-haul routes.",
        capabilities: ["Pallet & Bulk Freight Consolidation", "Scheduled Inter-Provincial Routes", "Cross-Docking Services", "Managed Transportation"],
        coverage: "All 9 provinces of South Africa.",
    },
]


export default function DistributionPartnerPage({ params }: { params: { distributionId: string } }) {

    const partner = featuredPartners.find(s => s.id === params.distributionId);

    if (!partner) {
        notFound();
    }
    
    return (
        <div className="py-16 md:py-24 bg-background">
             <div className="container mx-auto px-4">
                <div className="max-w-6xl mx-auto border rounded-xl overflow-hidden shadow-2xl bg-background">
                    {/* Profile Header */}
                    <div className="relative h-48 md:h-64">
                            {partner.image && (
                            <Image
                                src={partner.image.imageUrl}
                                alt={partner.name}
                                fill
                                className="object-cover"
                                data-ai-hint={partner.image.imageHint}
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                        <div className="absolute bottom-0 left-0 p-6">
                            <div className="flex items-center gap-4">
                                <div className="bg-background p-3 rounded-lg shadow-md">
                                    <Network className="h-10 w-10 text-primary" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-white font-headline">{partner.name}</h1>
                                    <p className="text-white/90">{partner.focus}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Profile Body */}
                    <div className="p-6 md:p-8 grid md:grid-cols-3 gap-8">
                        <div className="md:col-span-2">
                            <h2 className="text-xl font-semibold font-headline">About This Network</h2>
                            <p className="mt-2 text-muted-foreground">
                                {partner.about}
                            </p>

                            <h3 className="mt-8 text-xl font-semibold font-headline">Capabilities</h3>
                            <div className="mt-4 grid grid-cols-2 gap-4">
                                {partner.capabilities.map(cat => (
                                    <div key={cat} className="flex items-center gap-2 p-3 bg-card rounded-md border">
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                        <span>{cat}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-card p-6 rounded-lg border">
                            <h3 className="text-xl font-semibold font-headline">Network Coverage</h3>
                            <p className="mt-2 text-muted-foreground">{partner.coverage}</p>
                            
                            <h3 className="mt-6 text-xl font-semibold font-headline">Community Rating</h3>
                            <div className="flex items-center gap-1 mt-2">
                                {[...Array(5)].map((_, i) => (
                                    <Star 
                                        key={i} 
                                        className={`h-5 w-5 ${i < Math.floor(partner.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-yellow-400/50'}`} 
                                    />
                                ))}
                                <span className="ml-2 text-sm text-muted-foreground">({partner.rating.toFixed(1)}/5)</span>
                            </div>
                            <Button className="w-full mt-6">Partner with {partner.name}</Button>
                        </div>
                    </div>
                </div>
             </div>
        </div>
    );
}
