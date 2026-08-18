
'use client';

import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CreditCard } from 'lucide-react';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDateSafe } from '@/lib/utils';

const statusColors: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  pending_allocation: 'secondary',
  allocated: 'default',
  reversal: 'destructive',
};

export default function BillingContent() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const userDocRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);
    const { data: userData, isLoading: isUserDocLoading } = useDoc<{ companyId: string }>(userDocRef);

    const transactionsQuery = useMemoFirebase(() => {
        if (!firestore || !userData?.companyId) return null;
        return query(
            collection(firestore, `companies/${userData.companyId}/transactions`), 
            orderBy('date', 'desc')
        );
    }, [firestore, userData]);

    const { data: transactions, isLoading: isLoadingTransactions, error: transactionsError } = useCollection(transactionsQuery);

    const isLoading = isUserLoading || isUserDocLoading || isLoadingTransactions;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                   <CreditCard className="h-6 w-6" />
                   Billing & Statements
                </CardTitle>
                <CardDescription>View your full history of transactions, invoices, and charges.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                ) : transactionsError ? (
                     <div className="text-destructive-foreground bg-destructive/90 p-4 rounded-md">
                        <h4 className="font-semibold">Error Loading Transactions</h4>
                        <p className="text-sm">{transactionsError.message}</p>
                    </div>
                ) : transactions && transactions.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.map(tx => (
                                    <TableRow key={tx.id}>
                                        <TableCell className="text-xs text-muted-foreground">{formatDateSafe(tx.date, "dd MMM yyyy, HH:mm")}</TableCell>
                                        <TableCell>{tx.description}</TableCell>
                                        <TableCell>
                                            <Badge variant={statusColors[tx.status] || 'secondary'} className="capitalize">
                                                {tx.status?.replace(/_/g, ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className={`text-right font-mono font-semibold ${tx.type === 'credit' ? 'text-green-600' : 'text-destructive'}`}>
                                            {tx.type === 'credit' ? '+' : '-'} {formatCurrency(tx.amount)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="text-center py-20 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">No transactions found.</p>
                        <p className="text-sm text-muted-foreground mt-1">Your transaction history will appear here.</p>
                    </div>
                )}
            </CardContent>
             <CardFooter>
                <p className="text-xs text-muted-foreground">This is a log of all financial movements in your wallet.</p>
            </CardFooter>
        </Card>
    );
}
