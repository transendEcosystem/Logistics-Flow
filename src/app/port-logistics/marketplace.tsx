'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";

export default function MarketplaceContent() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-6 w-6" />
                    Real-time Marketplace
                </CardTitle>
                <CardDescription>This section is under construction. A real-time marketplace with upfront pricing and instant booking will be available here.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Eliminate negotiation delays and secure loads instantly.</p>
            </CardContent>
        </Card>
    );
}
