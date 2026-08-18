'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/firebase';
import { ArrowRight, Zap, Loader2, Check, TrendingUp, Handshake, Info } from 'lucide-react';
import Link from 'next/link';
import { useConfig } from '@/hooks/use-config';
import { formatCurrency } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function ActionsPlanPage() {
    const { user } = useUser();
    const { data: pricing, isLoading } = useConfig<{ actionsPlanPrice: number }>('connectPlans');
    
    const price = pricing?.actionsPlanPrice || 50;

    return (
        <div className="bg-background min-h-full">
            <div className="max-w-4xl mx-auto space-y-12">
                <div className="text-center space-y-4">
                    <Badge className="bg-primary/10 text-primary border-primary/20 font-bold uppercase tracking-widest">Connect Division</Badge>
                    <h1 className="text-4xl md:text-5xl font-black font-headline tracking-tight">The Actions Plan</h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Monetize your network. Earn recurring revenue by introducing others to the ecosystem.
                    </p>
                </div>

                <Card className="border-primary border-2 shadow-2xl relative overflow-hidden text-left">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                        <Zap className="h-32 w-32" />
                    </div>
                    
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                            <Zap className="h-10 w-10 text-primary" />
                        </div>
                        <CardTitle className="text-3xl font-bold">Network Monetization</CardTitle>
                        <CardDescription className="mt-2 text-base">Build a passive revenue stream through referrals.</CardDescription>
                        <div className="py-8">
                            <div className="flex items-baseline justify-center gap-1">
                                <span className="text-6xl font-black tracking-tight">{formatCurrency(price)}</span>
                                <span className="text-muted-foreground font-medium">/month</span>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="max-w-md mx-auto">
                        <ul className="space-y-4 mb-8">
                            {[
                                "Earn on Every Successful Referral",
                                "Recurring Membership Commissions",
                                "Transactional Revenue Share",
                                "Personal Referral Dashboard",
                                "Priority ISA Pathway Access",
                                "Automated Payouts to Wallet"
                            ].map((feature, i) => (
                                <li key={i} className="flex items-start">
                                    <Check className="h-5 w-5 text-green-500 mr-3 shrink-0 mt-0.5" />
                                    <span className="font-medium text-muted-foreground">{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>

                    <CardFooter className="bg-muted/30 border-t p-8 flex justify-center">
                        <Button asChild size="lg" className="h-14 px-12 text-lg font-bold w-full max-w-sm shadow-lg">
                            <Link href={`/checkout/actions`}>
                                Activate Actions Plan <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>

                <div className="grid md:grid-cols-2 gap-8 text-left">
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <TrendingUp className="h-6 w-6 text-primary" />
                            Annuity Income Model
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">
                            The Actions Plan isn't just about one-time bonuses. You earn a percentage of the monthly fees of every member you bring in, for as long as they stay active. It's a true annuity for your business.
                        </p>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Handshake className="h-6 w-6 text-primary" />
                            Shared Transactional Success
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">
                            When your network transacts—whether they are buying parts or financing vehicles—you share in the platform commission. Your network becomes your most valuable digital asset.
                        </p>
                    </div>
                </div>
                
                <Alert className="bg-primary/5 border-primary/20 p-6 text-left">
                    <Info className="h-6 w-6 text-primary" />
                    <AlertTitle className="text-lg font-bold ml-2">Strategic Insight</AlertTitle>
                    <AlertDescription className="mt-2 text-muted-foreground ml-2">
                        You can track your referrals and estimated earnings in the **My Network** section of your sidebar once the plan is active.
                    </AlertDescription>
                </Alert>
            </div>
        </div>
    );
}