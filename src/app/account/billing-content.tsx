
'use client';

import React, { useState } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CreditCard, FileText, Download, Printer, ShieldCheck, CheckCircle2, Building, Receipt } from 'lucide-react';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatCurrency, formatDateSafe } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const statusColors: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  pending_allocation: 'secondary',
  allocated: 'default',
  paid: 'default',
  reversal: 'destructive',
};

function InvoiceModal({ invoice, companyData }: { invoice: any, companyData: any }) {
    const handlePrint = () => {
        window.print();
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 font-bold text-xs gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-primary" /> View Tax Invoice
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto text-left text-foreground bg-white">
                <DialogHeader className="border-b pb-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <DialogTitle className="text-2xl font-black font-headline text-slate-900">
                                {invoice.invoiceNumber?.startsWith('RCP') ? 'PAYMENT RECEIPT' : 'TAX INVOICE'}
                            </DialogTitle>
                            <DialogDescription className="font-mono text-xs font-bold text-primary mt-1">
                                #{invoice.invoiceNumber || invoice.id}
                            </DialogDescription>
                        </div>
                        <Badge className="bg-emerald-600 text-white font-black uppercase text-xs px-3 py-1">
                            {invoice.status || 'PAID'}
                        </Badge>
                    </div>
                </DialogHeader>

                <div className="space-y-6 py-4 text-left">
                    <div className="grid grid-cols-2 gap-6 text-xs">
                        <div className="space-y-1">
                            <p className="font-black text-slate-400 uppercase text-[10px] tracking-widest">ISSUED BY</p>
                            <p className="font-bold text-slate-900 text-sm">Logistics Flow (Pty) Ltd</p>
                            <p className="text-slate-600">Reg: 2024/000000/07</p>
                            <p className="text-slate-600">VAT Reg: 4000123456</p>
                            <p className="text-slate-600">Sandton, Gauteng, South Africa</p>
                            <p className="text-slate-600">support@logisticsflow.co.za</p>
                        </div>
                        <div className="space-y-1 text-right">
                            <p className="font-black text-slate-400 uppercase text-[10px] tracking-widest">BILLED TO</p>
                            <p className="font-bold text-slate-900 text-sm">{invoice.companyName || companyData?.companyName || 'Member Company'}</p>
                            <p className="text-slate-600">{companyData?.address || companyData?.city || 'South Africa'}</p>
                            <p className="text-slate-600">VAT #: {invoice.vatNumber || companyData?.vatNumber || 'N/A'}</p>
                            <p className="text-slate-600">Date: {formatDateSafe(invoice.date, "dd MMMM yyyy")}</p>
                            <p className="text-slate-600">Payment: {invoice.paymentMethod || 'Wallet Balance'}</p>
                        </div>
                    </div>

                    <Separator />

                    <Table className="border rounded-lg">
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="font-bold">Item Description</TableHead>
                                <TableHead className="text-center font-bold">Qty</TableHead>
                                <TableHead className="text-right font-bold">Subtotal (Excl. VAT)</TableHead>
                                <TableHead className="text-right font-bold">Total (Incl. VAT)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(invoice.items || [{ description: invoice.description, quantity: 1, unitPrice: invoice.subtotal || invoice.totalAmount, total: invoice.totalAmount }]).map((item: any, idx: number) => (
                                <TableRow key={idx}>
                                    <TableCell className="font-semibold text-xs">{item.description}</TableCell>
                                    <TableCell className="text-center text-xs font-mono">{item.quantity || 1}</TableCell>
                                    <TableCell className="text-right text-xs font-mono">{formatCurrency(item.unitPrice || item.subtotal || (invoice.totalAmount / 1.15))}</TableCell>
                                    <TableCell className="text-right text-xs font-mono font-bold">{formatCurrency(item.total || invoice.totalAmount)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    <div className="flex justify-end pt-2">
                        <div className="w-64 space-y-2 text-xs">
                            <div className="flex justify-between text-slate-600">
                                <span>Subtotal (Excl. VAT):</span>
                                <span className="font-mono">{formatCurrency(invoice.subtotal || Math.round((invoice.totalAmount / 1.15) * 100) / 100)}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>VAT (15%):</span>
                                <span className="font-mono">{formatCurrency(invoice.vatAmount || Math.round((invoice.totalAmount - (invoice.totalAmount / 1.15)) * 100) / 100)}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between font-black text-sm text-slate-900 pt-1">
                                <span>Total Paid (ZAR):</span>
                                <span className="font-mono text-primary">{formatCurrency(invoice.totalAmount || 0)}</span>
                            </div>
                        </div>
                    </div>

                    {invoice.notes && (
                        <div className="border-2 border-slate-900 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900">
                            {invoice.notes}
                        </div>
                    )}

                    <div className="bg-slate-50 p-4 rounded-xl border flex items-center justify-between text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-emerald-600" />
                            <span>This is an official computer-generated tax invoice issued by Logistics Flow.</span>
                        </div>
                        <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 font-bold">
                            <Printer className="h-3.5 w-3.5" /> Print / Save PDF
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function BillingContent() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const userDocRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);
    const { data: userData, isLoading: isUserDocLoading } = useDoc<{ companyId: string }>(userDocRef);

    const companyDocRef = useMemoFirebase(() => {
        if (!firestore || !userData?.companyId) return null;
        return doc(firestore, 'companies', userData.companyId);
    }, [firestore, userData]);
    const { data: companyData } = useDoc<any>(companyDocRef);

    const transactionsQuery = useMemoFirebase(() => {
        if (!firestore || !userData?.companyId) return null;
        return query(
            collection(firestore, `companies/${userData.companyId}/transactions`), 
            orderBy('date', 'desc')
        );
    }, [firestore, userData]);

    const invoicesQuery = useMemoFirebase(() => {
        if (!firestore || !userData?.companyId) return null;
        return query(
            collection(firestore, `companies/${userData.companyId}/invoices`), 
            orderBy('date', 'desc')
        );
    }, [firestore, userData]);

    const statementsQuery = useMemoFirebase(() => {
        if (!firestore || !userData?.companyId) return null;
        return query(
            collection(firestore, `companies/${userData.companyId}/statements`), 
            orderBy('date', 'desc')
        );
    }, [firestore, userData]);

    const { data: transactions, isLoading: isLoadingTransactions } = useCollection(transactionsQuery);
    const { data: invoices, isLoading: isLoadingInvoices } = useCollection(invoicesQuery);
    const { data: statements, isLoading: isLoadingStatements } = useCollection(statementsQuery);

    const isLoading = isUserLoading || isUserDocLoading || isLoadingTransactions || isLoadingInvoices || isLoadingStatements;

    return (
        <div className="space-y-6 text-left text-foreground">
            <Card className="border-none shadow-xl bg-white text-left">
                <CardHeader className="border-b bg-slate-50/50">
                    <CardTitle className="flex items-center gap-2 text-2xl font-black font-headline">
                       <CreditCard className="h-6 w-6 text-primary" />
                       Billing & Financial Accounting
                    </CardTitle>
                    <CardDescription>View your full history of wallet transactions, official tax invoices, and account statements.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <Tabs defaultValue="invoices" className="w-full">
                        <TabsList className="bg-slate-100 p-1 mb-6 flex-wrap justify-start">
                            <TabsTrigger value="invoices" className="font-bold text-xs gap-2">
                                <Receipt className="h-3.5 w-3.5" /> Tax Invoices & Receipts ({invoices?.length || 0})
                            </TabsTrigger>
                            <TabsTrigger value="transactions" className="font-bold text-xs gap-2">
                                <CreditCard className="h-3.5 w-3.5" /> Wallet Transactions ({transactions?.length || 0})
                            </TabsTrigger>
                            <TabsTrigger value="statements" className="font-bold text-xs gap-2">
                                <FileText className="h-3.5 w-3.5" /> Account Statements ({statements?.length || 0})
                            </TabsTrigger>
                        </TabsList>

                        {/* TAB 1: TAX INVOICES & RECEIPTS */}
                        <TabsContent value="invoices">
                            {isLoading ? (
                                <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                            ) : invoices && invoices.length > 0 ? (
                                <Table className="border rounded-lg">
                                    <TableHeader className="bg-slate-50">
                                        <TableRow>
                                            <TableHead>Invoice #</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Payment Method</TableHead>
                                            <TableHead className="text-right">Total (Incl. VAT)</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {invoices.map(inv => (
                                            <TableRow key={inv.id}>
                                                <TableCell className="font-mono text-xs font-bold text-primary">{inv.invoiceNumber || inv.id}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{formatDateSafe(inv.date, "dd MMM yyyy")}</TableCell>
                                                <TableCell className="font-medium text-xs max-w-[220px] truncate">{inv.description}</TableCell>
                                                <TableCell className="text-xs">{inv.paymentMethod || 'Wallet Balance'}</TableCell>
                                                <TableCell className="text-right font-mono font-bold text-xs">{formatCurrency(inv.totalAmount || inv.amount)}</TableCell>
                                                <TableCell className="text-right">
                                                    <InvoiceModal invoice={inv} companyData={companyData} />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-16 border-2 border-dashed rounded-xl bg-slate-50/50">
                                    <Receipt className="mx-auto h-10 w-10 text-muted-foreground opacity-30" />
                                    <p className="mt-2 font-bold text-sm">No Tax Invoices Yet</p>
                                    <p className="text-xs text-muted-foreground">Invoices are automatically generated when you purchase memberships, node roles, or top-up funds.</p>
                                </div>
                            )}
                        </TabsContent>

                        {/* TAB 2: TRANSACTIONS */}
                        <TabsContent value="transactions">
                            {isLoading ? (
                                <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                            ) : transactions && transactions.length > 0 ? (
                                <Table className="border rounded-lg">
                                    <TableHeader className="bg-slate-50">
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
                                                <TableCell className="font-medium text-xs">{tx.description}</TableCell>
                                                <TableCell>
                                                    <Badge variant={statusColors[tx.status] || 'secondary'} className="capitalize text-[10px]">
                                                        {tx.status?.replace(/_/g, ' ')}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className={`text-right font-mono font-bold text-xs ${tx.type === 'credit' ? 'text-emerald-600' : 'text-slate-900'}`}>
                                                    {tx.type === 'credit' ? '+' : '-'} {formatCurrency(tx.amount)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-16 border-2 border-dashed rounded-xl bg-slate-50/50">
                                    <CreditCard className="mx-auto h-10 w-10 text-muted-foreground opacity-30" />
                                    <p className="mt-2 font-bold text-sm">No Transactions Found</p>
                                </div>
                            )}
                        </TabsContent>

                        {/* TAB 3: ACCOUNT STATEMENTS */}
                        <TabsContent value="statements">
                            {isLoading ? (
                                <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                            ) : statements && statements.length > 0 ? (
                                <Table className="border rounded-lg">
                                    <TableHeader className="bg-slate-50">
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Document / Reference</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead className="text-right">Movement</TableHead>
                                            <TableHead className="text-right">Running Balance</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {statements.map(st => (
                                            <TableRow key={st.id}>
                                                <TableCell className="text-xs text-muted-foreground">{formatDateSafe(st.date, "dd MMM yyyy")}</TableCell>
                                                <TableCell className="font-mono text-xs font-bold">{st.invoiceNumber || st.id}</TableCell>
                                                <TableCell className="text-xs">{st.description}</TableCell>
                                                <TableCell className={`text-right font-mono font-bold text-xs ${st.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {st.type === 'credit' ? '+' : '-'} {formatCurrency(st.amount)}
                                                </TableCell>
                                                <TableCell className="text-right font-mono font-bold text-xs text-slate-900">{formatCurrency(st.runningBalance || 0)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-16 border-2 border-dashed rounded-xl bg-slate-50/50">
                                    <FileText className="mx-auto h-10 w-10 text-muted-foreground opacity-30" />
                                    <p className="mt-2 font-bold text-sm">No Account Statements Generated</p>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
                <CardFooter className="border-t bg-slate-50/50 flex justify-between items-center text-xs text-muted-foreground">
                    <span>Tax Invoices and Statements are generated automatically upon financial transactions.</span>
                    <Badge variant="outline" className="font-bold text-[10px] uppercase">SA POPI & SARS Compliant</Badge>
                </CardFooter>
            </Card>
        </div>
    );
}
