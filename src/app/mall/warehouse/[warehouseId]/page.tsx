
'use client';

import data from "@/lib/placeholder-images.json";
import { Warehouse, CheckCircle, Star } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";

const { placeholderImages } = data;

const featuredFacilities = [
    { 
        id: "jhb-cold-storage",
        name: "JHB Cold Storage", 
        type: "Refrigerated & Frozen",
        location: "Johannesburg, GP",
        rating: 4.8,
        image: placeholderImages.find(p => p.id === 'tech-division'),
        about: "State-of-the-art cold storage facility with multi-temperature zones, perfect for perishable goods. Our facility is certified for food and pharmaceutical storage.",
        features: ["-18°C to +5°C Zones", "24/7 Security & Monitoring", "Inventory Management System", "Cross-Docking Bays"],
        capacity: "10,000 Pallet Positions",
    },
    { 
        id: "cpt-logistics-park",
        name: "CPT Logistics Park", 
        type: "Bulk & General Storage",
        location: "Cape Town, WC",
        rating: 4.7,
        image: placeholderImages.find(p => p.id === 'hero-home'),
        about: "A large-scale warehousing park located near major transport routes. We offer flexible space for bulk goods, container de-stuffing, and long-term storage.",
        features: ["Racked and Bulk Storage Areas", "Container Handling Services", "Flexible Lease Terms", "On-site Logistics Team"],
        capacity: "50,000 sqm Floor Space",
    },
]


export default function WarehousePage({ params }: { params: { warehouseId: string } }) {

    const facility = featuredFacilities.find(s => s.id === params.warehouseId);

    if (!facility) {
        notFound();
    }
    
    return (
        <div className="py-16 md:py-24 bg-background">
             <div className="container mx-auto px-4">
                <div className="max-w-6xl mx-auto border rounded-xl overflow-hidden shadow-2xl bg-background">
                    {/* Profile Header */}
                    <div className="relative h-48 md:h-64">
                            {facility.image && (
                            <Image
                                src={facility.image.imageUrl}
                                alt={facility.name}
                                fill
                                className="object-cover"
                                data-ai-hint={facility.image.imageHint}
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                        <div className="absolute bottom-0 left-0 p-6">
                            <div className="flex items-center gap-4">
                                <div className="bg-background p-3 rounded-lg shadow-md">
                                    <Warehouse className="h-10 w-10 text-primary" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-white font-headline">{facility.name}</h1>
                                    <p className="text-white/90">{facility.type} in {facility.location}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Profile Body */}
                    <div className="p-6 md:p-8 grid md:grid-cols-3 gap-8">
                        <div className="md:col-span-2">
                            <h2 className="text-xl font-semibold font-headline">About This Facility</h2>
                            <p className="mt-2 text-muted-foreground">
                                {facility.about}
                            </p>

                            <h3 className="mt-8 text-xl font-semibold font-headline">Key Features</h3>
                            <div className="mt-4 grid grid-cols-2 gap-4">
                                {facility.features.map(feat => (
                                    <div key={feat} className="flex items-center gap-2 p-3 bg-card rounded-md border">
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                        <span>{feat}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-card p-6 rounded-lg border">
                            <h3 className="text-xl font-semibold font-headline">Capacity</h3>
                            <p className="mt-2 text-muted-foreground">{facility.capacity}</p>
                            
                            <h3 className="mt-6 text-xl font-semibold font-headline">Community Rating</h3>
                            <div className="flex items-center gap-1 mt-2">
                                {[...Array(5)].map((_, i) => (
                                    <Star 
                                        key={i} 
                                        className={`h-5 w-5 ${i < Math.floor(facility.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-yellow-400/50'}`} 
                                    />
                                ))}
                                <span className="ml-2 text-sm text-muted-foreground">({facility.rating.toFixed(1)}/5)</span>
                            </div>
                            <Button className="w-full mt-6">Request Quote</Button>
                        </div>
                    </div>
                </div>
             </div>
        </div>
    );
}
