'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

export default function GateOptimizationContent() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-6 w-6" />
                    Gate-In Optimization
                </CardTitle>
                <CardDescription>This section is under construction. Tools for digital gate passes and pre-gate validation will be available here.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Reduce terminal turnaround times (TAT) and eliminate manual paperwork with digital gate-in processes.</p>
            </CardContent>
        </Card>
    );
}
