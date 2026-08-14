
'use client';

import data from "@/lib/placeholder-images.json";
import { Recycle, CheckCircle, Scale } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";

const { placeholderImages } = data;

const featuredItems = [
    { 
        id: "used-alternators-batch",
        name: "Used Alternators (Batch of 10)", 
        category: "Electrical Components",
        condition: "Refurbishable",
        image: placeholderImages.find(p => p.id === 'tech-division'),
        description: "Batch of 10 assorted used alternators from Scania and Volvo trucks. Ideal for parts harvesting or refurbishment projects. Sold as a single lot, as-is.",
        details: ["Mix of Bosch and other brands", "Untested, condition unknown", "For professional refurbishment only"],
        price: "Make an Offer",
    },
    { 
        id: "decommissioned-seats",
        name: "Decommissioned Truck Seats", 
        category: "Cabin Interior",
        condition: "For Upholstery/Parts",
        image: placeholderImages.find(p => p.id === 'product-truck-seat'),
        description: "Assortment of 5 driver and passenger seats from various truck models. Air suspension units may require service. Perfect for re-upholstery or salvaging mechanical parts.",
        details: ["Includes rails and bases", "Airbags (if equipped) are deployed or removed", "Sold as a complete lot"],
        price: "Make an Offer",
    },
]


export default function RepurposeItemPage({ params }: { params: { repurposeId: string } }) {

    const item = featuredItems.find(s => s.id === params.repurposeId);

    if (!item) {
        notFound();
    }
    
    return (
        <div className="py-16 md:py-24 bg-background">
             <div className="container mx-auto px-4">
                <div className="max-w-6xl mx-auto border rounded-xl overflow-hidden shadow-2xl bg-background">
                    {/* Header */}
                    <div className="relative h-48 md:h-64">
                            {item.image && (
                            <Image
                                src={item.image.imageUrl}
                                alt={item.name}
                                fill
                                className="object-cover"
                                data-ai-hint={item.image.imageHint}
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                        <div className="absolute bottom-0 left-0 p-6">
                            <div className="flex items-center gap-4">
                                <div className="bg-background p-3 rounded-lg shadow-md">
                                    <Recycle className="h-10 w-10 text-primary" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-white font-headline">{item.name}</h1>
                                    <p className="text-white/90">{item.category}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-6 md:p-8 grid md:grid-cols-3 gap-8">
                        <div className="md:col-span-2">
                            <h2 className="text-xl font-semibold font-headline">Item Description</h2>
                            <p className="mt-2 text-muted-foreground">
                                {item.description}
                            </p>

                            <h3 className="mt-8 text-xl font-semibold font-headline">Item Details</h3>
                            <div className="mt-4 flex flex-col gap-4">
                                {item.details.map(detail => (
                                    <div key={detail} className="flex items-center gap-2 p-3 bg-card rounded-md border">
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                        <span>{detail}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-card p-6 rounded-lg border">
                            <h3 className="text-xl font-semibold font-headline">Condition</h3>
                            <p className="mt-2 font-bold text-primary">{item.condition}</p>
                            
                            <h3 className="mt-6 text-xl font-semibold font-headline">Price</h3>
                            <div className="flex items-center gap-1 mt-2">
                               <p className="text-2xl font-bold">{item.price}</p>
                            </div>
                            <Button className="w-full mt-6">
                                <Scale className="mr-2 h-4 w-4" />
                                Make an Offer
                            </Button>
                        </div>
                    </div>
                </div>
             </div>
        </div>
    );
}
