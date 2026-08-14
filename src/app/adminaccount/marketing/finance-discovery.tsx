'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, ClipboardCheck, Info, Search, Terminal, Landmark, Database, Zap, ShieldCheck } from "lucide-react";
import * as React from "react";
import { useState, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const financeCategories = ["Banks", "Government", "AEO", "Niche Lenders"];

export function generateDiscoveryPrompt(category: string, startSeq: number = 1) {
    return `ACT AS AN ELITE SOUTH AFRICAN INDUSTRIAL RESEARCH AGENT. 
RETURN ONLY A RAW JSON ARRAY. NO MARKDOWN. NO CODE BLOCKS. NO CONVERSATION.

NOISE SUPPRESSION PROTOCOL:
1. IGNORE ALL JOB LISTINGS, POLICY NEWS, AND NEWS ARTICLES.
2. FOCUS ONLY ON LIVE CORPORATE LANDING PAGES AND BUSINESS DIRECTORIES.

CRITICAL INTEGRITY SHIELD: 
DO NOT RETURN MOCK OR HALLUCINATED DATA. 
YOU MUST PERFORM A LIVE GOOGLE SEARCH FOR "${category} in South Africa".

TASK: Discover and extract exactly 30 unique, live South African companies providing funding or credit for: "${category}".

INVESTIGATIVE PROTOCOL:
1. HUMAN IDENTITY: Find the ACTUAL NAME (First and Last) of the CEO, MD, or Head of Credit.
2. CONTACT MAPPING: Identify professional email and direct mobile numbers (+27 format).
3. TECH STACK MINING: In the "notes" field, summarize their target borrower profile.
4. RECORD KEY: Generate a unique "record_id" starting with "DISC_FIN_${category.toUpperCase().replace(/\s/g, '_')}_".

REQUIRED JSON FIELDS:
[
  {
    "seq": ${startSeq},
    "record_id": "...",
    "companyName": "FULL INSTITUTION NAME",
    "industrial_category": "${category}",
    "contactPerson": "VERIFIED HUMAN NAME",
    "email": "...",
    "mobile": "...",
    "website": "OFFICIAL VERIFIED URL",
    "notes": "..."
  }
]`;
}

const DiscoveryTab = ({ category, currentCount = 0 }: { category: string, currentCount?: number }) => {
    const { toast } = useToast();
    const [isCopied, setIsCopied] = useState(false);
    const [seqOverride, setSeqOverride] = useState<number | ''>('');
    
    const startSeq = useMemo(() => (seqOverride !== '' ? Number(seqOverride) : currentCount + 1), [seqOverride, currentCount]);
    const prompt = useMemo(() => generateDiscoveryPrompt(category, startSeq), [category, startSeq]);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(prompt);
        setIsCopied(true);
        toast({ title: "Research Prompt Ready", description: "Noise suppression active." });
        setTimeout(() => setIsCopied(false), 3000);
    };

    return (
        <div className="grid md:grid-cols-2 gap-6 text-left text-foreground">
            <div className="space-y-4 text-left">
                <h2 className="text-2xl font-bold font-headline flex items-center gap-2 text-left">
                    <Landmark className="h-6 w-6 text-primary" />
                    Capital Discovery: {category}
                </h2>
                
                <Alert className="bg-primary/5 border-primary/20 text-left">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <AlertTitle className="text-left font-bold text-foreground">Noise Suppression Active</AlertTitle>
                    <AlertDescription className="text-xs text-left text-muted-foreground">
                        The agent is commanded to ignore job listings and news policies.
                    </AlertDescription>
                </Alert>

                <div className="p-4 bg-muted/30 border rounded-xl space-y-4 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Sequence Sync</Label>
                    <div className="space-y-1.5 text-left text-foreground">
                        <Label className="text-xs font-bold text-left">Start Sequence #</Label>
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
                    Copy Research Prompt
                </Button>
            </div>

            <div className="space-y-2 text-left text-foreground">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 text-left"><Terminal className="h-3 w-3"/> AI Research Command</Label>
                <ScrollArea className="h-[400px] border rounded-lg bg-slate-900 p-4 shadow-inner text-left">
                    <pre className="text-[10px] text-slate-400 font-mono whitespace-pre-wrap leading-tight text-left">
                        {prompt}
                    </pre>
                </ScrollArea>
            </div>
        </div>
    );
};

export default function FinanceDiscoveryEngine() {
    return (
        <Card className="shadow-none border-none text-left text-foreground">
            <Tabs defaultValue="Banks" className="w-full text-left">
                <CardHeader className="px-0 pt-0 text-left text-foreground">
                    <CardTitle className="flex items-center gap-2 text-left text-foreground font-black font-headline">
                        <Database className="h-6 w-6 text-amber-500" />
                        Capital Intelligence Discovery
                    </CardTitle>
                    <CardDescription className="text-left text-muted-foreground">
                        Identify credit providers using noise-suppressed discovery.
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-0 text-left text-foreground">
                    <TabsList className="h-auto flex-wrap justify-start bg-muted/30 mb-8 p-1 text-left">
                        {financeCategories.map(category => (
                            <TabsTrigger key={category} value={category} className="text-xs px-4 py-2">
                                {category}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    {financeCategories.map(category => (
                        <TabsContent key={category} value={category} className="mt-0 text-left">
                            <DiscoveryTab category={category} />
                        </TabsContent>
                    ))}
                </CardContent>
            </Tabs>
        </Card>
    );
}