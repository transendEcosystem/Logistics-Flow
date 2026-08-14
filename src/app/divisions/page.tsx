
'use client';

import { divisions } from "@/lib/data";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Cpu, DollarSign, ShoppingBasket, Store } from "lucide-react";
import * as React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const iconComponents: { [key: string]: React.ElementType } = {
    DollarSign,
    ShoppingBasket,
    Store,
    Cpu,
};

export default function DivisionsPage() {
  return (
    <div className="bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto mb-12">
            <h1 className="text-4xl md:text-5xl font-bold font-headline">The Logistics Flow Ecosystem</h1>
            <p className="mt-4 text-lg md:text-xl text-muted-foreground">
                Four interconnected divisions working together to power your business. Explore a division to see its dashboard.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {divisions.map((division) => {
                const IconComponent = iconComponents[division.icon];
                const href = ['marketplace', 'tech', 'funding', 'mall'].includes(division.id) ? `/${division.id}` : `/divisions#${division.id}`;
                return (
                    <Card key={division.id} className="group relative flex flex-col shadow-lg hover:shadow-primary/20 transition-shadow h-full hover:border-primary">
                        <CardHeader className="flex-row items-start gap-4">
                            {IconComponent && <IconComponent className="h-10 w-10 text-primary" />}
                            <div className="flex-1">
                                <CardTitle>{division.title}</CardTitle>
                                <CardDescription className="mt-1">{division.description}</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-grow">
                             {/* Can be used for more details in the future */}
                        </CardContent>
                        <CardFooter className="flex justify-between items-center pt-4">
                           <Link href={`/faq#${division.id}`} className="text-sm font-semibold text-primary hover:underline z-20 relative">
                                FAQ
                            </Link>
                            <div className="text-sm font-semibold text-primary flex items-center gap-1">
                                Read More <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </div>
                        </CardFooter>
                        <Link href={href} className="absolute inset-0 z-10" aria-label={`View ${division.title}`} />
                    </Card>
                )
            })}
        </div>
      </div>
    </div>
  );
}
