'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrainCircuit } from "lucide-react";

export default function AiMatchingContent() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BrainCircuit className="h-6 w-6" />
                    AI Matching
                </CardTitle>
                <CardDescription>This section is under construction. AI-powered truck and container matching will be available here.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Connect the right truck to the right container based on proximity, capacity, and other criteria.</p>
            </CardContent>
        </Card>
    );
}
