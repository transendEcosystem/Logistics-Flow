
'use client';

import { useUser, useFirestore, useCollection, useDoc, getClientSideAuthToken, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Loader2, DollarSign, Wallet, Clock, Info, Gem, Send, AlertCircle, Banknote, Edit, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { collection, query, orderBy, limit, doc, where } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useConfig } from '@/hooks/use-config';
import { useToast } from '@/hooks/use-toast';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import PayServicesDialog from './pay-services-dialog';
import { formatCurrency, formatDateSafe } from '@/lib/utils';

const statusColors: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  pending_allocation: 'secondary',
  allocated: 'default',
  reversal: 'destructive',
  pending: 'secondary',
};

function PayoutRequestDialog({ companyData, availableBalance, onPayoutRequested }: { companyData: any, availableBalance: number, onPayoutRequested: () => void }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [amount, setAmount] = useState<string>('');

    const hasBankDetails = companyData.bankName && companyData.accountNumber;

    const handleSubmit = async () => {
        const payoutAmount = parseFloat(amount);
        if (isNaN(payoutAmount) || payoutAmount <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a positive amount.' });
            return;
        }
        if (payoutAmount > availableBalance) {
            toast({ variant: 'destructive', title: 'Insufficient Funds', description: 'Your requested amount exceeds your available balance.' });
            return;
        }

        setIsSubmitting(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");

            const response = await fetch('/api/createPayoutRequest', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ companyId: companyData.id, amount: payoutAmount }),
            });
            
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Failed to submit request.");

            toast({ title: 'Payout Request Submitted!', description: 'Your request will be processed by an admin shortly.' });
            setAmount('');
            setIsOpen(false);
            onPayoutRequested();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Submission Failed', description: e.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Send className="mr-2 h-4 w-4"/> Request Payout
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Request Wallet Payout</DialogTitle>
                     {hasBankDetails ? (
                        <DialogDescription>Enter the amount you wish to withdraw to your registered bank account.</DialogDescription>
                     ) : (
                         <DialogDescription>You need to add your bank details before you can request a payout.</DialogDescription>
                     )}
                </DialogHeader>
                {hasBankDetails ? (
                    <div className="space-y-4 py-4">
                        <div className="p-4 border rounded-lg bg-muted">
                            <h4 className="font-semibold text-sm mb-2">Payout to:</h4>
                            <p className="text-sm font-mono">{companyData.accountHolderName}</p>
                            <p className="text-sm font-mono">{companyData.bankName} - {companyData.accountNumber}</p>
                             <Button variant="link" size="sm" asChild className="p-0 h-auto text-xs mt-1">
                                <Link href="/account?view=company"><Edit className="mr-1 h-3 w-3"/>Change bank details</Link>
                            </Button>
                        </div>
                        <div className="space-y-2">
                             <Label htmlFor="payout-amount">Amount (Available: {formatCurrency(availableBalance)})</Label>
                             <Input 
                                id="payout-amount"
                                type="number" 
                                placeholder={`Max ${formatCurrency(availableBalance)}`}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                    </div>
                ) : (
                    <Alert className="mt-4">
                        <Banknote className="h-4 w-4"/>
                        <AlertTitle>Bank Details Required</AlertTitle>
                        <AlertDescription>
                            Please add your company's bank details on your profile page to enable payouts.
                            <Button asChild variant="link" className="p-0 h-auto ml-1">
                                <Link href="/account?view=company&from=wallet"><Edit className="mr-1 h-3 w-3"/>Add or change bank details</Link>
                            </Button>
                        </AlertDescription>
                    </Alert>
                )}
                 <DialogFooter>
                    {hasBankDetails && (
                        <Button onClick={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4" />}
                            Submit Request
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function WalletContent() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState<string>('');

    const userDocRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);
    const { data: userData, isLoading: isUserDocLoading } = useDoc<{ companyId: string }>(userDocRef);

    const companyId = userData?.companyId;

    const companyDocRef = useMemoFirebase(() => {
        if (!firestore || !companyId) return null;
        return doc(firestore, 'companies', companyId);
    }, [firestore, companyId]);
    const { data: companyData, isLoading: isCompanyLoading, forceRefresh: forceRefreshCompany } = useDoc(companyDocRef);

    const transactionsQuery = useMemoFirebase(() => {
        if (!firestore || !companyId) return null;
        return query(
            collection(firestore, `companies/${companyId}/transactions`), 
            orderBy('date', 'desc'), 
            limit(5)
        );
    }, [firestore, companyId]);

    const pendingPaymentsQuery = useMemoFirebase(() => {
        if (!firestore || !companyId) return null;
        return query(
            collection(firestore, `companies/${companyId}/walletPayments`),
            orderBy('createdAt', 'desc'),
            limit(5)
        );
    }, [firestore, companyId]);

    
    const { data: techPricing, isLoading: isTechPricingLoading } = useConfig<{ eftTopUpFee?: number }>('techPricing');
    const { data: bankDetails, isLoading: isBankDetailsLoading } = useConfig<any>('bankDetails');

    const { data: transactions, isLoading: isLoadingTransactions, error: transactionsError } = useCollection(transactionsQuery);
    const { data: pendingPayments, isLoading: isLoadingPayments, error: paymentsError, forceRefresh: forceRefreshPayments } = useCollection(pendingPaymentsQuery);
    
    const { forceRefresh: forceRefreshPayouts } = useCollection(useMemoFirebase(() => {
        if (!firestore || !companyId) return null;
        return query(
            collection(firestore, `companies/${companyId}/payoutRequests`),
            where('status', '==', 'pending')
        );
    }, [firestore, companyId]));
    
    const availableBalance = companyData?.availableBalance || 0;

    const isLoading = isUserLoading || isUserDocLoading || isCompanyLoading || isLoadingTransactions || isLoadingPayments || isTechPricingLoading || isBankDetailsLoading;
    const error = transactionsError || paymentsError;
    
    const handlePayoutRequestSuccess = () => {
        forceRefreshCompany();
        forceRefreshPayouts();
    };

    const unallocatedTotal = pendingPayments?.reduce((sum, p) => sum + p.amount, 0) || 0;
    const recentTransactionsTotal = transactions?.reduce((sum, tx) => {
        const amount = tx.type === 'credit' ? tx.amount : -tx.amount;
        return sum + amount;
    }, 0) || 0;
    
    const handleSubmitProofOfPayment = async () => {
        if (!user) {
             toast({
                variant: "destructive",
                title: "Not Logged In",
                description: "You must be logged in to make a payment.",
            });
            return;
        }
        const amountValue = parseFloat(paymentAmount);
        if (isNaN(amountValue) || amountValue <= 0) {
            toast({ variant: 'destructive', title: "Invalid Amount", description: "Please enter a valid payment amount."});
            return;
        }

        setIsSubmitting(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed");
            
            const paymentData = {
                status: 'pending',
                description: 'Wallet Top-up via EFT',
                amount: amountValue,
                createdAt: { _methodName: 'serverTimestamp' },
            };
            
            const response = await fetch('/api/createWalletPayment', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: paymentData }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to submit.');

            toast({ title: "Proof Submitted!", description: "An admin will review and credit your wallet shortly."});
            setPaymentAmount('');
            forceRefreshPayments();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Submission Failed", description: e.message });
        } finally {
            setIsSubmitting(false);
        }
    }


    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                   <Wallet className="h-6 w-6" />
                   My Wallet
                </CardTitle>
                <CardDescription>Your wallet balance, recent transactions, and pending payments.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="space-y-2">
                        <div className="flex justify-between items-baseline">
                            <p className="text-sm text-muted-foreground">Total Balance</p>
                            {isCompanyLoading ? (
                                <Loader2 className="h-6 w-6 animate-spin mt-1" />
                            ) : (
                                <p className="text-3xl font-bold">{formatCurrency(companyData?.walletBalance)}</p>
                            )}
                        </div>
                        <div className="flex justify-between items-baseline text-orange-600">
                            <p className="text-sm">(-) Pending Balance</p>
                            <p className="font-semibold">({formatCurrency(companyData?.pendingBalance)})</p>
                        </div>
                        <div className="flex justify-between items-baseline border-t pt-2 mt-2">
                            <p className="text-lg font-bold text-primary">Available to Spend</p>
                            <p className="text-2xl font-bold text-primary">{formatCurrency(availableBalance)}</p>
                        </div>
                    </div>
                     <div className="flex items-center gap-2 mt-4">
                        {companyData && <PayoutRequestDialog companyData={companyData} availableBalance={availableBalance} onPayoutRequested={handlePayoutRequestSuccess}/>}
                        {companyData && <PayServicesDialog member={companyData} onPaymentSuccess={forceRefreshCompany} />}
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Top-up via EFT</h3>
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>How to Top Up</AlertTitle>
                        <AlertDescription>
                        To add funds, make an EFT payment to the bank details below using your Company ID as the reference. Then, enter the amount and click "I've made a payment" to notify us.
                        {techPricing?.eftTopUpFee && techPricing.eftTopUpFee > 0 && (
                                <span className="font-semibold block mt-2">Please note: A {formatCurrency(techPricing.eftTopUpFee)} admin fee applies to EFT top-ups.</span>
                        )}
                        </AlertDescription>
                    </Alert>
                    <Card className="bg-background">
                        <CardContent className="p-4 text-sm space-y-2">
                            {isBankDetailsLoading ? (
                                <div className="flex justify-center p-4">
                                    <Loader2 className="h-6 w-6 animate-spin"/>
                                </div>
                            ) : bankDetails ? (
                                <>
                                    {Object.entries(bankDetails).filter(([key]) => !['id', 'updatedAt'].includes(key)).map(([key, value]) => (
                                        <div key={key} className="flex justify-between">
                                            <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                            <span className="font-mono">{String(value)}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between pt-2 border-t">
                                        <span className="text-muted-foreground">Reference</span>
                                        <span className="font-mono text-primary">{companyId || '(Loading...)'}</span>
                                    </div>
                                </>
                            ) : (
                                <p className="text-muted-foreground text-center">Bank details not configured.</p>
                            )}
                        </CardContent>
                    </Card>
                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="w-full sm:w-auto flex-grow">
                            <Label htmlFor="payment-amount">Payment Amount (R)</Label>
                            <Input 
                                id="payment-amount"
                                type="number" 
                                placeholder="500.00"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                disabled={isSubmitting}
                            />
                        </div>
                        <Button onClick={handleSubmitProofOfPayment} disabled={isSubmitting || !paymentAmount || isLoading}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            I've made a payment
                        </Button>
                    </div>
                </div>

                {isLoading && (
                    <div className="flex justify-center items-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}
                
                {error && (
                    <div className="text-center py-10 text-destructive">
                        <p>Error loading wallet data: {error.message}</p>
                    </div>
                )}

                {!isLoading && !error && (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mb-2">
                                <Clock className="h-4 w-4" />
                                Unallocated Payments
                            </h3>
                            {pendingPayments && pendingPayments.length > 0 ? (
                                <div className="border rounded-lg">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date Logged</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {pendingPayments.map((payment) => (
                                                <TableRow key={payment.id} className="bg-muted/30">
                                                    <TableCell className="text-muted-foreground text-xs">{formatDateSafe(payment.createdAt, "dd MMM yyyy, HH:mm")}</TableCell>
                                                    <TableCell>
                                                        <p className="font-medium capitalize">{payment.description.replace(/_/g, ' ')}</p>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary">Pending Approval</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono font-semibold">
                                                        {formatCurrency(payment.amount)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                        <TableFooter>
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-right font-semibold">Sub-Total of Pending Payments</TableCell>
                                                <TableCell className="text-right font-bold text-lg">{formatCurrency(unallocatedTotal)}</TableCell>
                                            </TableRow>
                                        </TableFooter>
                                    </Table>
                                </div>
                             ) : (
                                <div className="text-center py-10 border-2 border-dashed rounded-lg">
                                    <p className="text-muted-foreground">You have no pending payments awaiting allocation.</p>
                                </div>
                            )}
                        </div>
                        
                        <div>
                             <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mb-2">
                                <DollarSign className="h-4 w-4" />
                                Recent Allocated Transactions
                            </h3>
                             {transactions && transactions.length > 0 ? (
                                <div className="border rounded-lg">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {transactions.map((tx) => (
                                                <TableRow key={tx.id}>
                                                    <TableCell className="text-muted-foreground text-xs">{formatDateSafe(tx.date, "dd MMM yyyy, HH:mm")}</TableCell>
                                                    <TableCell>
                                                        <p className="font-medium">{tx.description}</p>
                                                    </TableCell>
                                                    <TableCell className={`text-right font-mono font-semibold ${tx.type === 'credit' ? 'text-green-600' : 'text-destructive'}`}>
                                                        {tx.type === 'credit' ? '+' : '-'} {formatCurrency(tx.amount)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                         <TableFooter>
                                            <TableRow>
                                                <TableCell colSpan={2} className="text-right font-semibold">Net Change from Recent Transactions</TableCell>
                                                <TableCell className="text-right font-bold text-lg">{formatCurrency(recentTransactionsTotal)}</TableCell>
                                            </TableRow>
                                        </TableFooter>
                                    </Table>
                                </div>
                            ) : (
                                <div className="text-center py-10 border-2 border-dashed rounded-lg">
                                    <p className="text-muted-foreground">You have no completed transactions yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter>
                 <Button variant="outline" asChild>
                    <Link href="/account?view=billing">View Full Transaction History</Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
