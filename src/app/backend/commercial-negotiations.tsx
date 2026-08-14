
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Handshake, Eye, Check, X, MessageSquare, Save, User, Bot, AlertTriangle, MoreVertical } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getClientSideAuthToken, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format as formatDateFns } from 'date-fns';

async function fetchFromAdminAPI(token: string, action: string, payload?: any) {
    const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
        throw new Error(result.error || `API Error for action: ${action}`);
    }
    return result;
}

const formatDate = (isoString?: string) => {
    if (!isoString) return 'N/A';
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return formatDateFns(date, "dd MMM yyyy, HH:mm");
    } catch {
        return 'Invalid Date';
    }
};

const statusColors: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  proposed: 'secondary',
  active: 'default',
  archived: 'destructive',
};

function NegotiationActionMenu({ agreement, onUpdate }: { agreement: any; onUpdate: () => void }) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [dialog, setDialog] = useState<'accept' | 'counter' | 'view' | null>(null);
    const [counterOffer, setCounterOffer] = useState<number | string>(agreement.percentage);
    const { user } = useUser();
    const { toast } = useToast();
    
    const canAccept = agreement.status === 'proposed';

    const handleAction = async (actionType: 'accept' | 'counter') => {
        setIsProcessing(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token || !user) throw new Error("Authentication failed.");

            let payload: any;
            let apiAction: string;
            let successMessage: string;

            if (actionType === 'accept') {
                apiAction = 'acceptCommercialAgreement';
                payload = { 
                    companyId: agreement.companyId, 
                    shopId: agreement.shopId, 
                    agreementId: agreement.id,
                    userId: user.uid 
                };
                successMessage = `Agreement for ${agreement.shopName} accepted at ${agreement.percentage}%.`;
            } else { // counter
                apiAction = 'proposeCounterOffer';
                payload = { 
                    companyId: agreement.companyId,
                    shopId: agreement.shopId,
                    agreementId: agreement.id,
                    newPercentage: Number(counterOffer),
                    adminId: user.uid
                };
                successMessage = `Counter-offer of ${counterOffer}% sent for ${agreement.shopName}.`;
            }
            await fetchFromAdminAPI(token, apiAction, payload);
            toast({ title: 'Success', description: successMessage });
            onUpdate();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Action Failed', description: e.message });
        } finally {
            setIsProcessing(false);
            setDialog(null);
        }
    };

    return (
        <>
            <AlertDialog open={dialog === 'accept'} onOpenChange={(open) => !open && setDialog(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Accept Proposal?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to accept the proposed {agreement.percentage}% commission for {agreement.shopName}? This will make the new rate active immediately and archive any other proposals.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleAction('accept')}>Yes, Accept</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <Dialog open={dialog === 'counter'} onOpenChange={(open) => !open && setDialog(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Make a Counter-Offer</DialogTitle>
                        <DialogDescription>The member proposed {agreement.percentage}%. Propose a new rate below.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-2">
                        <Label htmlFor="counter-offer-input">Your New Proposed Commission (%)</Label>
                        <Input id="counter-offer-input" type="number" value={counterOffer} onChange={(e) => setCounterOffer(e.target.value)} />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDialog(null)}>Cancel</Button>
                        <Button onClick={() => handleAction('counter')} disabled={isProcessing}>
                            {isProcessing ? <Loader2 className="animate-spin" /> : 'Send Counter-Offer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             <Dialog open={dialog === 'view'} onOpenChange={(open) => !open && setDialog(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Negotiation: {agreement.shopName}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="p-4 border rounded-lg bg-amber-500/10">
                            <h4 className="font-semibold">Member's Proposal</h4>
                            <p className="text-2xl font-bold text-amber-700">{agreement.percentage}%</p>
                            <p className="text-xs text-muted-foreground">Proposed by member on {formatDate(agreement.createdAt)}</p>
                        </div>
                         <div className="text-center py-8">
                            <Bot className="mx-auto h-10 w-10 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground mt-2">AI negotiation history will be displayed here.</p>
                         </div>
                    </div>
                </DialogContent>
            </Dialog>
            
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4"/></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setDialog('view')}><Eye className="mr-2 h-4 w-4"/> View Details</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setDialog('accept')} disabled={!canAccept}><Check className="mr-2 h-4 w-4"/> Accept Offer</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setDialog('counter')}><MessageSquare className="mr-2 h-4 w-4"/> Counter-Offer</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}

export default function CommercialNegotiations() {
    const [agreements, setAgreements] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const forceRefresh = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");
            const result = await fetchFromAdminAPI(token, 'getPendingAgreements');
            setAgreements(result.data || []);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        forceRefresh();
    }, [forceRefresh]);

    const columns: ColumnDef<any>[] = useMemo(() => [
        { accessorKey: 'shopName', header: 'Shop', cell: ({ row }) => <div>{row.original.shopName}</div> },
        { 
            accessorKey: 'percentage', 
            header: 'Member Proposal',
            cell: ({ row }) => <span className="font-bold text-lg">{row.original.percentage}%</span>
        },
        { 
            accessorKey: 'createdAt', 
            header: 'Date Proposed',
            cell: ({ row }) => <span>{formatDate(row.original.createdAt)}</span>
        },
        { 
            accessorKey: 'status', 
            header: 'Status',
            cell: ({ row }) => <Badge variant={statusColors[row.original.status] || 'secondary'} className="capitalize">{row.original.status}</Badge>
        },
        { 
            id: 'aiStatus',
            header: 'AI Agent Status',
            cell: ({ row }) => <Badge variant="outline">Awaiting AI Action</Badge>
        },
        { 
            id: 'actions', 
            header: <div className="text-right">Actions</div>,
            cell: ({ row }) => (
                <div className="text-right">
                    <NegotiationActionMenu agreement={row.original} onUpdate={forceRefresh} />
                </div>
            )
        },
    ], [forceRefresh]);

    if (isLoading) {
        return <div className="flex justify-center items-center py-20"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }
    
    if (error) {
        return (
            <Card className="bg-destructive/10 border-destructive text-destructive-foreground">
                <CardHeader><CardTitle>Error Loading Negotiations</CardTitle></CardHeader>
                <CardContent>{error}</CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Handshake /> Commercial Negotiations</CardTitle>
                <CardDescription>Review and manage all pending commercial agreement proposals from members.</CardDescription>
            </CardHeader>
            <CardContent>
                {agreements.length > 0 ? (
                    <DataTable columns={columns} data={agreements} />
                ) : (
                    <div className="text-center py-16 border-2 border-dashed rounded-lg">
                        <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-xl font-semibold">No Pending Negotiations</h3>
                        <p className="mt-2 text-muted-foreground">There are currently no new commercial proposals from members.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
