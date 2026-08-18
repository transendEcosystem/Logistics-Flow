
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "lucide-react";

export default function InventoryContent() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Package className="h-6 w-6" />
                    Inventory Management
                </CardTitle>
                <CardDescription>This section is under construction. Tools for managing inventory levels will be available here.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Track stock levels, set reorder points, and manage inventory across multiple locations.</p>
            </CardContent>
        </Card>
    );
}
