'use client';

import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Award, Gem, Loader2, Percent, Star, UserCheck, TrendingUp, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useConfig } from '@/hooks/use-config';
import { getClientSideAuthToken } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface Company {
    id: string;
    companyName?: string;
    membershipId?: string;
    rewardPoints?: number;
    loyaltyTier?: 'bronze' | 'silver' | 'gold';
    ownerId: string;
    firstName?: string;
    lastName?: string;
    email?: string;
}

const tierColors: { [key: string]: string } = {
    bronze: 'bg-orange-200 text-orange-800',
    silver: 'bg-slate-200 text-slate-800',
    gold: 'bg-yellow-200 text-yellow-800',
};

async function fetchFromAdminAPI(token: string, action: string, payload?: any) {
    const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || `API Error: ${action}`);
    return result.data;
}

export default function MemberLoyaltyStatus() {
    const { toast } = useToast();
    const [companies, setCompanies] = useState<Company[]>([]);
    const { data: loyaltySettings, isLoading: isSettingsLoading } = useConfig<any>('loyaltySettings');
    const [isLoadingData, setIsLoadingData] = useState(true);

    const loadData = useCallback(async () => {
        setIsLoadingData(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;
            const companyData = await fetchFromAdminAPI(token, 'getMembers', {});
            setCompanies(companyData);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoadingData(false);
        }
    }, [toast]);
    
    useEffect(() => { loadData(); }, [loadData]);

    const enrichedMembers = useMemo(() => {
        if (!companies || !loyaltySettings) return [];
        return companies.map((company: Company) => {
            const tier = company.loyaltyTier || 'bronze';
            const currentPoints = company.rewardPoints || 0;
            const nextTier = tier === 'bronze' ? 'silver' : 'gold';
            const nextTierPoints = loyaltySettings[`${nextTier}Points`];
            const progress = tier === 'gold' ? 100 : nextTierPoints > 0 ? (currentPoints / nextTierPoints) * 100 : 0;
            
            return {
                ...company,
                loyaltyTier: tier,
                rewardPoints: currentPoints,
                progressToNext: progress,
                nextTierName: tier !== 'gold' ? nextTier : null,
            };
        }).sort((a,b) => b.rewardPoints - a.rewardPoints);
    }, [companies, loyaltySettings]);
    
    const isLoading = isLoadingData || isSettingsLoading;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Award className="text-primary"/> Member Engagement & Loyalty</CardTitle>
                <CardDescription>Monitoring member points and progression through the value tiers.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center items-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
                ) : (
                    <div className="border rounded-lg overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Member</TableHead>
                                    <TableHead>Current Tier</TableHead>
                                    <TableHead>Total Points</TableHead>
                                    <TableHead>Tier Progress</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                               {enrichedMembers.length > 0 ? enrichedMembers.map(member => (
                                <TableRow key={member.id}>
                                    <TableCell>
                                        <p className="font-semibold">{member.companyName}</p>
                                        <p className="text-xs text-muted-foreground">{member.firstName} {member.lastName}</p>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={cn("capitalize border-none", tierColors[member.loyaltyTier || 'bronze'])}>{member.loyaltyTier}</Badge>
                                    </TableCell>
                                    <TableCell className="font-mono font-bold text-primary">{member.rewardPoints.toLocaleString()}</TableCell>
                                    <TableCell className="min-w-[150px]">
                                        {member.nextTierName ? (
                                            <div className="space-y-1">
                                                <Progress value={member.progressToNext} className="h-1.5" />
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold">To {member.nextTierName}</p>
                                            </div>
                                        ) : (
                                            <Badge variant="outline" className="text-[10px] border-amber-200 bg-amber-50 text-amber-700 uppercase font-black">Gold (Max Tier)</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button asChild variant="ghost" size="sm">
                                            <Link href={`/backend?view=wallet&memberId=${member.id}`}><Zap className="mr-2 h-3.5 w-3.5"/>Manage</Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                               )) : (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">No member data found.</TableCell></TableRow>
                               )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
