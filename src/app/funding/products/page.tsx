'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Landmark, ArrowRight, Truck, Briefcase, FileText, Repeat, Calculator, Save, Mail, Globe, Zap, Info } from "lucide-react";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import * as React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { useUser, getClientSideAuthToken } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const productsData = {
    loans: {
        title: "Loan Products",
        icon: Landmark,
        items: [
            { id: "loan-pv-term", title: "Loan (PV) – term", description: "A present value loan repaid over a fixed term with regular installments." },
            { id: "loan-pv-interest-only", title: "Loan (PV) - interest only", description: "Pay only the interest for a set period before principal payments begin." },
            { id: "loan-pv-single-payment", title: "Loan (PV) - single payment", description: "A lump-sum loan that is repaid in a single future payment." },
            { id: "loan-fl-term-daily", title: "Loan (FL) – term daily", description: "Future-value loan with daily repayments, suitable for businesses with consistent daily income." },
            { id: "loan-fl-term-weekly", title: "Loan (FL) term weekly", description: "Future-value loan structured with weekly repayments to match business cash flow cycles." },
            { id: "loan-fl-term-bi-monthly", title: "Loan (FL) term bi-monthly", description: "Future-value loan with repayments made twice a month." },
            { id: "loan-fl-term-monthly", title: "Loan (FL) term monthly", description: "A standard future-value loan with monthly repayments over a set term." },
            { id: "loan-revolving-credit", title: "Loan Revolving credit", description: "A flexible credit line that you can draw from, repay, and draw from again." },
        ]
    },
    'installment-sale': {
        title: "Installment Sale Products",
        icon: FileText,
        items: [
            { id: "installment-sale-term", title: "Term Agreement", description: "Finance an asset over a fixed period with regular, equal installments. Ownership transfers after the final payment." },
            { id: "installment-sale-balloon", title: "Balloon Payment", description: "Lower your monthly installments by deferring a larger, lump-sum payment to the end of the agreement term." }
        ]
    },
    rental: {
        title: "Rental / Lease Products",
        icon: Repeat,
        items: [
             { id: "rental-term", title: "Term Agreement", description: "Rent an asset for a fixed period with predictable payments. Provides access to assets without the commitment of ownership." },
             { id: "rental-balloon", title: "Balloon (Residual) Agreement", description: "Structure a lease with lower monthly payments and a final residual value payment, offering flexibility at the end of the term." }
        ]
    },
    discounting: {
        title: "Discounting Products",
        icon: Briefcase,
        items: [
            { id: "disclosed-confirmed-factoring", title: "Disclosed confirmed factoring 75% advance", description: "Factoring with notification to the debtor, who confirms payment directly to the factor." },
            { id: "disclosed-unconfirmed-factoring", name: "Disclosed un-confirmed factoring 0% advance", description: "Factoring where the debtor is notified, but doesn't confirm payment directly to the factor." },
            { id: "invoice-discounting", title: "Invoice discounting 100% advance", description: "A confidential facility where you maintain control of your sales ledger and collections." },
            { id: "rights-discounting", title: "Rights discounting", description: "Unlock the value of your contractual rights to future income streams." }
        ]
    }
};

function QuoteCalculator({ product, onOpenChange }: { product: { id: string; title: string }, onOpenChange: (open: boolean) => void }) {
    const { user } = useUser();
    const router = useRouter();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [amount, setAmount] = useState(500000);
    const [rate, setRate] = useState(15);
    const [term, setTerm] = useState(60);
    const [balloonPercent, setBalloonPercent] = useState(0);
    const [monthlyPayment, setMonthlyPayment] = useState(0);
    const [totalRepayment, setTotalRepayment] = useState(0);
    const [view, setView] = useState<'calculator' | 'conversion'>('calculator');
    
    const isBalloonProduct = product.id.includes('balloon');

    useEffect(() => {
        const monthlyRate = rate / 100 / 12;
        const n = term;
        
        if (monthlyRate > 0) {
            const pv = amount;
            const balloonAmount = isBalloonProduct ? pv * (balloonPercent / 100) : 0;
            const pvOfBalloon = balloonAmount / Math.pow(1 + monthlyRate, n);
            const principalToAmortize = pv - pvOfBalloon;
            const amortizationFactor = (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
            const payment = principalToAmortize * amortizationFactor;

            setMonthlyPayment(payment);
            setTotalRepayment(payment * n + balloonAmount);
        } else {
            const balloonAmount = isBalloonProduct ? amount * (balloonPercent / 100) : 0;
            const payment = term > 0 ? (amount - balloonAmount) / term : 0;
            setMonthlyPayment(payment);
            setTotalRepayment(amount);
        }
    }, [amount, rate, term, balloonPercent, isBalloonProduct]);

    const handleSaveQuote = async () => {
        if (!user) {
            router.push(`/signin?redirect=/funding/products?agreement=${product.id.split('-')[0]}`);
            return;
        }
        setIsSaving(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");

            const quoteData = {
                applicantId: user.uid,
                fundingType: product.id,
                amountRequested: amount,
                details: { rate, term, balloonPercent: isBalloonProduct ? balloonPercent : undefined, monthlyPayment, totalRepayment },
                createdAt: { _methodName: 'serverTimestamp' },
            };

            await fetch('/api/createQuote', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: quoteData }),
            });
            
            toast({ title: 'Quote Saved!' });
            setView('conversion');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleRoute = (origination: 'direct' | 'market') => {
        onOpenChange(false);
        router.push(`/funding/apply?type=${product.id}&amount=${amount}&origination=${origination}`);
    };

    if (view === 'conversion') {
        return (
             <DialogContent className="sm:max-w-2xl text-left text-foreground">
                <DialogHeader className="p-4 border-b bg-green-50 rounded-t-lg">
                    <DialogTitle className="flex items-center gap-2 font-black text-green-700 text-left">
                        <CheckCircle className="h-6 w-6" /> Quote Secured
                    </DialogTitle>
                    <DialogDescription className="text-green-600">The forensic quote for <strong>{formatCurrency(amount)}</strong> is saved to your profile.</DialogDescription>
                </DialogHeader>
                
                <div className="p-6 space-y-6 text-left">
                    <h3 className="font-bold text-lg text-left">How would you like to initiate the handshake?</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                        <Button 
                            variant="outline" 
                            className="h-auto py-6 flex flex-col items-center gap-3 border-2 hover:border-primary transition-all text-left bg-white text-foreground"
                            onClick={() => handleRoute('direct')}
                        >
                            <Landmark className="h-8 w-8 text-primary" />
                            <div className="text-center">
                                <p className="font-black uppercase text-xs">Direct Path</p>
                                <p className="text-[10px] text-muted-foreground mt-1 max-w-[150px] whitespace-normal leading-tight">Send directly to the platform finance division.</p>
                            </div>
                        </Button>
                        <Button 
                            variant="default" 
                            className="h-auto py-6 flex flex-col items-center gap-3 shadow-lg text-left"
                            onClick={() => handleRoute('market')}
                        >
                            <Globe className="h-8 w-8" />
                            <div className="text-center">
                                <p className="font-black uppercase text-xs">Market Broadcast</p>
                                <p className="text-[10px] text-primary-foreground/80 mt-1 max-w-[150px] whitespace-normal leading-tight">Expose this deal to our 85+ specialized lenders.</p>
                            </div>
                        </Button>
                    </div>
                </div>
            </DialogContent>
        )
    }

    return (
        <DialogContent className="text-left text-foreground">
            <DialogHeader className="text-left">
                <DialogTitle>Forensic Quote: {product.title}</DialogTitle>
                <DialogDescription>Adjust variables to estimate your industrial funding cost.</DialogDescription>
            </DialogHeader>
            <div className="space-y-8 py-6 text-left">
                <div className="space-y-4 text-left">
                    <div className="flex justify-between items-center mb-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Total Capital Required</Label>
                        <span className="font-black text-primary text-xl">{formatCurrency(amount)}</span>
                    </div>
                    <Slider min={10000} max={5000000} step={10000} value={[amount]} onValueChange={(v) => setAmount(v[0])} />
                </div>
                <div className="grid grid-cols-2 gap-8 text-left">
                    <div className="space-y-4 text-left">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Target Rate (% p.a.)</Label>
                        <span className="block font-bold mb-2">{rate.toFixed(1)}%</span>
                        <Slider min={5} max={30} step={0.5} value={[rate]} onValueChange={(v) => setRate(v[0])} />
                    </div>
                    <div className="space-y-4 text-left">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Repayment Term</Label>
                        <span className="block font-bold mb-2">{term} Months</span>
                        <Slider min={12} max={120} step={6} value={[term]} onValueChange={(v) => setTerm(v[0])} />
                    </div>
                </div>

                <div className="p-6 bg-slate-900 rounded-2xl text-white shadow-xl space-y-4 text-left">
                    <div className="flex justify-between items-baseline text-left">
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Estimated Installment</span>
                        <span className="text-4xl font-black text-primary">{formatCurrency(monthlyPayment)}</span>
                    </div>
                    <Separator className="bg-white/10" />
                    <div className="flex justify-between text-xs text-slate-400">
                        <span>Total Commit (Incl. Interest)</span>
                        <span className="font-mono">{formatCurrency(totalRepayment)}</span>
                    </div>
                </div>
            </div>
            <DialogFooter className="bg-slate-50 border-t p-6 rounded-b-lg">
                <Button onClick={handleSaveQuote} disabled={isSaving} className="w-full h-14 font-black uppercase text-lg shadow-xl text-white">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Quote & Proceed
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}

function ProductTypesContent() {
    const searchParams = useSearchParams();
    const [isClient, setIsClient] = useState(false);
    const [openDialogs, setOpenDialogs] = useState<Record<string, boolean>>({});

    useEffect(() => { setIsClient(true); }, []);

    const agreement = searchParams.get('agreement') as keyof typeof productsData;
    const categoryData = isClient ? productsData[agreement] : null;
    const Icon = categoryData?.icon || Landmark;

    return (
        <div className="container mx-auto px-4 py-20 text-left text-foreground">
            <div className="text-left max-w-3xl mb-16 space-y-4">
                 {isClient && categoryData ? <Icon className="h-12 w-12 text-primary" /> : <div className="h-12 w-12" />}
                <h1 className="text-4xl md:text-5xl font-black font-headline uppercase tracking-tight">{isClient && categoryData ? categoryData.title : 'Products'}</h1>
                <p className="text-xl text-muted-foreground">Select a specific structure to generate your forensic quote.</p>
            </div>
            
            {isClient && categoryData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl text-left">
                    {categoryData.items.map(product => (
                        <Dialog key={product.id} open={openDialogs[product.id] || false} onOpenChange={(isOpen) => setOpenDialogs(prev => ({...prev, [product.id]: isOpen}))}>
                            <Card className="flex flex-col border-none shadow-xl bg-white hover:ring-2 ring-primary/20 transition-all text-left">
                                <CardHeader className="p-8 pb-4">
                                    <CardTitle className="text-xl font-bold">{product.title}</CardTitle>
                                    <CardDescription className="text-sm leading-relaxed mt-2">{product.description}</CardDescription>
                                </CardHeader>
                                <CardFooter className="p-8 pt-0 gap-3">
                                     <DialogTrigger asChild>
                                        <Button variant="outline" className="flex-1 h-12 font-bold gap-2">
                                            <Calculator className="h-4 w-4" /> Get Quote
                                        </Button>
                                    </DialogTrigger>
                                    <Button asChild className="flex-1 h-12 font-bold gap-2 shadow-md">
                                        <Link href={`/funding/apply?type=${product.id}`}>
                                            Apply Now <ArrowRight className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                            <QuoteCalculator 
                                product={product} 
                                onOpenChange={(isOpen) => setOpenDialogs(prev => ({...prev, [product.id]: isOpen}))} 
                            />
                        </Dialog>
                    ))}
                </div>
            ) : (
                <div className="flex justify-center py-20"><Loader2 className="h-12 w-12 animate-spin text-primary"/></div>
            )}
        </div>
    )
}

export default function ProductTypesPage() {
    return (
        <Suspense fallback={<div className="flex justify-center py-40"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <ProductTypesContent />
        </Suspense>
    );
}
