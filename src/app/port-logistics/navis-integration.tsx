'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Landmark } from "lucide-react";

export default function NavisIntegrationContent() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Landmark className="h-6 w-6" />
                    Navis N4 Connectivity
                </CardTitle>
                <CardDescription>This section is under construction. Tools for Navis N4 integration will be available here.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Automate container validation and receive real-time status updates from the terminal operating system.</p>
            </CardContent>
        </Card>
    );
}
