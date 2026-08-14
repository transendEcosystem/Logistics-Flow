'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getClientSideAuthToken, useUser } from '@/firebase';
import { 
  Loader2, PlusCircle, Landmark, Edit, Trash2, Send, Globe, Search, Download, Save, 
  Filter, Users, Database, RotateCcw, Upload, Sparkles, ChevronDown, Settings2, Check, UserCheck, RefreshCcw, Phone,
  Zap, Tag, CheckCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { EngageDialog } from './EngageDialog';
import { CommunicationLogDialog } from './CommunicationLogDialog';
import { PartnerTasksDialog } from './PartnerTasksDialog';
import { PartnerOversightDialog } from './PartnerOversightDialog';
import { downloadDataAsCSV, formatDateSafe, cn } from '@/lib/utils';
import { EnrichPartnerButton } from './EnrichPartnerButton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { BulkImportDialog } from './BulkImportDialog';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

import FinanceDiscoveryEngine, { financeCategories } from './finance-discovery';
import AudienceCommunicationsTable from './AudienceCommunicationsTable';
import { BatchResearchDialog } from './BatchResearchDialog';
import { AddCommunicationLogDialog } from './AddCommunicationLogDialog';

async function performAdminAction(token: string, action: string, payload: any) {
    const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
        cache: 'no-store'
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || `API Error for action: ${action}`);
    return result;
}

const partnerSchema = z.object({
  firstName: z.string().optional().or(z.literal('')),
  lastName: z.string().optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  contactPerson: z.string().optional(),
  companyName: z.string().optional(),
  industrial_category: z.string().optional(),
  industrial_tags: z.array(z.string()).optional().default([]),
  status: z.enum(['active', 'inactive', 'contacted', 'new', 'qualified', 'invited', 'registered']),
  type: z.literal('finance'),
  website: z.string().url("Invalid URL").optional().or(z.literal('')),
  notes: z.string().optional(),
  address: z.string().optional(),
});
type PartnerFormValues = z.infer<typeof partnerSchema>;

function FinanceDialog({ open, onOpenChange, partner, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; partner?: any; onSave: () => void; }) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const form = useForm<PartnerFormValues>({ 
    resolver: zodResolver(partnerSchema),
    defaultValues: { type: 'finance', status: 'new' }
  });

  useEffect(() => {
    if (open) {
      if (partner) form.reset(partner);
      else form.reset({ firstName: '', lastName: '', email: '', phone: '', mobile: '', contactPerson: '', companyName: '', industrial_category: '', industrial_tags: [], status: 'new', type: 'finance', website: '', notes: '', address: '' });
    }
  }, [open, partner, form]);

  const handleFormSubmit = async (values: PartnerFormValues) => {
    setIsLoading(true);
    try {
        const token = await getClientSideAuthToken();
        if (!token) throw new Error("Authentication failed.");
        const coll = partner?.source === 'Lead' ? 'leads' : 'partners';
        await performAdminAction(token, 'savePartner', { collection: coll, partner: { id: partner?.id, ...values, type: 'finance' } });
        toast({ title: 'Finance Record Saved' });
        onSave();
        onOpenChange(false);
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: e.message });
    } finally {
        setIsLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] text-left text-foreground">
            <DialogHeader>
                <DialogTitle>Edit Finance Partner</DialogTitle>
                <DialogDescription>Manage core details and specialized forensic tags.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4 max-h-[80vh] overflow-y-auto pr-2 text-left">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="firstName" render={({ field }) => ( <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} className="bg-white" /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="lastName" render={({ field }) => ( <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} className="bg-white" /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                    <FormField control={form.control} name="companyName" render={({ field }) => ( <FormItem className="text-left text-foreground"><FormLabel>Institution Name</FormLabel><FormControl><Input {...field} className="bg-white" /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="industrial_category" render={({ field }) => (
                         <FormItem className="text-left text-foreground">
                            <FormLabel>Funder Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger className="bg-white text-left"><SelectValue placeholder="Select classification..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {financeCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                </SelectContent>
                            </Select>
                         </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4 text-left">
                        <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} type="email" className="bg-white" /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="mobile" render={({ field }) => ( <FormItem><FormLabel>Mobile (Direct)</FormLabel><FormControl><Input placeholder="+27 82..." {...field} className="bg-white" /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                    <FormField control={form.control} name="status" render={({ field }) => ( 
                        <FormItem className="text-left">
                            <FormLabel>Pipeline Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger className="bg-white text-left text-foreground"><SelectValue placeholder="Select status..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="new">New Lead</SelectItem>
                                    <SelectItem value="contacted">Researching</SelectItem>
                                    <SelectItem value="qualified">Qualified</SelectItem>
                                    <SelectItem value="active">Active Participant</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem> 
                    )} />
                    <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Forensic Notes</FormLabel><FormControl><Textarea {...field} className="bg-white min-h-[100px]" /></FormControl></FormItem>)} />
                     <DialogFooter className="pt-4 border-t text-left text-foreground">
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />} Save Record
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    </Dialog>
  );
}

function DuplicateCleaner({ onComplete }: { onComplete: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleAutoClean = async () => {
        setIsLoading(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Auth failed.");
            const result = await performAdminAction(token, 'bulkDeduplicate', { type: 'finance' });
            toast({ title: "Cleanup Complete", description: result.count === 0 ? "No duplicates found." : `Consolidated ${result.count} records.` });
            onComplete();
            setIsOpen(false);
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Cleanup Error", description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-foreground"><Trash2 className="mr-2 h-4 w-4"/>Clean Duplicates</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md text-left text-foreground">
                 <DialogHeader><DialogTitle>Auto-Clean Registry</DialogTitle></DialogHeader>
                <div className="py-4 space-y-4 text-left text-foreground">
                    <div className="p-4 bg-muted/30 border rounded-xl space-y-3">
                        <p className="text-xs font-bold flex items-center gap-2 text-foreground"><CheckCircle className="h-4 w-4 text-green-600"/> Prioritizes Registered Members</p>
                        <p className="text-xs font-bold flex items-center gap-2 text-foreground"><CheckCircle className="h-4 w-4 text-green-600"/> Preserves Earliest Records</p>
                    </div>
                </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleAutoClean} disabled={isLoading}>{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Zap className="mr-2 h-4 w-4"/>} Execute Clean</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function FinanceManagement() {
  const { toast } = useToast();
  const [allRecords, setAllRecords] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dialog, setDialog] = useState<{ type: 'add' | 'edit' | 'delete' | 'engage' | 'research' | null, data?: any, initialIndex?: number }>({ type: null });

  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    companyName: true,
    industrial_category: true,
    industrial_tags: true,
    contactPerson: true,
    email: true,
    outreach: true,
    status: true,
    actions: true
  });

  const fetchData = useCallback(async (limit: number = 500) => {
    setIsLoading(true);
    try {
        let records: any[] = [];
        let staffList: any[] = [];
        const token = await getClientSideAuthToken();

        if (token) {
          try {
            const [res, staffRes] = await Promise.all([
              performAdminAction(token, 'searchRegistry', { type: 'finance', term: searchTerm, limit }).catch(() => ({ data: [] })),
              performAdminAction(token, 'getPlatformStaff', {}).catch(() => ({ data: [] }))
            ]);
            records = res.data || [];
            staffList = staffRes.data || [];
          } catch (e) {
            console.warn('Admin API searchRegistry failed, trying client fallback:', e);
          }
        }

        // Fallback: Client-side Firestore query if API returned empty
        if (records.length === 0) {
          try {
            const { getFirestore, collection, query, where, limit: limitFn, getDocs } = await import('firebase/firestore');
            const { app } = await import('@/firebase');
            const clientDb = getFirestore(app);

            const financeTypes = ['finance', 'finances', 'funder', 'funders', 'lender', 'lenders', 'financial', 'bank', 'banks', 'investor', 'investors', 'credit'];

            const q1 = query(collection(clientDb, 'partners'), where('type', 'in', financeTypes), limitFn(limit));
            const snap1 = await getDocs(q1);
            let list = snap1.docs.map(doc => ({ id: doc.id, ...doc.data(), source: 'Member' }));

            if (list.length === 0) {
              const q2 = query(collection(clientDb, 'leads'), where('type', 'in', financeTypes), limitFn(limit));
              const snap2 = await getDocs(q2);
              list = snap2.docs.map(doc => ({ id: doc.id, ...doc.data(), source: 'Lead' }));
            }

            if (list.length === 0) {
              const q3 = query(collection(clientDb, 'partners'), limitFn(limit));
              const snap3 = await getDocs(q3);
              const allPartners = snap3.docs.map(doc => ({ id: doc.id, ...doc.data(), source: 'Member' }));
              list = allPartners.filter((p: any) => 
                financeTypes.includes(p.type) || financeTypes.includes(p.category) || financeTypes.includes(p.role) || financeTypes.includes(p.industrial_category)
              );
            }

            if (list.length === 0) {
              const q4 = query(collection(clientDb, 'leads'), limitFn(limit));
              const snap4 = await getDocs(q4);
              const allLeads = snap4.docs.map(doc => ({ id: doc.id, ...doc.data(), source: 'Lead' }));
              list = allLeads.filter((p: any) => 
                financeTypes.includes(p.type) || financeTypes.includes(p.category) || financeTypes.includes(p.role) || financeTypes.includes(p.industrial_category)
              );
            }

            records = list;
          } catch (fallbackErr) {
            console.error('Client Firestore fallback query error:', fallbackErr);
          }
        }

        // Client-side search filtering if needed
        if (searchTerm && records.length > 0) {
          const term = searchTerm.toLowerCase();
          records = records.filter(r => 
            (r.companyName || '').toLowerCase().includes(term) ||
            (r.contactPerson || '').toLowerCase().includes(term) ||
            (r.email || '').toLowerCase().includes(term) ||
            (r.phone || '').toLowerCase().includes(term) ||
            (r.industrial_category || '').toLowerCase().includes(term)
          );
        }

        setAllRecords(records);
        setStaff(staffList);
        setHasLoaded(true);
    } catch (e: any) {
        if (!e.message?.includes('PERMISSION_DENIED')) {
          toast({ variant: 'destructive', title: 'Fetch Error', description: e.message });
        }
    } finally {
        setIsLoading(false);
    }
  }, [searchTerm, toast]);

  useEffect(() => { if (!hasLoaded) fetchData(); }, [fetchData, hasLoaded]);

  const handleEngage = useCallback((record: any) => {
    const engageList = selectedIds.length > 0 ? allRecords.filter(r => selectedIds.includes(r.id)) : (record ? [record] : []);
    if (engageList.length === 0) return;
    setDialog({ type: 'engage', data: engageList, initialIndex: record ? engageList.findIndex((r: any) => r.id === record.id) : 0 });
  }, [allRecords, selectedIds]);

  const handleResearch = useCallback(() => {
      const researchList = allRecords.filter(r => selectedIds.includes(r.id));
      if (researchList.length === 0) return;
      setDialog({ type: 'research', data: researchList });
  }, [allRecords, selectedIds]);

  const filteredRecords = useMemo(() => {
    return allRecords.filter(p => {
        const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
        const pCat = (p.industrial_category || p.category || '').trim();
        const matchesCategory = categoryFilter === 'all' || pCat === categoryFilter;
        const matchesAssignee = assigneeFilter === 'all' || p.assigneeId === assigneeFilter;
        return matchesStatus && matchesCategory && matchesAssignee;
    });
  }, [allRecords, statusFilter, categoryFilter, assigneeFilter]);

  const columns: ColumnDef<any>[] = useMemo(() => [
    { 
        accessorKey: 'companyName',
        header: 'Finance Institution', 
        cell: ({row}) => (
            <div className="flex flex-col text-left">
                <span className="font-bold text-left text-foreground">{row.original.companyName || 'Unnamed Entity'}</span>
                <div className="flex items-center gap-2 mt-1 text-left text-foreground">
                    {row.original.website && <Globe className="h-3 w-3 text-primary" />}
                    <Badge variant="outline" className="text-[10px] h-3.5 border-primary/20 text-primary uppercase font-bold text-left">Lender</Badge>
                </div>
            </div>
        )
    },
    { 
        accessorKey: 'industrial_category', 
        header: 'Category',
        cell: ({row}) => <Badge variant="secondary" className="text-[10px] uppercase font-black tracking-widest">{row.original.industrial_category || 'General'}</Badge>
    },
    {
        accessorKey: 'industrial_tags',
        header: 'Specialized Tags',
        cell: ({row}) => (
            <div className="flex flex-wrap gap-1 max-w-[200px]">
                {(row.original.industrial_tags || []).map((tag: string) => (
                    <Badge key={tag} variant="outline" className="text-[8px] h-3.5 px-1 font-black bg-muted/50 text-foreground border-none uppercase">{tag}</Badge>
                ))}
            </div>
        )
    },
    { accessorKey: 'contactPerson', header: 'Key Contact' },
    { accessorKey: 'email', header: 'Email' },
    { 
        header: 'Outreach',
        id: 'outreach',
        accessorKey: 'lastOutreachSubject',
        cell: ({ row }) => {
            if (!row.original.lastOutreachSubject) return <span className="text-[10px] text-muted-foreground italic text-left">None</span>;
            return (
                <div className="flex flex-col text-left text-foreground text-left">
                    <Badge variant="outline" className="text-[9px] h-4 uppercase font-bold truncate max-w-[100px] text-left border-primary/20 text-primary">{row.original.lastOutreachSubject}</Badge>
                    {row.original.lastOpenedAt && (
                        <div className="flex items-center gap-1 text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 mt-1 w-fit text-left">
                            <UserCheck className="h-2.5 w-2.5" /> Read
                        </div>
                    )}
                </div>
            );
        }
    },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <Badge variant="outline" className="capitalize text-[10px]">{row.original.status}</Badge> 
    },
    { id: 'actions', header: 'Actions', cell: ({ row }) => (
      <div className="flex justify-end items-center gap-1 text-left text-foreground text-foreground text-foreground">
        <EnrichPartnerButton partner={row.original} onUpdate={() => fetchData()} />
        <Button variant="ghost" size="icon" onClick={() => handleEngage(row.original)} title="Engage"><Send className="h-4 w-4 text-primary" /></Button>
        <CommunicationLogDialog partnerId={row.original.id} partnerName={row.original.companyName} />
        <PartnerTasksDialog partner={row.original} />
        <PartnerOversightDialog partner={row.original} onUpdate={() => fetchData()} />
        <Button variant="ghost" size="icon" onClick={() => setDialog({ type: 'edit', data: row.original })}><Edit className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => setDialog({ type: 'delete', data: row.original })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </div>
    ) },
  ], [fetchData, handleEngage]);

  async function handleDeleteRecord() {
    if (!dialog.data) return;
    try {
      const token = await getClientSideAuthToken();
      if (!token) return;
      await performAdminAction(token, 'deletePartner', { partnerId: dialog.data.id });
      toast({ title: 'Deleted' });
      fetchData();
      setDialog({ type: null });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  }

  return (
    <div className="space-y-6 text-left text-foreground text-left text-foreground text-foreground">
      <EngageDialog open={dialog.type === 'engage'} onOpenChange={(o) => !o && setDialog({ type: null })} partners={dialog.data || []} initialIndex={dialog.initialIndex} audience="finance" onEngageSuccess={() => fetchData()} />
      <BatchResearchDialog open={dialog.type === 'research'} onOpenChange={(o) => !o && setDialog({ type: null })} selectedLeads={dialog.data || []} onComplete={() => fetchData()} />
      <FinanceDialog open={dialog.type === 'add' || dialog.type === 'edit'} onOpenChange={(o) => !o && setDialog({ type: null })} partner={dialog.type === 'edit' ? dialog.data : undefined} onSave={() => fetchData()} />
      <AlertDialog open={dialog.type === 'delete'} onOpenChange={(o) => !o && setDialog({ type: null })}>
        <AlertDialogContent className="text-left text-foreground text-foreground">
          <AlertDialogHeader><AlertDialogTitle className="text-left">Delete Record?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDialog({ type: null })}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRecord} className={buttonVariants({ variant: "destructive" })}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Tabs defaultValue="crm" className="w-full text-left text-foreground text-foreground text-foreground">
          <TabsList className="h-auto flex-wrap justify-start bg-muted/50 p-1 text-left text-foreground">
              <TabsTrigger value="crm" className="gap-2"><Users className="h-4 w-4" /> Forensic Registry (CRM)</TabsTrigger>
              <TabsTrigger value="discovery" className="gap-2"><Database className="h-4 w-4" /> Automated Discovery (AI)</TabsTrigger>
              <TabsTrigger value="oversight" className="gap-2"><RefreshCcw className="h-4 w-4" /> Oversight Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="crm" className="mt-6 space-y-6 text-left text-foreground text-foreground">
              {!hasLoaded ? (
                  <Card className="bg-primary/5 border-primary/20 p-12 text-center text-foreground text-left">
                      <Landmark className="mx-auto h-16 w-16 text-primary/20 mb-4" />
                      <h2 className="text-2xl font-black font-headline mb-2 text-center text-foreground text-left">Finance Registry Scan</h2>
                      <p className="text-muted-foreground max-sm mx-auto mb-8 text-center text-foreground text-left">Scan the capital database. Identify niche lenders and institutional partners.</p>
                      <Button size="lg" onClick={() => fetchData()} disabled={isLoading} className="h-12 px-8 font-bold text-left text-foreground text-foreground">
                          {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <RefreshCcw className="mr-2 h-4 w-4" />} Execute Scan
                      </Button>
                  </Card>
              ) : (
                  <Card className="text-left text-foreground text-left text-foreground">
                      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b text-left p-6 text-foreground text-foreground">
                          <div className="text-left text-foreground text-left">
                              <CardTitle className="text-xl font-bold flex items-center gap-2 text-left text-foreground text-foreground"><Landmark className="h-5 w-5 text-primary" /> Forensic Finance Registry</CardTitle>
                              <CardDescription className="text-left text-muted-foreground">Managing {filteredRecords.length} verified funding nodes.</CardDescription>
                          </div>
                          <div className="flex gap-2 text-left text-foreground text-foreground">
                              <Button variant="outline" size="sm" onClick={() => fetchData()} disabled={isLoading} className="text-foreground text-left"><RefreshCcw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} /> Refresh</Button>
                              <DuplicateCleaner onComplete={() => fetchData()} />
                              <BulkImportDialog type="finance" onComplete={() => fetchData()}><Button variant="outline" size="sm" className="text-foreground text-left"><Upload className="mr-2 h-4 w-4" /> Import</Button></BulkImportDialog>
                              <Button onClick={() => setDialog({ type: 'add' })} size="sm" className="text-foreground text-left"><PlusCircle className="mr-2 h-4 w-4"/>Add Record</Button>
                          </div>
                      </CardHeader>
                      <CardContent className="pt-6 text-left text-foreground text-foreground text-foreground">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-muted/30 rounded-lg text-left text-foreground text-foreground">
                            <div className="space-y-1 text-left text-foreground text-foreground text-foreground">
                                <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5 text-left text-foreground text-foreground"><Filter className="h-3 w-3"/> Status</Label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="h-9 bg-white text-xs text-left text-foreground text-foreground"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="new">New</SelectItem>
                                        <SelectItem value="active">Active</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1 text-left text-foreground text-foreground">
                                <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5 text-left text-foreground text-foreground text-foreground text-foreground"><Tag className="h-3 w-3"/> Category</Label>
                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <SelectTrigger className="h-9 bg-white text-xs text-left text-foreground text-foreground text-foreground text-foreground text-foreground"><SelectValue placeholder="All Categories" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        {financeCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="md:col-span-2 flex items-end gap-2 text-left text-foreground text-foreground text-foreground">
                                {selectedIds.length > 0 ? (
                                    <div className="flex gap-2 w-full animate-in fade-in slide-in-from-right-2 text-foreground text-foreground text-foreground">
                                        <Button variant="secondary" onClick={() => handleEngage(null)} className="flex-1 h-9 font-bold text-xs gap-2 text-foreground"><Send className="h-3.5 w-3.5" /> Engage ({selectedIds.length})</Button>
                                        <Button variant="outline" onClick={handleResearch} className="flex-1 h-9 font-bold text-xs gap-2 text-foreground text-foreground text-foreground"><Sparkles className="h-3.5 w-3.5 text-primary" /> AI Research</Button>
                                    </div>
                                ) : (
                                    <Button variant="outline" onClick={() => setHasLoaded(false)} className="w-full h-9 text-xs font-bold uppercase tracking-widest text-foreground text-foreground text-foreground"><RotateCcw className="mr-1 h-3 w-3" /> New Search</Button>
                                )}
                            </div>
                        </div>
                        {isLoading ? <div className="flex justify-center p-12 text-foreground text-foreground text-foreground text-foreground"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div> : (
                            <div className="space-y-6 text-left text-foreground">
                                <DataTable columns={columns} data={filteredRecords} onSelectionChange={setSelectedIds} />
                                {allRecords.length >= 100 && (
                                     <div className="flex justify-center pt-4 text-foreground">
                                        <Button variant="outline" size="lg" onClick={() => fetchData(allRecords.length + 100)} disabled={isLoading} className="gap-2 min-w-[200px] text-foreground text-foreground text-foreground">
                                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <ChevronDown className="h-4 w-4" />}
                                            Load Next 100 Records
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                      </CardContent>
                  </Card>
              )}
          </TabsContent>

          <TabsContent value="discovery" className="mt-6 text-left text-foreground text-foreground">
              <FinanceDiscoveryEngine />
          </TabsContent>

          <TabsContent value="oversight" className="mt-6 text-left text-foreground text-foreground">
              <AudienceCommunicationsTable audience="finance" />
          </TabsContent>
      </Tabs>
    </div>
  );
}