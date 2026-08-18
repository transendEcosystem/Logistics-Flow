'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getClientSideAuthToken, useUser } from '@/firebase';
import { 
  Loader2, PlusCircle, DollarSign, Edit, Trash2, Send, Globe, Search, Download, Save, 
  Filter, Users, UserCheck, Database, RotateCcw, Upload, Sparkles, ChevronDown, Settings2, Check 
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { BulkImportDialog } from './BulkImportDialog';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TagSelector, extractRegistryCategories, extractRegistryTags } from '@/components/ui/TagSelector';
import { Separator } from '@/components/ui/separator';
import { getRegistryCategoryOptions } from '@/lib/registry-category-options';

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
  status: z.enum(['active', 'inactive', 'contacted', 'new', 'qualified', 'invited']),
  type: z.literal('investor'),
  website: z.string().url("Invalid URL").optional().or(z.literal('')),
  notes: z.string().optional(),
  address: z.string().optional(),
});
type PartnerFormValues = z.infer<typeof partnerSchema>;

function InvestorDialog({ open, onOpenChange, partner, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; partner?: any; onSave: () => void; }) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const form = useForm<PartnerFormValues>({ 
    resolver: zodResolver(partnerSchema),
    defaultValues: { type: 'investor', status: 'new' }
  });

  useEffect(() => {
    if (open) {
      if (partner) form.reset(partner);
      else form.reset({ firstName: '', lastName: '', email: '', phone: '', mobile: '', contactPerson: '', companyName: '', status: 'new', type: 'investor', website: '', notes: '', address: '' });
    }
  }, [open, partner, form]);

  const handleFormSubmit = async (values: PartnerFormValues) => {
    setIsLoading(true);
    try {
        const token = await getClientSideAuthToken();
        if (!token) throw new Error("Authentication failed.");
        await performAdminAction(token, 'savePartner', { partner: { id: partner?.id, ...values, type: 'investor' } });
        toast({ title: 'Investor Saved' });
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
        <DialogContent className="sm:max-w-[700px] text-left text-foreground text-foreground">
            <DialogHeader>
                <DialogTitle>Edit App Launch Investor</DialogTitle>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4 max-h-[80vh] overflow-y-auto pr-2 text-left">
                    <div className="grid grid-cols-2 gap-4 text-left">
                        <FormField control={form.control} name="firstName" render={({ field }) => ( <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="lastName" render={({ field }) => ( <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                    <FormField control={form.control} name="companyName" render={({ field }) => ( <FormItem className="text-left text-foreground"><FormLabel>Fund Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <div className="grid grid-cols-2 gap-4 text-left">
                        <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} type="email"/></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="mobile" render={({ field }) => ( <FormItem><FormLabel>Mobile (Direct)</FormLabel><FormControl><Input placeholder="+27 82..." {...field} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                    <FormField control={form.control} name="status" render={({ field }) => ( 
                        <FormItem className="text-left text-foreground">
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

export default function InvestorManagement() {
  const { toast } = useToast();
  const [allRecords, setAllRecords] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dialog, setDialog] = useState<{ type: 'add' | 'edit' | 'delete' | 'engage' | null, data?: any, initialIndex?: number }>({ type: null });

  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [outreachFilter, setOutreachFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    companyName: true,
    contactPerson: true,
    email: true,
    outreach: true,
    status: true,
    actions: true
  });

  const fetchData = useCallback(async (limit: number = 20000) => {
    setIsLoading(true);
    try {
        const token = await getClientSideAuthToken();
        if (!token) return;
        const [res, staffRes] = await Promise.all([
          performAdminAction(token, 'searchRegistry', { type: 'investor', term: searchTerm, outreachFilter, limit }),
          performAdminAction(token, 'getPlatformStaff', {})
        ]);
        setAllRecords(res.data || []);
        setStaff(staffRes.data || []);
        setHasLoaded(true);
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Fetch Error', description: e.message });
    } finally {
        setIsLoading(false);
    }
  }, [searchTerm, outreachFilter, toast]);

  useEffect(() => { if (hasLoaded) fetchData(); }, [fetchData, hasLoaded]);

  const handleEngage = useCallback((record: any) => {
    const engageList = selectedIds.length > 0 ? allRecords.filter(r => selectedIds.includes(r.id)) : (record ? [record] : []);
    if (engageList.length === 0) return;
    setDialog({ type: 'engage', data: engageList, initialIndex: record ? engageList.findIndex((r: any) => r.id === record.id) : 0 });
  }, [allRecords, selectedIds]);

  const availableCategories = useMemo(() => {
    return getRegistryCategoryOptions('investor', allRecords);
  }, [allRecords]);

  const availableTags = useMemo(() => {
    return Array.from(new Set(
      allRecords.flatMap((record: any) => extractRegistryTags(record))
    )).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [allRecords]);

  const filteredRecords = useMemo(() => {
    return allRecords.filter(p => {
        const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
        const recordCategories = extractRegistryCategories(p).map((category) => category.trim());
        const matchesCategory = categoryFilter === 'all' || recordCategories.some((category) => category.toLowerCase() === categoryFilter.toLowerCase());
        const matchesAssignee = assigneeFilter === 'all' || p.assigneeId === assigneeFilter;
        const partnerTags = p.industrial_tags || p.tags || [];
        const matchesTag = tagFilter === 'all' || partnerTags.includes(tagFilter);
        return matchesStatus && matchesCategory && matchesAssignee && matchesTag;
    });
  }, [allRecords, statusFilter, categoryFilter, assigneeFilter, tagFilter]);

  const columns: ColumnDef<any>[] = useMemo(() => {
    const cols: ColumnDef<any>[] = [
      { 
          accessorKey: 'companyName',
          header: 'Investor Entity', 
          cell: ({row}) => (
              <div className="flex flex-col text-left">
                  <span className="font-bold text-left text-foreground">{row.original.companyName || 'Unnamed Entity'}</span>
                  <div className="flex items-center gap-2 mt-1 text-left text-foreground">
                      {row.original.website && <Globe className="h-3 w-3 text-primary" />}
                      <Badge variant="outline" className="text-[10px] h-3.5 border-primary/20 text-primary uppercase font-bold text-left">Equity Partner</Badge>
                  </div>
              </div>
          )
      },
      { 
          accessorKey: 'contactPerson',
          header: 'Key Decision Maker',
          cell: ({ row }) => <div className="text-sm font-medium text-left text-foreground">{row.original.contactPerson || 'N/A'}</div>
      },
      { accessorKey: 'email', header: 'Email' },
      { 
          header: 'Outreach & Result',
          id: 'outreach',
          accessorKey: 'lastOutreachSubject',
          cell: ({ row }) => {
              if (!row.original.lastOutreachSubject) return <span className="text-[10px] text-muted-foreground italic text-left">None</span>;
              return (
                  <div className="flex flex-col text-left text-foreground">
                      <Badge variant="outline" className="text-[9px] h-4 border-primary/20 text-primary uppercase font-bold truncate max-w-[100px] text-left">{row.original.lastOutreachSubject}</Badge>
                      <span className="text-[8px] text-muted-foreground mt-0.5 text-left">{formatDateSafe(row.original.lastOutreachAt, "dd/MM")}</span>
                      {row.original.lastOpenedAt && (
                          <div className="flex items-center gap-1 text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 mt-1 w-fit text-left">
                              <UserCheck className="h-2.5 w-2.5" /> Read
                          </div>
                      )}
                  </div>
              );
          }
      },
      { 
          accessorKey: 'status', 
          header: 'Status', 
          cell: ({ row }) => <Badge variant="outline" className="capitalize text-[10px]">{row.original.status}</Badge> 
      },
      { id: 'actions', header: 'Actions', cell: ({ row }) => (
        <div className="flex justify-end items-center gap-1 text-left text-foreground">
          <EnrichPartnerButton partner={row.original} onUpdate={() => fetchData()} />
          <Button variant="ghost" size="icon" onClick={() => handleEngage(row.original)} title="Engage"><Send className="h-4 w-4 text-primary" /></Button>
          <CommunicationLogDialog partnerId={row.original.id} partnerName={row.original.firstName} />
          <PartnerTasksDialog partner={row.original} />
          <PartnerOversightDialog partner={row.original} onUpdate={() => fetchData()} />
          <Button variant="ghost" size="icon" onClick={() => setDialog({ type: 'edit', data: row.original })}><Edit className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setDialog({ type: 'delete', data: row.original })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      ) },
    ];
    return cols.filter(c => visibleColumns[c.accessorKey as string] || visibleColumns[c.id as string]);
  }, [fetchData, handleEngage, visibleColumns]);

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
    <div className="space-y-6 text-left text-foreground">
      <EngageDialog open={dialog.type === 'engage'} onOpenChange={(o) => !o && setDialog({ type: null })} partners={dialog.data || []} initialIndex={dialog.initialIndex} audience="investors" onEngageSuccess={() => fetchData()} />
      <InvestorDialog open={dialog.type === 'add' || dialog.type === 'edit'} onOpenChange={(o) => !o && setDialog({ type: null })} partner={dialog.type === 'edit' ? dialog.data : undefined} onSave={() => fetchData()} />
      <AlertDialog open={dialog.type === 'delete'} onOpenChange={(o) => !o && setDialog({ type: null })}>
        <AlertDialogContent className="text-left text-foreground">
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>Delete record?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDialog({ type: null })}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRecord} className={buttonVariants({ variant: "destructive" })}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!hasLoaded ? (
            <Card className="bg-primary/5 border-primary/20 p-12 text-center text-foreground">
                <Database className="mx-auto h-16 w-16 text-primary/20 mb-4" />
                <h2 className="text-2xl font-black font-headline mb-2 text-center text-foreground">Investor Pipeline Scan</h2>
                <p className="text-muted-foreground max-w-sm mx-auto mb-8 text-center text-foreground">Scan your equity partner pipeline. Use filters to prioritize fundraising outreach.</p>
                
                <div className="max-w-4xl mx-auto space-y-6 text-left text-foreground">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-left">
                        <div className="space-y-1 text-left">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Outreach Status</Label>
                            <Select value={outreachFilter} onValueChange={setOutreachFilter}>
                                <SelectTrigger className="bg-white"><SelectValue placeholder="All Outreach" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="none">No Outreach Yet</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1 text-left">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Pipeline Status</Label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="bg-white text-left text-foreground"><SelectValue placeholder="All Stages" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="new">New Lead</SelectItem>
                                    <SelectItem value="contacted">In Research</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1 text-left text-foreground">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Category</Label>
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="bg-white text-left text-foreground"><SelectValue placeholder="All Categories" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {availableCategories.map(category => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1 text-left text-foreground">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Assignee</Label>
                            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                                <SelectTrigger className="bg-white text-left text-foreground"><SelectValue placeholder="All Staff" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Staff</SelectItem>
                                    <SelectItem value="none">Unallocated</SelectItem>
                                    {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1 text-left text-foreground">
                            <TagSelector
                                label="Tag Filter"
                                registryType="investor"
                                value={tagFilter}
                                options={availableTags}
                                placeholder="All Tags"
                                onValueChange={(selectedTag) => {
                                    setTagFilter(selectedTag);
                                    console.log('Selected tag:', selectedTag, 'registry:', 'investor');
                                }}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row justify-center gap-4 max-w-4xl mx-auto text-left">
                        <div className="flex-1 space-y-2 text-left">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Name, Fund or ID</Label>
                            <Input placeholder="Search criteria..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-12 text-lg bg-white" onKeyDown={(e) => e.key === 'Enter' && fetchData()} />
                        </div>
                        <div className="flex flex-col md:flex-row gap-2 self-end text-left text-foreground">
                            <Button size="lg" onClick={() => fetchData()} disabled={isLoading} className="h-12 px-8 font-bold text-left">
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Search className="mr-2 h-4 w-4" />} Execute Scan
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>
      ) : (
            <div className="space-y-6 text-left text-foreground">
                <CardHeader className="px-0 pt-0 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left text-foreground">
                    <div className="text-left text-foreground"><CardTitle className="flex items-center gap-2 font-black font-headline text-left text-foreground"><DollarSign /> Investors</CardTitle><CardDescription className="text-left text-muted-foreground text-foreground">Registry view ({allRecords.length} records).</CardDescription></div>
                    <div className="flex gap-2 text-left text-foreground text-foreground">
                        {selectedIds.length > 0 && <Button variant="secondary" onClick={() => handleEngage(null)} className="gap-2 shadow-sm font-bold text-left animate-in fade-in zoom-in text-foreground"><Send className="h-4 w-4" /> Batch Engage ({selectedIds.length})</Button>}
                        
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="gap-2 text-foreground text-foreground text-foreground"><Settings2 className="h-4 w-4" /> Columns</Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-2 text-left text-foreground text-foreground">
                                <div className="space-y-1 text-left text-foreground">
                                    {Object.keys(visibleColumns).map(col => (
                                        <div key={col} className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer text-[10px] font-black uppercase tracking-widest text-foreground" onClick={() => setVisibleColumns(prev => ({...prev, [col]: !prev[col]}))}>
                                            <span>{col.replace(/([A-Z])/g, ' $1')}</span>
                                            {visibleColumns[col] && <Check className="h-3 w-3 text-primary text-foreground" />}
                                        </div>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>

                        <Button variant="outline" onClick={() => downloadDataAsCSV(filteredRecords, 'investors-backup.csv')} disabled={isLoading} className="text-left text-foreground"><Download className="mr-2 h-4 w-4"/>Export CSV</Button>
                        <BulkImportDialog type="investor" onComplete={() => fetchData()}><Button variant="outline" className="text-left text-foreground"><Upload className="mr-2 h-4 w-4" /> Import</Button></BulkImportDialog>
                        <Button onClick={() => setDialog({ type: 'add' })} className="text-left text-foreground"><PlusCircle className="mr-2 h-4 w-4"/>Add Record</Button>
                    </div>
                </CardHeader>
                <Card className="text-left text-foreground text-foreground">
                    <CardContent className="pt-6 text-left text-foreground">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6 p-4 bg-muted/30 rounded-lg text-left text-foreground">
                            <div className="space-y-1 text-left text-foreground">
                                <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5 text-left text-foreground"><Filter className="h-3 w-3"/> Status</Label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="h-9 bg-white text-xs text-left text-foreground text-foreground"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                                    <SelectContent><SelectItem value="all">All Statuses</SelectItem><SelectItem value="new">New</SelectItem><SelectItem value="active">Active Participant</SelectItem></SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1 text-left text-foreground">
                                <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5 text-left text-foreground"><Filter className="h-3 w-3"/> Category</Label>
                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <SelectTrigger className="h-9 bg-white text-xs text-left text-foreground text-foreground"><SelectValue placeholder="All Categories" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        {availableCategories.map(category => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1 text-left text-foreground text-foreground">
                                <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5 text-left text-foreground"><Users className="h-3 w-3"/> Assignee</Label>
                                <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                                    <SelectTrigger className="bg-white text-left text-foreground text-foreground text-foreground"><SelectValue placeholder="All Staff" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Staff</SelectItem>
                                        <SelectItem value="none">Unallocated</SelectItem>
                                        {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1 text-left text-foreground">
                                <TagSelector
                                    label="Tag Filter"
                                    registryType="investor"
                                    value={tagFilter}
                                    options={availableTags}
                                    placeholder="All Tags"
                                    onValueChange={(selectedTag) => {
                                        setTagFilter(selectedTag);
                                        console.log('Selected tag:', selectedTag, 'registry:', 'investor');
                                    }}
                                />
                            </div>
                            <div className="space-y-1 text-left text-foreground">
                                <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5 text-left text-foreground"><Send className="h-3 w-3"/> Outreach</Label>
                                <Select value={outreachFilter} onValueChange={setOutreachFilter}>
                                    <SelectTrigger className="h-9 bg-white text-xs text-left text-foreground text-left text-foreground text-foreground"><SelectValue placeholder="All Outreach" /></SelectTrigger>
                                    <SelectContent><SelectItem value="all">All Outreach</SelectItem><SelectItem value="none">No Outreach Yet</SelectItem></SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-end text-left text-foreground"><Button variant="outline" onClick={() => setHasLoaded(false)} className="h-9 w-full text-xs font-bold uppercase tracking-widest text-left text-foreground text-foreground text-foreground text-foreground"><RotateCcw className="mr-1 h-3 w-3" /> New Search</Button></div>
                        </div>
                        {isLoading ? <div className="flex justify-center items-center py-10 text-foreground text-left text-foreground text-foreground"><Loader2 className="animate-spin mx-auto h-8 w-8 text-primary" /></div> : (
                            <div className="space-y-6 text-left text-foreground">
                                <DataTable columns={columns} data={filteredRecords} onSelectionChange={setSelectedIds} />
                                {allRecords.length >= 100 && (
                                     <div className="flex justify-center pt-4">
                                        <Button variant="outline" size="lg" onClick={() => fetchData(allRecords.length + 100)} disabled={isLoading} className="gap-2 min-w-[200px] text-foreground">
                                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <ChevronDown className="h-4 w-4" />}
                                            Load Next 100 Records
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
      )}
    </div>
  );
}
