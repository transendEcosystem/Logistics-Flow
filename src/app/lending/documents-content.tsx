
'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, PlusCircle, FileText, Search, Download, Trash2, ShieldCheck, Clock, Archive, FileUp, Save } from "lucide-react";
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { getClientSideAuthToken } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { formatDateSafe, cn, fetchFromAdminAPI } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

function UploadDocumentDialog({ onComplete }: { onComplete: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [docName, setDocName] = useState('');
    const [docType, setDocType] = useState('Master Agreement');
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
                body: JSON.stringify({ fileDataUri: dataUri, folder: 'lending-vault/documents', fileName: `${Date.now()}_${file.name}` })
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            setFileUrl(result.url);
            if (!docName) setDocName(file.name);
            setProgress(100);
            toast({ title: "File Secured" });
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
            await fetchFromAdminAPI(token, 'saveLendingDocument', {
                document: { documentName: docName, documentType: docType, fileUrl }
            });
            toast({ title: "Node Archived", description: "Agreement record committed to vault." });
            setIsOpen(false);
            onComplete();
            // Reset
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
                    <DialogTitle>Secure Document Intake</DialogTitle>
                    <DialogDescription>Archive original master agreements and lending contracts.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 text-left">
                    <div className="space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Document Label</Label>
                        <Input value={docName} onChange={e => setDocName(e.target.value)} placeholder="e.g. Master Cession Agreement - Scania" className="h-11 border-2" />
                    </div>
                    <div className="space-y-2 text-left text-foreground">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Classification</Label>
                        <Select value={docType} onValueChange={setDocType}>
                            <SelectTrigger className="h-11 border-2"><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Master Agreement">Master Agreement</SelectItem>
                                <SelectItem value="Facility Letter">Facility Letter</SelectItem>
                                <SelectItem value="Addendum">Addendum</SelectItem>
                                <SelectItem value="Cession Contract">Cession Contract</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="pt-4 text-left">
                        <input type="file" id="doc-vault-up" className="hidden" onChange={handleFile} />
                        <Button variant="outline" className={cn("w-full h-14 border-2 border-dashed gap-3", fileUrl && "border-green-500 bg-green-50 text-green-700")} onClick={() => document.getElementById('doc-vault-up')?.click()}>
                            {isUploading ? <Loader2 className="h-5 w-5 animate-spin"/> : fileUrl ? <ShieldCheck className="h-6 w-6" /> : <FileUp className="h-6 w-6" />}
                            {fileUrl ? 'File Secured in Vault' : 'Select Agreement Scan'}
                        </Button>
                        {isUploading && <Progress value={progress} className="h-1 mt-2" />}
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSave} disabled={!fileUrl || !docName} className="w-full h-12 font-bold uppercase tracking-widest">
                        Commit to Master Register
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function DocumentVaultContent() {
    const [documents, setDocuments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;
            const res = await fetchFromAdminAPI(token, 'getLendingData', { collectionName: 'documents' });
            setDocuments(res.data || []);
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Vault Load Failed", description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => { loadData(); }, [loadData]);

    const columns: ColumnDef<any>[] = [
        {
            header: 'Master Agreement',
            cell: ({ row }) => (
                <div className="flex flex-col text-left">
                    <span className="font-bold text-foreground text-left">{row.original.documentName || 'Agreement Scan'}</span>
                    <span className="text-[10px] text-muted-foreground font-mono uppercase text-left">{row.original.id}</span>
                </div>
            )
        },
        { 
            header: 'Document Class', 
            cell: ({row}) => <Badge variant="secondary" className="capitalize text-[10px] font-black">{row.original.documentType || 'Original'}</Badge> 
        },
        { 
            header: 'Audit Trail', 
            cell: ({row}) => (
                <div className="flex items-center gap-2 text-muted-foreground text-left">
                    <Clock className="h-3 w-3" />
                    <span className="text-[10px] font-bold uppercase">{formatDateSafe(row.original.createdAt, "dd MMM yyyy")}</span>
                </div>
            )
        },
        {
            id: 'actions',
            header: <div className="text-right">Audit</div>,
            cell: ({ row }) => (
                <div className="flex justify-end gap-1 text-left text-foreground">
                    <Button variant="ghost" size="icon" asChild title="Download"><a href={row.original.fileUrl} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /></a></Button>
                    <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-8 text-left text-foreground">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 text-left text-foreground">
                <div className="text-left text-foreground">
                    <h1 className="text-3xl font-black font-headline tracking-tight flex items-center gap-3 text-left">
                        <Archive className="h-8 w-8 text-primary" />
                        Master Document Register
                    </h1>
                    <p className="text-muted-foreground mt-1 text-left text-foreground">High-security scan vault for original lending agreements and master contracts.</p>
                </div>
                <UploadDocumentDialog onComplete={loadData} />
            </div>

            <Card className="border-none shadow-xl bg-white text-left text-foreground">
                <CardContent className="pt-6 text-left">
                    {isLoading ? (
                        <div className="flex justify-center p-20 text-left"><Loader2 className="animate-spin h-10 w-10 text-primary mx-auto" /></div>
                    ) : documents.length > 0 ? (
                        <DataTable columns={columns} data={documents} />
                    ) : (
                        <div className="py-24 text-center space-y-4 text-foreground text-left text-foreground">
                            <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-20" />
                            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest text-center">Vault Empty</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
