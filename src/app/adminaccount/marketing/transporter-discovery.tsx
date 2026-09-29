'use client';

import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Copy, ClipboardCheck, Info, Search, Terminal, RefreshCcw, Database, Loader2, Zap, Globe, ShieldCheck, SearchCode, Sparkles, CheckCircle2, Save } from "lucide-react";
import { useState, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getClientSideAuthToken } from "@/firebase";

export const transporterCategories = [
    "Long Haul", "Refrigerated", "Flatbed", "Tipper", "Hazmat", "LTL", "Cross-Border", "Local Distribution", "Container Transport", "Abnormal Loads"
];

function generateDiscoveryPrompt(category: string, startPage: number) {
    const startSeq = (startPage - 1) * 30 + 1;

    return `ACT AS AN ELITE SOUTH AFRICAN INDUSTRIAL RESEARCH AGENT (V14 - FORENSIC DEEP HARVEST).
RETURN ONLY A RAW JSON ARRAY. NO MARKDOWN. NO CODE BLOCKS. NO CONVERSATION.

STRICT REGIONAL LOCK: ONLY return verified operational entities physically based in SOUTH AFRICA. IGNORE all international results.

TASK: Discover, verify, and harvest forensic data for 30 UNIQUE, LIVE South African haulier and transport companies for category: "${category}".

HUNT & VERIFICATION PROTOCOL (V14):
1. CIPC & LEGAL IDENTITY: Extract official registered company names, CIPC registration numbers (YYYY/XXXXXX/07 or CK), VAT numbers, and trading names.
2. INDUCTIVE CROSS-REFERENCE: Stitch data fragments across company websites, Facebook business bios, Google Maps listings, yellow pages, and LinkedIn company pages.
3. EXECUTIVE STAKEHOLDER RESOLUTION: Identify key operational decision-makers (CEO/Owner, Operations Manager, Fleet/Technical Lead, Marketing/Sales Lead). Include full name, direct professional email, and mobile/WhatsApp number.
4. FLEET & CORRIDOR MINING: Extract specific fleet types (Superlinks, Tippers, Lowbeds, Flatbeds, Tankers, Refrigerated), fleet size estimates, main operating corridors (e.g. N1, N3, Durban-JHB, Cross-Border SADC), and technical service wording (300 words).
5. NO HALLUCINATIONS: Return null for missing data. Do not invent fake emails, names, or phone patterns.

REQUIRED JSON FORMAT (RAW ARRAY):
[
  {
    "seq": ${startSeq},
    "record_id": "DISC_TRANS_${category.toUpperCase().replace(/\s/g, '_')}_[RAND_ID]",
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
    "fleetTypes": ["Superlinks", "Tippers"],
    "operatingCorridors": "N3 Durban-JHB, N1 Cape Town",
    "ceo": { "name": "FULL NAME", "role": "CEO/MD/Owner", "email": "DIRECT EMAIL", "mobile": "MOBILE/WHATSAPP" },
    "operationsManager": { "name": "FULL NAME", "role": "Operations Lead", "email": "DIRECT EMAIL", "mobile": "MOBILE" },
    "technicalManager": { "name": "FULL NAME", "role": "Fleet/Technical Lead", "email": "DIRECT EMAIL", "mobile": "MOBILE" },
    "marketingManager": { "name": "FULL NAME", "role": "Marketing/Sales Lead", "email": "DIRECT EMAIL", "mobile": "MOBILE" },
    "socialProfiles": { "facebook": "URL", "linkedin": "URL" },
    "minedServiceWording": "COMPREHENSIVE Substantive Technical Overview of Fleet Capacity, Corridors, and Logistics Specialization (300 words)",
    "sourceUrls": ["URL 1", "URL 2"],
    "confidence": "high"
  }
]`;
}

const DiscoveryTab = ({ category, currentCount }: { category: string, currentCount: number }) => {
    const { toast } = useToast();
    const [isCopied, setIsCopied] = useState(false);
    const [pageOverride, setPageOverride] = useState<number | ''>('');
    const [isExecutingAI, setIsExecutingAI] = useState(false);
    const [isSavingHarvest, setIsSavingHarvest] = useState(false);
    const [harvestedRecords, setHarvestedRecords] = useState<any[]>([]);
    
    const suggestedPage = Math.floor(currentCount / 30) + 1;
    const startPage = pageOverride !== '' ? Number(pageOverride) : suggestedPage;
    const prompt = useMemo(() => generateDiscoveryPrompt(category, startPage), [category, startPage]);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(prompt);
        setIsCopied(true);
        toast({ title: "V14 Haulier Prompt Ready", description: "Fleet types, corridors, CIPC, and executive contacts active." });
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
            toast({ title: "AI Discovery Complete", description: `Harvested ${records.length} South African haulier records.` });
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
                    payload: { partners: harvestedRecords, type: 'transporter' }
                }),
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || "Save failed.");
            toast({ title: "Harvest Saved", description: `Successfully imported ${harvestedRecords.length} records into the Transporter Registry.` });
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
                        Haulier Mapping: {category}
                    </h2>
                    <Alert className="bg-primary/5 border-primary/20 text-left">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        <AlertTitle className="text-left font-bold">Hunt Protocol V14 Active</AlertTitle>
                        <AlertDescription className="text-xs text-left leading-relaxed">
                            Fleet capacity, corridor specializations, CIPC registration, and direct operations contacts enabled for South African transporters.
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
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button onClick={handleCopy} size="lg" className="flex-1 gap-2 h-14 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-white">
                            {isCopied ? <ClipboardCheck className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                            Copy V14 Haulier Prompt
                        </Button>
                        <Button onClick={handleExecuteLiveAI} disabled={isExecutingAI} size="lg" variant="secondary" className="gap-2 h-14 font-black uppercase tracking-widest border-2 border-primary/20 text-primary hover:bg-primary/10">
                            {isExecutingAI ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                            {isExecutingAI ? "Harvesting..." : "Live AI Discovery"}
                        </Button>
                    </div>
                </div>
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 text-left"><Terminal className="h-3 w-3"/> Industrial Command (V14)</Label>
                    <ScrollArea className="h-[320px] border rounded-lg bg-slate-900 p-4 shadow-inner text-left">
                        <pre className="text-[10px] text-slate-400 font-mono whitespace-pre-wrap leading-tight text-left">{prompt}</pre>
                    </ScrollArea>
                </div>
            </div>

            {harvestedRecords.length > 0 && (
                <Card className="border-2 border-primary/20 shadow-xl bg-slate-50/50">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-xl font-bold font-headline flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Live Harvested Haulier Records ({harvestedRecords.length})
                            </CardTitle>
                            <CardDescription>Review the verified South African transport companies discovered by Gemini V14 before committing to the registry.</CardDescription>
                        </div>
                        <Button onClick={handleSaveHarvested} disabled={isSavingHarvest} className="gap-2 font-bold uppercase tracking-wider">
                            {isSavingHarvest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save All to Transporter Registry
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Table className="border bg-white rounded-lg">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Company Name</TableHead>
                                    <TableHead>Location / Corridors</TableHead>
                                    <TableHead>Fleet Specialization</TableHead>
                                    <TableHead>Email / Phone</TableHead>
                                    <TableHead>Executive Lead</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {harvestedRecords.map((r, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-bold">{r.companyName || r.tradingName || 'N/A'}</TableCell>
                                        <TableCell className="text-xs">{r.city ? `${r.city}, ${r.province || ''}` : (r.operatingCorridors || 'RSA')}</TableCell>
                                        <TableCell className="text-xs font-semibold">{Array.isArray(r.fleetTypes) ? r.fleetTypes.join(', ') : (r.industrial_category || category)}</TableCell>
                                        <TableCell className="text-xs font-mono">{r.email || r.phone || 'null'}</TableCell>
                                        <TableCell className="text-xs">
                                            {r.operationsManager?.name ? `Ops: ${r.operationsManager.name}` : (r.ceo?.name ? `CEO: ${r.ceo.name}` : 'N/A')}
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
