'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getClientSideAuthToken, useUser, useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { Loader2, Zap, Sparkles, Target, Landmark, Store, DollarSign, ArrowRight, ShieldCheck, BarChart3, TrendingUp, Search, CheckCircle2, History, AlertCircle, Eye, MousePointer2, UserCheck, Layers, Info, Smartphone, ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { collection, query, orderBy, doc, where } from 'firebase/firestore';
import { formatCurrency, formatDateSafe, cn } from '@/lib/utils';
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const audiences = [
    { id: 'transporters', label: 'Transporters (Registry)', icon: Target },
    { id: 'suppliers', label: 'Suppliers (Registry)', icon: Store },
    { id: 'finance', label: 'Finance Partners', icon: Landmark },
    { id: 'all', label: 'Global Platform', icon: Zap },
];

function YieldDrillDown({ campaignId }: { campaignId: string }) {
    const firestore = useFirestore();
    const interactionsQuery = useMemoFirebase(() => {
        if (!firestore || !campaignId) return null;
        return query(
            collection(firestore, 'auditLogs'),
            where('metadata.campaignId', '==', campaignId),
            orderBy('timestamp', 'desc')
        );
    }, [firestore, campaignId]);

    const { data: logs, isLoading } = useCollection(interactionsQuery);

    return (
        <DialogContent className="max-w-4xl text-left text-foreground">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2 font-black text-left">
                    <BarChart3 className="h-6 w-6 text-primary" />
                    Behavioral Yield Audit
                </DialogTitle>
                <DialogDescription className="text-left text-foreground">Exact breakdown of which community members engaged with your promotion.</DialogDescription>
            </DialogHeader>
            <div className="py-6 text-left">
                {isLoading ? (
                    <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>
                ) : logs && logs.length > 0 ? (
                    <ScrollArea className="h-[400px] rounded-xl border bg-white shadow-inner text-left">
                        <Table>
                            <TableHeader className="bg-slate-50 sticky top-0 z-10 text-left text-foreground">
                                <TableRow>
                                    <TableHead className="text-[10px] font-black uppercase text-left">Timestamp</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-left">Entity (Viewer)</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-left">Action Taken</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.map((log: any) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="text-[10px] font-mono text-muted-foreground">{formatDateSafe(log.timestamp, "dd MMM, HH:mm")}</TableCell>
                                        <TableCell className="font-bold text-xs">{log.companyName || 'Anonymous Hub'}</TableCell>
                                        <TableCell>
                                            <Badge variant={log.action === 'ad_click' ? 'default' : 'outline'} className="gap-1 px-2 h-5 text-[8px] uppercase font-black text-left">
                                                {log.action === 'ad_click' ? <MousePointer2 className="h-2 w-2" /> : <Eye className="h-2 w-2" />}
                                                {log.action === 'ad_click' ? 'Clicked' : 'Viewed'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                ) : (
                    <div className="text-center py-20 opacity-30 italic text-left text-foreground">No behavioral data recorded for this campaign yet.</div>
                )}
            </div>
        </DialogContent>
    );
}

export default function PromoteNodeContent() {
    const { user, isUserLoading } = useUser();
    const { toast } = useToast();
    const firestore = useFirestore();
    
    const [title, setTitle] = useState('');
    const [target, setTarget] = useState('all');
    const [batches, setBatches] = useState(1);
    const [creativeUrl, setCreativeUrl] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const adPricingRef = useMemoFirebase(() => firestore ? doc(firestore, 'configuration', 'adPricing') : null, [firestore]);
    const { data: adPricing } = useDoc<any>(adPricingRef);

    const campaignsQuery = useMemoFirebase(() => {
        if (!firestore || !user?.companyId) return null;
        return query(collection(firestore, `companies/${user.companyId}/adCampaigns`), orderBy('createdAt', 'desc'));
    }, [firestore, user?.companyId]);
    const { data: campaigns, isLoading: isCampaignsLoading, forceRefresh: forceRefresh } = useCollection(campaignsQuery);

    const availableBalance = user?.companyData?.availableBalance || 0;
    
    const batchSize = adPricing?.instanceBatchSize || 1000;
    const pricePerBatch = adPricing?.pricePerBatch || 100;
    
    const totalCost = batches * pricePerBatch;
    const totalViews = batches * batchSize;

    const handleLaunch = async () => {
        if (!title || !creativeUrl) {
            toast({ variant: 'destructive', title: "Details Required", description: "Please enter a title and attach a creative URL from the Studio." });
            return;
        }
        if (totalCost > availableBalance) {
            toast({ variant: 'destructive', title: "Insufficient Funds", description: "Top-up your wallet to launch this campaign." });
            return;
        }

        setIsProcessing(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Auth failed.");

            const payload = {
                companyId: user.companyId,
                amount: totalCost,
                description: `Visibility Purchase: ${totalViews.toLocaleString()} views (${batches} batch/es)`,
                planType: 'ad_broadcast',
                title,
                targetAudience: target,
                creativeUrl,
                totalInstances: totalViews
            };

            const response = await fetch('/api/payWithWallet', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Payment failed.");

            toast({ title: "Campaign Launched!", description: "Your visibility boost is now in audit." });
            forceRefresh();
            setTitle('');
            setCreativeUrl('');
            setBatches(1);
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Launch Failed", description: e.message });
        } finally {
            setIsProcessing(false);
        }
    };

    const columns: ColumnDef<any>[] = [
        { 
            header: 'Campaign Label', 
            cell: ({row}) => (
                <div className="flex flex-col text-left">
                    <span className="font-bold text-foreground text-left">{row.original.title}</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-mono text-left">{row.original.id}</span>
                </div>
            )
        },
        { 
            header: 'Consumption', 
            cell: ({row}) => (
                <div className="flex flex-col text-left text-foreground">
                    <span className="font-black text-primary text-left">{(row.original.metrics?.impressions || 0).toLocaleString()} / {row.original.totalInstances?.toLocaleString()}</span>
                    <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest text-left">Views Served</p>
                </div>
            )
        },
        { 
            header: 'Yield', 
            cell: ({row}) => (
                <div className="flex items-center gap-2 text-left">
                    <div className="flex flex-col text-left text-foreground text-left">
                         <span className="font-black text-blue-600 text-left">{row.original.metrics?.clicks || 0}</span>
                         <p className="text-[8px] font-black uppercase text-blue-600/60 tracking-widest text-left">Direct Clicks</p>
                    </div>
                </div>
            ) 
        },
        { 
            header: 'Status', 
            cell: ({row}) => (
                <Badge variant={row.original.status === 'active' ? 'default' : 'secondary'} className="capitalize text-[9px] font-black tracking-widest text-left">
                    {row.original.status || 'Draft'}
                </Badge>
            )
        },
        {
            id: 'actions',
            header: <div className="text-right">Audit</div>,
            cell: ({row}) => (
                <div className="text-right text-left text-foreground">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase gap-1.5 text-left text-foreground">
                                <UserCheck className="h-3.5 w-3.5" /> Drill-Down
                            </Button>
                        </DialogTrigger>
                        <YieldDrillDown campaignId={row.original.id} />
                    </Dialog>
                </div>
            )
        }
    ];

    if (isUserLoading) return <div className="flex justify-center p-20 text-center"><Loader2 className="animate-spin h-10 w-10 text-primary mx-auto" /><p className="text-xs font-black uppercase tracking-widest text-muted-foreground text-center">Loading Hub...</p></div>;

    return (
        <div className="space-y-12 text-left text-foreground">
            <div className="text-left space-y-1">
                <h1 className="text-4xl font-black font-headline tracking-tight text-left">Industrial Promotion Hub</h1>
                <p className="text-muted-foreground text-lg text-left">Maximize your forensic visibility and secure prioritized search rankings.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 text-left text-foreground">
                <div className="lg:col-span-2 space-y-10 text-left">
                    <Card className="shadow-2xl border-none bg-white text-left overflow-hidden">
                        <CardHeader className="bg-slate-900 text-white p-8">
                            <div className="flex items-center gap-4 text-left">
                                <div className="bg-primary/20 p-3 rounded-xl"><Sparkles className="h-6 w-6 text-primary" /></div>
                                <div className="text-left">
                                    <CardTitle className="text-xl font-black uppercase tracking-tight text-left">Visibility Purchase Menu</CardTitle>
                                    <CardDescription className="text-slate-400 text-left">Standardized bundles of views targeting your chosen audience.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8 text-left text-foreground">
                            <div className="space-y-4 text-left">
                                <Label className="text-[10px] font-black uppercase text-primary tracking-[0.2em] ml-1 text-left">1. Campaign Label</Label>
                                <Input 
                                    value={title} 
                                    onChange={e => setTitle(e.target.value)} 
                                    placeholder="e.g. Scania Spares Seasonal Boost" 
                                    className="h-12 border-2 text-lg font-bold bg-white text-left" 
                                />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                                <div className="space-y-4 text-left">
                                    <Label className="text-[10px] font-black uppercase text-primary tracking-[0.2em] ml-1">2. Target Audience</Label>
                                    <Select value={target} onValueChange={(val) => setTarget(val)}>
                                        <SelectTrigger className="h-12 border-2 font-bold text-left"><SelectValue placeholder="Select Audience" /></SelectTrigger>
                                        <SelectContent>
                                            {audiences.map(a => <SelectItem key={a.id} value={a.id} className="font-bold">{a.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-4 text-left">
                                    <Label className="text-[10px] font-black uppercase text-primary tracking-[0.2em] ml-1">3. Purchase Volume</Label>
                                    <Select value={String(batches)} onValueChange={(v) => setBatches(Number(v))}>
                                        <SelectTrigger className="h-12 border-2 font-bold text-left"><SelectValue placeholder="Select Volume" /></SelectTrigger>
                                        <SelectContent>
                                            {[1, 5, 10, 25, 50].map(b => (
                                                <SelectItem key={b} value={String(b)} className="font-bold">
                                                    {(b * batchSize).toLocaleString()} Views (R {b * pricePerBatch})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground italic pl-1 text-left">
                                        <Info className="h-3 w-3" />
                                        <span>1 Batch = {batchSize.toLocaleString()} Impressions. Served until consumed.</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 text-left text-foreground">
                                <Label className="text-[10px] font-black uppercase text-primary tracking-[0.2em] ml-1">4. Creative Asset URL</Label>
                                <div className="flex gap-2 text-left">
                                    <Input 
                                        value={creativeUrl} 
                                        onChange={e => setCreativeUrl(e.target.value)} 
                                        placeholder="Paste link from Studio or Asset Gallery..." 
                                        className="h-12 border-2 font-mono text-xs text-left" 
                                    />
                                    <Button variant="outline" className="h-12 border-2 gap-2 font-bold text-left" asChild>
                                        <Link href="/account?view=marketing-studio"><Search className="h-4 w-4" /> Studio</Link>
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="bg-slate-900 border-t p-8 flex justify-between items-center rounded-b-xl text-white text-left">
                            <div className="text-left text-white">
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1 text-left">Total Investment</p>
                                <p className="text-2xl font-black text-primary text-left">{formatCurrency(totalCost)}</p>
                            </div>
                            <Button size="lg" className="h-16 px-12 font-black uppercase tracking-tight shadow-xl gap-3 text-lg text-white" onClick={handleLaunch} disabled={isProcessing}>
                                {isProcessing ? <Loader2 className="animate-spin h-6 w-6" /> : <Zap className="h-6 w-6 fill-current" />}
                                Launch Visibility Boost
                            </Button>
                        </CardFooter>
                    </Card>

                    <div className="space-y-6 text-left">
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2">
                            <History className="h-4 w-4" />
                            Behavioral Performance Audit
                        </h3>
                        <Card className="border-none shadow-xl bg-white text-left">
                            <CardContent className="pt-6 text-left">
                                {isCampaignsLoading ? (
                                    <div className="flex justify-center p-20 text-left"><Loader2 className="animate-spin h-10 w-10 text-primary mx-auto" /></div>
                                ) : campaigns && campaigns.length > 0 ? (
                                    <DataTable columns={columns} data={campaigns} />
                                ) : (
                                    <div className="py-20 text-center text-foreground opacity-20 border-2 border-dashed rounded-2xl bg-muted/10 text-left">
                                        <BarChart3 className="h-12 w-12 mx-auto mb-2 text-left" />
                                        <p className="text-xs font-black uppercase tracking-widest text-center text-foreground text-left">No active yield logs</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="space-y-8 text-left text-foreground">
                    <Card className="bg-slate-900 text-white border-none shadow-2xl p-8 text-left relative overflow-hidden">
                        <CardHeader className="p-0 mb-6 text-left">
                            <CardTitle className="text-2xl font-black font-headline flex items-center gap-3 text-white text-left">
                                <Search className="text-primary h-8 w-8" />
                                Redirect Logic
                            </CardTitle>
                            <CardDescription className="text-slate-400 mt-2 text-left leading-relaxed">
                                Every click is verified and logged. Recipients are instantly redirected to your **Digital Branch** to initiate the handshake.
                            </CardDescription>
                        </CardHeader>
                        <CardFooter className="p-0 text-left">
                             <div className="flex items-center gap-2 text-[10px] font-black uppercase text-primary bg-primary/10 px-3 py-1.5 rounded-full text-left">
                                <ShieldCheck className="h-3 w-3 fill-current"/> Secure Handshake Integrity
                             </div>
                        </CardFooter>
                    </Card>

                    <div className="space-y-4 text-left">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Economics of Scale</Label>
                        <Card className="border-dashed border-2 bg-muted/20 text-left">
                            <CardContent className="p-6 space-y-4 text-left text-foreground">
                                <div className="flex items-start gap-4 text-left">
                                    <div className="bg-primary/10 p-2 rounded-lg mt-1"><Layers className="h-4 w-4 text-primary" /></div>
                                    <div className="text-left">
                                        <p className="text-xs font-black uppercase text-foreground text-left">Batch Consumption</p>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed mt-1 text-left">Views are only deducted when your boosted profile is actually rendered for a unique viewer.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 text-left">
                                    <div className="bg-primary/10 p-2 rounded-lg mt-1 text-foreground"><TrendingUp className="h-4 w-4 text-primary" /></div>
                                    <div className="text-left text-foreground">
                                        <p className="text-xs font-black uppercase text-foreground text-left">Conversion Accountability</p>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed mt-1 text-left">Access a forensic list of every company that viewed or clicked your content via the Drill-Down tool.</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
