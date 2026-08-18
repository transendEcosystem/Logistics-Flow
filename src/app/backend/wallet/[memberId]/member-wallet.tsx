
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser, getClientSideAuthToken, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { doc, writeBatch, collection, increment, serverTimestamp } from 'firebase/firestore';
import { Loader2, User, Wallet, Calendar, Mail, FileCheck, Users, AlertTriangle, Check, Edit } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import MemberFundingRecords from './member-funding-records';
import MemberWalletPayments from './member-wallet-payments';
import MemberTransactions from './member-transactions';
import StaffContent from '@/app/account/staff-content';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MemberPayoutRequests from './member-payout-requests';
import { useRouter } from 'next/navigation';
import { EditMemberDialog } from './edit-member-dialog';
import { formatCurrency, formatDateSafe } from '@/lib/utils';


export default function MemberWallet({ memberId }: { memberId: string }) {
    const { toast } = useToast();
    const { user: adminUser, isUserLoading: isAdminLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    const [isPosting, setIsPosting] = useState(false);
    const [newRecordAmount, setNewRecordAmount] = useState<number | string>('');
    const [newRecordDescription, setNewRecordDescription] = useState('');
    const [isResetting, setIsResetting] = useState(false);
    const [resetAmount, setResetAmount] = useState<number | string>('');
    const [isClearing, setIsClearing] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    
    // --- SAFE DATA FETCHING ---
    const companyDocRef = useMemoFirebase(() => {
        if (!firestore || !memberId) return null;
        return doc(firestore, 'companies', memberId);
    }, [firestore, memberId]);
    
    const { data: companyData, isLoading: isCompanyLoading, error: companyError, forceRefresh: forceRefreshCompany } = useDoc(companyDocRef);

    const userDocRef = useMemoFirebase(() => {
        if (!firestore || !companyData?.ownerId) return null;
        return doc(firestore, 'users', companyData.ownerId);
    }, [firestore, companyData]);
    
    const { data: ownerData, isLoading: isOwnerLoading, error: ownerError } = useDoc(userDocRef);
    // --- END SAFE DATA FETCHING ---

    const isLoading = isAdminLoading || isCompanyLoading || isOwnerLoading;
    const error = companyError || ownerError;

    const getInitials = (fName?: string, lName?: string) => {
        if (!fName || !lName) return "U";
        return (fName[0] + lName[0]).toUpperCase();
    }
    
    const onDataUpdate = useCallback(() => {
        forceRefreshCompany();
        setRefreshTrigger(key => key + 1);
    }, [forceRefreshCompany]);
    
    const handleAddRecord = async () => {
        if (!firestore || !adminUser) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to post.' });
            return;
        }
        if (!newRecordAmount || !newRecordDescription) {
            toast({ variant: 'destructive', title: 'Missing Info', description: 'Please provide an amount and description.' });
            return;
        }

        setIsPosting(true);
        const amount = Number(newRecordAmount);
        
        const batch = writeBatch(firestore);
        
        const companyDocRef = doc(firestore, 'companies', memberId);
        const transactionRef = doc(collection(firestore, 'companies', memberId, 'transactions'));
        
        const transactionData = {
            companyId: memberId,
            type: amount >= 0 ? 'credit' : 'debit',
            amount: Math.abs(amount),
            date: serverTimestamp(),
            description: newRecordDescription,
            status: 'allocated',
            isAdjustment: true,
            postedBy: adminUser.uid,
            postedAt: serverTimestamp(),
            chartOfAccountsCode: '8010', // Manual Adjustment
            transactionId: transactionRef.id
        };

        batch.update(companyDocRef, { walletBalance: increment(amount), availableBalance: increment(amount) });
        batch.set(transactionRef, transactionData);
        
        try {
            await batch.commit();
            toast({ title: 'Success!', description: `Wallet updated and transaction recorded for ${ownerData?.firstName}.` });
            setNewRecordAmount('');
            setNewRecordDescription('');
            onDataUpdate();
        } catch (error: any) {
            errorEmitter.emit(
                'permission-error',
                new FirestorePermissionError({
                    path: `companies/${memberId}/transactions`,
                    operation: 'write',
                    requestResourceData: { walletUpdate: { walletBalance: increment(amount) }, transaction: transactionData },
                })
            );
            toast({ variant: 'destructive', title: 'Posting Failed', description: error.message || 'Missing or insufficient permissions.' });
        } finally {
            setIsPosting(false);
        }
    };
    
    const handleResetWallet = async () => {
        if (!resetAmount) {
            toast({ variant: 'destructive', title: 'Amount Required', description: 'Please enter a new opening balance.' });
            return;
        }
        setIsResetting(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");

            const response = await fetch('/api/resetWallet', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ companyId: memberId, newBalance: Number(resetAmount) }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            toast({ title: 'Wallet Reset Successfully', description: 'All transactions have been cleared and the new balance is set.' });
            setResetAmount('');
            onDataUpdate();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Reset Failed', description: e.message });
        } finally {
            setIsResetting(false);
        }
    }
    
    const handleClearPending = async () => {
        if (!companyData || (companyData.pendingBalance || 0) <= 0) {
            toast({ variant: 'default', title: 'No Action Needed', description: 'There is no pending balance to clear.'});
            return;
        }
        setIsClearing(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");
    
            const response = await fetch('/api/clearPendingBalance', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ companyId: memberId }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
    
            toast({ title: 'Success!', description: result.message });
            onDataUpdate();
        } catch(e: any) {
            toast({ variant: 'destructive', title: 'Clearing Failed', description: e.message });
        } finally {
            setIsClearing(false);
        }
    }

    if (isLoading) {
        return <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }

    if (error) {
         return (
            <Card>
                <CardHeader><CardTitle className="text-destructive">Error</CardTitle></CardHeader>
                <CardContent><p>{error.message}</p></CardContent>
            </Card>
         );
    }

    if (!companyData) {
        return (
             <Card>
                <CardHeader><CardTitle>Member Not Found</CardTitle></CardHeader>
                <CardContent><p>No member found with the ID: {memberId}</p></CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-8">
            {companyData && <EditMemberDialog isOpen={isEditDialogOpen} setIsOpen={setIsEditDialogOpen} member={companyData} onUpdate={onDataUpdate} />}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16">
                                <AvatarFallback>{getInitials(ownerData?.firstName, ownerData?.lastName)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="text-3xl">{ownerData?.firstName} {ownerData?.lastName}</CardTitle>
                                <CardDescription className="flex items-center gap-2 mt-1">
                                    <Mail className="h-4 w-4" /> {ownerData?.email}
                                </CardDescription>
                                <CardDescription className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" /> Joined: {formatDateSafe(companyData?.createdAt)}
                                </CardDescription>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
                            <Edit className="mr-2 h-4 w-4"/>
                            Edit Member
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Balance</p>
                        <p className="text-2xl font-bold">{formatCurrency(companyData?.walletBalance || 0)}</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Pending Balance</p>
                        <p className="text-2xl font-bold">{formatCurrency(companyData?.pendingBalance || 0)}</p>
                    </div>
                    <div className="p-4 bg-primary/10 rounded-lg">
                        <p className="text-sm text-primary">Available for Payout</p>
                        <p className="text-2xl font-bold text-primary">{formatCurrency(companyData?.availableBalance || 0)}</p>
                    </div>
                </CardContent>
            </Card>
            
            <Tabs defaultValue="wallet" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="wallet">Wallet</TabsTrigger>
                    <TabsTrigger value="staff">Staff</TabsTrigger>
                    <TabsTrigger value="funding">Funding Records</TabsTrigger>
                </TabsList>
                <TabsContent value="wallet" className="mt-6">
                    <div className="space-y-8">
                         <Card>
                            <CardHeader>
                                <CardTitle>Manual Wallet Adjustment</CardTitle>
                                <CardDescription>
                                    Manually add a credit or debit to this member's wallet. Use a negative number for debits.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-1">
                                        <Label htmlFor="amount">Amount (R)</Label>
                                        <Input 
                                            id="amount" 
                                            type="number" 
                                            placeholder="e.g., 500 or -50" 
                                            value={newRecordAmount}
                                            onChange={(e) => setNewRecordAmount(e.target.value)}
                                        />
                                    </div>
                                     <div className="md:col-span-2">
                                        <Label htmlFor="description">Description</Label>
                                        <Input 
                                            id="description" 
                                            placeholder="e.g., Manual top-up for sign-on bonus" 
                                            value={newRecordDescription}
                                            onChange={(e) => setNewRecordDescription(e.target.value)}
                                         />
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button onClick={handleAddRecord} disabled={isPosting}>
                                    {isPosting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileCheck className="mr-2 h-4 w-4" />}
                                    Add Record & Update Wallet
                                </Button>
                            </CardFooter>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Clear Pending Balance</CardTitle>
                                <CardDescription>
                                    Move all funds from the "Pending Balance" to the "Available Balance". This action is typically performed after a return/dispute period has passed.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-lg font-bold text-orange-600">{formatCurrency(companyData?.pendingBalance || 0)}</p>
                                <p className="text-sm text-muted-foreground">Currently pending</p>
                            </CardContent>
                            <CardFooter>
                                <Button onClick={handleClearPending} disabled={isClearing || (companyData?.pendingBalance || 0) <= 0}>
                                    {isClearing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Check className="mr-2 h-4 w-4" />}
                                    Clear Pending Funds
                                </Button>
                            </CardFooter>
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle />Danger Zone</CardTitle>
                                <CardDescription>
                                   Reset this member's wallet. This will permanently delete all existing transactions and set a new opening balance. This action cannot be undone.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="max-w-xs">
                                     <Label htmlFor="reset-amount">New Opening Balance (R)</Label>
                                     <Input 
                                        id="reset-amount"
                                        type="number"
                                        placeholder="e.g., 5000"
                                        value={resetAmount}
                                        onChange={(e) => setResetAmount(e.target.value)}
                                    />
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button variant="destructive" onClick={handleResetWallet} disabled={isResetting}>
                                    {isResetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                    Clear & Set Balance
                                </Button>
                            </CardFooter>
                        </Card>
                        <MemberPayoutRequests companyId={memberId} onUpdate={onDataUpdate} />
                        <MemberWalletPayments companyId={memberId} onUpdate={onDataUpdate} />
                        <MemberTransactions companyId={memberId} key={refreshTrigger} />
                    </div>
                </TabsContent>
                 <TabsContent value="staff" className="mt-6">
                    <StaffContent companyId={memberId} />
                </TabsContent>
                 <TabsContent value="funding" className="mt-6">
                    <MemberFundingRecords companyId={memberId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
