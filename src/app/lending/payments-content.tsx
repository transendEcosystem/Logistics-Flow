'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { 
    Loader2, Banknote, Scale, RefreshCcw, CheckCircle2, History, Building, Truck, 
    ArrowRight, UserCheck, AlertTriangle, Info, ShieldCheck, FileUp, Save, Landmark, Gavel, FileText,
    ChevronRight, Zap, ListChecks
} from "lucide-react";
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getClientSideAuthToken, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDateSafe, fetchFromAdminAPI } from '@/lib/utils';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

function RecordTrancheDialog({ payment, onComplete }: { payment: any, onComplete: () => void }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [amount, setAmount] = useState<string>('');
    const [method, setMethod] = useState<'bank' | 'journal'>('bank');

    const remaining = (payment.amount || 0) - (payment.amountPaid || 0);

    const handleExecute = async () => {
        const trancheVal = Number(amount);
        if (isNaN(trancheVal) || trancheVal <= 0 || trancheVal > remaining + 0.01) {
            toast({ variant: 'destructive', title: "Invalid Amount", description: "Tranche cannot exceed remaining liability." });
            return;
        }

        setIsProcessing(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;

            await fetchFromAdminAPI(token, 'executeLendingPayment', {
                paymentId: payment.id,
                assetId: payment.assetId,
                amount: trancheVal,
                method,
                isFinal: Math.abs(remaining - trancheVal) < 1 
            });

            toast({ title: "Tranche Recorded", description: "Ledger updated successfully." });
            setIsOpen(false);
            onComplete();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Process Failed", description: e.message });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 text-[9px] font-black uppercase tracking-widest gap-1.5 border-primary/30 text-primary text-left">
                    <Zap className="h-3 w-3" /> Record Tranche
                </Button>
            </DialogTrigger>
            <DialogContent className="text-left text-foreground">
                <DialogHeader>
                    <DialogTitle>Record Disbursement Tranche</DialogTitle>
                    <DialogDescription className="text-left text-foreground">Apply a partial or final payment to this liability node.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 text-left">
                    <div className="p-4 bg-muted/30 rounded-xl flex justify-between items-center text-left text-foreground">
                        <div className="text-left">
                            <p className="text-[10px] font-black uppercase text-muted-foreground">Remaining Liability</p>
                            <p className="text-xl font-black text-primary">{formatCurrency(remaining)}</p>
                        </div>
                        <Badge variant="outline" className="h-5 text-[8px] uppercase">Node ID: {payment.id?.slice(-4)}</Badge>
                    </div>

                    <div className="space-y-2 text-left text-foreground">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tranche Amount (ZAR)</Label>
                        <Input 
                            type="number" 
                            value={amount} 
                            onChange={e => setAmount(e.target.value)} 
                            placeholder="0.00" 
                            className="h-12 text-2xl font-black border-2 bg-white" 
                        />
                    </div>

                    <div className="space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Settlement Channel</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <Button variant={method === 'bank' ? 'default' : 'outline'} className="h-10 text-xs font-bold" onClick={() => setMethod('bank')}>Bank EFT</Button>
                            <Button variant={method === 'journal' ? 'default' : 'outline'} className="h-10 text-xs font-bold" onClick={() => setMethod('journal')}>Journal Offset</Button>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleExecute} disabled={isProcessing || !amount} className="w-full h-12 font-black uppercase tracking-widest text-white">
                        {isProcessing ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                        Commit Settlement Node
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function PaymentsContent() {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [isLoading, setIsLoading] = useState(true);

    const paymentsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'lendingPayments'), orderBy('createdAt', 'desc'), limit(100));
    }, [firestore]);
    const { data: payments, forceRefresh } = useCollection(paymentsQuery);

    const forceLoad = useCallback(async () => {
        setIsLoading(true);
        await forceRefresh();
        setIsLoading(false);
    }, [forceRefresh]);

    useEffect(() => { forceLoad(); }, [forceLoad]);

    const columns: ColumnDef<any>[] = [
        {
            header: 'Agreement / Borrower',
            cell: ({row}) => (
                <div className="flex flex-col text-left text-foreground">
                    <span className="font-bold text-foreground text-left">{row.original.clientName || 'Borrower'}</span>
                    <div className="flex items-center gap-1.5 mt-1">
                        <FileText className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[9px] text-muted-foreground font-mono uppercase text-left">AGR: {row.original.agreementId?.slice(-6)}</span>
                    </div>
                </div>
            )
        },
        {
            header: 'Recipient Creditor',
            cell: ({row}) => (
                <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-foreground text-left">{row.original.creditorName}</span>
                    <Badge variant="outline" className="w-fit text-[8px] h-3.5 mt-1 uppercase font-black border-primary/20 text-primary text-left">
                        Fiduciary Recipient
                    </Badge>
                </div>
            )
        },
        {
            header: 'Settlement Progress',
            cell: ({row}) => {
                const total = row.original.amount || 0;
                const paid = row.original.amountPaid || 0;
                const pct = total > 0 ? (paid / total) * 100 : 0;
                return (
                    <div className="flex flex-col gap-2 w-48 text-left">
                        <div className="flex justify-between text-[10px] font-black uppercase text-muted-foreground">
                            <span>{formatCurrency(paid)}</span>
                            <span>{pct.toFixed(0)}%</span>
                        </div>
                        <Progress value={pct} className="h-1.5 bg-slate-100" />
                    </div>
                );
            }
        },
        {
            header: 'Authorized Total',
            cell: ({row}) => (
                <div className="flex flex-col text-right text-foreground">
                    <span className="font-black text-primary text-sm text-right">{formatCurrency(row.original.amount)}</span>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter text-right">Authorized Ceiling</span>
                </div>
            )
        },
        {
            header: 'Status',
            cell: ({row}) => (
                <Badge variant={row.original.status === 'completed' ? 'default' : 'secondary'} className={cn(
                    "capitalize text-[10px] font-black border-none",
                    row.original.status === 'pending' ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                )}>
                    {row.original.status === 'pending' ? 'Active Tranches' : 'Concluded'}
                </Badge>
            )
        },
        {
            id: 'actions',
            header: <div className="text-right">Execution</div>,
            cell: ({ row }) => (
                <div className="flex justify-end gap-2 text-foreground">
                    {row.original.status === 'pending' ? (
                        <RecordTrancheDialog payment={row.original} onComplete={forceLoad} />
                    ) : (
                        <div className="flex items-center gap-2 text-green-600 text-[10px] font-black uppercase mr-2 text-left">
                            <ShieldCheck className="h-4 w-4" /> Full Settlement
                        </div>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500 text-left text-foreground">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 text-left">
                <div className="text-left text-foreground">
                    <h1 className="text-3xl font-black font-headline tracking-tight flex items-center gap-3 text-left">
                        <Banknote className="h-8 w-8 text-primary" />
                        Disbursements & Journals
                    </h1>
                    <p className="text-muted-foreground mt-1 text-left">Manage acquisition liabilities. Payouts can be settled in tranches until the authorized ceiling is reached.</p>
                </div>
                <Button variant="outline" size="sm" onClick={forceLoad} disabled={isLoading} className="gap-2 h-10 px-6 font-bold text-foreground">
                    <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} /> Refresh Ledger
                </Button>
            </div>

            <Card className="border-none shadow-xl bg-white overflow-hidden text-left">
                <CardContent className="pt-6 text-left">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground text-center">Synchronizing Payment Registry...</p>
                        </div>
                    ) : (
                        <DataTable columns={columns} data={payments || []} />
                    )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left text-foreground">
                <Card className="bg-primary/5 border-primary/20 p-8 rounded-[2.5rem] text-left text-foreground">
                    <CardHeader className="p-0 mb-4 text-left">
                        <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2 text-foreground">
                            <Info className="h-5 w-5 text-primary" /> Tranche Protocol
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 space-y-4 text-sm text-slate-600 leading-relaxed text-left text-foreground">
                        <p>Liability Nodes are <strong>not locked</strong>. This allows for contingent payouts based on milestones (e.g., Duties Paid, Delivery Confirmed). Each tranche is recorded as a balanced transaction in the sub-ledger.</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 text-white border-none p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden text-left text-white">
                    <div className="absolute top-0 right-0 p-8 opacity-10"><History className="h-32 w-32 text-primary" /></div>
                    <CardHeader className="p-0 mb-4 text-left text-white">
                        <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2 text-white">
                            <ShieldCheck className="h-5 w-5 text-primary" /> Forensic Stock Release
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 text-xs text-slate-400 leading-relaxed text-left">
                        Release of physical assets in the registry is only authorized once <strong>100% of the authorized amount</strong> has been settled. This prevents partial asset release before all third-party creditors (Dealers/Agents) are satisfied.
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}