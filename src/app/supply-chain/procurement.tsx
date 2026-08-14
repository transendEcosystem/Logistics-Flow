
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";

export default function ProcurementContent() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-6 w-6" />
                    Procurement
                </CardTitle>
                <CardDescription>This section is under construction. Tools for purchasing and order management will be available here.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Create purchase orders, manage approvals, and track order status with your suppliers.</p>
            </CardContent>
        </Card>
    );
}
