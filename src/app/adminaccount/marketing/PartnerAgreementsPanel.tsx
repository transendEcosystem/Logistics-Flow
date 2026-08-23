'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Handshake, Plus, CheckCircle2, Ban } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getClientSideAuthToken } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';

async function callAdminApi(token: string, action: string, payload?: any) {
    const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || `API error for ${action}`);
    return result;
}

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    proposed: 'secondary',
    accepted: 'outline',
    active: 'default',
    expired: 'destructive',
};

export default function PartnerAgreementsPanel() {
    const { toast } = useToast();
    const [agreements, setAgreements] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [partnerId, setPartnerId] = useState('');
    const [partnerName, setPartnerName] = useState('');
    const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
    const [discountValue, setDiscountValue] = useState('');
    const [notes, setNotes] = useState('');

    const loadAgreements = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;
            const result = await callAdminApi(token, 'listPartnerAgreements');
            setAgreements(result.agreements || []);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Failed to load agreements', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => { loadAgreements(); }, [loadAgreements]);

    const handleCreate = async () => {
        if (!partnerId.trim() || !partnerName.trim() || !discountValue.trim()) {
            toast({ variant: 'destructive', title: 'Missing fields', description: 'Partner ID, name, and discount value are required.' });
            return;
        }
        setIsSaving(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error('Authentication failed.');
            await callAdminApi(token, 'createPartnerAgreement', {
                agreement: { partnerId: partnerId.trim(), partnerName: partnerName.trim(), discountType, discountValue: Number(discountValue), notes: notes.trim() }
            });
            toast({ title: 'Agreement Created', description: `Discount agreement for ${partnerName} logged as proposed.` });
            setIsDialogOpen(false);
            setPartnerId(''); setPartnerName(''); setDiscountValue(''); setNotes('');
            loadAgreements();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Failed to create agreement', description: e.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleStatusChange = async (agreementId: string, status: string) => {
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error('Authentication failed.');
            await callAdminApi(token, 'updatePartnerAgreementStatus', { agreementId, status });
            toast({ title: 'Status Updated', description: `Agreement is now ${status}.` });
            loadAgreements();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Update failed', description: e.message });
        }
    };

    const columns: ColumnDef<any>[] = [
        { accessorKey: 'partnerName', header: 'Partner', cell: ({ row }) => <div className="font-bold">{row.original.partnerName}<div className="text-[10px] text-muted-foreground font-mono">{row.original.partnerId}</div></div> },
        { accessorKey: 'discountValue', header: 'Discount', cell: ({ row }) => <span>{row.original.discountType === 'percentage' ? `${row.original.discountValue}%` : `R${row.original.discountValue}`} off partner sales</span> },
        { accessorKey: 'status', header: 'Status', cell: ({ row }) => <Badge variant={statusVariant[row.original.status] || 'outline'} className="capitalize">{row.original.status}</Badge> },
        {
            id: 'actions', header: <div className="text-right">Actions</div>, cell: ({ row }) => (
                <div className="flex justify-end gap-2">
                    {row.original.status !== 'active' && (
                        <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => handleStatusChange(row.original.id, 'active')}>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Activate
                        </Button>
                    )}
                    {row.original.status !== 'expired' && (
                        <Button size="sm" variant="ghost" className="gap-1 text-xs text-destructive" onClick={() => handleStatusChange(row.original.id, 'expired')}>
                            <Ban className="h-3.5 w-3.5" /> Expire
                        </Button>
                    )}
                </div>
            )
        },
    ];

    return (
        <div className="space-y-6 text-left">
            <CardHeader className="px-0 pt-0 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2 font-black font-headline"><Handshake className="text-primary" /> Partner Discount Agreements</CardTitle>
                    <CardDescription>Lock in a partner-funded sale discount (e.g. CTS Trailers) for tagged customer imports.</CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> New Agreement</Button></DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>New Partner Discount Agreement</DialogTitle>
                            <DialogDescription>This becomes the single source of truth referenced by tagged imports and quote pricing.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="space-y-2"><Label>Partner ID</Label><Input placeholder="cts-trailers" value={partnerId} onChange={(e) => setPartnerId(e.target.value)} /></div>
                            <div className="space-y-2"><Label>Partner Name</Label><Input placeholder="CTS Trailers" value={partnerName} onChange={(e) => setPartnerName(e.target.value)} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Discount Type</Label>
                                    <Select value={discountType} onValueChange={(v) => setDiscountType(v as any)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="percentage">Percentage</SelectItem>
                                            <SelectItem value="fixed">Fixed Amount</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2"><Label>Value</Label><Input type="number" placeholder="5" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} /></div>
                            </div>
                            <div className="space-y-2"><Label>Notes</Label><Textarea placeholder="Discount applies to CTS sales only, not membership fee." value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreate} disabled={isSaving} className="w-full font-bold">
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} Create Agreement
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <Card className="border-none shadow-xl bg-white">
                <CardContent className="pt-6">
                    {isLoading ? <Loader2 className="animate-spin h-6 w-6 mx-auto text-primary" /> : <DataTable columns={columns} data={agreements} />}
                </CardContent>
            </Card>
        </div>
    );
}
