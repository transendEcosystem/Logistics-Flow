
'use client';

import { Suspense, useEffect, useState } from 'react';
import { notFound, useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, getClientSideAuthToken, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Loader2, CheckCircle, FileCheck, ArrowLeft, Landmark } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { formatCurrency, formatDateSafe } from '@/lib/utils';

function ApprovePaymentComponent() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const firestore = useFirestore();
    const [reconciliationId, setReconciliationId] = useState('');
    const [isApproving, setIsApproving] = useState(false);

    // slug will be [companyId, paymentId]
    const companyId = Array.isArray(params.slug) ? params.slug[0] : '';
    const paymentId = Array.isArray(params.slug) ? params.slug[1] : '';

    const paymentRef = useMemoFirebase(() => {
        if (!firestore || !companyId || !paymentId) return null;
        return doc(firestore, `companies/${companyId}/walletPayments/${paymentId}`);
    }, [firestore, companyId, paymentId]);

    const { data: payment, isLoading, error } = useDoc(paymentRef);
    
    const handleApprove = async () => {
        if (!payment) return;
        setIsApproving(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");
            
            const response = await fetch('/api/admin', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'approveWalletPayment',
                    payload: {
                        companyId: companyId,
                        paymentId: payment.id,
                        amount: payment.amount,
                        description: payment.description,
                        reconciliationId: reconciliationId, // Pass the reference number
                    }
                }),
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || `Failed to approve payment.`);
            }

            toast({
                title: "Payment Approved!",
                description: `${formatCurrency(payment.amount)} has been credited to the member's wallet.`
            });
            router.push('/backend?view=wallet-transactions');
        } catch (e: any) {
            toast({
                variant: 'destructive',
                title: 'Approval Failed',
                description: e.message
            });
        } finally {
            setIsApproving(false);
        }
    };
    

    if (isLoading) {
        return <div className="flex justify-center items-center h-full py-20"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }
    
    if (error) {
        return <div className="text-center py-20 text-destructive">Error: {error.message}</div>;
    }
    
    if (!payment) {
        return notFound();
    }

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-2xl">
                           <CheckCircle /> Approve Wallet Payment
                        </CardTitle>
                        <CardDescription>
                            Confirm the payment and add a bank reference number.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <Alert>
                    <Landmark className="h-4 w-4" />
                    <AlertTitle>Confirm Payment Details</AlertTitle>
                    <AlertDescription className="space-y-2 mt-2">
                       <div className="flex justify-between"><span>Company ID:</span><span className="font-mono">{companyId}</span></div>
                       <div className="flex justify-between"><span>Date Logged:</span><span className="font-semibold">{formatDateSafe(payment.createdAt, "dd MMMM yyyy, HH:mm")}</span></div>
                       <div className="flex justify-between"><span>Description:</span><span className="font-semibold">{payment.description}</span></div>
                       <div className="flex justify-between text-lg"><span>Amount:</span><span className="font-bold text-primary">{formatCurrency(payment.amount)}</span></div>
                    </AlertDescription>
                </Alert>

                <div className="space-y-2">
                    <Label htmlFor="reconId">Bank Allocation Ref #</Label>
                    <Input 
                        id="reconId"
                        value={reconciliationId}
                        onChange={(e) => setReconciliationId(e.target.value)}
                        placeholder="Enter the reference from your bank statement"
                    />
                </div>
            </CardContent>
            <CardFooter className="bg-muted/50 p-4 border-t flex justify-between items-center">
                 <Button variant="outline" asChild>
                    <Link href="/backend?view=wallet-transactions">
                        <ArrowLeft className="mr-2 h-4 w-4"/> Cancel
                    </Link>
                 </Button>
                 <Button onClick={handleApprove} disabled={isApproving || !reconciliationId}>
                    {isApproving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileCheck className="mr-2 h-4 w-4"/>}
                    Approve & Post Transaction
                 </Button>
            </CardFooter>
        </Card>
    )
}

export default function ApprovePaymentPage() {
    return (
         <div className="container mx-auto px-4 py-16">
            <Suspense fallback={<div className="flex justify-center items-center min-h-[calc(100vh-8rem)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>}>
                <ApprovePaymentComponent />
            </Suspense>
        </div>
    )
}
