'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Zap, ArrowRight, Lock } from "lucide-react";
import Link from "next/link";
import * as React from "react";

interface PremiumFeaturePromptProps {
  icon: React.ElementType;
  title: string;
  description: string;
  planId?: string; // The specific node ID to purchase
}

export function PremiumFeaturePrompt({ icon: Icon, title, description, planId }: PremiumFeaturePromptProps) {
    const isEarningNode = planId && planId !== 'intelligence';
    const ctaLabel = isEarningNode ? `Activate ${title} Node` : "Unlock Intelligence Access";

    return (
        <Card className="w-full max-w-2xl mx-auto shadow-2xl border-none overflow-hidden text-left bg-white">
            <CardHeader className="bg-slate-900 text-white p-10">
                <div className="flex items-center gap-4 text-left">
                    <div className="bg-primary/20 p-4 rounded-2xl">
                        <Icon className="h-10 w-10 text-primary" />
                    </div>
                    <div className="text-left">
                        <div className="flex items-center gap-2 mb-2">
                             <Lock className="h-4 w-4 text-amber-500" />
                             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">Access Restricted</span>
                        </div>
                        <CardTitle className="text-3xl font-black font-headline text-white">{title}</CardTitle>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-10 space-y-6 text-left">
                <p className="text-lg text-muted-foreground leading-relaxed">
                    {description}
                </p>
                
                <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-left">
                    <h4 className="font-bold text-sm uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
                        <Zap className="h-4 w-4 fill-current"/>
                        Earning Potential
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed">
                        Activating this node authorizes your business to perform transactions, access direct forensic contacts, and utilize the specialized matching terminals for this mall.
                    </p>
                </div>
            </CardContent>
            <CardFooter className="p-10 pt-0 bg-white flex flex-col gap-4">
                {planId ? (
                    <Button asChild size="lg" className="w-full h-16 text-lg font-black uppercase tracking-tight shadow-xl shadow-primary/20">
                        <Link href={`/checkout/${planId}`}>
                            {ctaLabel} <ArrowRight className="ml-2 h-6 w-6" />
                        </Link>
                    </Button>
                ) : (
                    <Button asChild size="lg" className="w-full h-16 text-lg font-black uppercase tracking-tight shadow-xl shadow-primary/20">
                        <Link href="/pricing">View All Intelligence Nodes <ArrowRight className="ml-2 h-6 w-6" /></Link>
                    </Button>
                )}
                <Button variant="ghost" asChild className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary">
                    <Link href="/pricing">Compare all membership plans</Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
