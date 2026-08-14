'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import data from "@/lib/placeholder-images.json";
import { Scale, Search, Clock, Hammer, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as gtag from '@/lib/gtag';
import { formatCurrency } from "@/lib/utils";

const { placeholderImages } = data;

const saAuctionMallImage = placeholderImages.find(p => p.id === 'sa-auction-mall');

// Placeholder for featured auction items
const featuredAuctions = [
    {
        id: 'auction-1',
        name: '2019 Scania R 560',
        image: placeholderImages.find(p => p.id === 'hero-home'),
        currentBid: 1200000,
        timeRemaining: '2d 4h',
    },
    {
        id: 'auction-2',
        name: 'Henred Fruehauf Tautliner Trailer',
        image: placeholderImages.find(p => p.id === 'mall-division'),
        currentBid: 350000,
        timeRemaining: '1d 8h',
    },
    {
        id: 'auction-3',
        name: 'CAT 320D Excavator',
        image: placeholderImages.find(p => p.id === 'equipment-1'),
        currentBid: 850000,
        timeRemaining: '5d 1h',
    },
     {
        id: 'auction-4',
        name: '2021 Freightliner Cascadia',
        image: placeholderImages.find(p => p.id === 'marketplace-division'),
        currentBid: 1500000,
        timeRemaining: '3d 2h',
    },
];

export default function SA_AuctionMallPage() {

    const handleAuctionClick = (auctionId: string) => {
        if (!process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID) return;
        gtag.event({
            action: 'view_auction_item',
            category: 'SA Auction Mall',
            label: auctionId,
            value: 0
        });
    };

    return (
        <div>
            <section className="relative w-full h-80 bg-card">
                {saAuctionMallImage && (
                    <Image
                        src={saAuctionMallImage.imageUrl}
                        alt="SA Auction Mall"
                        fill
                        className="object-cover"
                        priority
                        data-ai-hint={saAuctionMallImage.imageHint}
                    />
                )}
                <div className="absolute inset-0 bg-black/60" />
                <div className="relative h-full flex flex-col items-center justify-center text-center text-primary-foreground z-10 p-4">
                    <div className="mb-4">
                        <Image src="https://placehold.co/200x60/ffffff/14532d?text=SA+Auction+Group" alt="SA Auction Online Logo" width={200} height={60} />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold font-headline">SA Auction Mall</h1>
                    <p className="mt-4 text-lg md:text-xl max-w-3xl">Exclusive access to live vehicle, equipment, and asset auctions powered by SA Auction Group.</p>
                     <Button asChild size="lg" className="mt-8">
                        <a href="https://www.saauctiongroup.co.za" target="_blank" rel="noopener noreferrer">
                            Visit SA Auction Group <ArrowRight className="ml-2 h-4 w-4" />
                        </a>
                     </Button>
                </div>
            </section>
            
            <section id="search-auctions" className="py-16 md:py-24 bg-background">
                <div className="container mx-auto px-4">
                     <div className="max-w-4xl mx-auto">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Search className="h-6 w-6"/>
                                    Find an Auction
                                </CardTitle>
                                <CardDescription>Search for live and upcoming auctions for specific assets.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Input placeholder="Asset type, make, or model..." className="md:col-span-2" />
                                    <Select>
                                        <SelectTrigger>
                                            <SelectValue placeholder="All Categories" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="vehicles">Vehicles</SelectItem>
                                            <SelectItem value="equipment">Equipment</SelectItem>
                                            <SelectItem value="salvage">Salvage</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button className="w-full md:col-span-3">Search Auctions</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

             <section id="live-auctions" className="py-16 md:py-24 bg-card">
                <div className="container mx-auto px-4">
                     <div className="text-center max-w-3xl mx-auto mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold font-headline">Live Auctions</h2>
                        <p className="mt-4 text-lg text-muted-foreground">
                            Browse assets currently available for bidding.
                        </p>
                    </div>
                    {featuredAuctions.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                           {featuredAuctions.map((auction) => (
                                <Card key={auction.id} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col">
                                    {auction.image && (
                                        <div className="relative aspect-video">
                                            <Image src={auction.image.imageUrl} alt={auction.name} fill className="object-cover" data-ai-hint={auction.image.imageHint} />
                                            <div className="absolute bottom-2 right-2 bg-background/80 text-foreground text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {auction.timeRemaining} left
                                            </div>
                                        </div>
                                    )}
                                    <CardHeader>
                                        <CardTitle className="text-lg">{auction.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex-grow">
                                        <p className="text-sm text-muted-foreground">Current Bid</p>
                                        <p className="text-2xl font-bold text-primary">{formatCurrency(auction.currentBid)}</p>
                                    </CardContent>
                                    <CardFooter>
                                        <Button asChild className="w-full" onClick={() => handleAuctionClick(auction.id)}>
                                            <a href="https://www.saauctiongroup.co.za" target="_blank" rel="noopener noreferrer">
                                                <Hammer className="mr-2 h-4 w-4" />
                                                View & Bid
                                            </a>
                                        </Button>
                                    </CardFooter>
                                </Card>
                           ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 border-2 border-dashed rounded-lg">
                            <Clock className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-xl font-semibold">No Live Auctions Currently</h3>
                            <p className="mt-2 text-muted-foreground">Please check back soon for new auction listings from SA Auction Group.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
