
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Loader2, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getClientSideAuthToken } from '@/firebase';
import BillingRun from './billing-run';

interface LoyaltyResult {
    promotions: number;
    checked: number;
}

function LoyaltyTierUpdate() {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<LoyaltyResult | null>(null);
    const { toast } = useToast();

    const handleRunUpdate = async () => {
        setIsLoading(true);
        setResult(null);

        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication token not found.");
            
            const response = await fetch('/api/run-loyalty-update', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to run loyalty update.');
            
            setResult(data);
            toast({
                title: 'Loyalty Update Complete',
                description: data.message,
            });

        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: error.message,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Member Loyalty Tier Update</CardTitle>
                <CardDescription>Manually trigger the process to update member loyalty tiers based on their current reward points.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={handleRunUpdate} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Star className="mr-2 h-4 w-4" />}
                    Update Loyalty Tiers
                </Button>
            </CardContent>
            {result && (
                <CardFooter className="flex-col items-start gap-4 text-sm">
                    <h3 className="font-semibold text-base">Update Summary</h3>
                    <div className="p-4 bg-muted/50 rounded-lg w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="font-medium">Members Checked</p>
                            <p className="text-xl font-bold">{result.checked}</p>
                        </div>
                        <div>
                            <p className="font-medium text-green-600">Members Promoted</p>
                            <p className="text-xl font-bold text-green-600">{result.promotions}</p>
                        </div>
                    </div>
                </CardFooter>
            )}
        </Card>
    );
}

export default function PlatformTasksContent() {
     return (
        <div className="space-y-8">
             <div>
                <h1 className="text-2xl font-bold">Platform Tasks</h1>
                <p className="mt-2 text-muted-foreground">Run manual background jobs and scheduled processes.</p>
            </div>
            <BillingRun />
            <LoyaltyTierUpdate />
        </div>
    )
}
