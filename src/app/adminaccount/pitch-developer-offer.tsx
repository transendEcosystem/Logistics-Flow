
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Code2 } from "lucide-react";

export default function DeveloperOffer() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Code2 className="h-6 w-6" />
                    Developer Offer
                </CardTitle>
                <CardDescription>This section is under construction.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Details on API access, sandbox environments, and partnership opportunities for developers.</p>
            </CardContent>
        </Card>
    );
}
