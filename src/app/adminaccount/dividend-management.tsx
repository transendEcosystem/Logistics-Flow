'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getClientSideAuthToken, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Loader2, Gift, Save, ShieldCheck, Zap, Award } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import featuresData from '@/lib/features.json';
import { cn } from '@/lib/utils';

const { featureSections } = featuresData;

export default function DividendManagement() {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [isSaving, setIsSaving] = useState(false);

    const configRef = useMemoFirebase(() => firestore ? doc(firestore, 'configuration', 'dividendTiers') : null, [firestore]);
    const { data: tiersConfig, isLoading, forceRefresh } = useDoc<any>(configRef);

    const [selections, setSelections] = useState<Record<string, string[]>>({
        bronze: [],
        silver: [],
        gold: [],
    });

    useEffect(() => {
        if (tiersConfig) {
            setSelections({
                bronze: tiersConfig.bronze || [],
                silver: tiersConfig.silver || [],
                gold: tiersConfig.gold || [],
            });
        }
    }, [tiersConfig]);

    const loyaltyFeatures = useMemo(() => {
        const section = featureSections.find(s => s.name === "Loyalty & Information Dividend");
        return section ? section.features : [];
    }, []);

    const handleToggle = (tier: string, featureKey: string, checked: boolean) => {
        setSelections(prev => {
            const current = prev[tier] || [];
            const updated = checked 
                ? [...current, featureKey]
                : current.filter(k => k !== featureKey);
            return { ...prev, [tier]: updated };
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Auth failed");

            const response = await fetch('/api/updateConfigDoc', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    path: 'configuration/dividendTiers', 
                    data: { ...selections, updatedAt: { _methodName: 'serverTimestamp' } } 
                }),
            });

            if (!response.ok) throw new Error("Save failed");
            toast({ title: "Dividend Tiers Updated", description: "The About page will now reflect these specific rewards." });
            forceRefresh();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error", description: e.message });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="space-y-8 text-left">
            <CardHeader className="px-0">
                <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-xl">
                        <Gift className="h-8 w-8 text-primary"/>
                    </div>
                    <div className="text-left">
                        <CardTitle className="text-2xl font-black font-headline">The Information Dividend: Reward Matrix</CardTitle>
                        <CardDescription>Configure which loyalty benefits are visible on the Bronze, Silver, and Gold cards on the About page.</CardDescription>
                    </div>
                </div>
            </CardHeader>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {['bronze', 'silver', 'gold'].map((tier) => (
                    <Card key={tier} className={cn("border-2 text-left", tier === 'gold' ? 'border-primary' : 'border-slate-100')}>
                        <CardHeader className="bg-muted/50 p-6 border-b">
                            <CardTitle className="capitalize flex items-center gap-2">
                                <Award className={cn("h-5 w-5", tier === 'gold' ? 'text-yellow-500' : tier === 'silver' ? 'text-slate-400' : 'text-orange-600')} />
                                {tier} Rewards
                            </CardTitle>
                            <CardDescription>Select benefits for this tier.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            {loyaltyFeatures.map((feature) => (
                                <div key={feature.key} className="flex items-start gap-3 p-2 hover:bg-muted/30 rounded-md cursor-pointer transition-colors">
                                    <Checkbox 
                                        id={`${tier}-${feature.key}`} 
                                        checked={selections[tier]?.includes(feature.key)}
                                        onCheckedChange={(checked) => handleToggle(tier, feature.key, !!checked)}
                                    />
                                    <Label htmlFor={`${tier}-${feature.key}`} className="text-xs font-bold leading-tight cursor-pointer uppercase tracking-tight">
                                        {feature.name}
                                    </Label>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="flex justify-end pt-8 border-t">
                <Button onClick={handleSave} disabled={isSaving} size="lg" className="h-14 px-12 font-black uppercase tracking-widest shadow-xl">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                    Publish Rewards Matrix
                </Button>
            </div>
        </div>
    );
}
