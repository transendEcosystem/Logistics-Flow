'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default function CommunicationsContent() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-6 w-6" />
                    Agent Chats
                </CardTitle>
                <CardDescription>This section is under construction. A log of conversations between ISA agents and their leads will be available here.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">This feature is coming soon.</p>
            </CardContent>
        </Card>
    );
}
