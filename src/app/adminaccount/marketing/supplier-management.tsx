'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getClientSideAuthToken, useUser } from '@/firebase';
import { 
  Loader2, PlusCircle, Building, Edit, Trash2, Send, Globe, Search, Download, Save, 
  Filter, Users, Database, RotateCcw, Upload, Sparkles, ChevronDown, Settings2, Check, UserCheck, Phone, UserCircle, Smartphone, UserPlus, ShieldCheck, Zap, Wrench
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { EngageDialog } from './EngageDialog';
import { PartnerTasksDialog } from './PartnerTasksDialog';
import { downloadDataAsCSV, formatDateSafe, cn } from '@/lib/utils';
import { EnrichPartnerButton } from './EnrichPartnerButton';
import { CommercialDeepDiveButton } from './CommercialDeepDiveButton';
import { ContentHarvestButton } from './ContentHarvestButton';
import { BulkImportDialog } from './BulkImportDialog';
import { Label } from '@/components/ui/label';
import { TagSelector, extractRegistryCategories, extractRegistryTags } from '@/components/ui/TagSelector';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { getRegistryCategoryOptions } from '@/lib/registry-category-options';

async function performAdminAction(token: string, action: string, payload: any) {
  const response = await fetch('/api/admin', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload }),
    cache: 'no-store'
  });
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error || `API Error for action: ${action}`);
  }
  return result;
}

const contactSchema = z.object({
  name: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  mobile: z.string().optional().nullable(),
});

const partnerSchema = z.object({
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  mobile: z.string().optional().nullable(),
  contactPerson: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  minedServiceWording: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  marketingManager: contactSchema.optional().nullable(),
  operationsManager: contactSchema.optional().nullable(),
  technicalManager: contactSchema.optional().nullable(),
  ceo: contactSchema.optional().nullable(),
  primaryContactRole: z.enum(['marketingManager', 'ceo', 'operationsManager', 'technicalManager']).default('marketingManager'),
});
type PartnerFormValues = z.infer<typeof partnerSchema>;

function SupplierDialog({ open, onOpenChange, partner, onSave, targetType }: { open: boolean; onOpenChange: (open: boolean) => void; partner?: any; onSave: () => void; targetType: string; }) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const form = useForm<PartnerFormValues>({ 
    resolver: zodResolver(partnerSchema),
    defaultValues: { type: targetType, status: 'new', primaryContactRole: 'marketingManager' }
  });

  useEffect(() => {
    if (open) {
      if (partner) {
          const primaryContactRole = partner.primaryContactRole || 'marketingManager';
          const structuredContact = partner[primaryContactRole];
          const sanitizedPartner = {
              ...partner,
              marketingManager: partner.marketingManager || (primaryContactRole === 'marketingManager' ? {
                name: partner.contactPerson || `${partner.firstName || ''} ${partner.lastName || ''}`.trim(),
                email: partner.email || '',
                mobile: partner.mobile || partner.phone || '',
              } : { name: '', email: '', mobile: '' }),
              operationsManager: partner.operationsManager || { name: '', email: '', mobile: '' },
              technicalManager: partner.technicalManager || { name: '', email: '', mobile: '' },
              ceo: partner.ceo || { name: '', email: '', mobile: '' },
              status: partner.status || 'new',
              primaryContactRole,
          };
          form.reset(sanitizedPartner);
      } else {
        form.reset({ firstName: '', lastName: '', email: '', phone: '', mobile: '', contactPerson: '', companyName: '', website: '', minedServiceWording: '', address: '', status: 'new', type: targetType, marketingManager: { name: '', email: '', mobile: '' }, operationsManager: { name: '', email: '', mobile: '' }, technicalManager: { name: '', email: '', mobile: '' }, ceo: { name: '', email: '', mobile: '' }, primaryContactRole: 'marketingManager' });
      }
    }
  }, [open, partner, form, targetType]);

  const handleFormSubmit = async (values: PartnerFormValues) => {
    setIsLoading(true);
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error("Auth failed.");
      const coll = partner?.sourceCollection || (partner?.source === 'Lead' ? 'leads' : targetType === 'supplier' ? 'suppliers' : 'partners');
      const explicitType = partner ? (values.type || partner.type) : targetType;
      await performAdminAction(token, 'savePartner', {
        collection: coll,
        partner: {
          id: partner?.id,
          ...values,
          ...(explicitType ? { type: explicitType } : {}),
        },
      });
      toast({ title: 'Record Saved' });
      onSave();
      onOpenChange(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl text-left text-foreground">
        <DialogHeader>
            <DialogTitle>{partner ? 'Edit' : 'Add'} Supplier Profile</DialogTitle>
            <DialogDescription>Manage high-fidelity contacts and industrial profile data.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8 py-4 max-h-[85vh] overflow-y-auto pr-2 text-left text-foreground">
            <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2 text-left">
                    <Building className="h-4 w-4" /> Core Entity Details
                </h4>
                <div className="grid grid-cols-2 gap-4 text-left">
                  <FormField control={form.control} name="companyName" render={({ field }) => (<FormItem className="text-left text-foreground"><FormLabel>Entity Name</FormLabel><FormControl><Input {...field} value={field.value || ''} className="bg-white border-2" /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="website" render={({ field }) => (<FormItem className="text-left text-foreground"><FormLabel>Website URL</FormLabel><FormControl><Input {...field} value={field.value || ''} placeholder="e.g. jhtrucking.co.za" className="bg-white border-2" /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <div className="grid grid-cols-2 gap-4 text-left text-foreground text-foreground">
                  <FormField control={form.control} name="email" render={({ field }) => (<FormItem className="text-left text-foreground"><FormLabel>General Company Email</FormLabel><FormControl><Input {...field} value={field.value || ''} type="text" className="bg-white border-2" /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="phone" render={({ field }) => (<FormItem className="text-left text-foreground"><FormLabel>Company Landline</FormLabel><FormControl><Input {...field} value={field.value || ''} className="bg-white border-2" /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <div className="grid grid-cols-2 gap-4 text-left text-foreground text-foreground">
                    <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem className="text-left text-foreground text-foreground">
                            <FormLabel>Pipeline Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                                <FormControl><SelectTrigger className="bg-white border-2 text-left text-foreground"><SelectValue placeholder="Select status..." /></SelectTrigger></FormControl>
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
                </div>
                <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem className="text-left text-foreground text-foreground text-foreground">
                        <FormLabel>Physical Operational Address</FormLabel>
                        <FormControl><Textarea {...field} value={field.value || ''} className="bg-white h-20 border-2" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
            </div>

            <Separator />

            <div className="space-y-6">
                <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2 text-left">
                    <Users className="h-4 w-4" /> Strategic Stakeholders
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left text-foreground">
                    <div className={cn("space-y-4 p-6 rounded-2xl border transition-all text-left text-foreground", form.watch('primaryContactRole') === 'marketingManager' ? "bg-primary/5 border-primary shadow-md" : "bg-slate-50 border-slate-200 shadow-inner")}>
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 text-left text-foreground">
                                <UserCheck className="h-4 w-4" /> Marketing Lead
                            </h4>
                            <FormField control={form.control} name="primaryContactRole" render={({ field }) => (
                                <div className="flex items-center gap-2">
                                    <Checkbox id="primary-marketing-supp" checked={field.value === 'marketingManager'} onCheckedChange={() => field.onChange('marketingManager')} />
                                    <Label htmlFor="primary-marketing-supp" className="text-[10px] font-black uppercase text-muted-foreground cursor-pointer">Set as Account Lead</Label>
                                </div>
                            )} />
                        </div>
                        <FormField control={form.control} name="marketingManager.name" render={({ field }) => ( <FormItem className="text-left"><FormLabel>Full Name</FormLabel><FormControl><Input {...field} value={field.value || ''} className="bg-white border-2" /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="marketingManager.email" render={({ field }) => ( <FormItem className="text-left"><FormLabel>Direct E-mail</FormLabel><FormControl><Input {...field} value={field.value || ''} className="bg-white border-2" /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="marketingManager.mobile" render={({ field }) => ( <FormItem className="text-left"><FormLabel>Mobile (Direct)</FormLabel><FormControl><Input {...field} value={field.value || ''} className="bg-white border-2" /></FormControl><FormMessage /></FormItem> )} />
                    </div>

                    <div className={cn("space-y-4 p-6 rounded-2xl border transition-all text-left text-foreground", form.watch('primaryContactRole') === 'ceo' ? "bg-primary/5 border-primary shadow-md" : "bg-slate-50 border-slate-200 shadow-inner")}>
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-2 text-left text-foreground text-foreground">
                                <UserCircle className="h-4 w-4" /> CEO / Principal
                            </h4>
                            <FormField control={form.control} name="primaryContactRole" render={({ field }) => (
                                <div className="flex items-center gap-2">
                                    <Checkbox id="primary-ceo-supp" checked={field.value === 'ceo'} onCheckedChange={() => field.onChange('ceo')} />
                                    <Label htmlFor="primary-ceo-supp" className="text-[10px] font-black uppercase text-muted-foreground cursor-pointer">Set as Account Lead</Label>
                                </div>
                            )} />
                        </div>
                        <FormField control={form.control} name="ceo.name" render={({ field }) => ( <FormItem className="text-left"><FormLabel>Full Name</FormLabel><FormControl><Input {...field} value={field.value || ''} className="bg-white border-2" /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="ceo.email" render={({ field }) => ( <FormItem className="text-left"><FormLabel>Direct E-mail</FormLabel><FormControl><Input {...field} value={field.value || ''} className="bg-white border-2" /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="ceo.mobile" render={({ field }) => ( <FormItem className="text-left"><FormLabel>Mobile (Direct)</FormLabel><FormControl><Input {...field} value={field.value || ''} className="bg-white border-2" /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left text-foreground">
                    <div className={cn("space-y-4 p-6 rounded-2xl border transition-all text-left text-foreground", form.watch('primaryContactRole') === 'operationsManager' ? "bg-primary/5 border-primary shadow-md" : "bg-slate-50 border-slate-200 shadow-inner")}>
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-700 flex items-center gap-2 text-left text-foreground">
                                <Zap className="h-4 w-4" /> Operations Manager
                            </h4>
                            <FormField control={form.control} name="primaryContactRole" render={({ field }) => (
                                <div className="flex items-center gap-2">
                                    <Checkbox id="primary-ops-supp" checked={field.value === 'operationsManager'} onCheckedChange={() => field.onChange('operationsManager')} />
                                    <Label htmlFor="primary-ops-supp" className="text-[10px] font-black uppercase text-muted-foreground cursor-pointer">Set as Account Lead</Label>
                                </div>
                            )} />
                        </div>
                        <FormField control={form.control} name="operationsManager.name" render={({ field }) => ( <FormItem className="text-left"><FormLabel>Full Name</FormLabel><FormControl><Input {...field} value={field.value || ''} className="bg-white border-2" /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="operationsManager.email" render={({ field }) => ( <FormItem className="text-left"><FormLabel>Direct E-mail</FormLabel><FormControl><Input {...field} value={field.value || ''} className="bg-white border-2" /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="operationsManager.mobile" render={({ field }) => ( <FormItem className="text-left"><FormLabel>Mobile (Direct)</FormLabel><FormControl><Input {...field} value={field.value || ''} className="bg-white border-2" /></FormControl><FormMessage /></FormItem> )} />
                    </div>

                    <div className={cn("space-y-4 p-6 rounded-2xl border transition-all text-left text-foreground", form.watch('primaryContactRole') === 'technicalManager' ? "bg-primary/5 border-primary shadow-md" : "bg-slate-50 border-slate-200 shadow-inner")}>
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-700 flex items-center gap-2 text-left text-foreground">
                                <Wrench className="h-4 w-4" /> Technical Manager
                            </h4>
                            <FormField control={form.control} name="primaryContactRole" render={({ field }) => (
                                <div className="flex items-center gap-2">
                                    <Checkbox id="primary-tech-supp" checked={field.value === 'technicalManager'} onCheckedChange={() => field.onChange('technicalManager')} />
                                    <Label htmlFor="primary-tech-supp" className="text-[10px] font-black uppercase text-muted-foreground cursor-pointer">Set as Account Lead</Label>
                                </div>
                            )} />
                        </div>
                        <FormField control={form.control} name="technicalManager.name" render={({ field }) => ( <FormItem className="text-left"><FormLabel>Full Name</FormLabel><FormControl><Input {...field} value={field.value || ''} className="bg-white border-2" /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="technicalManager.email" render={({ field }) => ( <FormItem className="text-left"><FormLabel>Direct E-mail</FormLabel><FormControl><Input {...field} value={field.value || ''} className="bg-white border-2" /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="technicalManager.mobile" render={({ field }) => ( <FormItem className="text-left"><FormLabel>Mobile (Direct)</FormLabel><FormControl><Input {...field} value={field.value || ''} className="bg-white border-2" /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                </div>
            </div>

            <Separator />

            {Array.isArray(partner?.otherStaff) && partner.otherStaff.length > 0 && (
                <div className="space-y-3 text-left text-foreground">
                    <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <Sparkles className="h-4 w-4" /> Other Staff Found By Research
                    </h4>
                    <p className="text-xs text-muted-foreground">
                        These people were found but did not match one of the four contact roles above. Copy any you want into a role.
                    </p>
                    <div className="rounded-xl border bg-slate-50 divide-y">
                        {partner.otherStaff.map((person: any, index: number) => (
                            <div key={index} className="p-3 text-xs space-y-0.5">
                                <p className="font-bold">{person.name}{person.role ? ` \u2014 ${person.role}` : ''}</p>
                                {person.email && <p className="text-muted-foreground break-all">{person.email}</p>}
                                {person.mobile && <p className="text-muted-foreground">{person.mobile}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-4 text-left text-foreground text-foreground">
                <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2 text-left text-foreground">
                    <Sparkles className="h-4 w-4" /> Technical Profile
                </h4>
                <FormField control={form.control} name="minedServiceWording" render={({ field }) => (
                    <FormItem className="text-left text-foreground">
                        <FormControl><Textarea className="min-h-[150px] bg-white border-2 leading-relaxed" {...field} value={field.value || ''} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
            </div>

            <DialogFooter className="pt-4 border-t sticky bottom-0 bg-white z-10 text-left">
              <Button type="submit" disabled={isLoading} size="lg" className="w-full font-bold shadow-lg text-white">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Forensic Record
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function SupplierManagement() {
  const { toast } = useToast();
  const [allRecords, setAllRecords] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [indexReady, setIndexReady] = useState(false);
  const [indexFacets, setIndexFacets] = useState<{ categories: string[]; tags: string[] }>({ categories: [], tags: [] });
  const [isRebuildingIndex, setIsRebuildingIndex] = useState(false);
  const [rebuildProgress, setRebuildProgress] = useState(0);
  const [duplicateGroups, setDuplicateGroups] = useState<any[]>([]);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [isScanningDuplicates, setIsScanningDuplicates] = useState(false);
  const [isDeletingDuplicates, setIsDeletingDuplicates] = useState(false);
  const [selectRecommendedDuplicates, setSelectRecommendedDuplicates] = useState(true);
  const [duplicateScanTruncated, setDuplicateScanTruncated] = useState(false);
  const [duplicateScanScope, setDuplicateScanScope] = useState<{ registryType: string; searchTerm: string }>({
    registryType: 'supplier',
    searchTerm: '',
  });
  const pageCursorsRef = useRef<Record<number, any>>({ 0: null });
  const requestIdRef = useRef(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dialog, setDialog] = useState<{ type: 'add' | 'edit' | 'delete' | 'engage' | null, data?: any, initialIndex?: number }>({ type: null });

  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [registryTypeFilter, setRegistryTypeFilter] = useState<'supplier' | 'unclassified'>('supplier');
  const type = 'supplier';

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    companyName: true,
    accountLead: true,
    outreach: true,
    status: true,
    actions: true
  });

  const fetchData = useCallback(async (targetPage: number) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error('Authentication failed.');
      const searchType = appliedSearchTerm && registryTypeFilter === 'supplier'
        ? 'all'
        : registryTypeFilter;

      const res: any = await performAdminAction(token, 'getRegistryIndexPage', {
        type: searchType,
        term: appliedSearchTerm,
        status: statusFilter,
        category: categoryFilter,
        assigneeId: assigneeFilter,
        tag: tagFilter,
        page: targetPage + 1,
        pageSize,
        cursor: pageCursorsRef.current[targetPage] || null,
      });
      if (requestId !== requestIdRef.current) return;

      setAllRecords(res.data || []);
      setTotalCount(Number(res.totalCount || 0));
      setIndexReady(Boolean(res.indexReady));
      setIndexFacets({
        categories: Array.isArray(res.facets?.categories) ? res.facets.categories : [],
        tags: Array.isArray(res.facets?.tags) ? res.facets.tags : [],
      });
      if (res.nextCursor) {
        pageCursorsRef.current[targetPage + 1] = res.nextCursor;
      }
    } catch (e: any) {
      if (requestId === requestIdRef.current && !e.message?.includes('PERMISSION_DENIED')) {
        toast({ variant: 'destructive', title: 'Fetch Error', description: e.message });
      }
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, [appliedSearchTerm, assigneeFilter, categoryFilter, pageSize, registryTypeFilter, statusFilter, tagFilter, toast]);

  useEffect(() => { fetchData(pageIndex); }, [fetchData, pageIndex]);

  useEffect(() => {
    pageCursorsRef.current = { 0: null };
    setPageIndex(0);
  }, [appliedSearchTerm, statusFilter, categoryFilter, assigneeFilter, tagFilter, pageSize, registryTypeFilter]);

  useEffect(() => {
    const loadStaff = async () => {
      const token = await getClientSideAuthToken();
      if (!token) return;
      const staffRes: any = await performAdminAction(token, 'getPlatformStaff', {}).catch(() => ({ data: [] }));
      setStaff(staffRes.data || []);
    };
    void loadStaff();
  }, []);

  const refreshRegistry = useCallback(() => {
    pageCursorsRef.current = { 0: null };
    setSelectedIds([]);
    if (pageIndex === 0) {
      void fetchData(0);
    } else {
      setPageIndex(0);
    }
  }, [fetchData, pageIndex]);

  const handleEngage = useCallback((record: any) => {
    const engageList = selectedIds.length > 0 ? allRecords.filter(r => selectedIds.includes(r.id)) : (record ? [record] : []);
    if (engageList.length === 0) return;
    setDialog({ type: 'engage', data: engageList, initialIndex: record ? engageList.findIndex((r: any) => r.id === record.id) : 0 });
  }, [allRecords, selectedIds]);

  const availableCategories = useMemo(() => {
    return Array.from(new Set([
      ...getRegistryCategoryOptions(type, allRecords),
      ...indexFacets.categories,
    ])).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [allRecords, indexFacets.categories]);

  const availableTags = useMemo(() => {
    return Array.from(new Set(
      [
        ...indexFacets.tags,
        ...allRecords.flatMap((record: any) => extractRegistryTags(record)),
      ]
    )).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [allRecords, indexFacets.tags]);

  const filteredRecords = allRecords;

  const columns: ColumnDef<any>[] = useMemo(() => {
    return [
      { 
          accessorKey: 'companyName', 
          id: 'companyName',
          header: 'Supplier Entity', 
          cell: ({ row }: { row: { original: any } }) => (
              <div className="flex flex-col text-left text-foreground">
                  <span className="font-bold text-foreground text-left">{row.original.companyName || 'Unnamed'}</span>
                  <div className="flex items-center gap-1.5 mt-1 text-left text-foreground">
                      {row.original.website && <Globe className="h-3 w-3 text-primary" />}
                      <Badge variant={row.original.source === 'Member' ? 'default' : 'outline'} className="text-[10px] uppercase h-4 font-black">{row.original.source || 'Registry'}</Badge>
                      {row.original.companyId && <span className="text-[10px] text-muted-foreground font-mono">ID: {row.original.companyId}</span>}
                  </div>
              </div>
          )
      },
      { 
          id: 'accountLead',
          accessorKey: 'contactPerson',
          header: 'Account Lead', 
          cell: ({ row }: { row: { original: any } }) => {
            const p = row.original;
            const role = p.primaryContactRole || 'marketingManager';
            const contact = p[role];
            const name = contact?.name || p.contactPerson || `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'N/A';
            return (
                <div className="flex flex-col text-left text-foreground">
                    <span className="font-bold text-sm text-left">{name}</span>
                    <span className="text-[10px] font-black uppercase text-primary tracking-tighter">
                        {role === 'marketingManager' ? 'Marketing' : role === 'ceo' ? 'CEO' : role === 'operationsManager' ? 'Operations' : 'Technical'}
                    </span>
                    <span className="text-[9px] text-muted-foreground text-left truncate max-w-[150px]">{contact?.email || p.marketingManager?.email || p.email || 'No email discovered'}</span>
                </div>
            )
          }
      },
      { 
          id: 'outreach',
          accessorKey: 'lastOutreachSubject', 
          header: 'Outreach Stage', 
          cell: ({ row }: { row: { original: any } }) => {
              if (!row.original.lastOutreachSubject) return <span className="text-[10px] text-muted-foreground italic text-left">None</span>;
              const cleanSubject = row.original.lastOutreachSubject.replace('Logistics Flow: ', '').split('(')[0].trim();
              return (
                  <div className="flex flex-col text-left text-foreground text-left">
                      <Badge variant="outline" className="text-[9px] h-4 border-primary/20 text-primary uppercase font-bold truncate max-w-[100px] text-left">{cleanSubject}</Badge>
                      <TooltipProvider>
                        <div className="flex items-center gap-1 mt-1 text-left text-foreground">
                            {row.original.lastOpenedAt && (
                                <Tooltip>
                                    <TooltipTrigger>
                                        <div className="bg-blue-100 p-0.5 rounded-full text-left text-foreground"><UserCheck className="h-3 w-3 text-blue-600" /></div>
                                    </TooltipTrigger>
                                    <TooltipContent className="text-[10px] font-bold text-foreground">Read: {formatDateSafe(row.original.lastOpenedAt, "dd/MM")}</TooltipContent>
                                </Tooltip>
                            )}
                            {row.original.lastAccessedAt && (
                                <Tooltip>
                                    <TooltipTrigger>
                                        <div className="bg-purple-100 p-0.5 rounded-full text-left text-foreground"><Smartphone className="h-3 w-3 text-purple-600" /></div>
                                    </TooltipTrigger>
                                    <TooltipContent className="text-[10px] font-bold text-foreground">Link: {formatDateSafe(row.original.lastAccessedAt, "dd/MM")}</TooltipContent>
                                </Tooltip>
                            )}
                        </div>
                      </TooltipProvider>
                  </div>
              );
          }
      },
      { 
        id: 'status',
        accessorKey: 'status', 
        header: 'Status & Conversion', 
        cell: ({ row }: { row: { original: any } }) => {
            const isVerified = !!row.original.companyId;
            const isConverted = row.original.status === 'active' && (row.original.lastOpenedAt || row.original.lastAccessedAt);
            const statusLabel = row.original.status === 'active' && !isVerified ? 'CRM Active (Unlinked)' : row.original.status;
            
            return (
                <div className="flex flex-col gap-1 text-left text-foreground">
                    <div className="flex items-center gap-2 text-left">
                        <Badge variant={isVerified ? 'default' : 'outline'} className="capitalize text-[10px] font-black w-fit">{statusLabel}</Badge>
                        {isVerified && <TooltipProvider><Tooltip><TooltipTrigger><ShieldCheck className="h-4 w-4 text-green-600" /></TooltipTrigger><TooltipContent className="text-xs font-bold text-foreground">Forensic Handshake Linked (Member Roster Verified)</TooltipContent></Tooltip></TooltipProvider>}
                    </div>
                    {isConverted && !isVerified && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[8px] h-4 uppercase font-black py-0 px-1.5 w-fit text-left">
                            Handshake Pending Sign-up
                        </Badge>
                    )}
                    {isVerified && (
                        <Badge className="bg-green-100 text-green-700 text-[8px] h-4 uppercase font-black border-none gap-1 py-0 px-1.5 w-fit text-left">
                            <UserPlus className="h-2 w-2 fill-current" /> Verified Member
                        </Badge>
                    )}
                </div>
            )
        }
      },
      { id: 'actions', header: 'Actions', cell: ({ row }: { row: { original: any } }) => (
          <div className="flex justify-end gap-1 text-foreground">
            <EnrichPartnerButton partner={row.original} onUpdate={refreshRegistry} />
            <ContentHarvestButton partner={row.original} onUpdate={refreshRegistry} />
            <CommercialDeepDiveButton partner={row.original} onUpdate={refreshRegistry} onEngage={handleEngage} />
            <Button variant="ghost" size="icon" onClick={() => handleEngage(row.original)}><Send className="h-4 w-4 text-primary" /></Button>
            <PartnerTasksDialog partner={row.original} />
            <Button variant="ghost" size="icon" onClick={() => setDialog({ type: 'edit', data: row.original })}><Edit className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setDialog({ type: 'delete', data: row.original })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        )},
    ].filter(c => visibleColumns[c.id as string] || visibleColumns[c.accessorKey as string]);
  }, [handleEngage, refreshRegistry, visibleColumns]);

  async function handleDeleteRecord() {
    if (!dialog.data) return;
    try {
      const token = await getClientSideAuthToken();
      if (!token) return;
      await performAdminAction(token, 'deletePartner', {
        partnerId: dialog.data.id,
        collection: dialog.data.sourceCollection || dialog.data.collection,
      });
      toast({ title: 'Deleted' });
      refreshRegistry();
      setDialog({ type: null });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  }

  const [isClassifying, setIsClassifying] = useState(false);

  async function handleClassifyGaps() {
    setIsClassifying(true);
    try {
      const token = await getClientSideAuthToken();
      if (!token) return;
      const gapRes: any = await performAdminAction(token, 'getRegistryClassificationGaps', {});
      const gapCount = gapRes?.unclassifiedCount || 0;
      if (gapCount === 0) {
        toast({ title: 'No gaps found', description: 'Every record already has a type/category set.' });
        return;
      }
      const sampleNames = (gapRes?.sample || [])
        .slice(0, 5)
        .map((record: any) => record.companyName)
        .join(', ');
      window.alert(
        `${gapCount.toLocaleString()} record(s) have no reliable register classification. They remain safely available in the Unclassified index instead of being incorrectly labelled as suppliers.` +
        (sampleNames ? `\n\nExamples: ${sampleNames}` : '')
      );
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsClassifying(false);
    }
  }

  async function handleRebuildIndex() {
    setIsRebuildingIndex(true);
    setRebuildProgress(0);
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error('Authentication failed.');

      let cursor: any = {
        phase: 'clear',
        collectionIndex: 0,
        afterId: '',
        buildId: Date.now().toString(),
      };
      let indexed = 0;
      let cleared = 0;
      let done = false;
      while (!done) {
        const res: any = await performAdminAction(token, 'rebuildRegistryIndexBatch', {
          ...cursor,
          batchSize: 2500,
        });
        if (res.operation === 'cleared') {
          cleared += Number(res.processed || 0);
        } else {
          indexed += Number(res.processed || 0);
        }
        setRebuildProgress(indexed || cleared);
        done = Boolean(res.done);
        cursor = res.cursor;
      }

      pageCursorsRef.current = { 0: null };
      setPageIndex(0);
      await fetchData(0);
      toast({
        title: 'Registry index rebuilt',
        description: `${indexed.toLocaleString()} source records were indexed.`,
      });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Index rebuild failed', description: e.message });
    } finally {
      setIsRebuildingIndex(false);
    }
  }

  async function handleFindDuplicates() {
    setIsScanningDuplicates(true);
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error('Authentication failed.');
      const searchType = appliedSearchTerm && registryTypeFilter === 'supplier'
        ? 'all'
        : registryTypeFilter;
      const result: any = await performAdminAction(token, 'findRegistryDuplicates', {
        maxGroups: 50,
        type: searchType,
        term: appliedSearchTerm,
      });
      const groups = result.data || [];
      setDuplicateGroups(groups);
      setDuplicateScanTruncated(Boolean(result.truncated));
      setDuplicateScanScope({
        registryType: String(result.scope?.registryType || searchType),
        searchTerm: String(result.scope?.searchTerm || appliedSearchTerm),
      });
      setSelectRecommendedDuplicates(true);
      if (groups.length === 0) {
        toast({ title: 'No exact duplicates found' });
        return;
      }
      setIsDuplicateDialogOpen(true);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Duplicate scan failed', description: e.message });
    } finally {
      setIsScanningDuplicates(false);
    }
  }

  async function handleDeleteRecommendedDuplicates() {
    if (!selectRecommendedDuplicates) {
      toast({ title: 'Select the recommended duplicates before deleting.' });
      return;
    }
    const deletionGroups = duplicateGroups.map(group => ({
      keepIndexId: group.keepIndexId,
      deleteIndexIds: group.records
        .filter((record: any) => !record.recommendedKeep)
        .map((record: any) => record.indexId),
    }));
    const deleteCount = deletionGroups.reduce((count, group) => count + group.deleteIndexIds.length, 0);
    if (deleteCount === 0) return;
    if (!window.confirm(`Permanently delete ${deleteCount.toLocaleString()} automatically selected duplicate record(s)? The recommended keeper in each group will remain.`)) {
      return;
    }

    setIsDeletingDuplicates(true);
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error('Authentication failed.');
      const result: any = await performAdminAction(token, 'deleteRegistryDuplicates', { groups: deletionGroups });
      toast({ title: 'Duplicates deleted', description: result.message });
      setIsDuplicateDialogOpen(false);
      setDuplicateGroups([]);
      refreshRegistry();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Duplicate deletion failed', description: e.message });
    } finally {
      setIsDeletingDuplicates(false);
    }
  }

  return (
    <div className="space-y-6 text-left text-foreground">
      <EngageDialog open={dialog.type === 'engage'} onOpenChange={(o) => !o && setDialog({ type: null })} partners={dialog.data || []} initialIndex={dialog.initialIndex} audience="suppliers" onEngageSuccess={refreshRegistry} />
      <SupplierDialog open={dialog.type === 'add' || dialog.type === 'edit'} onOpenChange={(o) => !o && setDialog({ type: null })} partner={dialog.type === 'edit' ? dialog.data : undefined} onSave={refreshRegistry} targetType={type} />
      <AlertDialog open={dialog.type === 'delete'} onOpenChange={(o) => !o && setDialog({ type: null })}>
        <AlertDialogContent className="text-left text-foreground text-foreground">
          <AlertDialogHeader><AlertDialogTitle className="text-left text-foreground text-foreground">Are you sure?</AlertDialogTitle><AlertDialogDescription className="text-left text-foreground text-foreground">Delete record?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDialog({ type: null })}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRecord} className={buttonVariants({ variant: "destructive" })}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
        <DialogContent className="max-w-5xl text-left text-foreground">
          <DialogHeader>
            <DialogTitle>Registry Duplicate Cleaner</DialogTitle>
            <DialogDescription>
              Found {duplicateGroups.length.toLocaleString()} exact company-name duplicate group(s)
              {duplicateScanScope.searchTerm
                ? ` matching "${duplicateScanScope.searchTerm}" ${duplicateScanScope.registryType === 'all' ? 'across all registry classifications' : `in the ${duplicateScanScope.registryType} registry`}`
                : ` in the ${duplicateScanScope.registryType} registry`}.
              The strongest record in each group is marked to keep; redundant copies can be selected together.
              {duplicateScanTruncated ? ' This is only the first batch of 50 groups, not the complete registry. Delete this batch and scan again to continue.' : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border bg-muted/30 p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={selectRecommendedDuplicates}
                onCheckedChange={(checked) => setSelectRecommendedDuplicates(Boolean(checked))}
              />
              <span>
                <span className="block font-bold">Select all recommended duplicate copies</span>
                <span className="text-sm text-muted-foreground">
                  {duplicateGroups.reduce((count, group) => count + Math.max(0, group.records.length - 1), 0).toLocaleString()} redundant record(s) will be selected without scrolling through the registry.
                </span>
              </span>
            </label>
          </div>
          <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-2">
            {duplicateGroups.map(group => (
              <Card key={group.key}>
                <CardHeader className="py-3">
                  <CardTitle className="text-base">{group.companyName || group.key}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pb-3">
                  {group.records.map((record: any) => (
                    <div key={record.indexId} className="flex items-start gap-3 rounded border p-2 text-sm">
                      {record.recommendedKeep
                        ? <ShieldCheck className="h-4 w-4 mt-0.5 text-green-600" />
                        : <Checkbox checked={selectRecommendedDuplicates} disabled />}
                      <div className="min-w-0">
                        <div className="font-semibold">
                          {record.recommendedKeep ? 'KEEP' : 'DELETE'} · {record.registryType} · {record.sourceCollection} · {record.id}
                        </div>
                        <div className="text-muted-foreground truncate">
                          {record.contactPerson || 'No contact'} · {record.email || 'No email'} · {record.website || 'No website'}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDuplicateDialogOpen(false)} disabled={isDeletingDuplicates}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteRecommendedDuplicates} disabled={!selectRecommendedDuplicates || isDeletingDuplicates}>
              {isDeletingDuplicates ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete Selected Duplicates
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-6 text-left text-foreground">
          <CardHeader className="px-0 pt-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-left">
              <div className="text-left text-foreground">
                <CardTitle className="flex items-center gap-2 text-2xl font-black font-headline text-left text-foreground"><Building className="h-6 w-6" /> Supplier Registry</CardTitle>
                <CardDescription className="text-left text-muted-foreground">
                  {indexReady
                    ? appliedSearchTerm && registryTypeFilter === 'supplier'
                      ? `All-register search (${totalCount.toLocaleString()} results).`
                      : `${registryTypeFilter === 'supplier' ? 'Supplier' : 'Unclassified'} index (${totalCount.toLocaleString()} records).`
                    : 'Registry index setup is required. Use Rebuild Index to populate it.'}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2 text-left w-full md:w-auto">
                  <Button variant="outline" size="sm" onClick={() => fetchData(pageIndex)} disabled={isLoading} className="text-foreground"><RotateCcw className="h-4 w-4 mr-2" /> Refresh Page</Button>
                  <Button variant="outline" size="sm" onClick={handleRebuildIndex} disabled={isRebuildingIndex} className="text-foreground">
                    {isRebuildingIndex ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
                    {isRebuildingIndex ? `Indexing ${rebuildProgress.toLocaleString()}...` : 'Rebuild Index'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleFindDuplicates} disabled={isScanningDuplicates} className="text-foreground">
                    {isScanningDuplicates ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                    {isScanningDuplicates ? 'Scanning...' : appliedSearchTerm ? 'Find Duplicates in Search' : 'Find Duplicates'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleClassifyGaps} disabled={isClassifying} className="text-foreground"><Wrench className="h-4 w-4 mr-2" /> {isClassifying ? 'Checking...' : 'Review Classification Gaps'}</Button>
                  <Popover>
                      <PopoverTrigger asChild>
                          <Button variant="outline" className="gap-2 text-foreground"><Settings2 className="h-4 w-4" /> Columns</Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-2 text-left text-foreground">
                          <div className="space-y-1 text-left text-foreground">
                              {Object.keys(visibleColumns).map(col => (
                                  <div key={col} className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer text-[10px] font-black uppercase tracking-widest text-left" onClick={() => setVisibleColumns(prev => ({...prev, [col]: !prev[col]}))}>
                                      <span>{col.replace(/([A-Z])/g, ' $1')}</span>
                                      {visibleColumns[col] && <Check className="h-3 w-3 text-primary" />}
                                  </div>
                              ))}
                          </div>
                      </PopoverContent>
                  </Popover>
                  <Button variant="outline" onClick={() => downloadDataAsCSV(filteredRecords, 'suppliers-page.csv')} disabled={isLoading} className="text-left text-foreground"><Download className="mr-2 h-4 w-4"/>Export Page</Button>
                  <BulkImportDialog type="supplier" onComplete={refreshRegistry}><Button variant="outline" className="text-left text-foreground"><Upload className="mr-2 h-4 w-4" /> Import</Button></BulkImportDialog>
                  <Button onClick={() => setDialog({ type: 'add' })} className="text-white"><PlusCircle className="mr-2 h-4 w-4" /> Add Record</Button>
              </div>
          </CardHeader>
          <Card className="text-left text-foreground">
              <CardContent className="pt-6 text-left">
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-6 p-4 bg-muted/30 rounded-lg text-left text-foreground">
                    <div className="space-y-1 text-left">
                        <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5 text-left">Registry View</Label>
                        <Select value={registryTypeFilter} onValueChange={(value: 'supplier' | 'unclassified') => setRegistryTypeFilter(value)}>
                            <SelectTrigger className="h-9 bg-white text-xs text-left text-foreground"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="supplier">Suppliers</SelectItem>
                                <SelectItem value="unclassified">Unclassified</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1 text-left">
                        <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5 text-left">Status Filter</Label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-9 bg-white text-xs text-left text-foreground"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="new">New</SelectItem>
                                <SelectItem value="contacted">Researching</SelectItem>
                                <SelectItem value="qualified">Qualified</SelectItem>
                                <SelectItem value="active">Active Participant</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1 text-left text-foreground">
                        <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5 text-left"><Filter className="h-3 w-3"/> Category</Label>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="h-9 bg-white text-xs text-left text-foreground"><SelectValue placeholder="All Categories" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {availableCategories.map(category => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1 text-left">
                        <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5 text-left"><Users className="h-3 w-3"/> Assignee</Label>
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
                            registryType={type}
                            value={tagFilter}
                            options={availableTags}
                            placeholder="All Tags"
                            onValueChange={(selectedTag) => {
                                setTagFilter(selectedTag);
                                console.log('Selected tag:', selectedTag, 'registry:', type);
                            }}
                        />
                    </div>
                    <div className="md:col-span-2 flex items-end gap-2 text-left text-foreground">
                        <div className="flex-1 space-y-1 text-left text-foreground">
                            <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5 text-left"><Search className="h-3 w-3"/> Search Registry</Label>
                            <Input
                              placeholder="Search all company records..."
                              value={searchTerm}
                              onChange={e => setSearchTerm(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  pageCursorsRef.current = { 0: null };
                                  setPageIndex(0);
                                  setAppliedSearchTerm(searchTerm.trim());
                                }
                              }}
                              className="h-9 bg-white"
                            />
                        </div>
                    </div>
                  </div>
                  {isLoading ? (
                    <div className="flex justify-center py-20 text-left"><Loader2 className="animate-spin mx-auto h-8 w-8 text-primary" /></div>
                  ) : (
                    <DataTable
                      columns={columns}
                      data={filteredRecords}
                      onSelectionChange={setSelectedIds}
                      totalCount={totalCount}
                      pageIndex={pageIndex}
                      onPageChange={setPageIndex}
                      pageSize={pageSize}
                      onPageSizeChange={setPageSize}
                    />
                  )}
              </CardContent>
          </Card>
      </div>
    </div>
  );
}
