'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, ClipboardCheck, Terminal, Database, ShieldCheck, Info, UserCheck, Zap, Target, Landmark, Briefcase, Banknote, Sparkles, SearchCode } from "lucide-react";
import * as React from "react";
import { useState, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const investorClasses = [
    { id: 'Angels', label: 'Individuals / Angels', icon: UserCheck, focus: 'High-net-worth individuals and angel syndicates interested in early-stage logistics tech.' },
    { id: 'Seed', label: 'Seed / VC Funds', icon: Sparkles, focus: 'Venture Capital firms specializing in Seed to Series A rounds for B2B industrial SaaS.' },
    { id: 'Mezzanine', label: 'Mezzanine / Debt', icon: Banknote, focus: 'Providers of venture debt, subordinated debt, and mezzanine financing for scale-ups.' },
    { id: 'Private Equity', label: 'Private Equity', icon: Briefcase, focus: 'Growth equity and buyout firms with a focus on industrial transformation and logistics.' },
    { id: 'Institutional', label: 'Institutional / DFIs', icon: Landmark, focus: 'Development Finance Institutions (DFIs) and pension funds targeting infrastructure.' }
];

export function generateInvestorPrompt(category: string, startSeq: number = 1) {
    return `ACT AS AN ELITE VENTURE INTELLIGENCE AGENT (V6 - DEEP SCAVENGER). 
RETURN ONLY A RAW JSON ARRAY. NO MARKDOWN. NO CODE BLOCKS. NO CONVERSATION.

TASK: Discover and extract exactly 30 UNIQUE, LIVE South African investment partners for the class: "${category}".

SCAVENGER PROTOCOL:
1. WEBSITE & SITEMAP: Locate the official domain. Crawl the Sitemap for 'Team', 'Partners', or 'About' pages to extract the names of the Managing Partners and Investment Leads.
2. IDENTITY RESOLUTION: Use extracted names to perform targeted SECONDARY searches on LinkedIn to resolve their direct professional email and direct mobile numbers.
3. MANDATE VERIFICATION: Ensure they invest in B2B SaaS, Logistics, or Industrial Tech.

CRITICAL INTEGRITY SHIELD: 
- ZERO TOLERANCE FOR FICTITIOUS DATA: Do not invent names or guess emails.
- NULL MANDATE: If data is not explicitly visible in search evidence after sitemap and identity checks, set the field to null.

RECORD KEY: Generate a unique "record_id" starting with "DISC_INV_${category.toUpperCase().replace(/\s/g, '_')}_".

REQUIRED JSON FIELDS:
[
  {
    "seq": ${startSeq},
    "record_id": "...",
    "companyName": "FUND / FIRM NAME",
    "industrial_category": "${category}",
    "contact_person": "VERIFIED HUMAN NAME",
    "email": "ACTUAL VERIFIED EMAIL",
    "mobile": "ACTUAL VERIFIED MOBILE",
    "website": "OFFICIAL CORPORATE URL",
    "notes": "Thesis and fit summary."
  }
]`;
}

const DiscoveryTab = ({ category, focus, currentCount = 0 }: { category: string, focus: string, currentCount?: number }) => {
    const { toast } = useToast();
    const [isCopied, setIsCopied] = useState(false);
    const [seqOverride, setSeqOverride] = useState<number | ''>('');
    
    const startSeq = useMemo(() => (seqOverride !== '' ? Number(seqOverride) : currentCount + 1), [seqOverride, currentCount]);
    const prompt = useMemo(() => generateInvestorPrompt(category, startSeq), [category, startSeq]);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(prompt);
        setIsCopied(true);
        toast({ title: "V6 Investor Prompt Ready", description: "Deep scavenger protocol active." });
        setTimeout(() => setIsCopied(false), 3000);
    };

    return (
        <div className="grid md:grid-cols-2 gap-6 text-left text-foreground">
            <div className="space-y-4 text-left">
                <h2 className="text-2xl font-bold font-headline flex items-center gap-2 text-foreground text-left">
                    <SearchCode className="h-6 w-6 text-primary" />
                    Capital Scouting: {category}
                </h2>

                <Alert className="bg-primary/5 border-primary/20 text-left">
                    <Info className="h-4 w-4 text-primary" />
                    <AlertTitle className="font-bold text-left text-foreground">Target Mandate</AlertTitle>
                    <AlertDescription className="text-xs text-left text-muted-foreground leading-relaxed">
                        {focus}
                    </AlertDescription>
                </Alert>

                <div className="p-4 bg-muted/30 border rounded-xl space-y-4 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left text-foreground">Sequence Sync</Label>
                    <div className="space-y-1.5 text-left text-foreground">
                        <Label className="text-xs font-bold text-foreground text-left">Start Sequence #</Label>
                        <Input 
                            type="number" 
                            value={seqOverride}
                            onChange={(e) => setSeqOverride(e.target.value === '' ? '' : Number(e.target.value))}
                            className="h-10 font-mono bg-white"
                        />
                    </div>
                </div>
                <Button onClick={handleCopy} size="lg" className="w-full gap-2 h-14 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-white">
                    {isCopied ? <ClipboardCheck className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                    Copy V6 Investor Prompt
                </Button>
            </div>
            <div className="space-y-2 text-left text-foreground text-foreground">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 text-left text-foreground"><Terminal className="h-3 w-3"/> Intelligence Command</Label>
                <ScrollArea className="h-[400px] border rounded-lg bg-slate-900 p-4 text-left text-foreground">
                    <pre className="text-[10px] text-slate-400 font-mono whitespace-pre-wrap leading-tight text-left text-foreground">{prompt}</pre>
                </ScrollArea>
            </div>
        </div>
    );
};

export default function InvestorDiscoveryEngine() {
    return (
        <Card className="shadow-none border-none text-left">
            <Tabs defaultValue="Seed" className="w-full text-left">
                <CardHeader className="px-0 pt-0 text-left">
                    <CardTitle className="flex items-center gap-2 text-left text-foreground font-black font-headline">
                        <Database className="h-6 w-6 text-primary" />
                        App Launch Investor Discovery
                    </CardTitle>
                    <CardDescription className="text-muted-foreground text-left text-muted-foreground text-foreground text-left">Identify foundational partners using the deep V6 sitemap protocol.</CardDescription>
                </CardHeader>
                <CardContent className="px-0 text-left">
                    <TabsList className="h-auto flex-wrap justify-start bg-muted/30 mb-8 p-1 text-left">
                        {investorClasses.map(cls => (
                            <TabsTrigger key={cls.id} value={cls.id} className="text-xs px-4 py-2">
                                {cls.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    {investorClasses.map(cls => (
                        <TabsContent key={cls.id} value={cls.id} className="text-left">
                            <DiscoveryTab category={cls.id} focus={cls.focus} />
                        </TabsContent>
                    ))}
                </CardContent>
            </Tabs>
        </Card>
    );
}
