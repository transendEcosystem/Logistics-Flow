
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function AnalyticsContent() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-6 w-6" />
                    Analytics
                </CardTitle>
                <CardDescription>This section is under construction. Advanced analytics and reporting tools will be available here.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Platform-wide analytics will be displayed here.</p>
            </CardContent>
        </Card>
    );
}
