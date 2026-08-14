'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { Banknote, FileCheck, Scale, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useFirestore, useUser, useCollection } from '@/firebase';
import { useMemoFirebase } from '@/hooks/use-memo-firebase';
import { writeBatch, doc, collection, increment, serverTimestamp, query, deleteDoc, addDoc } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

const chartOfAccounts = {
    revenue: [
        { code: '4010', name: 'Basic Membership Fees' },
        { code: '4020', name: 'Standard Membership Fees' },
        { code: '4030', name: 'Premium Membership Fees' },
        { code: '4110', name: 'Loyalty Plan Subscription Fees' },
    ],
    expenses: [
        { code: '7010', name: 'Bank Charges' },
        { code: '7020', name: 'Software & Subscriptions' },
        { code: '7030', name: 'Consulting & Professional Fees' },
        { code: '7040', name: 'Marketing & Advertising' },
        { code: '7050', name: 'General & Administrative' },
        { code: '8010', name: 'Wallet Adjustment (Manual)' },
        { code: '8020', name: 'Transaction Reversal' },
    ]
};


type UiTransaction = {
    id: number;
    paymentId?: string;
    date: string;
    description: string;
    reference: string;
    amount: number;
    type: 'credit' | 'debit';
    status: 'allocated' | 'pending' | 'platform_expense';
    memberName?: string;
    chartOfAccountsCode?: string;
};

export default function TransactionAllocation({ statementData, onSuccessfulPost }: { statementData: any, onSuccessfulPost: () => void }) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user } = useUser();

    const membersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'companies'));
    }, [firestore]);
    const { data: members, isLoading: isLoadingMembers } = useCollection(membersQuery);

    const memberMap = useMemo(() => {
        if (!members) return new Map();
        return new Map(members.map(m => [m.id, `${m.companyName}`]));
    }, [members]);
    
    const [transactions, setTransactions] = useState<UiTransaction[]>([]);
    const [openingBalance, setOpeningBalance] = useState(statementData.openingBalance);
    const [closingBalance, setClosingBalance] = useState(statementData.closingBalance);
    
    const [totalCredits, setTotalCredits] = useState(0);
    const [totalDebits, setTotalDebits] = useState(0);
    const [calculatedClosingBalance, setCalculatedClosingBalance] = useState(0);
    const [difference, setDifference] = useState(0);
    const [isPosting, setIsPosting] = useState(false);

     useEffect(() => {
        setOpeningBalance(statementData.openingBalance);
        setClosingBalance(statementData.closingBalance);
        
        if (statementData.transactions) {
            const populated = statementData.transactions.map((tx: any) => ({
                ...tx,
                status: tx.reference && memberMap.has(tx.reference) ? 'allocated' : 'pending',
                memberName: memberMap.get(tx.reference) || (tx.reference ? 'Unknown/Manual Entry' : 'N/A'),
                chartOfAccountsCode: tx.description.toLowerCase().includes('bank charges') ? '7010' : ''
            }));
            setTransactions(populated);
        }

    }, [statementData, memberMap]); 
    
    const handleAllocationChange = (transactionId: number, newStatus: UiTransaction['status']) => {
        const updatedTransactions = transactions.map((tx) => {
            if (tx.id === transactionId) {
                if (newStatus === 'allocated' && !memberMap.has(tx.reference)) {
                    toast({
                        variant: 'destructive',
                        title: 'Invalid Member',
                        description: 'Cannot allocate to member without a valid Company ID in the reference field.',
                    });
                    return tx;
                }
                
                let toastMessage = `Transaction ${transactionId} marked as ${newStatus.replace('_', ' ')}.`;
                if(tx.status === newStatus) toastMessage = `Transaction ${transactionId} is already ${newStatus.replace('_', ' ')}.`;

                toast({ title: toastMessage });

                return { ...tx, status: newStatus };
            }
            return tx;
        });

        setTransactions(updatedTransactions);
    };

    const handleFieldChange = (transactionId: number, field: keyof UiTransaction, value: string | number) => {
        setTransactions(currentTransactions =>
            currentTransactions.map(tx => {
                if (tx.id === transactionId) {
                    const updatedTx = { ...tx, [field]: value };
                    if (field === 'reference') {
                        updatedTx.memberName = memberMap.get(value as string) || 'Unknown/Manual Entry';
                        if (memberMap.has(value as string) && updatedTx.status === 'pending') {
                            updatedTx.status = 'allocated';
                        }
                    }
                    return updatedTx;
                }
                return tx;
            })
        );
    };

    const addManualRow = () => {
        const newId = transactions.length > 0 ? Math.max(...transactions.map(t => t.id)) + 1 : 1;
        const newRow: UiTransaction = {
            id: newId,
            date: new Date().toISOString().split('T')[0],
            description: '',
            reference: '',
            amount: 0,
            type: 'credit',
            status: 'pending',
            memberName: ''
        };
        setTransactions([...transactions, newRow]);
    };
    
    const removeManualRow = (id: number) => {
        setTransactions(transactions.filter(tx => tx.id !== id));
    };

    const handleSaveAndPost = async () => {
        if (!firestore || !user) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to post.' });
            return;
        }
        
        setIsPosting(true);
        const memberAllocations = transactions.filter(tx => tx.status === 'allocated' && memberMap.has(tx.reference));
        const platformExpenses = transactions.filter(tx => tx.status === 'platform_expense');

        if (memberAllocations.length === 0 && platformExpenses.length === 0) {
            toast({ variant: 'destructive', title: 'No Valid Transactions', description: 'No transactions were marked as allocated to a member or as a platform expense.' });
            setIsPosting(false);
            return;
        }
        
        const batch = writeBatch(firestore);
        const reconciliationId = `RECON-${format(new Date(), 'yyyy-MM-dd-HHmmss')}`;

        // Create the master reconciliation document
        const reconciliationRef = doc(firestore, 'reconciliations', reconciliationId);
        batch.set(reconciliationRef, {
            id: reconciliationId,
            statementPeriod: statementData.statementName,
            openingBalance,
            closingBalance,
            status: 'completed',
            processedAt: serverTimestamp(),
            processedBy: user.uid,
        });

        // Process Member Allocations
        for (const tx of memberAllocations) {
            const memberId = tx.reference;
            const memberRef = doc(firestore, 'companies', memberId);
            const transactionAmount = tx.type === 'credit' ? tx.amount : -tx.amount;
            
            batch.update(memberRef, { walletBalance: increment(transactionAmount) });

            const transactionRef = doc(collection(firestore, 'companies', memberId, 'transactions'));
            batch.set(transactionRef, {
                transactionId: transactionRef.id,
                reconciliationId,
                type: tx.type,
                amount: tx.amount,
                date: new Date(tx.date),
                description: tx.description,
                status: 'allocated',
                chartOfAccountsCode: '4410', 
                isAdjustment: tx.description.toLowerCase().includes('manual'),
                postedAt: serverTimestamp(),
                postedBy: user.uid,
            });
            
            if (tx.paymentId) {
                const pendingPaymentRef = doc(firestore, `companies/${memberId}/walletPayments/${tx.paymentId}`);
                batch.delete(pendingPaymentRef);
            }
        }
        
        // Process Platform Expenses
        for (const tx of platformExpenses) {
             const platformTransactionRef = doc(collection(firestore, 'platformTransactions'));
             batch.set(platformTransactionRef, {
                transactionId: platformTransactionRef.id,
                reconciliationId,
                type: tx.type,
                amount: tx.amount,
                date: new Date(tx.date),
                description: tx.description,
                chartOfAccountsCode: tx.chartOfAccountsCode || '7050',
                postedAt: serverTimestamp(),
                postedBy: user.uid,
             });
        }
        
        try {
            await batch.commit();
            toast({ title: 'Success!', description: 'Reconciliation has been posted.' });
            setTransactions(transactions.filter(tx => tx.status === 'pending'));
            onSuccessfulPost();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Posting Failed', description: error.message || "You may not have the required permissions." });
        } finally {
            setIsPosting(false);
        }
    };

    useEffect(() => {
        const reconciledTxs = transactions.filter(t => t.status !== 'pending');
        const newTotalCredits = reconciledTxs.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
        const newTotalDebits = reconciledTxs.filter(t => t.type === 'debit').reduce((sum, t) => sum + Math.abs(t.amount), 0);
        
        const newCalculatedClosingBalance = openingBalance + newTotalCredits - newTotalDebits;
        const newDifference = closingBalance - newCalculatedClosingBalance;

        setTotalCredits(newTotalCredits);
        setTotalDebits(newTotalDebits);
        setCalculatedClosingBalance(newCalculatedClosingBalance);
        setDifference(newDifference);
    }, [transactions, openingBalance, closingBalance]);

    const isManualMode = statementData.statementName.startsWith('manual-adjustment');

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-4">
                    <Banknote className="h-8 w-8 text-primary" />
                    <div>
                        <CardTitle>Allocate Transactions</CardTitle>
                        <CardDescription>
                            Reviewing: <span className="font-mono font-semibold">{isManualMode ? 'Manual Adjustment Session' : statementData.statementName}</span>
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {!isManualMode && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <Label htmlFor="opening-balance">Opening Balance (R)</Label>
                            <Input id="opening-balance" type="number" placeholder="0.00" value={openingBalance} onChange={e => setOpeningBalance(parseFloat(e.target.value) || 0)} />
                        </div>
                        <div>
                            <Label htmlFor="closing-balance">Closing Balance (R)</Label>
                            <Input id="closing-balance" type="number" placeholder="0.00" value={closingBalance} onChange={e => setClosingBalance(parseFloat(e.target.value) || 0)} />
                        </div>
                    </div>
                )}

                <div className="border rounded-lg overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[120px]">Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="w-[250px]">Member / Expense Account</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right w-[150px]">Amount (R)</TableHead>
                                <TableHead className="w-[120px] text-center">Status</TableHead>
                                <TableHead className="w-[200px] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             {isLoadingMembers ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                                        <p className="mt-2 text-sm text-muted-foreground">Loading member data...</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                transactions.map(tx => (
                                    <TableRow key={tx.id} className={tx.status === 'allocated' ? 'bg-green-100/50 dark:bg-green-900/20' : tx.status === 'platform_expense' ? 'bg-blue-100/50 dark:bg-blue-900/20' : ''}>
                                        <TableCell>
                                            <Input value={tx.date} onChange={(e) => handleFieldChange(tx.id, 'date', e.target.value)} className="h-8 text-xs font-mono" type="date" />
                                        </TableCell>
                                        <TableCell>
                                            <Input value={tx.description} onChange={(e) => handleFieldChange(tx.id, 'description', e.target.value)} className="h-8 text-xs" />
                                        </TableCell>
                                        <TableCell>
                                            {tx.status === 'platform_expense' ? (
                                                 <Select value={tx.chartOfAccountsCode} onValueChange={(value) => handleFieldChange(tx.id, 'chartOfAccountsCode', value)}>
                                                    <SelectTrigger className="h-8 text-xs">
                                                        <SelectValue placeholder="Select expense account..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {chartOfAccounts.expenses.map(acc => (
                                                            <SelectItem key={acc.code} value={acc.code}>{acc.code}: {acc.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <>
                                                    <Input 
                                                        value={tx.reference} 
                                                        onChange={(e) => handleFieldChange(tx.id, 'reference', e.target.value)} 
                                                        className={cn('h-8 text-xs font-mono', tx.reference && tx.status === 'allocated' && !memberMap.has(tx.reference) ? 'border-destructive' : '')}
                                                        list="members-datalist"
                                                    />
                                                    <p className="text-xs text-muted-foreground mt-1 truncate">{tx.memberName}</p>
                                                </>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Select value={tx.type} onValueChange={(value: 'credit' | 'debit') => handleFieldChange(tx.id, 'type', value)}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent><SelectItem value="credit">Credit</SelectItem><SelectItem value="debit">Debit</SelectItem></SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Input value={tx.amount} onChange={(e) => handleFieldChange(tx.id, 'amount', parseFloat(e.target.value) || 0)} className="h-8 text-sm font-mono text-right w-full" type="number" step="0.01" />
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={tx.status === 'allocated' ? 'default' : tx.status === 'platform_expense' ? 'outline' : 'secondary'} className="capitalize">{tx.status.replace('_', ' ')}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right space-x-1">
                                            {isManualMode ? (
                                                <Button variant="ghost" size="icon" onClick={() => removeManualRow(tx.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                            ) : (
                                                <>
                                                    <Button variant={tx.status === 'allocated' ? 'secondary' : 'default'} size="sm" onClick={() => handleAllocationChange(tx.id, tx.status === 'allocated' ? 'pending' : 'allocated')}>
                                                        {tx.status === 'allocated' ? 'Un-allocate' : 'To Member'}
                                                    </Button>
                                                     <Button variant={tx.status === 'platform_expense' ? 'secondary' : 'outline'} size="sm" onClick={() => handleAllocationChange(tx.id, tx.status === 'platform_expense' ? 'pending' : 'platform_expense')}>
                                                        To Platform
                                                    </Button>
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    <datalist id="members-datalist">
                        {members?.map(m => <option key={m.id} value={m.id}>{`${m.companyName}`}</option>)}
                    </datalist>
                </div>
                 <Button onClick={addManualRow} variant="outline" size="sm" className="mt-4"><PlusCircle className="mr-2 h-4 w-4" />Add Manual Record</Button>
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-4">
                 {!isManualMode && (
                    <div className="w-full bg-muted p-4 rounded-lg">
                        <h4 className="font-semibold mb-3 text-lg">Reconciliation Summary</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <div className="space-y-1"><p className="text-muted-foreground">Opening Balance</p><p className="font-mono font-semibold">{formatCurrency(openingBalance)}</p></div>
                            <div className="space-y-1"><p className="text-muted-foreground">Reconciled Credits</p><p className="font-mono font-semibold text-green-600">{formatCurrency(totalCredits)}</p></div>
                            <div className="space-y-1"><p className="text-muted-foreground">Reconciled Debits</p><p className="font-mono font-semibold text-destructive">{formatCurrency(totalDebits)}</p></div>
                            <div className="space-y-1 border-t pt-2"><p className="text-muted-foreground">Calculated Balance</p><p className="font-mono font-bold text-base">{formatCurrency(calculatedClosingBalance)}</p></div>
                            <div className="space-y-1 border-t pt-2"><p className="text-muted-foreground">Entered Closing</p><p className="font-mono font-bold text-base">{formatCurrency(closingBalance)}</p></div>
                            <div className={`space-y-1 border-t pt-2 ${Math.abs(difference) < 0.01 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'} p-2 rounded-md`}><p className="text-muted-foreground font-semibold">Difference</p><p className={`font-mono font-extrabold text-lg ${Math.abs(difference) < 0.01 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(difference)}</p></div>
                        </div>
                    </div>
                )}
                 <Button onClick={handleSaveAndPost} disabled={isPosting || (!isManualMode && Math.abs(difference) > 0.01)}>
                    {isPosting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileCheck className="mr-2 h-4 w-4" />}
                    Save & Post Transactions
                </Button>
            </CardFooter>
        </Card>
    )
}
