
'use client';

import { Suspense, useMemo, useState, useCallback, useEffect } from 'react';
import { notFound, useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase, useCollection, getClientSideAuthToken } from '@/firebase';
import { collection, doc, query, where, orderBy, limit } from 'firebase/firestore';
import { 
    Loader2, User, ArrowLeft, Building, Mail, Phone, Hash, Globe, Banknote, 
    FileSignature, Truck, ShieldCheck, Zap, Sparkles, BarChart3, AlertTriangle, SearchCode, Landmark, Scale, CheckCircle2, History 
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDateSafe, cn } from '@/lib/utils';
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { generateScorecard } from '@/ai/flows/lending-scorecard-flow';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';

/**
 * FORENSIC AUDIT HUB (ADMIN WORKSPACE)
 * Displays comparisons between manual input and extracted forensic data.
 */
function ForensicAuditWorkspace({ client }: { client: any }) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [scorecard, setScorecard] = useState<any>(null);

    // Fetch the hidden forensic extractions
    const extractionsQuery = useMemoFirebase(() => {
        if (!firestore || !client?.id) return null;
        return query(collection(firestore, `lendingClients/${client.id}/forensicExtractions`), orderBy('createdAt', 'desc'), limit(10));
    }, [firestore, client.id]);
    const { data: extractions, isLoading: isLoadingExtractions } = useCollection(extractionsQuery);

    const latestExtraction = useMemo(() => extractions?.[0], [extractions]);

    const handleRunAIAudit = async () => {
        setIsAnalyzing(true);
        try {
            const result = await generateScorecard({
                minedData: latestExtraction?.extraction || {},
                onboardedData: client,
                creditData: { rating: client.creditRating || 'unknown', turnover: client.annualTurnover }
            });

            const token = await getClientSideAuthToken();
            if (token) {
                await fetch('/api/admin', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'saveDigitalScorecard', payload: { clientId: client.id, scorecard: result } })
                });
            }

            setScorecard(result);
            toast({ title: "AI Audit Complete", description: "Exception report generated." });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Audit Failed", description: e.message });
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 text-left text-foreground">
            {/* DATA COMPARISON GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                <Card className="border-none shadow-xl bg-white text-left">
                    <CardHeader className="bg-slate-50 border-b p-6 text-left">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <User className="h-4 w-4" /> Member Declaration (Manual)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4 text-left">
                        <div className="flex justify-between border-b pb-2 text-left">
                            <span className="text-xs font-bold text-muted-foreground">Entity Name</span>
                            <span className="text-sm font-black">{client.companyLegalName || client.name}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2 text-left">
                            <span className="text-xs font-bold text-muted-foreground">Registration ID</span>
                            <span className="text-sm font-black">{client.registrationNumber || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2 text-left">
                            <span className="text-xs font-bold text-muted-foreground">Declared Turnover</span>
                            <span className="text-sm font-black">{formatCurrency(client.annualTurnover)}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl bg-white text-left">
                    <CardHeader className="bg-primary/5 border-b p-6 text-left">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2 text-left">
                            <SearchCode className="h-4 w-4" /> Vision AI Findings (Shadow Silo)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4 text-left text-foreground">
                        {isLoadingExtractions ? (
                            <div className="flex justify-center p-8"><Loader2 className="animate-spin h-6 w-6 text-primary" /></div>
                        ) : latestExtraction ? (
                            <>
                                <div className="flex justify-between border-b pb-2 text-left">
                                    <span className="text-xs font-bold text-muted-foreground text-left">Extracted Name</span>
                                    <span className={cn("text-sm font-black", latestExtraction.extraction.name !== (client.companyLegalName || client.name) && "text-destructive")}>
                                        {latestExtraction.extraction.name || 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between border-b pb-2 text-left">
                                    <span className="text-xs font-bold text-muted-foreground text-left">Extracted Reg #</span>
                                    <span className={cn("text-sm font-black", latestExtraction.extraction.registrationNumber !== client.registrationNumber && "text-destructive")}>
                                        {latestExtraction.extraction.registrationNumber || 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between border-b pb-2 text-left">
                                    <span className="text-xs font-bold text-muted-foreground text-left">AI confidence</span>
                                    <Badge className="bg-green-100 text-green-700">{(latestExtraction.confidence * 100).toFixed(0)}%</Badge>
                                </div>
                            </>
                        ) : (
                            <div className="p-10 text-center opacity-30 text-left">
                                <AlertTriangle className="h-10 w-10 mx-auto mb-2 text-left" />
                                <p className="text-xs font-black uppercase text-center">No Shadow Extractions Found</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-center text-center">
                <Button size="lg" className="h-14 px-12 font-black uppercase tracking-widest shadow-xl text-white text-center" onClick={handleRunAIAudit} disabled={isAnalyzing || !latestExtraction}>
                    {isAnalyzing ? <Loader2 className="animate-spin h-5 w-5 mr-2"/> : <Zap className="h-5 w-5 mr-2 fill-current" />}
                    Execute Exception Audit
                </Button>
            </div>

            {scorecard && (
                <Card className="border-2 border-primary bg-white shadow-2xl animate-in zoom-in-95 duration-500 text-left text-foreground">
                    <CardHeader className="bg-primary/10 border-b p-8 text-left text-foreground">
                        <div className="flex justify-between items-center text-left">
                            <div className="text-left text-foreground">
                                <CardTitle className="text-2xl font-black font-headline text-left">AI Audit Scorecard</CardTitle>
                                <CardDescription className="text-left text-foreground">Synthesized discrepancy report.</CardDescription>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black uppercase text-muted-foreground">Trust Probability</p>
                                <p className="text-4xl font-black text-primary">{scorecard.trustScore}%</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6 text-left">
                        <div className="p-6 bg-muted/30 rounded-2xl border-2 border-dashed text-left">
                             <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2 mb-4 text-left">
                                <ShieldCheck className="h-4 w-4" /> Strategic Recommendation
                            </h4>
                            <p className="text-sm leading-relaxed text-slate-800 text-left">{scorecard.recommendation}</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function ClientDetailComponent() {
    const params = useParams();
    const router = useRouter();
    const clientId = params.clientId as string;
    const firestore = useFirestore();

    const clientRef = useMemoFirebase(() => {
        if (!firestore || !clientId) return null;
        return doc(firestore, `lendingClients/${clientId}`);
    }, [firestore, clientId]);
    const { data: client, isLoading: isLoadingClient, error: clientError } = useDoc(clientRef);
    
    if (isLoadingClient) return <div className="flex justify-center p-40"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;
    if (clientError || !client) return notFound();

    return (
        <div className="space-y-8 text-left text-foreground">
            <div className="flex justify-between items-start text-left">
                <div className="flex items-center gap-4 text-left">
                    <div className="bg-primary/10 p-3 rounded-xl"><Building className="h-8 w-8 text-primary"/></div>
                    <div className="text-left text-foreground">
                        <h1 className="text-2xl font-black uppercase tracking-tight text-left">{client.companyLegalName || client.name}</h1>
                        <p className="text-muted-foreground text-sm font-medium text-left">Registry ID: {client.id} • Registered as {client.entityType}</p>
                    </div>
                </div>
                <Button variant="outline" asChild className="font-bold h-10"><Link href="/lending?view=desk"><ArrowLeft className="mr-2 h-4 w-4"/> Return to Ledger</Link></Button>
            </div>

            <Tabs defaultValue="audit" className="w-full text-left text-foreground">
                <TabsList className="bg-muted/50 p-1 h-auto flex-wrap justify-start text-left">
                    <TabsTrigger value="audit" className="gap-2 px-6 py-2.5 font-bold uppercase tracking-widest text-[10px]">
                        <SearchCode className="h-3.5 w-3.5" /> Forensic Audit
                    </TabsTrigger>
                    <TabsTrigger value="profile" className="gap-2 px-6 py-2.5 font-bold uppercase tracking-widest text-[10px]">
                        <Building className="h-3.5 w-3.5" /> Member Data
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="audit" className="mt-8 text-left">
                    <ForensicAuditWorkspace client={client} />
                </TabsContent>

                <TabsContent value="profile" className="mt-8 text-left">
                    <Card className="border-none shadow-xl bg-white text-left">
                        <CardHeader className="border-b bg-slate-50 p-6 text-left">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-left">Registry Record Details</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                            <div className="space-y-4 text-left text-foreground">
                                <div className="space-y-1 text-left">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground text-left">Member ID</Label>
                                    <p className="font-mono text-sm text-left">{client.id}</p>
                                </div>
                                <div className="space-y-1 text-left">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Fiduciary Mail</Label>
                                    <p className="font-bold text-left">{client.email || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="space-y-4 text-left text-foreground">
                                <div className="space-y-1 text-left">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Annual Turnover</Label>
                                    <p className="font-black text-primary text-xl text-left">{formatCurrency(client.annualTurnover)}</p>
                                </div>
                                <div className="space-y-1 text-left">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Operational Property</Label>
                                    <Badge variant={client.ownsOperatingProperty ? "default" : "outline"} className="text-left">{client.ownsOperatingProperty ? 'Owner' : 'Leasing'}</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default function ClientDetailPage() {
    return (
        <div className="container mx-auto px-4 py-16 bg-slate-50 min-h-screen text-left">
            <Suspense fallback={<div className="flex justify-center p-40"><Loader2 className="animate-spin h-16 w-16 text-primary" /></div>}>
                <ClientDetailComponent />
            </Suspense>
        </div>
    );
}
