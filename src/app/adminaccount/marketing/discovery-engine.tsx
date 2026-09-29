'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Copy, ClipboardCheck, Info, Search, Terminal, Loader2, RefreshCcw, Database, Zap, AlertTriangle, Globe, ShieldCheck, SearchCode, Sparkles, CheckCircle2, Save } from "lucide-react";
import * as React from "react";
import { useState, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getClientSideAuthToken } from "@/firebase";

export const supplierCategories = [
    "Accessories", "Air", "Anti-Theft Devices", "Auto Electrical", "Batteries", 
    "Brakes", "Cleaning Products", "Diesel", "Differential", "Engine Refurbish",
    "Filters", "Injectors", "Lights", "Mechanical repairs", "Oils & Lubricants", 
    "Parts", "Prop Shafts", "Second Hand Trailers", "Second Hand Trucks", "Transport", 
    "Tarpaulins", "Tow in", "Trailer repairs", "Truck Accessories", "Truck Parts", 
    "Truck repairs", "Turbo", "Tyres"
];

function generateDiscoveryPrompt(category: string, startSeq: number = 1) {
    return `ACT AS AN ELITE SOUTH AFRICAN INDUSTRIAL RESEARCH AGENT (V14 - FORENSIC DEEP HARVEST).
RETURN ONLY A RAW JSON ARRAY. NO MARKDOWN. NO CODE BLOCKS. NO CONVERSATION.

STRICT REGIONAL LOCK: ONLY return verified operational entities physically based in SOUTH AFRICA. IGNORE all international results.

TASK: Discover, verify, and harvest forensic data for 30 UNIQUE, LIVE South African suppliers for category: "${category}".

HUNT & VERIFICATION PROTOCOL (V14):
1. CIPC & LEGAL IDENTITY: Extract official registered company names, CIPC registration numbers (YYYY/XXXXXX/07 or CK), VAT numbers, and trading names.
2. INDUCTIVE CROSS-REFERENCE: Stitch data fragments across company websites, Facebook business bios, Google Maps listings, yellow pages (yellosa, sayellow, braby), and LinkedIn company pages.
3. EXECUTIVE STAKEHOLDER RESOLUTION: Identify key operational decision-makers (CEO/Owner, Operations Manager, Technical/Fleet Manager, Marketing/Sales Lead). Include full name, direct professional email, and mobile/WhatsApp number.
4. OPERATIONAL CAPABILITY & FLEET MINING: Extract detailed technical wording (300 words), operational regions/provinces served, specific fleet/service capabilities, and payment/credit terms.
5. NO HALLUCINATIONS: Return null for missing data. Do not invent fake emails, names, or phone patterns.

REQUIRED JSON FORMAT (RAW ARRAY):
[
  {
    "seq": ${startSeq},
    "record_id": "DISC_SUPP_${category.toUpperCase().replace(/\s/g, '_')}_[RAND_ID]",
    "companyName": "OFFICIAL REGISTERED NAME",
    "tradingName": "PUBLIC TRADING NAME",
    "cipcRegNumber": "RSA CIPC REG NUMBER OR NULL",
    "industrial_category": "${category}",
    "website": "OFFICIAL VERIFIED URL",
    "email": "VERIFIED GENERAL EMAIL",
    "phone": "RSA LANDLINE OR PRIMARY PHONE",
    "whatsappNumber": "VERIFIED WHATSAPP NUMBER OR NULL",
    "address": "FULL PHYSICAL RSA ADDRESS",
    "city": "CITY",
    "province": "PROVINCE",
    "ceo": { "name": "FULL NAME", "role": "CEO/MD/Owner", "email": "DIRECT EMAIL", "mobile": "MOBILE/WHATSAPP" },
    "operationsManager": { "name": "FULL NAME", "role": "Operations Lead", "email": "DIRECT EMAIL", "mobile": "MOBILE" },
    "technicalManager": { "name": "FULL NAME", "role": "Technical/Fleet Lead", "email": "DIRECT EMAIL", "mobile": "MOBILE" },
    "marketingManager": { "name": "FULL NAME", "role": "Marketing/Sales Lead", "email": "DIRECT EMAIL", "mobile": "MOBILE" },
    "socialProfiles": { "facebook": "URL", "linkedin": "URL", "instagram": "URL" },
    "minedServiceWording": "COMPREHENSIVE Substantive Technical Overview of Services, Capacity, and Specializations (300 words)",
    "operationalCoverage": "RSA Provinces/Corridors Served",
    "sourceUrls": ["URL 1", "URL 2"],
    "confidence": "high"
  }
]`;
}

const DiscoveryTab = ({ category, currentCount }: { category: string, currentCount: number }) => {
    const { toast } = useToast();
    const [isCopied, setIsCopied] = useState(false);
    const [seqOverride, setSeqOverride] = useState<number | ''>('');
    const [isExecutingAI, setIsExecutingAI] = useState(false);
    const [isSavingHarvest, setIsSavingHarvest] = useState(false);
    const [harvestedRecords, setHarvestedRecords] = useState<any[]>([]);
    
    const startSeq = useMemo(() => (seqOverride !== '' ? Number(seqOverride) : currentCount + 1), [seqOverride, currentCount]);
    const prompt = generateDiscoveryPrompt(category, startSeq);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(prompt);
        setIsCopied(true);
        toast({ title: "V14 Command Ready", description: "CIPC verification, executive contacts & WhatsApp mining active." });
        setTimeout(() => setIsCopied(false), 3000);
    };

    const handleExecuteLiveAI = async () => {
        setIsExecutingAI(true);
        setHarvestedRecords([]);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Auth required");
            const response = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'liveAIDiscovery', payload: { prompt, category } }),
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || "AI Discovery failed.");
            const records = result.records || [];
            setHarvestedRecords(records);
            toast({ title: "AI Discovery Complete", description: `Harvested ${records.length} South African supplier records.` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Discovery Error", description: e.message });
        } finally {
            setIsExecutingAI(false);
        }
    };

    const handleSaveHarvested = async () => {
        if (!harvestedRecords.length) return;
        setIsSavingHarvest(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Auth failed");
            const response = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'bulkSavePartners',
                    payload: { partners: harvestedRecords, type: 'supplier' }
                }),
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || "Save failed.");
            toast({ title: "Harvest Saved", description: `Successfully imported ${harvestedRecords.length} records into the Supplier Registry.` });
            setHarvestedRecords([]);
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Save Failed", description: e.message });
        } finally {
            setIsSavingHarvest(false);
        }
    };

    return (
        <div className="space-y-6 text-left text-foreground">
            <div className="grid md:grid-cols-2 gap-6 text-left text-foreground">
                <div className="space-y-4 text-left">
                    <h2 className="text-2xl font-bold font-headline flex items-center gap-2 text-left">
                        <SearchCode className="h-6 w-6 text-primary" />
                        Forensic Sourcing: {category}
                    </h2>
                    <Alert className="bg-primary/5 border-primary/20 text-left text-foreground">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        <AlertTitle className="text-left font-bold">Hunt Protocol V14 Active</AlertTitle>
                        <AlertDescription className="text-xs text-left leading-relaxed">
                            CIPC registration, WhatsApp number, direct executive contacts, and deep service capacity mining enabled for South African entities.
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
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button onClick={handleCopy} size="lg" className="flex-1 gap-2 h-14 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-white text-left">
                            {isCopied ? <ClipboardCheck className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                            Copy V14 Prompt
                        </Button>
                        <Button onClick={handleExecuteLiveAI} disabled={isExecutingAI} size="lg" variant="secondary" className="gap-2 h-14 font-black uppercase tracking-widest border-2 border-primary/20 text-primary hover:bg-primary/10">
                            {isExecutingAI ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                            {isExecutingAI ? "Harvesting..." : "Live AI Discovery"}
                        </Button>
                    </div>
                </div>
                <div className="space-y-2 text-left text-foreground">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 text-left"><Terminal className="h-3 w-3"/> Command Preview (V14)</Label>
                    <ScrollArea className="h-[320px] border rounded-lg bg-slate-900 p-4 text-left">
                        <pre className="text-[10px] text-slate-400 font-mono whitespace-pre-wrap leading-tight text-left">{prompt}</pre>
                    </ScrollArea>
                </div>
            </div>

            {harvestedRecords.length > 0 && (
                <Card className="border-2 border-primary/20 shadow-xl bg-slate-50/50">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-xl font-bold font-headline flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Live Harvested Records ({harvestedRecords.length})
                            </CardTitle>
                            <CardDescription>Review the verified South African entities discovered by Gemini V14 before committing to the registry.</CardDescription>
                        </div>
                        <Button onClick={handleSaveHarvested} disabled={isSavingHarvest} className="gap-2 font-bold uppercase tracking-wider">
                            {isSavingHarvest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save All to Registry
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Table className="border bg-white rounded-lg">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Company Name</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Contact Email</TableHead>
                                    <TableHead>Phone / WhatsApp</TableHead>
                                    <TableHead>Executive Contacts</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {harvestedRecords.map((r, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-bold">{r.companyName || r.tradingName || 'N/A'}</TableCell>
                                        <TableCell className="text-xs">{r.city ? `${r.city}, ${r.province || ''}` : (r.address || 'RSA')}</TableCell>
                                        <TableCell className="text-xs font-mono">{r.email || 'null'}</TableCell>
                                        <TableCell className="text-xs font-mono">{r.phone || r.whatsappNumber || 'null'}</TableCell>
                                        <TableCell className="text-xs">
                                            {r.ceo?.name ? `CEO: ${r.ceo.name}` : (r.marketingManager?.name ? `Mkt: ${r.marketingManager.name}` : 'N/A')}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
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
