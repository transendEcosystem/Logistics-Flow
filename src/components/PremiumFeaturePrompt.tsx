'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Zap, ArrowRight, Lock, Sparkles, Tag, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import { getClientSideAuthToken } from "@/firebase";
import { Badge } from "@/components/ui/badge";

interface PremiumFeaturePromptProps {
  icon: React.ElementType;
  title: string;
  description: string;
  planId?: string; // The specific node ID to purchase
}

export function PremiumFeaturePrompt({ icon: Icon, title, description, planId }: PremiumFeaturePromptProps) {
    const router = useRouter();
    const { toast } = useToast();
    const isEarningNode = planId && planId !== 'intelligence';
    const ctaLabel = isEarningNode ? `Activate ${title} Node (20% OFF)` : "Unlock Intelligence Access (20% OFF)";
    const targetUrl = planId ? `/checkout/${planId}?discount=JOIN20` : `/pricing?discount=JOIN20`;

    const handleCtaClick = async (destination: string) => {
        try {
            const token = await getClientSideAuthToken();
            fetch('/api/admin', {
                method: 'POST',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'logClick',
                    payload: {
                        featureId: planId || title,
                        discountCode: 'JOIN20',
                        discountPercent: 20,
                        targetUrl: destination
                    }
                })
            }).catch(e => console.warn("CTA click logging notice:", e));

            toast({
                title: "20% Discount Code JOIN20 Applied!",
                description: "Your special introductory discount has been attached to your checkout session.",
            });
        } catch (e) {}

        router.push(destination);
    };

    return (
        <Card className="w-full max-w-2xl mx-auto shadow-2xl border-none overflow-hidden text-left bg-white">
            <CardHeader className="bg-slate-900 text-white p-8 md:p-10">
                <div className="flex items-center gap-4 text-left">
                    <div className="bg-primary/20 p-4 rounded-2xl shrink-0">
                        <Icon className="h-10 w-10 text-primary" />
                    </div>
                    <div className="text-left">
                        <div className="flex items-center gap-2 mb-2">
                             <Lock className="h-4 w-4 text-amber-500" />
                             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">Access Restricted</span>
                        </div>
                        <CardTitle className="text-2xl md:text-3xl font-black font-headline text-white">{title}</CardTitle>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-8 md:p-10 space-y-6 text-left">
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                    {description}
                </p>

                {/* LIMITED TIME DISCOUNT BANNER */}
                <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 rounded-2xl border-2 border-amber-400/30 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-amber-500 p-2.5 rounded-xl text-slate-950 font-black shrink-0">
                            <Tag className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                            <p className="font-black text-xs uppercase tracking-wider text-amber-900">Special Introductory Offer</p>
                            <p className="text-xs text-amber-950 font-bold mt-0.5">Use code <span className="font-mono bg-amber-200 px-1.5 py-0.5 rounded text-slate-900">JOIN20</span> for 20% OFF your first billing cycle.</p>
                        </div>
                    </div>
                    <Badge className="bg-amber-500 text-slate-950 font-black uppercase text-[10px] tracking-widest shrink-0 hidden sm:inline-flex">
                        20% OFF
                    </Badge>
                </div>

                <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-left space-y-3">
                    <h4 className="font-bold text-sm uppercase tracking-widest text-primary flex items-center gap-2">
                        <Zap className="h-4 w-4 fill-current"/>
                        What You Unlock With This Node:
                    </h4>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 font-semibold">
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> Direct Executive Contacts</li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> 1-Click RFQ Dispatch</li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> Verified Identity Badge</li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> Data Dividend Points</li>
                    </ul>
                </div>
            </CardContent>
            <CardFooter className="p-8 md:p-10 pt-0 bg-white flex flex-col gap-4">
                <Button onClick={() => handleCtaClick(targetUrl)} size="lg" className="w-full h-16 text-base md:text-lg font-black uppercase tracking-tight shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 text-white">
                    {ctaLabel} <Sparkles className="ml-2 h-5 w-5" />
                </Button>
                <Button variant="ghost" onClick={() => handleCtaClick('/pricing?discount=JOIN20')} className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary">
                    Compare all membership plans & discounts
                </Button>
            </CardFooter>
        </Card>
    );
}
