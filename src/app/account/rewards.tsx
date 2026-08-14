
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift, Loader2, Star, AlertTriangle } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import Image from 'next/image';
import { formatNumber } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function RewardsContent() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const rewardsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'rewards'), where('isActive', '==', true));
    }, [firestore]);

    const { data: rewards, isLoading: areRewardsLoading, error } = useCollection(rewardsQuery);

    const userPoints = user?.companyData?.rewardPoints || 0;

    const handleRedeem = (reward: any) => {
        toast({
            title: "Coming Soon!",
            description: `Redemption for "${reward.title}" is not yet implemented.`,
        });
    };

    const isLoading = isUserLoading || areRewardsLoading;

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-2xl"><Gift /> Rewards Store</CardTitle>
                            <CardDescription>Redeem your hard-earned points for valuable rewards.</CardDescription>
                        </div>
                        <div className="text-right">
                             <p className="text-sm text-muted-foreground">Your Balance</p>
                             <p className="text-2xl font-bold text-primary flex items-center gap-1 justify-end">
                                <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                                {isLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : formatNumber(userPoints)}
                            </p>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {isLoading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            ) : error ? (
                 <Card className="bg-destructive/10 border-destructive">
                    <CardHeader className="flex-row items-center gap-4">
                        <AlertTriangle className="h-8 w-8 text-destructive" />
                        <div>
                            <CardTitle className="text-destructive">Error Loading Rewards</CardTitle>
                            <CardDescription className="text-destructive/80">{error.message}</CardDescription>
                        </div>
                    </CardHeader>
                </Card>
            ) : rewards && rewards.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rewards.map((reward) => {
                        const canAfford = userPoints >= reward.pointsCost;
                        return (
                             <Card key={reward.id} className="flex flex-col">
                                <CardHeader>
                                    <div className="relative aspect-video w-full bg-muted rounded-md overflow-hidden">
                                        {reward.imageUrl ? (
                                            <Image src={reward.imageUrl} alt={reward.title} fill className="object-cover" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full">
                                                <Gift className="h-12 w-12 text-muted-foreground/50"/>
                                            </div>
                                        )}
                                    </div>
                                    <CardTitle className="pt-4">{reward.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <p className="text-sm text-muted-foreground">{reward.description}</p>
                                </CardContent>
                                <CardFooter className="flex-col items-stretch gap-2">
                                     <div className="text-lg font-bold text-primary flex items-center justify-center gap-1">
                                        <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                                        {formatNumber(reward.pointsCost)} Points
                                    </div>
                                    <Button onClick={() => handleRedeem(reward)} disabled={!canAfford}>
                                        {canAfford ? 'Redeem Now' : 'Not Enough Points'}
                                    </Button>
                                </CardFooter>
                            </Card>
                        )
                    })}
                </div>
            ) : (
                <div className="text-center py-20 border-2 border-dashed rounded-lg">
                    <Gift className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-xl font-semibold">No Rewards Available</h3>
                    <p className="mt-2 text-muted-foreground">The rewards store is currently empty. Please check back soon!</p>
                </div>
            )}
        </div>
    )
}

