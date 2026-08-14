
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Loader2, DollarSign, Clock, ArrowRight, CheckCircle, Send, XCircle } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import { getClientSideAuthToken } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatCurrency, formatDateSafe } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';


interface Company {
    id: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
    ownerId?: string;
    bankName?: string;
    accountNumber?: string;
    branchCode?: string;
}

interface Payment {
    id: string;
    companyId: string;
    amount: number;
    description: string;
    createdAt: any;
    memberName?: string;
    status: 'pending' | 'approved' | 'rejected';
}

interface Transaction {
    id: string;
    companyId: string;
    type: 'credit' | 'debit';
    amount: number;
    description: string;
    date: any;
    memberName?: string;
}

async function performAdminAction(token: string, action: string, payload?: any) {
    const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, payload }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
        throw new Error(result.error || `API Error for action: ${action}`);
    }
    return result;
}


export default function WalletTransactionsList() {
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    // State for payouts
    const [pendingPayouts, setPendingPayouts] = useState<any[]>([]);
    const [isLoadingPayouts, setIsLoadingPayouts] = useState(true);
    const [payoutsError, setPayoutsError] = useState<string | null>(null);
    
    // State for pending wallet payments
    const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
    const [isLoadingPayments, setIsLoadingPayments] = useState(true);
    const [paymentsError, setPaymentsError] = useState<string | null>(null);

    // State for all transactions
    const [allocatedTransactions, setAllocatedTransactions] = useState<Transaction[]>([]);
    const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
    const [transactionsError, setTransactionsError] = useState<string | null>(null);

    const [companies, setCompanies] = useState<Company[]>([]);
    const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
    
    const companyMap = useMemo(() => {
        if (!companies) return new Map();
        return new Map(companies.map((c: Company) => [c.id, c]));
    }, [companies]);

    // Combined data fetching function
    const fetchData = useCallback(async (action: string, setData: React.Dispatch<any>, setIsLoading: React.Dispatch<boolean>, setError: React.Dispatch<string | null>) => {
        setIsLoading(true);
        setError(null);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");
            
            const result = await performAdminAction(token, action, {});
            const sortedData = (result.data || []).sort((a: any, b: any) => {
                const dateA = a.createdAt || a.date;
                const dateB = b.createdAt || b.date;
                if (!dateA || !dateB) return 0;
                return new Date(dateB).getTime() - new Date(dateA).getTime();
            });
            setData(sortedData);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Refresh functions
    const refreshPayouts = useCallback(async () => {
        setIsLoadingPayouts(true);
        setPayoutsError(null);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");
            
            const response = await fetch('/api/getPendingPayouts', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            const sortedData = (result.data || []).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setPendingPayouts(sortedData);
        } catch (e: any) {
            setPayoutsError(e.message);
        } finally {
            setIsLoadingPayouts(false);
        }
    }, []);

    const refreshPayments = useCallback(() => fetchData('getWalletPayments', setPendingPayments, setIsLoadingPayments, setPaymentsError), [fetchData]);
    const refreshTransactions = useCallback(() => fetchData('getWalletTransactions', setAllocatedTransactions, setIsLoadingTransactions, setTransactionsError), [fetchData]);
    
    useEffect(() => {
        const loadInitial = async () => {
            setIsLoadingCompanies(true);
            try {
                const token = await getClientSideAuthToken();
                if (!token) throw new Error("Auth failed");
                const companiesResult = await performAdminAction(token, 'getMembers', {});
                setCompanies(companiesResult.data || []);
            } catch (e: any) {
                // handle error
            } finally {
                setIsLoadingCompanies(false);
            }
        };
        loadInitial();
        refreshPayouts();
        refreshPayments();
        refreshTransactions();
    }, [refreshPayouts, refreshPayments, refreshTransactions]);

    const isLoading = isLoadingCompanies || isLoadingPayments || isLoadingTransactions || isLoadingPayouts;
    const error = payoutsError || paymentsError || transactionsError;

    const enhancedPayments = useMemo(() => {
        if (!pendingPayments || !companyMap) return [];
        return pendingPayments
            .filter(p => p.status === 'pending')
            .map(p => {
                const company = companyMap.get(p.companyId);
                return { ...p, memberName: company?.companyName || 'Unknown Member' };
            });
    }, [pendingPayments, companyMap]);

    const enhancedPayouts = useMemo(() => {
        if (!pendingPayouts || !companyMap) return [];
        return pendingPayouts.map(p => {
            const company = companyMap.get(p.companyId);
            return { ...p, company };
        });
    }, [pendingPayouts, companyMap]);
    
    const handleApprovePayout = async (payout: any) => {
        setIsProcessing(payout.id);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");

            await performAdminAction(token, 'approvePayout', {
                companyId: payout.companyId,
                payoutId: payout.id,
                amount: payout.amount
            });

            toast({ title: "Payout Approved", description: `Wallet for ${payout.company?.companyName} has been debited.` });
            refreshPayouts();

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Approval Failed', description: e.message });
        } finally {
            setIsProcessing(null);
        }
    };
    
    const handleRejectPayout = async (payout: any) => {
        setIsProcessing(payout.id);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");
    
            await performAdminAction(token, 'rejectPayout', {
                companyId: payout.companyId,
                payoutId: payout.id
            });
    
            toast({ title: 'Payout Rejected', description: `Request for ${payout.company?.companyName} was rejected.` });
            refreshPayouts();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Rejection Failed', description: e.message });
        } finally {
            setIsProcessing(null);
        }
    };

    const enhancedTransactions = useMemo(() => {
        if (!allocatedTransactions || !companyMap) return [];
        return allocatedTransactions
            .map(tx => {
                const company = companyMap.get(tx.companyId);
                return { ...tx, memberName: company?.companyName || 'Unknown Member' };
            })
    }, [allocatedTransactions, companyMap]);

    const unallocatedTotal = enhancedPayments?.reduce((sum, p) => sum + p.amount, 0) || 0;
    
    if (isLoading) {
        return <div className="flex justify-center items-center py-20"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }

    if (error) {
        return <Card className="bg-destructive/10 border-destructive text-destructive-foreground"><CardHeader><CardTitle>Error Loading Data</CardTitle></CardHeader><CardContent>{error}</CardContent></Card>;
    }
    
    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Send /> Pending Payout Requests</CardTitle>
                    <CardDescription>Review and approve member withdrawal requests. Approving will debit the member's wallet.</CardDescription>
                </CardHeader>
                <CardContent>
                     {isLoadingPayouts ? (
                        <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                    ) : payoutsError ? (
                         <div className="text-destructive-foreground bg-destructive/90 p-4 rounded-md"><p>{payoutsError}</p></div>
                    ) : enhancedPayouts && enhancedPayouts.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date Requested</TableHead>
                                    <TableHead>Company</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Bank Details</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {enhancedPayouts.map(p => (
                                     <TableRow key={p.id}>
                                        <TableCell>{formatDateSafe(p.createdAt, "dd MMM yyyy, HH:mm")}</TableCell>
                                        <TableCell>{p.company?.companyName}</TableCell>
                                        <TableCell className="font-semibold">{formatCurrency(p.amount)}</TableCell>
                                        <TableCell className="text-xs font-mono">
                                            {p.company?.bankName}<br/>
                                            {p.company?.accountNumber}<br/>
                                            {p.company?.branchCode}
                                        </TableCell>
                                        <TableCell className="text-right space-x-1">
                                            <Button size="sm" onClick={() => handleApprovePayout(p)} disabled={isProcessing === p.id}>
                                                {isProcessing === p.id && <Loader2 className="h-4 w-4 animate-spin"/>}
                                                {isProcessing !== p.id && <CheckCircle className="h-4 w-4"/>}
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button size="sm" variant="destructive" disabled={!!isProcessing}>
                                                        <XCircle className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will reject the payout request of {formatCurrency(p.amount)} for {p.company?.companyName}. This action cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleRejectPayout(p)} className={buttonVariants({ variant: "destructive" })}>
                                                            Yes, Reject Payout
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                     </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                         <p className="text-center text-muted-foreground py-10">No pending payouts.</p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Clock /> Unallocated Payments</CardTitle>
                    <CardDescription>Member-submitted EFT payments awaiting verification and manual allocation.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingPayments ? (
                        <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                    ) : paymentsError ? (
                        <div className="text-destructive-foreground bg-destructive/90 p-4 rounded-md"><p>{paymentsError}</p></div>
                    ) : enhancedPayments && enhancedPayments.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date Logged</TableHead>
                                    <TableHead>Company Name</TableHead>
                                    <TableHead>Company ID</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {enhancedPayments.map(p => (
                                    <TableRow key={p.id} className="bg-amber-50 dark:bg-amber-900/20">
                                        <TableCell>{formatDateSafe(p.createdAt, "dd MMM yyyy, HH:mm")}</TableCell>
                                        <TableCell className="font-medium">{p.memberName}</TableCell>
                                        <TableCell className="font-mono text-xs">{p.companyId}</TableCell>
                                        <TableCell>{p.description}</TableCell>
                                        <TableCell className="font-semibold">{formatCurrency(p.amount)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button asChild size="sm" variant="default">
                                                <Link href={`/backend/approve-payment/${p.companyId}/${p.id}`}>
                                                    <CheckCircle className="mr-2 h-4 w-4"/>
                                                    Approve
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableFooter>
                                <TableRow>
                                    <TableCell colSpan={5} className="text-right font-bold">Total Pending Allocation</TableCell>
                                    <TableCell className="text-right font-bold text-lg">{formatCurrency(unallocatedTotal)}</TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    ) : (
                        <p className="text-center text-muted-foreground py-10">No pending payments to allocate.</p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><DollarSign /> All Allocated Transactions</CardTitle>
                    <CardDescription>A combined ledger of all completed transactions across all member wallets.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingTransactions ? (
                         <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                    ) : transactionsError ? (
                        <div className="text-destructive-foreground bg-destructive/90 p-4 rounded-md"><p>{transactionsError}</p></div>
                    ) : enhancedTransactions && enhancedTransactions.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Company Name</TableHead>
                                    <TableHead>Company ID</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {enhancedTransactions.slice(0, 20).map(tx => ( // Show latest 20
                                    <TableRow key={tx.id}>
                                        <TableCell>{formatDateSafe(tx.date, "dd MMM yyyy, HH:mm")}</TableCell>
                                        <TableCell className="font-medium">{tx.memberName}</TableCell>
                                        <TableCell className="font-mono text-xs">{tx.companyId}</TableCell>
                                        <TableCell>{tx.description}</TableCell>
                                        <TableCell className={`text-right font-mono font-semibold ${tx.type === 'credit' ? 'text-green-600' : 'text-destructive'}`}>
                                            {tx.type === 'credit' ? '+' : '-'} {formatCurrency(tx.amount)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                         <p className="text-center text-muted-foreground py-10">No allocated transactions found.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
