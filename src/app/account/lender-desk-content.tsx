
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    Loader2, ClipboardList, CheckCircle, FileText, Send, Landmark, 
    ArrowRight, UserCheck, ShieldCheck, Zap, Info, Search, Building, Clock, Mail, Phone, FileSignature,
    AlertTriangle, RefreshCcw, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getClientSideAuthToken, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDateSafe, cn } from '@/lib/utils';
import { 
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

/**
 * LENDER DESK (CRM)
 * Primary hub for financiers to manage deal flow and concluded agreements.
 * Features automated forensic matching based on granular per-product parameters.
 */

async function performAdminAction(token: string, action: string, payload: any) {
    const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
        cache: 'no-store'
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || `API Error: ${action}`);
    return result.data;
}

function OpportunityDetail({ 
    opportunity, 
    onClose, 
    onStatusChange 
}: { 
    opportunity: any, 
    onClose: () => void, 
    onStatusChange: () => void 
}) {
    const { toast } = useToast();
    const [isIssuing, setIsIssuing] = useState(false);
    const [view, setView] = useState<'details' | 'docs' | 'letter'>('details');

    const handleIssueLetter = async () => {
        setIsIssuing(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;

            await performAdminAction(token, 'logCommunication', {
                partnerId: opportunity.id,
                subject: 'Facility Letter Issued',
                notes: `Issued automated facility letter for ${formatCurrency(opportunity.amountRequested)} via Lending Desk.`,
                collection: 'leads'
            });

            toast({ title: "Letter Issued", description: "The borrower has been notified of the conditional offer." });
            onStatusChange();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Failed to issue letter" });
        } finally {
            setIsIssuing(false);
        }
    };

    return (
        <Card className="animate-in slide-in-from-right-4 duration-500 border-primary/20 shadow-2xl text-left">
            <CardHeader className="bg-slate-900 text-white rounded-t-lg">
                <div className="flex justify-between items-center text-left">
                    <div className="text-left">
                        <CardTitle className="text-2xl font-black font-headline flex items-center gap-3 text-white text-left">
                            <Landmark className="h-6 w-6 text-primary" />
                            {opportunity.companyName || 'Provisional Borrower'}
                        </CardTitle>
                        <CardDescription className="text-slate-400">Registry ID: {opportunity.id}</CardDescription>
                    </div>
                    <Button variant="ghost" className="text-white hover:text-primary" onClick={onClose}>Close</Button>
                </div>
            </CardHeader>
            <div className="flex border-b bg-muted/30 px-6 text-left">
                <Button variant={view === 'details' ? 'secondary' : 'ghost'} className="rounded-none border-b-2 border-transparent h-12" onClick={() => setView('details')}>Forensic Profile</Button>
                <Button variant={view === 'docs' ? 'secondary' : 'ghost'} className="rounded-none border-b-2 border-transparent h-12" onClick={() => setView('docs')}>Documentation</Button>
                <Button variant={view === 'letter' ? 'secondary' : 'ghost'} className="rounded-none border-b-2 border-transparent h-12" onClick={() => setView('letter')}>Facility Letter</Button>
            </div>
            <CardContent className="p-8 space-y-8 text-left">
                {view === 'details' && (
                    <div className="space-y-6 text-left">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                            <div className="space-y-1 text-left">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Requested Capital</Label>
                                <p className="text-3xl font-black text-primary">{formatCurrency(opportunity.amountRequested)}</p>
                                <Badge variant="outline" className="mt-1 capitalize">{opportunity.fundingNeed?.replace(/-/g, ' ') || 'Loan'}</Badge>
                            </div>
                            <div className="space-y-1 text-left">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Annual Turnover</Label>
                                <p className="text-2xl font-bold">{formatCurrency(opportunity.annualTurnover)}</p>
                                <p className="text-[10px] text-muted-foreground font-bold">Years in Business: {opportunity.yearsInBusiness}</p>
                            </div>
                            <div className="space-y-1 text-left">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Risk Disclosure</Label>
                                <div className="flex flex-col gap-1.5 pt-1 text-left">
                                    <Badge variant={opportunity.hasJudgements ? "destructive" : "secondary"} className="w-fit text-[9px] uppercase font-bold">Judgements: {opportunity.hasJudgements ? 'YES' : 'NO'}</Badge>
                                    <Badge variant={opportunity.hasDefaults ? "destructive" : "secondary"} className="w-fit text-[9px] uppercase font-bold">Defaults: {opportunity.hasDefaults ? 'YES' : 'NO'}</Badge>
                                </div>
                            </div>
                        </div>
                        <Separator />
                        <div className="space-y-2 text-left">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Purpose of Funds</Label>
                            <p className="text-sm italic leading-relaxed text-muted-foreground">"{opportunity.purpose}"</p>
                        </div>
                    </div>
                )}

                {view === 'docs' && (
                    <div className="py-12 text-center space-y-4">
                        <FileSignature className="h-12 w-12 mx-auto text-muted-foreground opacity-20" />
                        <div className="space-y-1 text-center">
                            <h4 className="font-bold text-foreground">Pending Document Pack</h4>
                            <p className="text-xs text-muted-foreground max-w-xs mx-auto">Borrower has not yet uploaded finalized documents for this specific enquiry.</p>
                        </div>
                        <Button variant="outline" size="sm">Request Document Pack</Button>
                    </div>
                )}

                {view === 'letter' && (
                    <div className="space-y-6 text-left">
                        <div className="bg-slate-50 p-6 rounded-xl border border-dashed text-left">
                            <h4 className="font-bold text-sm mb-4 border-b pb-2 flex items-center gap-2"><FileText className="h-4 w-4" /> Automated Facility Letter Template</h4>
                            <div className="space-y-3 font-mono text-[11px] text-muted-foreground text-left">
                                <p>OFFER TO: {opportunity.companyName}</p>
                                <p>AMOUNT: {formatCurrency(opportunity.amountRequested)}</p>
                                <p>TERM: {opportunity.preferredTerm || 'TBD'}</p>
                                <p>SUBJECT TO: FICA/KYC Verification and Asset Inspection.</p>
                            </div>
                        </div>
                        <Button className="w-full h-12 font-bold gap-2" onClick={handleIssueLetter} disabled={isIssuing}>
                            {isIssuing ? <Loader2 className="animate-spin h-4 w-4" /> : <Send className="h-4 w-4" />}
                            Issue Facility Letter via Registry
                        </Button>
                    </div>
                )}
            </CardContent>
            <CardFooter className="bg-slate-50 border-t p-6 rounded-b-lg flex justify-between">
                <div className="flex gap-2 text-left">
                    <Button variant="outline" size="sm" className="gap-2"><Mail className="h-3.5 w-3.5" /> Message Borrower</Button>
                    <Button variant="outline" size="sm" className="gap-2"><Phone className="h-3.5 w-3.5" /> Direct Line</Button>
                </div>
                <Button className="bg-green-600 hover:bg-green-700 font-bold" onClick={() => toast({ title: "Workflow Concluded", description: "Agreement marked as finalized." })}>Conclude Agreement</Button>
            </CardFooter>
        </Card>
    );
}

export default function LenderDeskContent() {
    const { user, isUserLoading } = useUser();
    const { toast } = useToast();
    const [opportunities, setOpportunities] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOpportunity, setSelectedOpportunity] = useState<any | null>(null);

    const isAdmin = user && (
        user.email === 'beyondtransport@gmail.com' || 
        user.email === 'mkoton100@gmail.com' || 
        user.email === 'michael@logisticsflow.co.za'
    );

    const lenderParams = useMemo(() => user?.companyData?.lendingParams, [user]);

    const loadOpportunities = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;

            // Fetch all entries that have financial enquiry data
            const result = await performAdminAction(token, 'searchRegistry', { 
                type: 'all', 
                limit: 500 
            });
            
            // 1. Filter for valid enquiries
            const allEnquiries = (result || []).filter((r: any) => !!r.amountRequested);
            
            // 2. APPLY V2 FORENSIC MATCHING ENGINE (Per-Product Logic + Origination Route)
            const matched = allEnquiries.filter((enquiry: any) => {
                
                // 2a. ORIGINATION ROUTE FILTERING
                // If this is a 3rd Party Lender (non-admin), only show 'market' broadcast applications.
                // Admins see both 'direct' and 'market'.
                if (!isAdmin && enquiry.originationType === 'direct') {
                    return false;
                }

                if (!lenderParams) return true; // Show all if params not set

                const { 
                    productCriteria = {}, minAnnualTurnover, minYearsInBusiness, 
                    requiresNoJudgements, requiresNoDefaults, requiresNoArrears,
                    entityTypes, serviceRegions, assetTypes
                } = lenderParams;

                // 2b. Product Specific Check
                const productKey = enquiry.fundingNeed; // e.g. 'loan-pv-term'
                const criteria = productCriteria[productKey];
                
                // If the product is not enabled by the lender, they shouldn't see it
                if (criteria && !criteria.enabled) return false;

                // If enabled, check specific range
                if (criteria && criteria.enabled) {
                    if (criteria.minAmount && enquiry.amountRequested < criteria.minAmount) return false;
                    if (criteria.maxAmount && enquiry.amountRequested > criteria.maxAmount) return false;
                    // Check term alignment if specified
                    if (criteria.preferredTerms?.length > 0 && enquiry.preferredTerm) {
                        if (!criteria.preferredTerms.includes(enquiry.preferredTerm)) return false;
                    }
                }

                // 2c. Global Entity Checks
                if (minAnnualTurnover && enquiry.annualTurnover < minAnnualTurnover) return false;
                if (minYearsInBusiness && enquiry.yearsInBusiness < minYearsInBusiness) return false;
                if (entityTypes?.length > 0 && !entityTypes.includes(enquiry.entityType)) return false;

                // 2d. Global Risk Checks
                if (requiresNoJudgements && enquiry.hasJudgements) return false;
                if (requiresNoDefaults && enquiry.hasDefaults) return false;
                if (requiresNoArrears && enquiry.hasArrears) return false;

                // 2e. Regional & Asset Portfolio Checks
                if (serviceRegions?.length > 0 && !serviceRegions.includes(enquiry.primaryRegion)) return false;
                
                // Asset Check (Match if ANY asset in enquiry matches lender's asset specialization)
                if (assetTypes?.length > 0 && enquiry.assets?.length > 0) {
                    const hasMatch = enquiry.assets.some((a: any) => 
                        assetTypes.includes(a.vehicleClass) || assetTypes.includes(a.assetCategory)
                    );
                    if (!hasMatch) return false;
                }

                return true;
            });
            
            setOpportunities(matched);
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Desk Error", description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [toast, lenderParams, isAdmin]);

    useEffect(() => {
        if (!isUserLoading && user) loadOpportunities();
    }, [isUserLoading, user, loadOpportunities]);

    const columns: ColumnDef<any>[] = [
        {
            header: 'Borrower Entity',
            cell: ({ row }) => (
                <div className="flex flex-col text-left">
                    <span className="font-bold text-foreground text-left">{row.original.companyName || 'Provisional Borrower'}</span>
                    <div className="flex items-center gap-1.5 mt-1 text-left">
                         <Badge variant="outline" className="bg-green-50 text-green-700 border-green-100 text-[8px] h-3.5 uppercase font-black text-left">
                            <ShieldCheck className="h-2.5 w-2.5 mr-1" /> Forensic Match
                        </Badge>
                        <Badge variant="secondary" className="text-[8px] h-3.5 uppercase font-black bg-slate-100 text-left">
                            {row.original.originationType === 'direct' ? 'Direct to Platform' : 'Market Broadcast'}
                        </Badge>
                    </div>
                </div>
            )
        },
        {
            header: 'Requested Amount',
            cell: ({ row }) => (
                <div className="flex flex-col text-left">
                    <span className="font-black text-primary">{formatCurrency(row.original.amountRequested)}</span>
                    <Badge variant="outline" className="w-fit text-[8px] h-3.5 mt-0.5 uppercase text-left">{row.original.fundingNeed || 'Working Capital'}</Badge>
                </div>
            )
        },
        {
            header: 'Risk Summary',
            cell: ({ row }) => (
                <div className="flex flex-col gap-1 text-left">
                    <div className="flex gap-1.5 items-center text-left">
                        {!row.original.hasJudgements ? <ShieldCheck className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-destructive" />}
                        <span className="text-[10px] font-bold">{row.original.yearsInBusiness}y Operation</span>
                    </div>
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest text-left">{row.original.primaryRegion || 'National'}</span>
                </div>
            )
        },
        {
            header: 'Status',
            cell: ({ row }) => (
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 capitalize text-[9px] font-black tracking-widest text-left">
                    {row.original.status || 'New Opportunity'}
                </Badge>
            )
        },
        {
            id: 'actions',
            header: <div className="text-right">Actions</div>,
            cell: ({ row }) => (
                <div className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedOpportunity(row.original)} className="h-8 text-[10px] font-black uppercase tracking-widest gap-1.5 text-left">
                        Open Desk <ArrowRight className="h-3 w-3" />
                    </Button>
                </div>
            )
        }
    ];

    if (isUserLoading || isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-left">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-sm font-black uppercase tracking-widest text-muted-foreground text-left">Initializing Lending Desk...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 text-left text-foreground">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 text-left">
                <div className="text-left text-foreground">
                    <h1 className="text-3xl font-black font-headline tracking-tight text-left">Lending Desk (CRM)</h1>
                    <p className="text-muted-foreground text-left">Management of inbound deal flow and active financing agreements.</p>
                </div>
                <div className="flex gap-2 text-left">
                    <Button variant="outline" size="sm" onClick={loadOpportunities} disabled={isLoading}>
                        <RefreshCcw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                        Refresh Queue
                    </Button>
                </div>
            </div>

            {selectedOpportunity ? (
                <OpportunityDetail 
                    opportunity={selectedOpportunity} 
                    onClose={() => setSelectedOpportunity(null)} 
                    onStatusChange={loadOpportunities}
                />
            ) : (
                <Tabs defaultValue="matches" className="w-full text-left text-foreground">
                    <TabsList className="bg-muted/30 p-1 h-auto flex-wrap justify-start text-left">
                        <TabsTrigger value="matches" className="gap-2 px-6 py-2.5 font-bold uppercase tracking-widest text-[10px]">
                            <Zap className="h-3.5 w-3.5" /> Matched Opportunities
                        </TabsTrigger>
                        <TabsTrigger value="pipeline" className="gap-2 px-6 py-2.5 font-bold uppercase tracking-widest text-[10px]">
                            <ClipboardList className="h-3.5 w-3.5" /> Active Pipeline
                        </TabsTrigger>
                        <TabsTrigger value="concluded" className="gap-2 px-6 py-2.5 font-bold uppercase tracking-widest text-[10px]">
                            <ShieldCheck className="h-3.5 w-3.5" /> Concluded Agreements
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="matches" className="mt-8 text-left">
                        <Card className="border-none shadow-xl text-left">
                            <CardContent className="pt-6 text-left">
                                {opportunities.length > 0 ? (
                                    <DataTable columns={columns} data={opportunities} />
                                ) : (
                                    <div className="py-32 text-center space-y-4 text-left">
                                        <div className="bg-muted p-6 rounded-full w-fit mx-auto opacity-20">
                                            <Search className="h-12 w-12 text-muted-foreground" />
                                        </div>
                                        <div className="text-center text-foreground">
                                            <h3 className="text-xl font-bold">No Matches Yet</h3>
                                            <p className="text-muted-foreground max-w-xs mx-auto mt-2">Adjust your **Lending Focus** parameters or check for new market broadcasts.</p>
                                        </div>
                                        <Button variant="outline" asChild className="mt-4"><Link href="/lending?view=lending-focus">Review My Focus</Link></Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="pipeline" className="mt-8 text-left">
                        <div className="py-20 text-center border-2 border-dashed rounded-2xl bg-muted/10 text-left">
                            <Clock className="h-10 w-10 mx-auto text-muted-foreground opacity-30" />
                            <p className="text-sm font-bold text-muted-foreground mt-4 text-center">Your active deal pipeline will appear here once you engage with an opportunity.</p>
                        </div>
                    </TabsContent>

                    <TabsContent value="concluded" className="mt-8 text-left">
                         <div className="py-20 text-center border-2 border-dashed rounded-2xl bg-muted/10 text-left text-foreground">
                            <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground opacity-30" />
                            <p className="text-sm font-bold text-muted-foreground mt-4 text-center">Historical agreements and finalized contracts will be archived here.</p>
                        </div>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
