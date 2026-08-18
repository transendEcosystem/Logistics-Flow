
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building } from "lucide-react";

export default function SuppliersContent() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Building className="h-6 w-6" />
                    Suppliers
                </CardTitle>
                <CardDescription>This section is under construction. Tools for managing your suppliers will be available here.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Maintain a directory of your suppliers, track performance, and manage contracts.</p>
            </CardContent>
        </Card>
    );
}
