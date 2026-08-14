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
                <CardDescription>This content is under construction. Details on API access, sandbox environments, and partnership opportunities for developers will be available here.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Our developer program will provide the tools and support needed to build innovative solutions on the Logistics Flow platform.</p>
            </CardContent>
        </Card>
    );
}
