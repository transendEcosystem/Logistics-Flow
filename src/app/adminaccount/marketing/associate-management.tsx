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
  Loader2, PlusCircle, Share2, Edit, Trash2, Send, Globe, Search, Download, Save, 
  Filter, Users, UserCheck, Database, RotateCcw, Upload, Sparkles, ChevronDown, Settings2, Check, Smartphone, Phone, Clock, AtSign, BarChart, ExternalLink
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { EngageDialog } from './EngageDialog';
import { CommunicationLogDialog } from './CommunicationLogDialog';
import { AddCommunicationLogDialog } from './AddCommunicationLogDialog';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';

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
  social_handle: z.string().optional(),
  follower_count: z.string().optional(),
  primary_channel: z.string().optional(),
  status: z.enum(['active', 'inactive', 'contacted', 'new', 'qualified', 'invited']),
  type: z.literal('associate'),
  source: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal('')),
  notes: z.string().optional(),
  address: z.string().optional(),
});
type PartnerFormValues = z.infer<typeof partnerSchema>;

function AssociateDialog({ open, onOpenChange, partner, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; partner?: any; onSave: () => void; }) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const form = useForm<PartnerFormValues>({ 
    resolver: zodResolver(partnerSchema),
    defaultValues: { type: 'associate', status: 'new' }
  });

  useEffect(() => {
    if (open) {
      if (partner) form.reset(partner);
      else form.reset({ firstName: '', lastName: '', email: '', phone: '', mobile: '', contactPerson: '', companyName: '', social_handle: '', follower_count: '', primary_channel: '', status: 'new', type: 'associate', website: '', notes: '', address: '' });
    }
  }, [open, partner, form]);

  const handleFormSubmit = async (values: PartnerFormValues) => {
    setIsLoading(true);
    try {
        const token = await getClientSideAuthToken();
        if (!token) throw new Error("Authentication failed.");
        
        const collection = partner?.source === 'Lead' ? 'leads' : 'partners';
        
        await performAdminAction(token, 'savePartner', { 
            collection,
            partner: { id: partner?.id, ...values, type: 'associate' } 
        });
        toast({ title: 'Associate Record Saved' });
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
                <DialogTitle>Edit Digital Partner</DialogTitle>
                <DialogDescription>Synchronize social metrics and forensic contact data.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 py-4 max-h-[80vh] overflow-y-auto pr-2 text-left">
                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                           <Share2 className="h-4 w-4" /> Identity & Branding
                        </Label>
                        <div className="grid grid-cols-2 gap-4 text-left">
                            <FormField control={form.control} name="companyName" render={({ field }) => ( <FormItem className="text-left text-foreground"><FormLabel>Creative Hub / Brand Name</FormLabel><FormControl><Input {...field} value={field.value || ''} className="bg-white border-2" /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="social_handle" render={({ field }) => ( <FormItem className="text-left"><FormLabel>Social Handle</FormLabel><FormControl><Input placeholder="@username" {...field} value={field.value || ''} className="bg-white border-2" /></FormControl><FormMessage /></FormItem> )} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                            <FormField control={form.control} name="primary_channel" render={({ field }) => ( 
                                <FormItem className="text-left">
                                    <FormLabel>Primary Distribution Channel</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || ''}>
                                        <FormControl><SelectTrigger className="bg-white border-2 text-left"><SelectValue placeholder="Select platform..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="TikTok">TikTok</SelectItem>
                                            <SelectItem value="Instagram">Instagram</SelectItem>
                                            <SelectItem value="Facebook">Facebook</SelectItem>
                                            <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                                            <SelectItem value="YouTube">YouTube</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem> 
                            )} />
                            <FormField control={form.control} name="follower_count" render={({ field }) => ( <FormItem className="text-left"><FormLabel>Est. Followers</FormLabel><FormControl><Input placeholder="e.g. 10k" {...field} value={field.value || ''} className="bg-white border-2" /></FormControl></FormItem> )} />
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                         <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                           <UserCheck className="h-4 w-4" /> Direct Stakeholder
                        </Label>
                        <div className="grid grid-cols-2 gap-4 text-left">
                            <FormField control={form.control} name="firstName" render={({ field }) => ( <FormItem className="text-left"><FormLabel>First Name</FormLabel><FormControl><Input {...field} value={field.value || ''} className="bg-white border-2" /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="lastName" render={({ field }) => ( <FormItem className="text-left"><FormLabel>Last Name</FormLabel><FormControl><Input {...field} value={field.value || ''} className="bg-white border-2" /></FormControl><FormMessage /></FormItem> )} />
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-left">
                            <FormField control={form.control} name="email" render={({ field }) => ( <FormItem className="text-left"><FormLabel>Email</FormLabel><FormControl><Input {...field} value={field.value || ''} type="email" className="bg-white border-2" /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="mobile" render={({ field }) => ( <FormItem className="text-left"><FormLabel>Mobile (Direct)</FormLabel><FormControl><Input placeholder="+27 82..." {...field} value={field.value || ''} className="bg-white border-2" /></FormControl><FormMessage /></FormItem> )} />
                        </div>
                    </div>

                    <Separator />

                    <FormField control={form.control} name="status" render={({ field }) => ( 
                        <FormItem className="text-left">
                            <FormLabel>Pipeline Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger className="bg-white border-2 text-left"><SelectValue placeholder="Select status..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="new">New Lead</SelectItem>
                                    <SelectItem value="contacted">Researching</SelectItem>
                                    <SelectItem value="qualified">Qualified</SelectItem>
                                    <SelectItem value="active">Active Associate</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem> 
                    )} />
                     <DialogFooter className="pt-4 border-t text-left">
                        <Button type="submit" disabled={isLoading} size="lg" className="w-full h-12 font-bold shadow-lg text-white">
                            {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />} Save Record
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    </Dialog>
  );
}

export default function AssociateManagement() {
  const { toast } = useToast();
  const [allRecords, setAllRecords] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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
    social_handle: true,
    mobile: true,
    email: true,
    outreach: true,
    status: true,
    actions: true
  });

  const fetchData = useCallback(async (limit: number = 20000) => {
    setIsLoading(true);
    try {
        let records: any[] = [];
        let staffList: any[] = [];
        const token = await getClientSideAuthToken();

        if (token) {
          try {
            const [res, staffRes] = await Promise.all([
              performAdminAction(token, 'searchRegistry', { type: 'associate', term: searchTerm, outreachFilter, limit }).catch(() => ({ data: [] })),
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
            const { initializeFirebase } = await import('@/firebase');
            const { firestore } = initializeFirebase();
            const clientDb = getFirestore(firestore.app);

            const associateTypes = ['associate', 'associates', 'digital_associate', 'digital_associates', 'creator', 'creators', 'influencer', 'influencers', 'agency', 'agencies', 'isa'];

            const q1 = query(collection(clientDb, 'partners'), where('type', 'in', associateTypes), limitFn(limit));
            const snap1 = await getDocs(q1);
            let list = snap1.docs.map(doc => ({ id: doc.id, ...doc.data(), source: 'Member' }));

            if (list.length === 0) {
              const q2 = query(collection(clientDb, 'leads'), where('type', 'in', associateTypes), limitFn(limit));
              const snap2 = await getDocs(q2);
              list = snap2.docs.map(doc => ({ id: doc.id, ...doc.data(), source: 'Lead' }));
            }

            if (list.length === 0) {
              const q3 = query(collection(clientDb, 'partners'), limitFn(limit));
              const snap3 = await getDocs(q3);
              const allPartners = snap3.docs.map(doc => ({ id: doc.id, ...doc.data(), source: 'Member' }));
              list = allPartners.filter((p: any) => 
                associateTypes.includes(p.type) || associateTypes.includes(p.category) || associateTypes.includes(p.role) || associateTypes.includes(p.industrial_category)
              );
            }

            if (list.length === 0) {
              const q4 = query(collection(clientDb, 'leads'), limitFn(limit));
              const snap4 = await getDocs(q4);
              const allLeads = snap4.docs.map(doc => ({ id: doc.id, ...doc.data(), source: 'Lead' }));
              list = allLeads.filter((p: any) => 
                associateTypes.includes(p.type) || associateTypes.includes(p.category) || associateTypes.includes(p.role) || associateTypes.includes(p.industrial_category)
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
            (r.firstName || '').toLowerCase().includes(term) ||
            (r.lastName || '').toLowerCase().includes(term) ||
            (r.contactPerson || '').toLowerCase().includes(term) ||
            (r.email || '').toLowerCase().includes(term) ||
            (r.phone || '').toLowerCase().includes(term) ||
            (r.social_handle || '').toLowerCase().includes(term)
          );
        }

        setAllRecords(records);
        setStaff(staffList);
    } catch (e: any) {
        if (!e.message?.includes('PERMISSION_DENIED')) {
          toast({ variant: 'destructive', title: 'Fetch Error', description: e.message });
        }
    } finally {
        setIsLoading(false);
    }
  }, [searchTerm, outreachFilter, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleEngage = useCallback((record: any) => {
    const engageList = selectedIds.length > 0 ? allRecords.filter(r => selectedIds.includes(r.id)) : (record ? [record] : []);
    if (engageList.length === 0) return;
    setDialog({ type: 'engage', data: engageList, initialIndex: record ? engageList.findIndex((r: any) => r.id === record.id) : 0 });
  }, [allRecords, selectedIds]);

  const availableCategories = useMemo(() => {
    return getRegistryCategoryOptions('supplier', allRecords);
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
          header: 'Brand / Agency', 
          cell: ({row}) => (
              <div className="flex flex-col text-left">
                  <span className="font-bold text-left text-foreground">{row.original.companyName || `${row.original.firstName} ${row.original.lastName}`}</span>
                  <div className="flex items-center gap-2 mt-1 text-left">
                      <Badge variant={row.original.source === 'Member' ? 'default' : 'outline'} className="text-[9px] h-4 uppercase font-bold">{row.original.source}</Badge>
                      <Badge variant="outline" className="text-[10px] h-3.5 border-primary/20 text-primary uppercase font-bold">Creator Node</Badge>
                  </div>
              </div>
          )
      },
      {
          accessorKey: 'social_handle',
          header: 'Social Hub',
          cell: ({ row }) => {
              const p = row.original;
              const handle = p.social_handle;
              const channel = p.primary_channel?.toLowerCase();
              const site = p.website;
              
              // Robust Absolute URL construction
              let finalHref = "";
              if (site && site.includes('.') && !site.includes(' ')) {
                  finalHref = site.startsWith('http') ? site : `https://${site}`;
              } else if (handle && channel) {
                  const clean = handle.replace('@', '');
                  if (channel.includes('tiktok')) finalHref = `https://www.tiktok.com/@${clean}`;
                  else if (channel.includes('instagram')) finalHref = `https://www.instagram.com/${clean}`;
                  else if (channel.includes('linkedin')) finalHref = `https://www.linkedin.com/in/${clean}`;
                  else if (channel.includes('facebook')) finalHref = `https://www.facebook.com/${clean}`;
                  else if (channel.includes('twitter') || channel.includes('x')) finalHref = `https://x.com/${clean}`;
                  else if (channel.includes('youtube')) finalHref = `https://www.youtube.com/@${clean}`;
              }

              return (
                  <div className="flex flex-col text-left">
                      <div className="flex items-center gap-2 font-bold text-primary text-xs text-left">
                        <AtSign className="h-3 w-3" />
                        {handle ? (
                            finalHref ? (
                                <a 
                                    href={finalHref} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="hover:underline flex items-center gap-1 text-left"
                                >
                                    {handle}
                                    <ExternalLink className="h-2 w-2" />
                                </a>
                            ) : <span>{handle}</span>
                        ) : 'Not Linked'}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-left">
                          <span className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">{p.primary_channel}</span>
                          {p.follower_count && <Badge variant="secondary" className="text-[8px] h-3.5 px-1 font-black bg-slate-100">{p.follower_count} Followers</Badge>}
                      </div>
                  </div>
              )
          }
      },
      { 
          accessorKey: 'mobile', 
          header: 'Direct Line',
          cell: ({row}) => (
              <div className="flex flex-col text-left">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground text-left">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      {row.original.mobile || row.original.phone || 'N/A'}
                  </div>
                  <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{row.original.email || 'No email discovered'}</span>
              </div>
          )
      },
      { 
          header: 'Outreach Stage',
          id: 'outreach',
          accessorKey: 'lastOutreachSubject',
          cell: ({ row }) => {
              if (!row.original.lastOutreachSubject) return <span className="text-[10px] text-muted-foreground italic text-left">None</span>;
              const cleanSubject = row.original.lastOutreachSubject.replace('Logistics Flow: ', '').split('(')[0].trim();
              return (
                  <div className="flex flex-col text-left">
                      <div className="flex items-center gap-1 text-left">
                        <Badge variant="outline" className="text-[9px] h-4 border-primary/20 text-primary uppercase font-bold truncate max-w-[100px] text-left">{cleanSubject}</Badge>
                        {row.original.lastOpenedAt && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <div className="bg-blue-100 p-0.5 rounded-full text-left"><UserCheck className="h-3 w-3 text-blue-600" /></div>
                              </TooltipTrigger>
                              <TooltipContent className="text-[10px] font-bold">Email Read: {formatDateSafe(row.original.lastOpenedAt, "dd/MM HH:mm")}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {row.original.lastAccessedAt && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <div className="bg-purple-100 p-0.5 rounded-full text-left"><Smartphone className="h-3 w-3 text-purple-600" /></div>
                              </TooltipTrigger>
                              <TooltipContent className="text-[10px] font-bold">Landed on Link: {formatDateSafe(row.original.lastAccessedAt, "dd/MM HH:mm")}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <span className="text-[8px] text-muted-foreground mt-0.5 text-left">{formatDateSafe(row.original.lastOutreachAt, "dd/MM, HH:mm")}</span>
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
        <div className="flex justify-end items-center gap-1 text-left">
          <EnrichPartnerButton partner={row.original} onUpdate={() => fetchData()} />
          <Button variant="ghost" size="icon" onClick={() => handleEngage(row.original)} title="Engage"><Send className="h-4 w-4 text-primary" /></Button>
          <AddCommunicationLogDialog 
              partnerId={row.original.id} 
              collection={row.original.source === 'Lead' ? 'leads' : 'partners'} 
              onLogAdded={() => fetchData()} 
          />
          <CommunicationLogDialog partnerId={row.original.id} partnerName={row.original.firstName} />
          <PartnerTasksDialog partner={row.original} />
          <PartnerOversightDialog partner={row.original} onUpdate={() => fetchData()} />
          <Button variant="ghost" size="icon" onClick={() => setDialog({ type: 'edit', data: row.original })}><Edit className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setDialog({ type: 'delete', data: row.original })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      ) },
    ];
    return cols.filter(c => visibleColumns[c.accessorKey as string] || visibleColumns[c.id as string]);
  }, [allRecords, fetchData, handleEngage, visibleColumns]);

  async function handleDeleteRecord() {
    if (!dialog.data) return;
    try {
      const token = await getClientSideAuthToken();
      if (!token) return;
      await performAdminAction(token, 'deletePartner', { partnerId: dialog.data.id, source: dialog.data.source });
      toast({ title: 'Deleted' });
      fetchData();
      setDialog({ type: null });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  }

  return (
    <div className="space-y-6 text-left">
      <EngageDialog open={dialog.type === 'engage'} onOpenChange={(o) => !o && setDialog({ type: null })} partners={dialog.data || []} initialIndex={dialog.initialIndex} audience="associates" onEngageSuccess={() => fetchData()} />
      <AssociateDialog open={dialog.type === 'add' || dialog.type === 'edit'} onOpenChange={(o) => !o && setDialog({ type: null })} partner={dialog.type === 'edit' ? dialog.data : undefined} onSave={() => fetchData()} />
      <AlertDialog open={dialog.type === 'delete'} onOpenChange={(o) => !o && setDialog({ type: null })}>
        <AlertDialogContent className="text-left text-foreground">
          <AlertDialogHeader><AlertDialogTitle className="text-left">Are you sure?</AlertDialogTitle><AlertDialogDescription className="text-left">Delete record?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDialog({ type: null })}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRecord} className={buttonVariants({ variant: "destructive" })}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-6 text-left">
          <CardHeader className="px-0 pt-0 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
              <div className="text-left"><CardTitle className="flex items-center gap-2 font-black font-headline text-left text-foreground"><Share2 /> Digital Partners</CardTitle><CardDescription className="text-left text-muted-foreground">Registry view ({allRecords.length} records).</CardDescription></div>
              <div className="flex gap-2 text-left text-foreground">
                  <Button variant="outline" size="sm" onClick={() => fetchData()} className="gap-2 text-left text-foreground"><RotateCcw className="h-4 w-4" /> Sync Registry</Button>
                  {selectedIds.length > 0 && <Button variant="secondary" onClick={() => handleEngage(null)} className="gap-2 shadow-sm font-bold text-left animate-in fade-in zoom-in text-foreground"><Send className="h-4 w-4" /> Batch Engage ({selectedIds.length})</Button>}
                  
                  <Popover>
                      <PopoverTrigger asChild>
                          <Button variant="outline" className="gap-2 text-foreground"><Settings2 className="h-4 w-4" /> Columns</Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-2 text-left">
                          <div className="space-y-1 text-left">
                              {Object.keys(visibleColumns).map(col => (
                                  <div key={col} className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer text-[10px] font-black uppercase tracking-widest text-foreground" onClick={() => setVisibleColumns(prev => ({...prev, [col]: !prev[col]}))}>
                                      <span>{col.replace(/([A-Z])/g, ' $1')}</span>
                                      {visibleColumns[col] && <Check className="h-3 w-3 text-primary" />}
                                  </div>
                              ))}
                          </div>
                      </PopoverContent>
                  </Popover>

                  <Button variant="outline" onClick={() => downloadDataAsCSV(filteredRecords, 'associates-backup.csv')} disabled={isLoading} className="text-left text-foreground"><Download className="mr-2 h-4 w-4"/>Export CSV</Button>
                  <BulkImportDialog type="associate" onComplete={() => fetchData()}><Button variant="outline" className="text-left text-foreground"><Upload className="mr-2 h-4 w-4" /> Import</Button></BulkImportDialog>
                  <Button onClick={() => setDialog({ type: 'add' })} className="text-left text-white"><PlusCircle className="mr-2 h-4 w-4"/>Add Record</Button>
              </div>
          </CardHeader>
          <Card className="text-left">
              <CardContent className="pt-6 text-left text-foreground">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6 p-4 bg-muted/30 rounded-lg text-left text-foreground">
                      <div className="space-y-1 text-left text-foreground">
                          <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5 text-left text-foreground"><Filter className="h-3 w-3"/> Status</Label>
                          <Select value={statusFilter} onValueChange={setStatusFilter}>
                              <SelectTrigger className="h-9 bg-white text-xs text-left text-foreground"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="all">All Statuses</SelectItem>
                                  <SelectItem value="new">New</SelectItem>
                                  <SelectItem value="active">Active</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                      <div className="space-y-1 text-left text-foreground">
                          <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5 text-left text-foreground"><Filter className="h-3 w-3"/> Category</Label>
                          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                              <SelectTrigger className="h-9 bg-white text-xs text-left text-foreground"><SelectValue placeholder="All Categories" /></SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="all">All Categories</SelectItem>
                                  {availableCategories.map(category => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                              </SelectContent>
                          </Select>
                      </div>
                      <div className="space-y-1 text-left text-foreground">
                          <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5 text-left text-foreground"><Users className="h-3 w-3"/> Assignee</Label>
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
                              registryType="associate"
                              value={tagFilter}
                              options={availableTags}
                              placeholder="All Tags"
                              onValueChange={(selectedTag) => {
                                  setTagFilter(selectedTag);
                                  console.log('Selected tag:', selectedTag, 'registry:', 'associate');
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
                      <div className="flex items-end text-left text-foreground">
                          <Button variant="outline" size="sm" asChild className="h-9 w-full text-[10px] font-black uppercase tracking-widest text-left text-foreground">
                              <Link href="/adminaccount?view=associate-oversight">
                                  <Clock className="mr-1 h-3 w-3" /> Performance Monitoring
                              </Link>
                          </Button>
                      </div>
                  </div>
                  {isLoading ? <div className="flex justify-center items-center py-10 text-left"><Loader2 className="animate-spin mx-auto h-8 w-8 text-primary" /></div> : (
                      <div className="space-y-6 text-left text-foreground">
                          <DataTable columns={columns} data={filteredRecords} onSelectionChange={setSelectedIds} />
                          {allRecords.length >= 100 && (
                                <div className="flex justify-center pt-4 text-left">
                                  <Button variant="outline" size="lg" onClick={() => fetchData(allRecords.length + 100)} disabled={isLoading} className="gap-2 min-w-[200px] text-left">
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
    </div>
  );
}
