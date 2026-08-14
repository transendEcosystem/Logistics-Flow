'use client';

import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Copy, ClipboardCheck, Info, Search, Terminal, RefreshCcw, Database, Loader2, Zap, Globe, ShieldCheck, SearchCode } from "lucide-react";
import { useState, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const transporterCategories = [
    "Long Haul", "Refrigerated", "Flatbed", "Tipper", "Hazmat", "LTL", "Cross-Border", "Local Distribution", "Container Transport", "Abnormal Loads"
];

function generateDiscoveryPrompt(category: string, startPage: number) {
    const startSeq = (startPage - 1) * 30 + 1;

    return `ACT AS AN ELITE SOUTH AFRICAN INDUSTRIAL RESEARCH AGENT (V13 - INDUCTIVE RECONSTRUCTION).
RETURN ONLY A RAW JSON ARRAY. NO MARKDOWN. NO CODE BLOCKS. NO CONVERSATION.

TASK: Discover and extract exactly 30 UNIQUE, LIVE South African transport companies for: "${category}".

HUNT PROTOCOL (V13 INDUCTIVE):
1. IDENTITY EXPANSION: Resolve acronyms (e.g. "JH") into full legal identities ("Junior H").
2. SOCIAL HUB RESILIENCY: Prioritize the FACEBOOK PAGE bio for the correct operational address and direct WhatsApp.
3. INDUCTIVE STITCHING: Combine fragments from different search results. Match directory snippets with social bio snippets to bridge gaps.
4. IDENTITY RESOLUTION: You MUST identify the NAMES AND CONTACTS (Email/Mobile) for: CEO/MD, Marketing Lead, Operations Manager, and Technical Manager.
5. REAL DATA ONLY: Do not guess email patterns. Use actual evidence from snippets.

REQUIRED JSON FIELDS:
[
  {
    "seq": ${startSeq},
    "record_id": "DISC_TRANS_${category.toUpperCase().replace(/\s/g, '_')}_[RAND_ID]",
    "companyName": "FULL LEGAL NAME",
    "industrial_category": "${category}",
    "website": "OFFICIAL VERIFIED URL (OR FACEBOOK)",
    "email": "VERIFIED GENERAL EMAIL",
    "phone": "RSA LANDLINE",
    "address": "VERIFIED PHYSICAL ADDRESS (PRIORITIZE FACEBOOK BIO)",
    "marketingManager": { "name": "...", "email": "...", "mobile": "..." },
    "operationsManager": { "name": "...", "email": "...", "mobile": "..." },
    "technicalManager": { "name": "...", "email": "...", "mobile": "..." },
    "ceo": { "name": "...", "email": "...", "mobile": "..." },
    "primaryContactRole": "marketingManager",
    "minedServiceWording": "TECHNICAL SUMMARY MINED FROM SITE SECTIONS (300 WORDS)"
  }
]`;
}

const DiscoveryTab = ({ category, currentCount }: { category: string, currentCount: number }) => {
    const { toast } = useToast();
    const [isCopied, setIsCopied] = useState(false);
    const [pageOverride, setPageOverride] = useState<number | ''>('');
    
    const suggestedPage = Math.floor(currentCount / 30) + 1;
    const startPage = pageOverride !== '' ? Number(pageOverride) : suggestedPage;
    const prompt = useMemo(() => generateDiscoveryPrompt(category, startPage), [category, startPage]);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(prompt);
        setIsCopied(true);
        toast({ title: "V13 Scavenger Ready", description: "Inductive reconstruction and acronym expansion active." });
        setTimeout(() => setIsCopied(false), 3000);
    };

    return (
        <div className="grid md:grid-cols-2 gap-6 text-left text-foreground">
            <div className="space-y-4 text-left">
                <h2 className="text-2xl font-bold font-headline flex items-center gap-2 text-left">
                    <SearchCode className="h-6 w-6 text-primary" />
                    Haulier Mapping: {category}
                </h2>
                <Alert className="bg-primary/5 border-primary/20 text-left">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <AlertTitle className="text-left font-bold">Hunt Protocol V13 Active</AlertTitle>
                    <AlertDescription className="text-xs text-left leading-relaxed">
                        Optimized for inductive reconstruction and Facebook bio-mining. Commands the AI to find direct manager contacts and prioritize social-media operational data.
                    </AlertDescription>
                </Alert>
                <div className="p-4 bg-muted/30 border rounded-xl space-y-4 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Pagination Sync</Label>
                    <div className="space-y-1.5 text-left">
                        <Label className="text-xs font-bold text-left">Start from Batch #</Label>
                        <Input 
                            type="number" 
                            placeholder={String(suggestedPage)}
                            value={pageOverride}
                            onChange={(e) => setPageOverride(e.target.value === '' ? '' : Number(e.target.value))}
                            className="h-10 font-mono bg-white"
                        />
                    </div>
                </div>
                <Button onClick={handleCopy} size="lg" className="w-full gap-2 h-14 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-white">
                    {isCopied ? <ClipboardCheck className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                    Copy V13 Haulier Prompt
                </Button>
            </div>
            <div className="space-y-2 text-left">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 text-left"><Terminal className="h-3 w-3"/> Industrial Command (V13)</Label>
                <ScrollArea className="h-[400px] border rounded-lg bg-slate-900 p-4 shadow-inner text-left">
                    <pre className="text-[10px] text-slate-400 font-mono whitespace-pre-wrap leading-tight text-left">{prompt}</pre>
                </ScrollArea>
            </div>
        </div>
    );
};

export default function TransporterDiscoveryEngine() {
    return (
        <Card className="shadow-none border-none text-left">
            <Tabs defaultValue="Long Haul" className="w-full text-left">
                <CardHeader className="px-0 pt-0 text-left">
                    <CardTitle className="flex items-center gap-2 text-left font-black font-headline text-foreground">
                        <Database className="h-6 w-6 text-primary" />
                        Industrial Haulier Scavenger
                    </CardTitle>
                    <CardDescription className="text-left text-muted-foreground">Map unique transport entities using the V13 inductive reconstruction protocol.</CardDescription>
                </CardHeader>
                <CardContent className="px-0 text-left">
                    <TabsList className="h-auto flex-wrap justify-start bg-muted/30 mb-8 p-1 text-left">
                        {transporterCategories.map(category => (
                            <TabsTrigger key={category} value={category} className="text-xs px-4 py-2">{category}</TabsTrigger>
                        ))}
                    </TabsList>
                    {transporterCategories.map(category => (
                        <TabsContent key={category} value={category} className="mt-0 text-left">
                            <DiscoveryTab category={category} currentCount={0} />
                        </TabsContent>
                    ))}
                </CardContent>
            </Tabs>
        </Card>
    );
}
