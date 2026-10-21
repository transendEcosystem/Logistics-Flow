'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, PlusCircle, FileText, Download, Trash2, ShieldCheck, FileUp, Save, RefreshCcw } from "lucide-react";
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { getClientSideAuthToken } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { formatDateSafe, cn, fetchFromAdminAPI } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const TEMPLATE_CATEGORIES = [
  { id: 'agreement', label: 'Agreement Pack' },
  { id: 'security', label: 'Security Document' },
  { id: 'collateral', label: 'Collateral Document' },
  { id: 'facility-letter', label: 'Facility Letter' },
  { id: 'other', label: 'Other' },
];

function UploadTemplateDialog({ onComplete }: { onComplete: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [docName, setDocName] = useState('');
    const [category, setCategory] = useState('agreement');
    const [productType, setProductType] = useState('loan-pv');
    const [fileUrl, setFileUrl] = useState('');
    const [fileName, setFileName] = useState('');
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
                body: JSON.stringify({ fileDataUri: dataUri, folder: 'lending-library/templates', fileName: `${Date.now()}_${file.name}` })
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            setFileUrl(result.url);
            setFileName(file.name);
            if (!docName) setDocName(file.name.replace(/\.[^/.]+$/, ''));
            setProgress(100);
            toast({ title: "Template File Secured" });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Upload Failed", description: e.message });
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        if (!docName || !fileUrl) {
            toast({ variant: 'destructive', title: "Template name and file are required." });
            return;
        }
        setIsUploading(true);
        try {
            const token = await getClientSideAuthToken();
            await fetchFromAdminAPI(token, 'saveLendingDocument', {
                document: {
                    documentName: docName,
                    documentType: 'template',
                    templateCategory: category,
                    productType: category === 'agreement' ? productType : null,
                    fileUrl,
                    sourceFileName: fileName,
                    status: 'template',
                }
            });
            toast({ title: "Template Committed to Library" });
            onComplete();
            setIsOpen(false);
            setDocName('');
            setFileUrl('');
            setFileName('');
            setProgress(0);
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Save Failed", description: e.message });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <Button onClick={() => setIsOpen(true)} className="gap-2 font-bold text-white shadow-lg">
                <PlusCircle className="h-4 w-4" /> Upload Template
            </Button>
            <DialogContent className="text-left">
                <DialogHeader>
                    <DialogTitle>Upload Document Template</DialogTitle>
                    <DialogDescription>Add an agreement, security, or collateral template to the library.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label>Template Name</Label>
                        <Input value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="e.g. Installment Sale Agreement Pack" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Category</Label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {TEMPLATE_CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        {category === 'agreement' && (
                            <div className="space-y-1.5">
                                <Label>Product Type</Label>
                                <Select value={productType} onValueChange={setProductType}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="loan-pv">Loan / Working Capital</SelectItem>
                                        <SelectItem value="installment-sale">Installment Sale</SelectItem>
                                        <SelectItem value="lease">Lease / Rental</SelectItem>
                                        <SelectItem value="factoring">Factoring / Discounting</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <div className="space-y-1.5">
                        <Label>Template File (Word / PDF)</Label>
                        <input type="file" id="library-up" className="hidden" onChange={handleFile} accept=".doc,.docx,.pdf,.txt,.html" />
                        <Button type="button" variant="outline" className={cn("w-full h-14 border-2 border-dashed gap-3", fileUrl && "border-green-500 bg-green-50 text-green-700")} onClick={() => document.getElementById('library-up')?.click()} disabled={isUploading}>
                            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : fileUrl ? <ShieldCheck className="h-4 w-4" /> : <FileUp className="h-4 w-4" />}
                            {fileUrl ? `Attached: ${fileName}` : 'Attach Template File'}
                        </Button>
                        {isUploading && progress > 0 && <Progress value={progress} className="h-1.5" />}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isUploading || !fileUrl} className="text-white">
                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save to Library
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function DocumentLibraryContent() {
    const { toast } = useToast();
    const [templates, setTemplates] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

    const forceRefresh = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");
            const res = await fetchFromAdminAPI(token, 'getLendingData', { collectionName: 'documents', limit: 250 });
            const all = res.data || [];
            setTemplates(all.filter((d: any) => d.documentType === 'template' || d.status === 'template'));
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Load failed', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => { forceRefresh(); }, [forceRefresh]);

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;
            await fetchFromAdminAPI(token, 'deleteLendingDocument', { documentId: deleteTarget.id });
            toast({ title: 'Template Removed' });
            forceRefresh();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: e.message });
        } finally {
            setDeleteTarget(null);
        }
    };

    const filtered = useMemo(() => {
        if (categoryFilter === 'all') return templates;
        return templates.filter(t => t.templateCategory === categoryFilter);
    }, [templates, categoryFilter]);

    const columns: ColumnDef<any>[] = useMemo(() => [
        {
            accessorKey: 'documentName',
            header: 'Template',
            cell: ({ row }) => (
                <div className="flex items-center gap-2 text-left">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="font-bold text-foreground">{row.original.documentName}</span>
                </div>
            )
        },
        {
            accessorKey: 'templateCategory',
            header: 'Category',
            cell: ({ row }) => <Badge variant="outline" className="capitalize text-[10px] font-black">{String(row.original.templateCategory || 'other').replace('-', ' ')}</Badge>
        },
        {
            accessorKey: 'productType',
            header: 'Product',
            cell: ({ row }) => row.original.productType
                ? <Badge variant="secondary" className="capitalize text-[10px] font-black">{String(row.original.productType).replace('-', ' ')}</Badge>
                : <span className="text-muted-foreground text-xs">—</span>
        },
        {
            accessorKey: 'createdAt',
            header: 'Added',
            cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDateSafe(row.original.createdAt)}</span>
        },
        {
            id: 'actions',
            header: <div className="text-right">Audit</div>,
            cell: ({ row }) => (
                <div className="flex justify-end items-center gap-1">
                    <Button variant="ghost" size="icon" asChild title="Download">
                        <a href={row.original.fileUrl} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /></a>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(row.original)} title="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
            )
        },
    ], []);

    return (
        <div className="space-y-8 text-left text-foreground">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-black font-headline tracking-tight flex items-center gap-3">
                        <FileText className="h-8 w-8 text-primary" />
                        Document Library
                    </h1>
                    <p className="text-muted-foreground mt-1">Master templates for agreement packs, security instruments, and collateral documents. These drive the generated packs issued to clients.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={forceRefresh} disabled={isLoading} className="gap-2">
                        <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} /> Refresh
                    </Button>
                    <UploadTemplateDialog onComplete={forceRefresh} />
                </div>
            </div>

            <div className="flex gap-2 flex-wrap">
                <Badge variant={categoryFilter === 'all' ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setCategoryFilter('all')}>All</Badge>
                {TEMPLATE_CATEGORIES.map(c => (
                    <Badge key={c.id} variant={categoryFilter === c.id ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setCategoryFilter(c.id)}>{c.label}</Badge>
                ))}
            </div>

            <Card className="border-none shadow-xl bg-white">
                <CardHeader className="border-b bg-muted/10">
                    <CardTitle className="text-lg font-bold">Template Registry</CardTitle>
                    <CardDescription>Source templates used to generate client-facing document packs.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    {isLoading ? (
                        <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
                    ) : (
                        <DataTable columns={columns} data={filtered} />
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Template?</AlertDialogTitle>
                        <AlertDialogDescription>This will remove "{deleteTarget?.documentName}" from the library. Generated packs are not affected.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className={buttonVariants({ variant: 'destructive' })}>Remove</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
