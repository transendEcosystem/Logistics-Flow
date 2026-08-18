
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail } from 'lucide-react';

export default function DriverEmails() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Driver Recruitment Sequence
                </CardTitle>
                <CardDescription>
                    Email and messaging templates for engaging with professional drivers.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Templates for initial talent outreach, membership invitations for the jobs board, and verification reminders will be available here.</p>
            </CardContent>
        </Card>
    )
}
