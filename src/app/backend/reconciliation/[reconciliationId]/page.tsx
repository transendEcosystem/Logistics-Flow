
'use client';

import { Suspense, useEffect, useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, getDocs, query, where, collectionGroup } from 'firebase/firestore';
import { Loader2, ArrowLeft, Printer, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { formatCurrency, formatDateSafe } from '@/lib/utils';

function ReconciliationReportComponent() {
    const params = useParams();
    const reconciliationId = params.reconciliationId as string;
    const firestore = useFirestore();

    const reconciliationRef = useMemoFirebase(() => {
        if (!firestore || !reconciliationId) return null;
        return doc(firestore, `reconciliations/${reconciliationId}`);
    }, [firestore, reconciliationId]);

    const { data: reconciliation, isLoading: isLoadingRecon } = useDoc(reconciliationRef);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [isLoadingTxs, setIsLoadingTxs] = useState(true);
    const [generatedAt, setGeneratedAt] = useState<string | null>(null);

    useEffect(() => {
        setGeneratedAt(formatDateSafe(new Date(), "dd MMM yyyy, HH:mm"));
    }, []);


    useEffect(() => {
        async function fetchTransactions() {
            if (!firestore || !reconciliationId) return;
            setIsLoadingTxs(true);
            try {
                // Query both member and platform transactions
                const memberTxsQuery = query(collectionGroup(firestore, `transactions`), where('reconciliationId', '==', reconciliationId));
                const platformTxsQuery = query(collection(firestore, `platformTransactions`), where('reconciliationId', '==', reconciliationId));

                const [memberTxsSnap, platformTxsSnap] = await Promise.all([
                    getDocs(memberTxsQuery),
                    getDocs(platformTxsQuery)
                ]);

                let allTxs: any[] = [];
                memberTxsSnap.forEach(doc => allTxs.push({ ...doc.data(), id: doc.id, source: 'member' }));
                platformTxsSnap.forEach(doc => allTxs.push({ ...doc.data(), id: doc.id, source: 'platform' }));
                
                allTxs.sort((a,b) => {
                    const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
                    const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
                    return dateB.getTime() - dateA.getTime();
                });

                setTransactions(allTxs);
            } catch (e) {
                console.error("Failed to fetch transactions for report:", e);
            } finally {
                setIsLoadingTxs(false);
            }
        }
        fetchTransactions();
    }, [firestore, reconciliationId]);

    if (isLoadingRecon || isLoadingTxs) {
        return (
            <div className="flex justify-center items-center h-full py-20">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!reconciliation) {
        return notFound();
    }

    const memberTransactions = transactions.filter(t => t.source === 'member');
    const platformTransactions = transactions.filter(t => t.source === 'platform');
    
    const totalCredits = memberTransactions.filter(t => t.type === 'credit').reduce((sum, tx) => sum + tx.amount, 0);
    const totalDebits = memberTransactions.filter(t => t.type === 'debit').reduce((sum, tx) => sum + tx.amount, 0);
    const totalPlatformExpenses = platformTransactions.reduce((sum, tx) => sum + tx.amount, 0);

    return (
        <Card className="w-full max-w-4xl mx-auto print:shadow-none print:border-none">
            <CardHeader className="flex-row justify-between items-start">
                <div>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                       <FileText /> Reconciliation Report
                    </CardTitle>
                    <CardDescription className="font-mono text-xs mt-1">
                        ID: {reconciliation.id}
                    </CardDescription>
                </div>
                 <div className="flex gap-2">
                    <Button variant="outline" asChild>
                        <Link href="/backend?view=reconciliation"><ArrowLeft className="mr-2 h-4 w-4"/> Back to List</Link>
                    </Button>
                    <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4"/> Print</Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-semibold text-lg">Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm">
                        <div><p className="text-muted-foreground">Statement Period</p><p className="font-semibold">{reconciliation.statementPeriod}</p></div>
                        <div><p className="text-muted-foreground">Processed On</p><p className="font-semibold">{formatDateSafe(reconciliation.processedAt, "dd MMM yyyy, HH:mm")}</p></div>
                         <div><p className="text-muted-foreground">Opening Balance</p><p className="font-mono">{formatCurrency(reconciliation.openingBalance)}</p></div>
                        <div><p className="text-muted-foreground">Closing Balance</p><p className="font-mono">{formatCurrency(reconciliation.closingBalance)}</p></div>
                    </div>
                </div>

                <div>
                    <h4 className="font-semibold mb-2">Member Wallet Transactions</h4>
                    <div className="border rounded-lg overflow-x-auto">
                        <Table>
                            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Member ID</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {memberTransactions.length > 0 ? memberTransactions.map(tx => (
                                    <TableRow key={tx.id}>
                                        <TableCell className="text-xs">{formatDateSafe(tx.date, "dd MMM yyyy, HH:mm")}</TableCell>
                                        <TableCell className="font-mono text-xs">{tx.memberId}</TableCell>
                                        <TableCell>{tx.description}</TableCell>
                                        <TableCell className={`text-right font-semibold ${tx.type === 'credit' ? 'text-green-600' : 'text-destructive'}`}>
                                            {tx.type === 'credit' ? '+' : '-'} {formatCurrency(tx.amount)}
                                        </TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground h-24">No member transactions in this batch.</TableCell></TableRow>}
                            </TableBody>
                             <TableFooter>
                                <TableRow>
                                    <TableCell colSpan={3} className="text-right font-bold">Total Credits to Members</TableCell>
                                    <TableCell className="text-right font-bold text-green-600">{formatCurrency(totalCredits)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell colSpan={3} className="text-right font-bold">Total Debits from Members</TableCell>
                                    <TableCell className="text-right font-bold text-destructive">{formatCurrency(totalDebits)}</TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </div>
                </div>
                 <div>
                    <h4 className="font-semibold mb-2">Platform Expense Transactions</h4>
                    <div className="border rounded-lg overflow-x-auto">
                       <Table>
                            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Account</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {platformTransactions.length > 0 ? platformTransactions.map(tx => (
                                    <TableRow key={tx.id}>
                                        <TableCell className="text-xs">{formatDateSafe(tx.date, "dd MMM yyyy, HH:mm")}</TableCell>
                                        <TableCell>{tx.description}</TableCell>
                                        <TableCell className="font-mono text-xs">{tx.chartOfAccountsCode}</TableCell>
                                        <TableCell className="text-right font-semibold text-destructive">- {formatCurrency(tx.amount)}</TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground h-24">No platform expenses in this batch.</TableCell></TableRow>}
                            </TableBody>
                             <TableFooter>
                                <TableRow>
                                    <TableCell colSpan={3} className="text-right font-bold">Total Platform Expenses</TableCell>
                                    <TableCell className="text-right font-bold text-destructive">{formatCurrency(totalPlatformExpenses)}</TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </div>
                </div>

            </CardContent>
            <CardFooter className="bg-muted/50 p-4 border-t flex justify-end">
                 <p className="text-xs text-muted-foreground">Report Generated: {generatedAt || 'Loading...'}</p>
            </CardFooter>
        </Card>
    )
}


export default function ReconciliationReportPage({ params }: { params: { reconciliationId: string } }) {
    return (
         <div className="container mx-auto px-4 py-16">
            <Suspense fallback={<div className="flex justify-center items-center min-h-[calc(100vh-8rem)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>}>
                <ReconciliationReportComponent />
            </Suspense>
        </div>
    )
}
