'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function LoadCalculator() {
    const [distance, setDistance] = useState<number | string>('');
    const [rate, setRate] = useState<number | string>('');

    const totalValue = useMemo(() => {
        const numDistance = Number(distance);
        const numRate = Number(rate);
        if (!isNaN(numDistance) && !isNaN(numRate) && numDistance > 0 && numRate > 0) {
            return numDistance * numRate;
        }
        return 0;
    }, [distance, rate]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calculator className="h-6 w-6"/>Load Value Calculator</CardTitle>
                <CardDescription>Calculate the total value of a load based on distance and rate per kilometer.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="distance">Distance (km)</Label>
                        <Input
                            id="distance"
                            type="number"
                            placeholder="e.g., 550"
                            value={distance}
                            onChange={(e) => setDistance(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="rate">Rate per km (R)</Label>
                        <Input
                            id="rate"
                            type="number"
                            placeholder="e.g., 25.50"
                            value={rate}
                            onChange={(e) => setRate(e.target.value)}
                        />
                    </div>
                </div>
                <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">Total Load Value</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(totalValue)}</p>
                </div>
            </CardContent>
        </Card>
    );
}
