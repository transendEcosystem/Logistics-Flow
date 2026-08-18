'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function WorkflowContent() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-6 w-6" />
                    Digital Workflow
                </CardTitle>
                <CardDescription>This section is under construction. Tools for managing digital Bill of Lading (BOL) and Proof of Delivery (POD) will be available here.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Eliminate paperwork and streamline your documentation process.</p>
            </CardContent>
        </Card>
    );
}
