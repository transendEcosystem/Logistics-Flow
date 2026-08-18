
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck } from "lucide-react";

export default function LogisticsContent() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Truck className="h-6 w-6" />
                    Logistics
                </CardTitle>
                <CardDescription>This section is under construction. Tools for coordinating shipments and transportation will be available here.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Plan and track inbound and outbound logistics, manage carriers, and optimize routes.</p>
            </CardContent>
        </Card>
    );
}
