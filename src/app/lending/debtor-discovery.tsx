
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, ClipboardCheck, Terminal, Database, ShieldCheck, Info, SearchCode, Zap, Landmark } from "lucide-react";
import * as React from "react";
import { useState, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const debtorCategories = [
    "Transport Operator",
    "Freight Logistics Firm",
    "Agriculture Supply Chain",
    "Mining Service Provider",
    "Heavy Equipment Owner",
    "FMCG Distributor"
];

function generateDiscoveryPrompt(category: string, startSeq: number = 1) {
    return `ACT AS AN ELITE SOUTH AFRICAN INDUSTRIAL RESEARCH AGENT (V13.1 - LENDING SCAVENGER). 
RETURN ONLY A RAW JSON ARRAY. NO MARKDOWN. NO CODE BLOCKS. NO CONVERSATION.

TASK: Discover and extract exactly 30 UNIQUE, LIVE South African businesses requiring asset finance or credit for: "${category}".

SCAVENGER PROTOCOL (V13.1):
1. IDENTITY EXPANSION: Resolve legal trading names and registration numbers where visible in search evidence.
2. SOCIAL HUB RESILIENCY: For South African firms, use the FACEBOOK PAGE bio as the source of truth for operational addresses and direct mobile contacts.
3. TEAM DISCOVERY: You MUST identify the names of the Managing Director, Financial Lead, and Fleet Manager.
4. CREDIT PROFILE: In the "notes" field, summarize their likely borrowing needs (e.g., replacement cycle, expansion).

RECORD KEY: Generate a unique "id" starting with "DISC_DEBTOR_${category.toUpperCase().replace(/\s/g, '_')}_".

REQUIRED JSON FIELDS:
[
  {
    "seq": ${startSeq},
    "id": "...",
    "name": "FULL LEGAL COMPANY NAME",
    "type": "company",
    "category": "${category}",
    "contactPerson": "VERIFIED DIRECTOR NAME",
    "email": "ACTUAL VERIFIED EMAIL",
    "cell": "ACTUAL VERIFIED MOBILE",
    "website": "OFFICIAL CHANNEL/URL",
    "physicalAddress": "VERIFIED PHYSICAL ADDRESS",
    "notes": "Lending fit summary."
  }
]`;
}

const DiscoveryTab = ({ category, currentCount }: { category: string, currentCount: number }) => {
    const { toast } = useToast();
    const [isCopied, setIsCopied] = useState(false);
    const [seqOverride, setSeqOverride] = useState<number | ''>('');
    
    const startSeq = useMemo(() => (seqOverride !== '' ? Number(seqOverride) : currentCount + 1), [seqOverride, currentCount]);
    const prompt = generateDiscoveryPrompt(category, startSeq);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(prompt);
        setIsCopied(true);
        toast({ title: "V13.1 Debtor Prompt Ready", description: "Lending-optimized scavenger protocol active." });
        setTimeout(() => setIsCopied(false), 3000);
    };

    return (
        <div className="grid md:grid-cols-2 gap-6 text-left text-foreground">
            <div className="space-y-4 text-left">
                <h2 className="text-2xl font-bold font-headline flex items-center gap-2 text-left">
                    <SearchCode className="h-6 w-6 text-primary" />
                    Forensic Scouting: {category}
                </h2>

                <Alert className="bg-primary/5 border-primary/20 text-left">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <AlertTitle className="text-left font-bold text-foreground text-left">V13.1 Lending Scavenger</AlertTitle>
                    <AlertDescription className="text-xs text-left text-muted-foreground leading-relaxed">
                        This protocol mandates the discovery of Financial Leads and Managing Directors, prioritizing Facebook operational data for high-fidelity contact mapping.
                    </AlertDescription>
                </Alert>

                <div className="p-4 bg-muted/30 border rounded-xl space-y-4 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Batch Control</Label>
                    <div className="space-y-1.5 text-left">
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
                    Copy V13.1 Research Prompt
                </Button>
            </div>
            <div className="space-y-2 text-left text-foreground">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 text-left"><Terminal className="h-3 w-3"/> AI Research Command</Label>
                <ScrollArea className="h-[400px] border rounded-lg bg-slate-900 p-4 text-left">
                    <pre className="text-[10px] text-slate-400 font-mono whitespace-pre-wrap leading-tight text-left">{prompt}</pre>
                </ScrollArea>
            </div>
        </div>
    );
};

export default function DebtorDiscoveryEngine() {
    return (
        <Card className="shadow-none border-none text-left text-foreground">
            <Tabs defaultValue="Transport Operator" className="w-full text-left">
                <CardHeader className="px-0 pt-0 text-left">
                    <CardTitle className="flex items-center gap-2 text-foreground font-black font-headline text-left">
                        <Database className="h-6 w-6 text-primary" />
                        Automated Debtor Discovery
                    </CardTitle>
                    <CardDescription className="text-left text-muted-foreground">Map high-fidelity lending opportunities using V13.1 Social-First protocol.</CardDescription>
                </CardHeader>
                <CardContent className="px-0 text-left text-foreground">
                    <TabsList className="h-auto flex-wrap justify-start bg-muted/30 p-1 text-left">
                        {debtorCategories.map(category => (
                            <TabsTrigger key={category} value={category} className="text-xs px-4 py-2">
                                {category}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    {debtorCategories.map(category => (
                        <TabsContent key={category} value={category} className="mt-8 text-left">
                            <DiscoveryTab category={category} currentCount={0} />
                        </TabsContent>
                    ))}
                </CardContent>
            </Tabs>
        </Card>
    );
}
