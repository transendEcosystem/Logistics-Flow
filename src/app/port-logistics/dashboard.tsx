'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, Ship } from "lucide-react";

export default function DashboardContent() {
    return (
        <div className="space-y-8">
            <CardHeader className="px-0">
                <CardTitle className="flex items-center gap-2">
                    <LayoutDashboard className="h-6 w-6" />
                    Dashboard
                </CardTitle>
                <CardDescription>A high-level overview of port logistics operations and key metrics.</CardDescription>
            </CardHeader>

             <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <Ship className="h-6 w-6 text-primary" />
                        What is the Port Logistics Portal?
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        This portal is designed to digitize and streamline the flow of information between transporters, clearing agents, and port terminals. By integrating with systems like Navis N4 and the Transnet Truck Booking System (TBS), we provide tools for real-time container tracking, optimized gate-in procedures, and an efficient marketplace to reduce turnaround times and operational friction.
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Key Metrics</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-48 bg-muted/50 rounded-lg">
                    <p className="text-muted-foreground">Dashboard KPIs will be displayed here.</p>
                </CardContent>
            </Card>
        </div>
    );
}
