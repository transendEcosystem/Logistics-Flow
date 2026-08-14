'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Mail } from 'lucide-react';

export default function DeveloperEmails() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Developer Email Sequence
                </CardTitle>
                <CardDescription>
                    Email templates for engaging with developer partners. This content is under construction.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Templates for API documentation access, sandbox invitations, and partnership opportunities will be available here.</p>
            </CardContent>
        </Card>
    )
}
