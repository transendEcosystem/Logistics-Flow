
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function FinancialsGeneralSettings() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Settings className="h-6 w-6" />
                    General Financial Settings
                </CardTitle>
                <CardDescription>This section is under construction.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Manage platform-wide financial settings like currency, tax rates, and fiscal year start.</p>
            </CardContent>
        </Card>
    );
}
