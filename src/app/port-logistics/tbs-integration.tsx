'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck } from "lucide-react";

export default function TbsIntegrationContent() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CalendarCheck className="h-6 w-6" />
                    Transnet TBS Integration
                </CardTitle>
                <CardDescription>This section is under construction. Tools for integrating with the Transnet Truck Booking System will be available here.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Direct API synchronization for real-time slot availability and one-click bookings.</p>
            </CardContent>
        </Card>
    );
}
