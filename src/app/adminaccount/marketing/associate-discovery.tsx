'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, ClipboardCheck, Terminal, Database, ShieldCheck, Share2, Info, UserCheck, Zap, Target, Palette, Video, Star, AlertTriangle, SearchCode } from "lucide-react";
import * as React from "react";
import { useState, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const associateCategories = [
    "Digital Influencer",
    "Content Creator",
    "Digital Marketer",
    "Brand Strategist",
    "Industry Influencer",
    "Social Growth Lead"
];

function generateDiscoveryPrompt(category: string, startSeq: number = 1) {
    return `ACT AS AN ELITE SOUTH AFRICAN INDUSTRIAL RESEARCH AGENT (V6 - DEEP SCAVENGER). 
RETURN ONLY A RAW JSON ARRAY. NO MARKDOWN. NO CODE BLOCKS. NO CONVERSATION.

STRICT REGIONAL LOCK: ONLY return entities based in SOUTH AFRICA. IGNORE all international results.

TASK: Discover 30 UNIQUE "Micro-Influencers" or "Logistics Hubs" for: "${category}".

SCAVENGER PROTOCOL:
1. WEBSITE & SITEMAP: Find the official website. You MUST crawl the Sitemap, 'About Us', and 'Contact' pages to extract the names of the CEO and Marketing Manager.
2. IDENTITY RESOLUTION: Use extracted names to perform targeted SECONDARY search on LinkedIn, Facebook, and Instagram for that specific individual to resolve their direct professional email and mobile numbers.
3. SOCIAL CROSS-REFERENCE: Specially mine Facebook and Instagram bios for hidden WhatsApp/Mobile numbers.

CRITICAL INTEGRITY SHIELD: 
- REAL DATA ONLY: Do not invent names or guess emails based on patterns.
- NULL MANDATE: If data is not explicitly visible in search evidence after multi-platform checks, set the field to null.

RECORD KEY: Generate a unique "record_id" starting with "DISC_ASSOC_${category.toUpperCase().replace(/\s/g, '_')}_".

REQUIRED JSON FIELDS:
[
  {
    "seq": ${startSeq},
    "record_id": "...",
    "companyName": "CREATIVE HUB / BRAND NAME",
    "social_handle": "@username",
    "industrial_category": "${category}",
    "contact_person": "VERIFIED HUMAN NAME",
    "email": "ACTUAL VERIFIED EMAIL",
    "mobile": "ACTUAL VERIFIED MOBILE",
    "website": "OFFICIAL CHANNEL/URL",
    "follower_count": "e.g. 10k",
    "primary_channel": "TikTok/Instagram/LinkedIn",
    "notes": "Brief summary of industrial influence."
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
        toast({ title: "V6 Command Ready", description: "Deep sitemap and identity resolution protocol active." });
        setTimeout(() => setIsCopied(false), 3000);
    };

    return (
        <div className="grid md:grid-cols-2 gap-6 text-left text-foreground">
            <div className="space-y-4 text-left">
                <h2 className="text-2xl font-bold font-headline flex items-center gap-2 text-left">
                    <SearchCode className="h-6 w-6 text-primary" />
                    High-Velocity Scouting: {category}
                </h2>

                <Alert className="bg-primary/5 border-primary/20 text-left">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <AlertTitle className="text-left font-bold text-foreground">Sitemap & Identity Resolve</AlertTitle>
                    <AlertDescription className="text-xs text-left text-muted-foreground leading-relaxed">
                        This V6 command instructs the AI to mine employee lists from the sitemap, then pivot to social platforms to resolve their direct contact details.
                    </AlertDescription>
                </Alert>

                <div className="p-4 bg-muted/30 border rounded-xl space-y-4 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left text-foreground">Sequence Sync</Label>
                    <div className="space-y-1.5 text-left text-foreground">
                        <Label className="text-xs font-bold text-left text-foreground">Start Sequence #</Label>
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
                    Copy V6 Research Prompt
                </Button>
            </div>
            <div className="space-y-2 text-left text-foreground">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 text-left text-foreground"><Terminal className="h-3 w-3"/> AI Research Command (V6)</Label>
                <ScrollArea className="h-[400px] border rounded-lg bg-slate-900 p-4 text-left">
                    <pre className="text-[10px] text-slate-400 font-mono whitespace-pre-wrap leading-tight text-left">{prompt}</pre>
                </ScrollArea>
            </div>
        </div>
    );
};

export default function AssociateDiscoveryEngine() {
    return (
        <Card className="shadow-none border-none text-left text-foreground">
            <Tabs defaultValue="Digital Influencer" className="w-full text-left">
                <CardHeader className="px-0 pt-0 text-left text-foreground">
                    <CardTitle className="flex items-center gap-2 text-foreground font-black font-headline text-left text-foreground">
                        <Database className="h-6 w-6 text-primary" />
                        Associate Discovery Hub
                    </CardTitle>
                    <CardDescription className="text-left text-muted-foreground">Map South African logistics creators using high-fidelity V6 sitemap discovery.</CardDescription>
                </CardHeader>
                <CardContent className="px-0 text-left text-foreground">
                    <TabsList className="h-auto flex-wrap justify-start bg-muted/30 p-1 text-left text-foreground">
                        {associateCategories.map(category => (
                            <TabsTrigger key={category} value={category} className="text-xs px-4 py-2">
                                {category}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    {associateCategories.map(category => (
                        <TabsContent key={category} value={category} className="mt-8 text-left">
                            <DiscoveryTab category={category} currentCount={0} />
                        </TabsContent>
                    ))}
                </CardContent>
            </Tabs>
        </Card>
    );
}
