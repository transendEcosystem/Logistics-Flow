
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { collection, query, orderBy } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { formatCurrency, formatDateSafe } from '@/lib/utils';

const statusColors: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  pending_allocation: 'secondary',
  allocated: 'default',
  reversal: 'destructive',
};

export default function MemberTransactions({ companyId }: { companyId: string }) {
    const firestore = useFirestore();

    const transactionsQuery = useMemoFirebase(() => {
        if (!firestore || !companyId) return null;
        return query(collection(firestore, `companies/${companyId}/transactions`), orderBy('date', 'desc'));
    }, [firestore, companyId]);

    const { data: transactions, isLoading, error } = useCollection(transactionsQuery);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><DollarSign /> Wallet Transaction History</CardTitle>
                <CardDescription>A real-time view of this member's wallet ledger.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading && (
                    <div className="flex justify-center items-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}
                {error && (
                    <div className="text-destructive-foreground bg-destructive/90 p-4 rounded-md">
                        <h4 className="font-semibold">Error</h4>
                        <p className="text-sm">{error.message}</p>
                    </div>
                )}
                {!isLoading && transactions && (
                    transactions.length > 0 ? (
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
                                        <TableCell className="text-xs">{formatDateSafe(tx.date, "dd MMM yyyy, HH:mm")}</TableCell>
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
                    ) : (
                        <div className="text-center py-10 text-muted-foreground">
                            <p>No wallet transactions found for this member.</p>
                        </div>
                    )
                )}
            </CardContent>
        </Card>
    );
}
