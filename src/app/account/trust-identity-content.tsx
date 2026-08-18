'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { 
    Fingerprint, ShieldCheck, Scale, FileText, Download, AlertTriangle, 
    Trash2, Loader2, CheckCircle, Info, ExternalLink, MessageSquareQuote,
    Lock, Ban, ShieldAlert, UserCheck, Smartphone
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, 
    AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function TrustIdentityContent() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);

    // 1. FETCH REVIEWS & VOUCHES
    const reviewsQuery = useMemoFirebase(() => {
        if (!firestore || !user?.companyId) return null;
        return query(collection(firestore, `partners/${user.companyId}/reviews`), where('status', '!=', 'archived'));
    }, [firestore, user?.companyId]);
    const { data: reviews, isLoading: isReviewsLoading, forceRefresh: refreshReviews } = useCollection(reviewsQuery);

    const vouchesQuery = useMemoFirebase(() => {
        if (!firestore || !user?.companyId) return null;
        return query(collection(firestore, `partners/${user.companyId}/vouches`));
    }, [firestore, user?.companyId]);
    const { data: vouches, isLoading: isVouchesLoading } = useCollection(vouchesQuery);

    // 2. POPI DATA EXPORT
    const handleDownloadData = async () => {
        setIsProcessing(true);
        try {
            const dataProfile = {
                account: user,
                company: user?.companyData,
                reviews: reviews || [],
                vouches: vouches || [],
                timestamp: new Date().toISOString(),
                policy: "POPI Act (South Africa) - Right to Access"
            };
            const blob = new Blob([JSON.stringify(dataProfile, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `lf-data-profile-${user?.uid}.json`;
            a.click();
            toast({ title: "Data Profile Generated", description: "Your forensic data record has been exported." });
        } catch (e) {
            toast({ variant: 'destructive', title: "Export Failed" });
        } finally {
            setIsProcessing(false);
        }
    };

    // 3. DISPUTE MECHANISM
    const handleDispute = async (review: any) => {
        setIsProcessing(true);
        try {
            const token = await (await import('@/firebase')).getClientSideAuthToken();
            if (!token) return;

            await fetch('/api/addUserDoc', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    collectionPath: `platformTasks`,
                    data: {
                        title: `REVIEW DISPUTE: ${user?.companyData?.companyName}`,
                        description: `Member refuting review ID: ${review.id}. Reason: Member claim of inaccuracy.`,
                        status: 'pending',
                        priority: 'high',
                        type: 'dispute',
                        targetId: review.id,
                        targetCollection: `partners/${user?.companyId}/reviews`
                    }
                })
            });

            toast({ title: "Dispute Logged", description: "Oversight Division will arbitrate this record." });
            refreshReviews();
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed to log dispute" });
        } finally {
            setIsProcessing(false);
        }
    };

    // 4. ACCOUNT EXIT (DEACTIVATION)
    const handleExitGrid = async () => {
        setIsProcessing(true);
        try {
            const token = await (await import('@/firebase')).getClientSideAuthToken();
            if (!token) return;

            await fetch('/api/updateUserDoc', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: `companies/${user?.companyId}`,
                    data: { 
                        status: 'suspended', 
                        membershipId: 'free',
                        deactivatedAt: { _methodName: 'serverTimestamp' }
                    }
                })
            });

            toast({ title: "Node Deactivated", description: "Your account is now idle. Sign in again to reactivate." });
            window.location.reload();
        } catch (e) {
            toast({ variant: 'destructive', title: "Deactivation failed" });
        } finally {
            setIsProcessing(false);
        }
    };

    const reviewColumns: ColumnDef<any>[] = [
        { 
            header: 'Date', 
            cell: ({row}) => <span className="text-xs font-mono">{new Date(row.original.createdAt?.seconds * 1000).toLocaleDateString()}</span> 
        },
        { 
            header: 'Feedback', 
            cell: ({row}) => (
                <div className="flex flex-col text-left">
                    <p className="text-sm italic text-left">"{row.original.comment}"</p>
                    <Badge variant="outline" className="w-fit text-[8px] h-3.5 mt-1 uppercase text-left">Rating: {row.original.rating}/5</Badge>
                </div>
            )
        },
        {
            id: 'actions',
            header: <div className="text-right">Actions</div>,
            cell: ({ row }) => (
                <div className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleDispute(row.original)} className="text-xs font-bold text-destructive gap-1">
                        <Scale className="h-3 w-3" /> Dispute
                    </Button>
                </div>
            )
        }
    ];

    if (isUserLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary mx-auto" /></div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 text-left text-foreground">
            <div className="text-left space-y-1">
                <h1 className="text-3xl font-black font-headline tracking-tight flex items-center gap-3 text-left">
                    <Fingerprint className="h-8 w-8 text-primary" />
                    Trust & Identity Hub
                </h1>
                <p className="text-muted-foreground text-left">Manage your industrial standing, data privacy, and community reputation.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left text-foreground">
                <div className="lg:col-span-2 space-y-8 text-left">
                    <Tabs defaultValue="reputation" className="w-full text-left">
                        <TabsList className="bg-muted/50 p-1 h-auto flex-wrap justify-start text-left">
                            <TabsTrigger value="reputation" className="gap-2 px-6 py-2.5 font-bold uppercase tracking-widest text-[10px]">
                                <ShieldCheck className="h-3.5 w-3.5" /> Community Standing
                            </TabsTrigger>
                            <TabsTrigger value="popi" className="gap-2 px-6 py-2.5 font-bold uppercase tracking-widest text-[10px]">
                                <FileText className="h-3.5 w-3.5" /> Data Profile (POPI)
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="reputation" className="mt-8 space-y-6 text-left">
                            <div className="grid grid-cols-2 gap-4 text-left">
                                <Card className="bg-green-50 border-green-100 text-left">
                                    <CardContent className="pt-6 text-center text-foreground">
                                        <div className="bg-white p-3 rounded-full w-fit mx-auto mb-2 shadow-sm">
                                            <ShieldCheck className="h-6 w-6 text-green-600" />
                                        </div>
                                        <p className="text-2xl font-black text-green-700">{vouches?.length || 0}</p>
                                        <p className="text-[10px] font-black uppercase text-green-600/70 tracking-widest">Accuracy Vouches</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-primary/5 border-primary/20 text-left">
                                    <CardContent className="pt-6 text-center text-foreground">
                                        <div className="bg-white p-3 rounded-full w-fit mx-auto mb-2 shadow-sm">
                                            <MessageSquareQuote className="h-6 w-6 text-primary" />
                                        </div>
                                        <p className="text-2xl font-black text-primary">{reviews?.length || 0}</p>
                                        <p className="text-[10px] font-black uppercase text-primary/70 tracking-widest text-center">Verified Reviews</p>
                                    </CardContent>
                                </Card>
                            </div>

                            <Card className="border-none shadow-xl bg-white text-left">
                                <CardHeader className="border-b bg-muted/10 text-left">
                                    <CardTitle className="text-sm font-black uppercase tracking-widest text-foreground text-left">Performance Ledger</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6 text-left">
                                    {isReviewsLoading ? <Loader2 className="animate-spin mx-auto h-6 w-6 text-primary" /> : (
                                        <DataTable columns={reviewColumns} data={reviews || []} />
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="popi" className="mt-8 space-y-6 text-left">
                            <Card className="border-none shadow-xl bg-white text-left">
                                <CardHeader className="text-left text-foreground">
                                    <div className="flex items-center gap-3 text-left">
                                        <div className="bg-primary/10 p-2 rounded-lg text-left"><FileText className="h-5 w-5 text-primary" /></div>
                                        <CardTitle className="text-xl font-bold text-left">Personal Data Control</CardTitle>
                                    </div>
                                    <CardDescription className="text-left text-muted-foreground">In compliance with the POPI Act, you have the right to access and export your data profile.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 text-left">
                                    <p className="text-sm text-muted-foreground leading-relaxed text-left">
                                        Click the button below to generate a real-time export of your entire digital node, including profile details, transaction metadata, and recorded interactions.
                                    </p>
                                    <Button variant="outline" className="h-12 px-8 font-bold gap-2 text-left" onClick={handleDownloadData} disabled={isProcessing}>
                                        {isProcessing ? <Loader2 className="animate-spin h-4 w-4" /> : <Download className="h-4 w-4" />}
                                        Download My Data Profile (.json)
                                    </Button>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                <div className="space-y-6 text-left text-foreground">
                    <Card className="bg-slate-900 text-white border-none shadow-2xl p-6 text-left">
                        <CardHeader className="p-0 mb-4 text-left">
                            <CardTitle className="text-lg font-black uppercase tracking-widest text-primary flex items-center gap-2 text-left">
                                <ShieldCheck className="h-5 w-5 text-primary" /> Verified identity
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 space-y-4 text-left">
                            <p className="text-xs text-slate-400 leading-relaxed text-left">
                                Your digital node is currently verified. This standing allows you to transact in the Malls and receive direct RFQs.
                            </p>
                            <Badge className="bg-green-600 text-white border-none text-[8px] h-4 uppercase font-black px-3 py-1">Active Grid Node</Badge>
                        </CardContent>
                    </Card>

                    <div className="p-6 border-2 border-dashed rounded-3xl space-y-4 text-left bg-white text-foreground">
                         <div className="flex items-center gap-2 text-left text-foreground">
                            <Ban className="h-5 w-5 text-destructive" />
                            <h4 className="font-bold text-sm uppercase text-destructive text-left">Exit Structure</h4>
                         </div>
                         <p className="text-[11px] text-muted-foreground leading-relaxed text-left text-foreground">
                            Formally deactivating your node removes you from public searches and halts any active Connect Plan billing. You can reactivate at any time.
                         </p>
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" className="w-full text-destructive font-bold text-xs h-10 border border-destructive/20 hover:bg-destructive/5 text-left">
                                    Deactivate Digital Node
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="text-left text-foreground">
                                <AlertDialogHeader className="text-left">
                                    <AlertDialogTitle className="text-left text-foreground">Are you sure you want to exit?</AlertDialogTitle>
                                    <AlertDialogDescription className="text-left text-muted-foreground">
                                        This will hide your digital branch from the registry and stop your active subscriptions. Your wallet balance will remain preserved.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="text-left">
                                    <AlertDialogCancel onClick={() => {}}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleExitGrid} className={cn(buttonVariants({ variant: 'destructive' }))}>
                                        Confirm Deactivation
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                         </AlertDialog>
                    </div>
                </div>
            </div>
        </div>
    );
}
