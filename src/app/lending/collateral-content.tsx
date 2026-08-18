'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, PlusCircle, ShieldCheck, Lock, Search, Download, Trash2, Clock, Landmark, Gavel, FileUp, Save, ArrowRightLeft } from "lucide-react";
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getClientSideAuthToken } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { formatDateSafe, cn, fetchFromAdminAPI } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

/**
 * COLLATERAL REGISTER (OWNERSHIP TRANSFERRED)
 * Formal ledger for assets where ownership is legally transferred to the cedent.
 * Focus: Cessions of book debts, Out-and-out Pledges, Registered Bonds.
 */
function UploadCollateralDialog({ onComplete }: { onComplete: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [docName, setDocName] = useState('');
    const [docType, setDocType] = useState('Out-and-Out Cession');
    const [fileUrl, setFileUrl] = useState('');
    const [progress, setProgress] = useState(0);
    const { toast } = useToast();

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        setProgress(10);
        try {
            const token = await getClientSideAuthToken();
            const reader = new FileReader();
            const dataUri = await new Promise<string>(res => {
                reader.onload = () => res(reader.result as string);
                reader.readAsDataURL(file);
            });
            setProgress(40);
            const res = await fetch('/api/uploadImageAsset', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileDataUri: dataUri, folder: 'lending-vault/collateral', fileName: `${Date.now()}_${file.name}` })
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            setFileUrl(result.url);
            if (!docName) setDocName(file.name);
            setProgress(100);
            toast({ title: "Collateral Node Secured" });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Upload Failed", description: e.message });
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;
            await fetchFromAdminAPI(token, 'saveLendingCollateral', {
                collateral: { documentName: docName, documentType: docType, fileUrl }
            });
            toast({ title: "Collateral Record Archived" });
            setIsOpen(false);
            onComplete();
            setDocName('');
            setFileUrl('');
        } catch (e) {
            toast({ variant: 'destructive', title: "Save Failed" });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="font-bold gap-2 text-white shadow-lg h-11 px-8">
                    <PlusCircle className="h-4 w-4" /> Upload Agreement Scan
                </Button>
            </DialogTrigger>
            <DialogContent className="text-left text-foreground">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ArrowRightLeft className="h-5 w-5 text-primary" />
                        Secure Collateral Intake
                    </DialogTitle>
                    <DialogDescription className="text-left">
                        Archive assets where <strong>Ownership is Transferred</strong> (Cessionary model).
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 text-left text-foreground">
                    <div className="space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Collateral Label</Label>
                        <Input value={docName} onChange={e => setDocName(e.target.value)} placeholder="e.g. Master Cession of Book Debts" className="h-11 border-2" />
                    </div>
                    <div className="space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Transfer Class</Label>
                        <Select value={docType} onValueChange={setDocType}>
                            <SelectTrigger className="h-11 border-2"><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Out-and-Out Cession">Out-and-Out Cession</SelectItem>
                                <SelectItem value="Asset Transfer Agreement">Direct Asset Transfer</SelectItem>
                                <SelectItem value="Registered Notarial Bond">Registered Notarial Bond</SelectItem>
                                <SelectItem value="Pledge (Ownership)">Ownership-Transferring Pledge</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="pt-4 text-left">
                        <input type="file" id="collateral-vault-up" className="hidden" onChange={handleFile} />
                        <Button variant="outline" className={cn("w-full h-14 border-2 border-dashed gap-3", fileUrl && "border-green-50 bg-green-50 text-green-700")} onClick={() => document.getElementById('collateral-vault-up')?.click()}>
                            {isUploading ? <Loader2 className="h-5 w-5 animate-spin"/> : fileUrl ? <ShieldCheck className="h-6 w-6" /> : <FileUp className="h-6 w-6" />}
                            {fileUrl ? 'Collateral Node Secured' : 'Select Ownership Document'}
                        </Button>
                        {isUploading && <Progress value={progress} className="h-1 mt-2" />}
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSave} disabled={!fileUrl || !docName} className="w-full h-12 font-bold uppercase tracking-widest">
                        Commit to Collateral Register
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function CollateralRegisterContent() {
    const [collateral, setCollateral] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;
            const res = await fetchFromAdminAPI(token, 'getLendingData', { collectionName: 'collateral' });
            setCollateral(res.data || []);
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Register Load Failed", description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => { loadData(); }, [loadData]);

    const columns: ColumnDef<any>[] = [
        {
            header: 'Collateral Identity',
            cell: ({ row }) => (
                <div className="flex flex-col text-left">
                    <span className="font-bold text-foreground text-left">{row.original.documentName || 'Collateral Record'}</span>
                    <div className="flex items-center gap-1.5 mt-1 text-left">
                        <Badge variant="outline" className="text-[8px] h-3.5 uppercase font-black border-primary/20 text-primary">Ownership Node</Badge>
                        <span className="text-[9px] text-muted-foreground font-mono uppercase text-left">{row.original.id}</span>
                    </div>
                </div>
            )
        },
        { 
            header: 'Fiduciary Class', 
            cell: ({row}) => <Badge variant="secondary" className="capitalize text-[10px] font-black">{row.original.documentType || 'Transferred'}</Badge> 
        },
        { 
            header: 'Vault Entry', 
            cell: ({row}) => (
                <div className="flex items-center gap-2 text-muted-foreground text-left">
                    <Gavel className="h-3 w-3" />
                    <span className="text-[10px] font-bold uppercase">{formatDateSafe(row.original.createdAt, "dd MMM yyyy")}</span>
                </div>
            )
        },
        {
            id: 'actions',
            header: <div className="text-right">Audit</div>,
            cell: ({ row }) => (
                <div className="flex justify-end gap-1 text-left">
                    <Button variant="ghost" size="icon" asChild title="Download"><a href={row.original.fileUrl} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /></a></Button>
                    <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-8 text-left text-foreground">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 text-left">
                <div className="text-left">
                    <h1 className="text-3xl font-black font-headline tracking-tight flex items-center gap-3 text-left">
                        <ArrowRightLeft className="h-8 w-8 text-primary" />
                        Collateral Register
                    </h1>
                    <p className="text-muted-foreground mt-1 text-left">Formal ledger of assets where <strong>Ownership is Legally Transferred</strong> to the financier.</p>
                </div>
                <UploadCollateralDialog onComplete={loadData} />
            </div>

            <Card className="border-none shadow-xl bg-white text-left">
                <CardContent className="pt-6 text-left">
                    {isLoading ? (
                        <div className="flex justify-center p-20 text-left"><Loader2 className="animate-spin h-10 w-10 text-primary mx-auto" /></div>
                    ) : collateral.length > 0 ? (
                        <DataTable columns={columns} data={collateral} />
                    ) : (
                        <div className="py-24 text-center space-y-4 text-left">
                            <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground opacity-20" />
                            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest text-center">Collateral Ledger Standby</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
