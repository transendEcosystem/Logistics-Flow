
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, DownloadCloud, Upload, ListChecks, ArrowRight, Calendar as CalendarIcon } from "lucide-react";
import { useState, useRef, useEffect, Suspense, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import TransactionAllocation from "./transaction-allocation";
import { getClientSideAuthToken, useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import demoStatementData from '@/lib/demo-statement.json';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { collection, query, orderBy } from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDateSafe } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";


const manualAdjustmentTemplate = {
    statementName: `manual-adjustment-${new Date().toISOString()}`,
    openingBalance: 0,
    closingBalance: 0,
    transactions: []
};

async function fetchPendingPayments() {
    const token = await getClientSideAuthToken();
    if (!token) throw new Error("Authentication failed.");
    
    const response = await fetch('/api/getUserSubcollection', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: 'walletPayments', type: 'collection-group' }),
    });

    const result = await response.json();
    if (!result.success) {
        throw new Error(result.error || 'Failed to fetch pending payments');
    }
    
    return result.data
        .filter((p: any) => p.status === 'pending')
        .map((p: any, index: number) => ({
            id: index + 1,
            paymentId: p.id,
            companyId: p.companyId,
            date: new Date(p.createdAt).toISOString().split('T')[0],
            description: p.description,
            reference: p.companyId,
            amount: p.amount,
            type: 'credit',
        }));
}

function ReconciliationDashboard() {
    const [processingData, setProcessingData] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [useDemo, setUseDemo] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const firestore = useFirestore();
    const [isClient, setIsClient] = useState(false);


    const reconciliationsQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'reconciliations'), orderBy('processedAt', 'desc')) : null
    , [firestore]);
    const { data: pastReconciliations, isLoading: isLoadingHistory, forceRefresh: refreshHistory } = useCollection(reconciliationsQuery);
    
    useEffect(() => {
        setIsClient(true);
        // Set the initial date range only on the client-side
        setDateRange({
            from: new Date(),
            to: addDays(new Date(), 30),
        });
    }, []);

    const onSuccessfulPost = useCallback(() => {
        setProcessingData(null);
        refreshHistory();
    }, [refreshHistory]);


    useEffect(() => {
        if (useDemo) {
            setProcessingData(demoStatementData);
             toast({ title: "Demo Statement Loaded", description: "Sample transactions are ready for reconciliation." });
        } else {
            if (processingData && processingData.statementName === 'demo-statement.csv') {
                 setProcessingData(null);
            }
        }
    }, [useDemo, processingData, toast]);

    const handleProcessPendingEFTs = async () => {
        setIsLoading(true);
        setProcessingData(null);
        setUseDemo(false);
        try {
            const pending = await fetchPendingPayments();
            if (pending.length === 0) {
                toast({ title: "No Pending Payments", description: "There are no unallocated EFTs to reconcile."});
                setIsLoading(false);
                return;
            }
            
            const totalAmount = pending.reduce((sum: number, p: any) => sum + p.amount, 0);

            setProcessingData({
                statementName: `pending-efts-${new Date().toISOString()}`,
                openingBalance: 0,
                closingBalance: totalAmount,
                transactions: pending,
            });
             toast({ title: "Pending Payments Loaded", description: `${pending.length} unallocated payments are ready for reconciliation.` });
        } catch (e: any) {
             toast({ variant: 'destructive', title: "Failed to Load Payments", description: e.message });
        } finally {
            setIsLoading(false);
        }
    }
    
    const handleManualAdjustment = () => {
        setUseDemo(false);
        toast({
            title: "Manual Adjustment Mode",
            description: "You can now add manual transactions below.",
        });
        setProcessingData(manualAdjustmentTemplate);
    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setUseDemo(false);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const rows = text.split('\n').slice(1);
                const transactions = rows.map((row, index) => {
                    const [date, description, reference, amountStr] = row.split(',');
                    const amount = parseFloat(amountStr);
                    return {
                        id: index + 1,
                        date,
                        description,
                        reference,
                        amount: Math.abs(amount),
                        type: amount >= 0 ? 'credit' : 'debit'
                    };
                }).filter(tx => tx.date && tx.description);

                if (transactions.length === 0) {
                    throw new Error("No valid transactions found in the file.");
                }

                setProcessingData({
                    statementName: file.name,
                    openingBalance: 0,
                    closingBalance: 0,
                    transactions: transactions
                });
                toast({ title: "Statement Loaded", description: `${transactions.length} transactions are ready for reconciliation.` });
            } catch (err: any) {
                toast({ variant: "destructive", title: "Error Parsing File", description: err.message });
                setProcessingData(null);
            } finally {
                setIsLoading(false);
            }
        };
        reader.readAsText(file);
    };

    if (!isClient) {
        return <div className="flex justify-center py-20"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }

    return (
        <div className="w-full space-y-8">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Transaction Reconciliation</CardTitle>
                            <CardDescription>
                                Start a new reconciliation session or view past reports.
                            </CardDescription>
                        </div>
                         <div className="flex gap-4 items-center">
                             <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".csv"
                                onChange={handleFileChange}
                             />
                              <Button onClick={() => fileInputRef.current?.click()} variant="outline" disabled={isLoading}>
                                <Upload className="mr-2 h-4 w-4" />
                                Upload Statement
                            </Button>
                             <Button onClick={handleManualAdjustment} variant="outline" disabled={isLoading}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Manual Adjustment
                            </Button>
                            <Button onClick={handleProcessPendingEFTs} variant="default" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <DownloadCloud className="mr-2 h-4 w-4" />}
                                Load Pending EFTs
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-2 mb-4 p-4 border rounded-md bg-muted/50">
                        <Checkbox id="demo-mode" checked={useDemo} onCheckedChange={(checked) => setUseDemo(!!checked)} />
                        <Label htmlFor="demo-mode" className="cursor-pointer">Use Demo Statement</Label>
                    </div>
                    {!processingData && (
                         <div className="text-center py-10 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground">Your reconciliation session will appear below once started.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {processingData && (
                <TransactionAllocation statementData={processingData} onSuccessfulPost={onSuccessfulPost} />
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ListChecks /> Reconciliation History</CardTitle>
                    <CardDescription>Review all previously completed reconciliation reports.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingHistory ? (
                        <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : pastReconciliations && pastReconciliations.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Report ID</TableHead>
                                    <TableHead>Statement Period</TableHead>
                                    <TableHead>Processed On</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pastReconciliations.map(recon => (
                                    <TableRow key={recon.id}>
                                        <TableCell className="font-mono text-xs">{recon.id}</TableCell>
                                        <TableCell>{recon.statementPeriod}</TableCell>
                                        <TableCell>{formatDateSafe(recon.processedAt, "dd MMM yyyy, HH:mm")}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={`/backend/reconciliation/${recon.id}`}>View Report <ArrowRight className="ml-2 h-4 w-4"/></Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-center text-muted-foreground py-10">No past reconciliations found.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function ReconciliationPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-[calc(100vh-8rem)]"><Loader2 className="h-16 w-16 animate-spin" /></div>}>
            <ReconciliationDashboard />
        </Suspense>
    );
}
