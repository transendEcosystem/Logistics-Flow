'use client';

import { useState, useCallback, useMemo, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getClientSideAuthToken, useUser } from '@/firebase';
import { Loader2, PlusCircle, Users, Edit, Trash2, Search, Send, Download, Tag, Save, Database, RefreshCcw, UserCheck, RotateCcw, Upload, Mail, Building, Sparkles, Zap, Smartphone, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { roles } from '@/lib/roles';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { formatDateSafe, cn, downloadDataAsCSV } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

import { EnrichPartnerButton } from '@/app/adminaccount/marketing/EnrichPartnerButton';
import { PartnerTasksDialog } from '@/app/adminaccount/marketing/PartnerTasksDialog';
import { CommunicationLogDialog } from '@/app/adminaccount/marketing/CommunicationLogDialog';
import { EngageDialog } from '@/app/adminaccount/marketing/EngageDialog';
import { PartnerOversightDialog } from '@/app/adminaccount/marketing/PartnerOversightDialog';
import { BulkImportDialog } from '@/app/adminaccount/marketing/BulkImportDialog';
import { AddCommunicationLogDialog } from '@/app/adminaccount/marketing/AddCommunicationLogDialog';

async function performAdminAction(token: string, action: string, payload?: any) {
  const response = await fetch('/api/admin', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload }),
    cache: 'no-store'
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.error || `API Error: ${action}`);
  return result;
}

const contactSchema = z.object({
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  mobile: z.string().nullable().optional(),
});

const leadSchema = z.object({
  companyName: z.string().nullable().optional(),
  contactPerson: z.string().nullable().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  mobile: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  minedServiceWording: z.string().nullable().optional(),
  marketingManager: contactSchema.nullable().optional(),
  ceo: contactSchema.nullable().optional(),
});

type LeadFormValues = z.infer<typeof leadSchema>;

function LeadDialog({ open, onOpenChange, lead, onSave, defaultValues }: { open: boolean; onOpenChange: (open: boolean) => void; lead?: any; onSave: () => void; defaultValues?: Partial<LeadFormValues> }) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
  });

  useEffect(() => {
    if (open) {
      if (lead) {
        form.reset({ ...lead, status: lead.status || 'new' });
      } else {
        form.reset({
          companyName: defaultValues?.companyName || '',
          contactPerson: defaultValues?.contactPerson || '',
          email: defaultValues?.email || '',
          phone: defaultValues?.phone || '',
          mobile: defaultValues?.mobile || '',
          whatsapp: defaultValues?.whatsapp || '',
          role: defaultValues?.role || '',
          status: 'new',
          notes: '',
          website: defaultValues?.website || '',
          address: defaultValues?.address || '',
          marketingManager: { name: '', email: '', mobile: '' },
          ceo: { name: '', email: '', mobile: '' },
          minedServiceWording: ''
        });
      }
    }
  }, [open, lead, form, defaultValues]);

  async function onSubmit(values: LeadFormValues) {
    setIsLoading(true);
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error("Authentication failed.");
      await performAdminAction(token, 'savePartner', { collection: 'leads', partner: { ...values, id: lead?.id, type: 'lead' } });
      toast({ title: 'Record Updated!' });
      onSave();
      onOpenChange(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: e.message });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl text-left text-foreground">
        <DialogHeader><DialogTitle>{lead ? 'Edit' : 'Add New'} Lead</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 py-4 max-h-[85vh] overflow-y-auto pr-2 text-left text-foreground">
            <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2 text-left">
                    <Building className="h-4 w-4" /> Core Entity Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    <FormField control={form.control} name="companyName" render={({ field }) => (<FormItem className="text-left"><FormLabel>Company Name</FormLabel><FormControl><Input {...field} value={field.value || ''} className="bg-white border-2" /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="website" render={({ field }) => (<FormItem className="text-left"><FormLabel>Website URL</FormLabel><FormControl><Input {...field} value={field.value || ''} className="bg-white border-2" placeholder="https://..." /></FormControl></FormItem>)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                    <FormField control={form.control} name="email" render={({ field }) => (<FormItem className="text-left"><FormLabel>General Company Email</FormLabel><FormControl><Input {...field} value={field.value || ''} type="text" className="bg-white border-2" placeholder="info@..." /></FormControl></FormItem>)} />
                    <FormField control={form.control} name="phone" render={({ field }) => (<FormItem className="text-left"><FormLabel>Company Landline</FormLabel><FormControl><Input {...field} value={field.value || ''} className="bg-white border-2" placeholder="011..." /></FormControl></FormItem>)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                    <FormField control={form.control} name="mobile" render={({ field }) => (<FormItem className="text-left text-foreground"><FormLabel>Personal Mobile (Principal)</FormLabel><FormControl><Input {...field} value={field.value || ''} className="bg-white border-2" placeholder="+27..." /></FormControl></FormItem>)} />
                    <FormField control={form.control} name="whatsapp" render={({ field }) => (<FormItem className="text-left text-foreground"><FormLabel>Dedicated WhatsApp (Business)</FormLabel><FormControl><Input {...field} value={field.value || ''} className="bg-white border-2" placeholder="+27..." /></FormControl></FormItem>)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem className="text-left"><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl><SelectTrigger className="bg-white text-left text-foreground"><SelectValue/></SelectTrigger></FormControl><SelectContent>
                    <SelectItem value="new">New</SelectItem><SelectItem value="contacted">In Research</SelectItem><SelectItem value="qualified">Qualified</SelectItem><SelectItem value="invited">Invited</SelectItem><SelectItem value="active">Member</SelectItem>
                    </SelectContent></Select></FormItem>
                )} />
                <FormField control={form.control} name="role" render={({ field }) => (
                    <FormItem className="text-left text-foreground"><FormLabel>Potential Role</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger className="bg-white text-left text-foreground"><SelectValue/></SelectTrigger></FormControl><SelectContent>
                    {roles.map(r => <SelectItem key={r.id} value={r.title}>{r.title}</SelectItem>)}
                    </SelectContent></Select></FormItem>
                )} />
                </div>
                <FormField control={form.control} name="address" render={({ field }) => (<FormItem className="text-left"><FormLabel>Full Address</FormLabel><FormControl><Textarea {...field} value={field.value || ''} className="bg-white border-2" /></FormControl></FormItem>)} />
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left text-foreground">
                <div className="space-y-4 p-6 rounded-2xl bg-primary/5 border border-primary/10 shadow-inner text-left text-foreground text-foreground">
                    <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2 text-left text-foreground text-foreground">
                        <Users className="h-4 w-4" /> Marketing Manager
                    </h4>
                    <FormField control={form.control} name="marketingManager.name" render={({ field }) => ( <FormItem className="text-left"><FormLabel>Full Name</FormLabel><FormControl><Input {...field} value={field.value || ''} className="bg-white border-2" /></FormControl></FormItem> )} />
                    <FormField control={form.control} name="marketingManager.email" render={({ field }) => ( <FormItem className="text-left"><FormLabel>Direct E-mail</FormLabel><FormControl><Input {...field} value={field.value || ''} className="bg-white border-2" /></FormControl></FormItem> )} />
                    <FormField control={form.control} name="marketingManager.mobile" render={({ field }) => ( <FormItem className="text-left"><FormLabel>Mobile (Direct)</FormLabel><FormControl><Input {...field} value={field.value || ''} className="bg-white border-2" /></FormControl></FormItem> )} />
                </div>

                <div className="space-y-4 p-6 rounded-2xl bg-slate-50 border border-slate-200 shadow-inner text-left text-foreground text-foreground text-foreground">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-600 flex items-center gap-2 text-left text-foreground text-foreground text-foreground text-foreground text-foreground">
                        <UserCheck className="h-4 w-4" /> CEO / Principal
                    </h4>
                    <FormField control={form.control} name="ceo.name" render={({ field }) => ( <FormItem className="text-left"><FormLabel>Full Name</FormLabel><FormControl><Input {...field} value={field.value || ''} className="bg-white border-2" /></FormControl></FormItem> )} />
                    <FormField control={form.control} name="ceo.email" render={({ field }) => ( <FormItem className="text-left"><FormLabel>Direct E-mail</FormLabel><FormControl><Input {...field} value={field.value || ''} className="bg-white border-2" /></FormControl></FormItem> )} />
                    <FormField control={form.control} name="ceo.mobile" render={({ field }) => ( <FormItem className="text-left"><FormLabel>Mobile (Direct)</FormLabel><FormControl><Input {...field} value={field.value || ''} className="bg-white border-2" /></FormControl></FormItem> )} />
                </div>
            </div>

            <Separator />

            <div className="space-y-4 text-left text-foreground text-foreground text-foreground">
                <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2 text-left text-foreground text-foreground text-foreground">
                    <Sparkles className="h-4 w-4" /> Technical Profile (300 Words)
                </h4>
                <FormField control={form.control} name="minedServiceWording" render={({ field }) => ( 
                    <FormItem className="text-left">
                        <FormControl><Textarea {...field} value={field.value || ''} className="bg-white min-h-[150px] border-2" /></FormControl>
                    </FormItem> 
                )} />
            </div>

            <DialogFooter className="pt-6 border-t sticky bottom-0 bg-white z-10 text-left">
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

function LeadsDatabaseComponent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();

  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [editLead, setEditLead] = useState<any | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [deleteLead, setDeleteLead] = useState<any | null>(null);
  const [engageLead, setEngageLead] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const forceRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getClientSideAuthToken();
      if (!token) return;
      const res = await performAdminAction(token, 'getLeads');
      setLeads(res.data || []);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Registry Load Failed', description: e.message });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => { forceRefresh(); }, [forceRefresh]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'add-member') setIsAddLeadOpen(true);
  }, [searchParams]);

  const handleExport = (format: 'Standard' | 'SendGrid') => {
      const dataToExport = leads.map(l => {
          const baseUrl = 'https://studio--ecosystem-hub.us-central1.hosted.app';
          const handshakeUrl = `${baseUrl}/opt-in/${l.id}`;
          const directJoinUrl = `${baseUrl}/join?email=${encodeURIComponent(l.email || '')}&ref=${user?.companyId || 'SYSTEM'}`;

          if (format === 'SendGrid') {
              return {
                  email: l.marketingManager?.email || l.email || l.email_address || '',
                  first_name: l.marketingManager?.name?.split(' ')[0] || l.firstName || l.contactPerson?.split(' ')[0] || '',
                  last_name: l.marketingManager?.name?.split(' ').slice(1).join(' ') || l.lastName || l.contactPerson?.split(' ').slice(1).join(' ') || '',
                  company_name: l.companyName || l.company_name || '',
                  handshake_url: handshakeUrl,
                  direct_join_url: directJoinUrl
              };
          }
          return { ...l, handshakeUrl, directJoinUrl };
      });

      downloadDataAsCSV(dataToExport, `leads-${format.toLowerCase()}-${Date.now()}.csv`);
      toast({ title: `${format} Export Ready` });
  };

  async function handleDelete() {
    if (!deleteLead) return;
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error("Auth failed.");
      await performAdminAction(token, 'deleteLeads', { leadIds: [deleteLead.id] });
      toast({ title: 'Lead Deleted' });
      forceRefresh();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Delete Failed', description: e.message });
    } finally {
      setIsDeleteAlertOpen(false);
      setDeleteLead(null);
    }
  }

  const columns: ColumnDef<any>[] = useMemo(() => [
    { accessorKey: 'companyName', header: 'Lead Entity' },
    { 
        id: 'contact',
        header: 'Contact', 
        cell: ({ row }) => (
            <div className="text-sm font-medium text-left text-foreground text-foreground">
                {row.original.marketingManager?.name || row.original.contactPerson || `${row.original.firstName || ''} ${row.original.lastName || ''}`.trim() || 'N/A'}
            </div>
        )
    },
    { 
        header: 'Referrer Node', 
        cell: ({row}) => (
            <div className="flex flex-col text-left text-foreground">
                <span className="text-xs font-bold text-primary text-left">{row.original.referrerName}</span>
                <span className="text-[9px] text-muted-foreground font-mono text-left">{row.original.referrerId}</span>
            </div>
        )
    },
    {
        header: 'Outreach Stage',
        cell: ({ row }) => {
            if (!row.original.lastOutreachSubject) return <span className="text-[10px] text-muted-foreground italic text-left">None</span>;
            const cleanSubject = row.original.lastOutreachSubject.replace('Logistics Flow: ', '').split('(')[0].trim();
            return (
                <div className="flex flex-col text-left text-foreground">
                    <div className="flex items-center gap-1 text-left text-foreground">
                        <Badge variant="outline" className="text-[9px] h-4 border-primary/20 text-primary uppercase font-bold truncate max-w-[120px] text-left">{cleanSubject}</Badge>
                        {row.original.lastOpenedAt && <TooltipProvider><Tooltip><TooltipTrigger><div className="bg-blue-100 p-0.5 rounded-full text-left text-foreground"><UserCheck className="h-3 w-3 text-blue-600" /></div></TooltipTrigger><TooltipContent className="text-[10px] font-bold text-foreground">Email Read: {formatDateSafe(row.original.lastOpenedAt, "dd/MM HH:mm")}</TooltipContent></Tooltip></TooltipProvider>}
                        {row.original.lastAccessedAt && <TooltipProvider><Tooltip><TooltipTrigger><div className="bg-purple-100 p-0.5 rounded-full text-left text-foreground"><Smartphone className="h-3 w-3 text-purple-600" /></div></TooltipTrigger><TooltipContent className="text-[10px] font-bold text-foreground">Landed on Link: {formatDateSafe(row.original.lastAccessedAt, "dd/MM HH:mm")}</TooltipContent></Tooltip></TooltipProvider>}
                    </div>
                    <span className="text-[8px] text-muted-foreground mt-0.5 text-left">{formatDateSafe(row.original.lastOutreachAt, "dd/MM, HH:mm")}</span>
                </div>
            );
        }
    },
    { 
        accessorKey: 'status', 
        header: 'Status & Intelligence', 
        cell: ({ row }) => (
            <div className="flex flex-col gap-1 text-left text-foreground text-foreground text-foreground">
                <Badge variant={row.original.status === 'active' ? 'default' : 'outline'} className="capitalize text-[10px] font-black w-fit">{row.original.status}</Badge>
                {row.original.enhancementMethod && (
                    <Badge className="bg-primary/10 text-primary text-[8px] h-4 uppercase font-black border-none gap-1 py-0 px-1.5 w-fit text-left text-foreground">
                        <Zap className="h-2 w-2 fill-current" /> {row.original.enhancementMethod} {formatDateSafe(row.original.lastEnrichedAt, "dd/MM")}
                    </Badge>
                )}
            </div>
        )
    },
    {
      id: 'actions',
      header: <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="text-right flex items-center justify-end gap-1 text-foreground text-foreground text-foreground text-foreground">
          <EnrichPartnerButton partner={row.original} onUpdate={forceRefresh} />
          <Button variant="ghost" size="icon" onClick={() => setEngageLead(row.original)} title="Engage"><Send className="h-4 w-4 text-primary" /></Button>
          <AddCommunicationLogDialog partnerId={row.original.id} collection="leads" onLogAdded={forceRefresh} />
          <CommunicationLogDialog partnerId={row.original.id} partnerName={row.original.companyName} />
          <PartnerTasksDialog partner={row.original} />
          <PartnerOversightDialog partner={row.original} onUpdate={forceRefresh} />
          <Button variant="ghost" size="icon" onClick={() => { setEditLead(row.original); }}><Edit className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => { setDeleteLead(row.original); setIsDeleteAlertOpen(true); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      )
    },
  ], [forceRefresh]);

  return (
    <>
      <EngageDialog open={!!engageLead} onOpenChange={(o) => { setEngageLead(null); }} partners={engageLead ? [engageLead] : leads.filter(l => selectedIds.includes(l.id))} audience="transporters" onEngageSuccess={forceRefresh} />
      <LeadDialog open={isAddLeadOpen || !!editLead} onOpenChange={(o) => { if(!o) { setEditLead(null); setIsAddLeadOpen(false); } }} lead={editLead} onSave={forceRefresh} />
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="text-left text-foreground text-left text-foreground text-foreground text-foreground text-foreground">
          <AlertDialogHeader className="text-left text-foreground text-left text-foreground text-foreground text-foreground text-foreground text-foreground"><AlertDialogTitle className="text-left text-foreground text-left text-foreground text-foreground text-foreground">Are you sure?</AlertDialogTitle><AlertDialogDescription className="text-left text-foreground text-foreground text-foreground text-foreground">This will permanently delete the record.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteLead(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className={buttonVariants({ variant: "destructive" })}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-6 text-left text-foreground text-foreground text-foreground text-foreground text-foreground text-foreground">
        <CardHeader className="px-0 pt-0 flex flex-col md:flex-row md:items-center justify-between gap-4 px-0 pt-0 text-left text-foreground text-left text-foreground text-foreground text-foreground text-foreground text-foreground">
          <div className="text-left text-foreground text-left text-foreground text-foreground text-foreground text-foreground">
            <CardTitle className="flex items-center gap-2 text-left text-foreground text-foreground text-foreground text-foreground text-foreground text-foreground"><Users /> Master Lead Database</CardTitle>
            <CardDescription className="text-left text-muted-foreground text-left text-foreground text-foreground text-foreground text-foreground">Comprehensive registry of prospects and attributed referrals.</CardDescription>
          </div>
          <div className="flex items-center gap-2 text-left text-foreground text-foreground text-foreground text-foreground text-foreground">
             <Button variant="outline" size="sm" onClick={forceRefresh} disabled={isLoading} className="gap-2 text-foreground text-foreground text-foreground text-foreground text-foreground text-foreground"><RotateCcw className="h-4 w-4" /> Sync Registry</Button>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="text-left text-foreground text-foreground text-foreground text-foreground"><Download className="mr-2 h-4 w-4" /> Export</Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2 text-left text-foreground text-foreground text-foreground text-foreground">
                    <div className="space-y-1 text-left text-foreground text-foreground text-foreground text-foreground">
                        <Button variant="ghost" className="w-full justify-start text-xs font-bold text-foreground text-left text-foreground" onClick={() => handleExport('Standard')}><Download className="mr-2 h-3.5 w-3.5" /> Standard CSV</Button>
                        <Button variant="ghost" className="w-full justify-start text-xs font-bold text-primary text-left text-foreground" onClick={() => handleExport('SendGrid')}><Mail className="mr-2 h-3.5 w-3.5" /> SendGrid Export</Button>
                    </div>
                </PopoverContent>
            </Popover>
            <BulkImportDialog type="lead" onComplete={forceRefresh}><Button variant="outline" className="text-left text-foreground text-foreground text-foreground text-foreground text-foreground"><Upload className="mr-2 h-4 w-4" /> Import</Button></BulkImportDialog>
            <Button onClick={() => setIsAddLeadOpen(true)} className="text-left text-foreground text-foreground text-foreground text-foreground text-foreground text-foreground text-foreground"><PlusCircle className="mr-2 h-4 w-4" />Add Lead</Button>
          </div>
        </CardHeader>

        <Card className="text-left text-foreground text-foreground text-foreground text-foreground text-foreground text-foreground text-foreground text-foreground text-foreground">
            <CardContent className="pt-6 text-left text-foreground text-foreground text-foreground text-foreground text-foreground text-foreground text-foreground text-foreground text-foreground text-foreground">
                {isLoading ? <div className="flex justify-center py-20 text-left text-foreground text-foreground text-foreground text-foreground text-foreground text-foreground text-foreground text-foreground text-foreground text-foreground"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : <DataTable columns={columns} data={leads} onSelectionChange={setSelectedIds} />}
            </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function LeadsDatabase() {
  return (
    <Suspense fallback={<Loader2 className="animate-spin h-10 w-10 text-primary mx-auto my-20"/>}>
      <LeadsDatabaseComponent />
    </Suspense>
  );
}
