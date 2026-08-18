
'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, getClientSideAuthToken } from '@/firebase';
import { doc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Wallet, AlertCircle, ShieldCheck, Zap, Heart, Gift, Truck, Landmark, Warehouse, ShoppingCart, Building2, Network } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useMemoFirebase } from '@/firebase';
import { formatCurrency } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const iconMap: Record<string, any> = {
    loyalty: Heart,
    rewards: Gift,
    actions: Zap,
    intelligence: ShieldCheck,
    loads_intelligence: Truck,
    warehouse_intelligence: Warehouse,
    buy_sell_intelligence: ShoppingCart,
    finance_intelligence: Landmark,
    distribution_intelligence: Network,
    transporter_intelligence: Truck,
    supplier_intelligence: Building2,
};

function CheckoutComponent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const planId = params.planId as string;
  const cycle = searchParams.get('cycle') || 'monthly';
  
  const isConnectPlan = ['loyalty', 'rewards', 'actions'].includes(planId);

  const membershipRef = useMemoFirebase(() => {
      if (!firestore || !planId) return null;
      return doc(firestore, 'memberships', planId);
  }, [firestore, planId]);

  const connectConfigRef = useMemoFirebase(() => {
      if (!firestore || !isConnectPlan) return null;
      return doc(firestore, 'configuration', 'connectPlans');
  }, [firestore, isConnectPlan]);

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData } = useDoc<{ companyId: string }>(userDocRef);
  const companyDocRef = useMemoFirebase(() => {
    if (!firestore || !userData?.companyId) return null;
    return doc(firestore, 'companies', userData.companyId);
  }, [firestore, userData]);

  const { data: companyData, isLoading: isCompanyLoading } = useDoc(companyDocRef);
  const { data: membershipPlan, isLoading: isMembershipLoading } = useDoc<any>(membershipRef);
  const { data: connectConfig, isLoading: isConnectLoading } = useDoc<any>(connectConfigRef);
  
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push(`/signin?redirect=/checkout/${planId}?cycle=${cycle}`);
    }
  }, [user, isUserLoading, router, planId, cycle]);
  
  const planDisplay = useMemo(() => {
    if (isConnectPlan && connectConfig) {
        const priceKey = `${planId}PlanPrice`;
        return {
            name: planId.charAt(0).toUpperCase() + planId.slice(1) + ' Plan',
            price: Number(connectConfig[priceKey]) || 50,
            description: `Optional ecosystem add-on for the ${planId} division.`,
            type: 'connect'
        };
    }
    
    if (membershipPlan) {
        const monthlyPrice = (typeof membershipPlan.price === 'number')
            ? membershipPlan.price
            : (membershipPlan.price?.monthly || 0);
            
        let type = membershipPlan.type;
        if (!type) {
            type = planId === 'intelligence' ? 'membership' : 'node';
        }

        if (cycle === 'annual') {
            const annualDiscount = Number(membershipPlan.annualDiscount) || 0;
            return {
                name: membershipPlan.name,
                price: monthlyPrice * 12 * (1 - (annualDiscount / 100)),
                description: membershipPlan.description,
                type: type
            };
        }
        return {
            name: membershipPlan.name,
            price: monthlyPrice,
            description: membershipPlan.description,
            type: type
        };
    }

    return null;
  }, [planId, isConnectPlan, connectConfig, membershipPlan, cycle]);

  const handlePurchase = async () => {
    if (!user || !planDisplay || !companyData || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'System not ready.' });
        return;
    }
    
    const balance = companyData.availableBalance || 0;
    if (balance < planDisplay.price) {
        toast({ variant: 'destructive', title: 'Insufficient Funds', description: 'Please top-up your wallet to complete this activation.' });
        return;
    }

    setIsProcessing(true);
    try {
        const token = await getClientSideAuthToken();
        if (!token) throw new Error("Authentication failed.");

        const payload = {
            companyId: companyData.id,
            amount: planDisplay.price,
            description: `Plan Activation: ${planDisplay.name} (${cycle})`,
            planType: planDisplay.type === 'earning' || planDisplay.type === 'node' ? 'node' : (planDisplay.type === 'connect' ? 'connect' : 'membership'), 
            planId: planId,
            cycle: cycle,
        };

        const response = await fetch('/api/payWithWallet', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Activation failed.');
        }

        toast({
            title: 'Activation Successful!',
            description: `Your ${planDisplay.name} is now active. Opening setup wizard...`,
        });
        
        router.push('/account?view=shop&subview=wizard');

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Process Failed', description: error.message });
    } finally {
        setIsProcessing(false);
    }
  };

  const isLoading = isUserLoading || isMembershipLoading || isConnectLoading || isCompanyLoading;
  const PlanIcon = iconMap[planId] || ShieldCheck;

  if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Preparing Secure Checkout...</p>
        </div>
      );
  }

  if (!planDisplay) {
    return (
        <div className="container mx-auto max-w-md py-20 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold">Node Metadata Missing</h2>
            <p className="text-muted-foreground mt-2 text-center">We couldn't retrieve the configuration for this industrial node.</p>
            <Button asChild className="mt-6" variant="outline"><Link href="/pricing">Return to Pricing</Link></Button>
        </div>
    );
  }

  const hasSufficientFunds = companyData && (companyData.availableBalance || 0) >= planDisplay.price;

  return (
    <div className="container mx-auto px-4 py-16 flex justify-center text-left text-foreground">
        <Card className="w-full max-w-xl shadow-2xl border-none overflow-hidden text-left bg-white">
            <CardHeader className="bg-slate-900 text-white p-10 text-left">
                <div className="flex items-center gap-6 text-left">
                    <div className="bg-primary/20 p-4 rounded-2xl shadow-inner">
                        <PlanIcon className="h-10 w-10 text-primary" />
                    </div>
                    <div className="text-left text-white">
                        <div className="flex items-center gap-2 mb-1 text-left text-white">
                            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-[0.2em] border-primary/50 text-primary px-3 h-5 text-left">
                                {planDisplay.type === 'earning' || planDisplay.type === 'node' ? 'Industrial Earning Node' : (planDisplay.type === 'foundation' || planDisplay.type === 'membership' ? 'Ecosystem Foundation' : 'Ecosystem Add-on')}
                            </Badge>
                        </div>
                        <CardTitle className="text-3xl font-black font-headline text-white text-left leading-tight">Activate Intelligence</CardTitle>
                    </div>
                </div>
            </CardHeader>
            
            <CardContent className="p-10 space-y-8 text-left text-foreground">
                <div className="space-y-4 text-left text-foreground">
                    <div className="flex justify-between items-baseline text-left">
                        <h3 className="text-2xl font-black text-left">{planDisplay.name}</h3>
                        <p className="text-3xl font-black text-primary text-left">{formatCurrency(planDisplay.price)}</p>
                    </div>
                    <p className="text-base text-muted-foreground leading-relaxed text-left">{planDisplay.description}</p>
                    <Badge variant="secondary" className="capitalize px-3 py-1 font-bold text-[10px] uppercase tracking-widest">{cycle} billing cycle</Badge>
                </div>

                <Separator />

                <div className="space-y-4 text-left">
                    <div className="flex justify-between items-center text-left">
                        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Account Available Balance</span>
                        <span className="font-mono font-bold text-lg">{formatCurrency(companyData?.availableBalance)}</span>
                    </div>
                    
                    {!hasSufficientFunds && (
                        <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-left">
                            <AlertCircle className="h-5 w-5" />
                            <AlertTitle className="font-bold text-left">Activation Blocked: Low Balance</AlertTitle>
                            <AlertDescription className="text-sm mt-1 text-left">
                                You require an additional **{formatCurrency(planDisplay.price - (companyData?.availableBalance || 0))}** in your wallet to activate this node.
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                <div className="bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-200 text-left text-foreground">
                    <h4 className="font-black text-xs uppercase tracking-widest text-primary mb-3 flex items-center gap-2 text-left">
                        <ShieldCheck className="h-4 w-4 fill-current"/>
                        Handshake Verification
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed text-left">
                        By confirming, you authorize a direct wallet debit. This activation is final and grants immediate access to the setup terminal for this node.
                    </p>
                </div>
            </CardContent>

            <CardFooter className="p-10 bg-muted/20 border-t flex flex-col gap-4 text-left">
                <Button 
                    onClick={handlePurchase} 
                    disabled={isProcessing || !hasSufficientFunds} 
                    className="w-full h-16 text-lg font-black uppercase tracking-tight shadow-2xl bg-primary hover:bg-primary/90 text-white"
                >
                    {isProcessing ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Zap className="mr-2 h-6 w-6" />}
                    {hasSufficientFunds ? `Confirm & Activate Node` : 'Insufficient Funds'}
                </Button>
                
                {!hasSufficientFunds ? (
                    <Button asChild variant="outline" className="w-full h-12 font-bold">
                        <Link href="/account?view=wallet">Go to Wallet & Top-up</Link>
                    </Button>
                ) : (
                    <Button variant="ghost" className="text-xs text-muted-foreground font-bold uppercase tracking-widest text-center" asChild>
                        <Link href="/pricing">Cancel and return to plans</Link>
                    </Button>
                )}
            </CardFooter>
        </Card>
    </div>
  );
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}>
            <CheckoutComponent />
        </Suspense>
    );
}
