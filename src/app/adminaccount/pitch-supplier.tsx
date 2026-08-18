'use client';

import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, PlusCircle, MessageSquare } from "lucide-react";
import Link from "next/link";

const supplierCategories = [
    "Accessories", 
    "Air",
    "Anti-Theft Devices", 
    "Auto Electrical", 
    "Batteries", 
    "Brakes", 
    "Cleaning Products",
    "Diesel", 
    "Differential",
    "Engine Refurbish",
    "Filters", 
    "Injectors", 
    "Lights", 
    "Mechanical repairs",
    "Oils & Lubricants", 
    "Parts", 
    "Prop Shafts",
    "Second Hand Trailers",
    "Second Hand Trucks",
    "Transport", 
    "Tarpaulins", 
    "Tow in", 
    "Trailer repairs", 
    "Truck Accessories", 
    "Truck Parts", 
    "Truck repairs", 
    "Turbo", 
    "Tyres"
];

const PitchComponent = ({ category }: { category: string }) => {
    return (
        <div className="text-center py-10 space-y-4">
            <h2 className="text-2xl font-bold font-headline">Engage with {category} Suppliers</h2>
            <p className="max-w-xl mx-auto text-muted-foreground">
                Pitch the value of a digital storefront and collective buying power to suppliers in the <strong>{category}</strong> sector.
            </p>
            <div className="pt-6 flex justify-center gap-4">
                 <Button asChild>
                    <Link href={`/adminaccount?view=marketing-suppliers&subview=management&action=add-member&newRole=Supplier&newNotes=Category:%20${category}`}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add New Supplier
                    </Link>
                </Button>
                <Button asChild variant="outline">
                    <Link href={`/adminaccount?view=marketing-suppliers&subview=emails&type=${encodeURIComponent(category)}`}>
                        <MessageSquare className="mr-2 h-4 w-4 text-primary" />
                        View Pitch Emails <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </div>
        </div>
    );
};


export default function SupplierPitch() {
    return (
        <Card className="shadow-none border-none">
            <Tabs defaultValue="Accessories" className="w-full">
                <CardHeader className="px-0 pt-0">
                    <CardTitle>Supplier Pitch Library</CardTitle>
                    <CardDescription>Select a category to access tailored pitch notes and engagement tools.</CardDescription>
                </CardHeader>
                <CardContent className="px-0">
                    <TabsList className="h-auto flex-wrap justify-start bg-muted/30 mb-6">
                        {supplierCategories.map(category => (
                            <TabsTrigger key={category} value={category} className="text-xs">{category}</TabsTrigger>
                        ))}
                    </TabsList>

                    {supplierCategories.map(category => (
                        <TabsContent key={category} value={category}>
                            <PitchComponent category={category} />
                        </TabsContent>
                    ))}
                </CardContent>
            </Tabs>
        </Card>
    );
}
