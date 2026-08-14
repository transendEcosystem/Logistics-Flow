'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Copy, ClipboardCheck, Info, Search, Terminal, Loader2, RefreshCcw, Database, Zap, AlertTriangle, Globe, ShieldCheck, SearchCode } from "lucide-react";
import * as React from "react";
import { useState, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const supplierCategories = [
    "Accessories", "Air", "Anti-Theft Devices", "Auto Electrical", "Batteries", 
    "Brakes", "Cleaning Products", "Diesel", "Differential", "Engine Refurbish",
    "Filters", "Injectors", "Lights", "Mechanical repairs", "Oils & Lubricants", 
    "Parts", "Prop Shafts", "Second Hand Trailers", "Second Hand Trucks", "Transport", 
    "Tarpaulins", "Tow in", "Trailer repairs", "Truck Accessories", "Truck Parts", 
    "Truck repairs", "Turbo", "Tyres"
];

function generateDiscoveryPrompt(category: string, startSeq: number = 1) {
    return `ACT AS AN ELITE SOUTH AFRICAN INDUSTRIAL RESEARCH AGENT (V12 - INDUCTIVE RECONSTRUCTION). 
RETURN ONLY A RAW JSON ARRAY. NO MARKDOWN. NO CODE BLOCKS. NO CONVERSATION.

STRICT REGIONAL LOCK: ONLY return entities based in SOUTH AFRICA. IGNORE all international results.

TASK: Discover and extract exactly 30 UNIQUE, LIVE South African suppliers for: "${category}".

HUNT PROTOCOL (V12 INDUCTIVE):
1. IDENTITY EXPANSION: Resolve acronyms and identify full legal names.
2. INDUCTIVE STITCHING: Combine data fragments from multiple snippets. Directory data + Social bio data = High fidelity record.
3. FLAT-SITE MINING: Analyze root domain snippets for "Contact Cards" and "Sections" (Address, Email, Phone).
4. IDENTITY RESOLUTION: Extract names of CEO and Marketing Lead. Pivot to LinkedIn metadata in snippets to resolve direct professional contact.

CRITICAL INTEGRITY SHIELD: 
- REAL DATA ONLY: Do not invent names or guess email patterns.
- NULL MANDATE: If data is not explicitly visible in search evidence after these multi-query checks, return null.

REQUIRED JSON FIELDS:
[
  {
    "seq": ${startSeq},
    "record_id": "DISC_SUPP_${category.toUpperCase().replace(/\s/g, '_')}_[RAND_ID]",
    "companyName": "FULL LEGAL NAME",
    "industrial_category": "${category}",
    "contactPerson": "VERIFIED HUMAN NAME",
    "email": "VERIFIED GENERAL EMAIL",
    "phone": "RSA LANDLINE",
    "website": "OFFICIAL VERIFIED URL",
    "address": "...",
    "marketingManager": { "name": "...", "email": "...", "mobile": "..." },
    "ceo": { "name": "...", "email": "...", "mobile": "..." },
    "minedServiceWording": "TECHNICAL SUMMARY MINED FROM SITE SECTIONS (300 WORDS)"
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
        toast({ title: "V12 Command Ready", description: "Inductive reconstruction and flat-site logic active." });
        setTimeout(() => setIsCopied(false), 3000);
    };

    return (
        <div className="grid md:grid-cols-2 gap-6 text-left text-foreground">
            <div className="space-y-4 text-left">
                <h2 className="text-2xl font-bold font-headline flex items-center gap-2 text-left">
                    <SearchCode className="h-6 w-6 text-primary" />
                    Forensic Sourcing: {category}
                </h2>
                <Alert className="bg-primary/5 border-primary/20 text-left text-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <AlertTitle className="text-left font-bold">Hunt Protocol V12 Active</AlertTitle>
                    <AlertDescription className="text-xs text-left leading-relaxed">
                        Optimized for inductive reconstruction. Commands the AI to stitch together data fragments from multiple sources to eliminate null records.
                    </AlertDescription>
                </Alert>
                <div className="p-4 bg-muted/30 border rounded-xl space-y-4 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Sequence Sync</Label>
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
                <Button onClick={handleCopy} size="lg" className="w-full gap-2 h-14 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-white text-left">
                    {isCopied ? <ClipboardCheck className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                    Copy V12 Discovery Prompt
                </Button>
            </div>
            <div className="space-y-2 text-left text-foreground">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 text-left"><Terminal className="h-3 w-3"/> Command Preview (V12)</Label>
                <ScrollArea className="h-[400px] border rounded-lg bg-slate-900 p-4 text-left">
                    <pre className="text-[10px] text-slate-400 font-mono whitespace-pre-wrap leading-tight text-left">{prompt}</pre>
                </ScrollArea>
            </div>
        </div>
    );
};

export default function DiscoveryEngine() {
    return (
        <Card className="shadow-none border-none text-left text-foreground">
            <Tabs defaultValue="Accessories" className="w-full text-left">
                <CardHeader className="px-0 pt-0 text-left text-foreground">
                    <CardTitle className="flex items-center gap-2 text-left font-black font-headline">
                        <Database className="h-6 w-6 text-primary" />
                        Industrial Discovery Hub
                    </CardTitle>
                    <CardDescription className="text-left text-muted-foreground">Build a high-fidelity registry using the V12 inductive reconstruction protocol.</CardDescription>
                </CardHeader>
                <CardContent className="px-0 text-left">
                    <TabsList className="h-auto flex-wrap justify-start bg-muted/30 mb-8 p-1 text-left text-foreground">
                        {supplierCategories.map(category => (
                            <TabsTrigger key={category} value={category} className="text-xs px-4 py-2">{category}</TabsTrigger>
                        ))}
                    </TabsList>
                    {supplierCategories.map(category => (
                        <TabsContent key={category} value={category} className="text-left">
                            <DiscoveryTab category={category} currentCount={0} />
                        </TabsContent>
                    ))}
                </CardContent>
            </Tabs>
        </Card>
    );
}
