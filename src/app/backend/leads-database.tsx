
'use client';

import { useState, useMemo, useEffect, Suspense, useCallback } from 'react';
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
  DialogTrigger,
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
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, getClientSideAuthToken, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Loader2, PlusCircle, Users, Edit, Trash2, Search, Check, AlertTriangle, Send, Copy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { roles } from '@/lib/roles';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';


const leadSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  contactPerson: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  role: z.string().min(1, 'Role is required'),
  status: z.enum(['new', 'contacted', 'qualified', 'unqualified', 'invited', 'registered']).default('new'),
  notes: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  address: z.string().optional(),
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
             form.reset({
                ...lead,
                status: lead.status || 'new',
            });
        } else {
            form.reset({
                companyName: defaultValues?.companyName || '',
                contactPerson: defaultValues?.contactPerson || '',
                email: defaultValues?.email || '',
                phone: defaultValues?.phone || '',
                role: defaultValues?.role || '',
                status: 'new',
                notes: '',
                website: defaultValues?.website || '',
                address: defaultValues?.address || '',
            });
        }
    }
  }, [open, lead, form, defaultValues]);

  const onSubmit = async (values: LeadFormValues) => {
    setIsLoading(true);
    try {
        const token = await getClientSideAuthToken();
        if (!token) throw new Error("Authentication token not found.");
        
        const response = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'saveLead',
                payload: { lead: { id: lead?.id, ...values } }
            }),
        });
        
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to save lead.');

        toast({ title: lead ? 'Lead Updated' : 'Lead Added' });
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
        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>{lead ? 'Edit Lead' : 'Add New Lead'}</DialogTitle>
                <DialogDescription>
                    Enter the details for the potential member.
                </DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                    <FormField control={form.control} name="companyName" render={({ field }) => ( <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField control={form.control} name="contactPerson" render={({ field }) => ( <FormItem><FormLabel>Contact Person</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                    <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} type="email"/></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="website" render={({ field }) => ( <FormItem><FormLabel>Website</FormLabel><FormControl><Input {...field} type="url" placeholder="https://example.com" /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="address" render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField control={form.control} name="role" render={({ field }) => ( <FormItem><FormLabel>Potential Role</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl><SelectContent>{roles.map(r => <SelectItem key={r.id} value={r.title}>{r.title}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="status" render={({ field }) => ( <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="new">New</SelectItem><SelectItem value="contacted">Contacted</SelectItem><SelectItem value="qualified">Qualified</SelectItem><SelectItem value="unqualified">Unqualified</SelectItem><SelectItem value="invited">Invited</SelectItem><SelectItem value="registered">Registered</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                    </div>
                    <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />
                     <DialogFooter className="pt-4">
                        <Button type="submit" disabled={isLoading}>{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Save Lead</Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    </Dialog>
  );
}

function InviteDialog({ lead, onInviteSent }: { lead: any; onInviteSent: () => void; }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [inviteLink, setInviteLink] = useState('');
    const { toast } = useToast();

    const handleInvite = async () => {
        setIsLoading(true);
        setInviteLink('');
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");

            const response = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'inviteLead', payload: { leadId: lead.id } }),
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            
            const nameParts = (lead.contactPerson || '').split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
            
            const baseUrl = 'https://studio--ecosystem-hub.us-central1.hosted.app';
            const constructedLink = `${baseUrl}/join?email=${encodeURIComponent(lead.email || '')}&firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}`;
            
            setInviteLink(constructedLink);
            onInviteSent();
            toast({ title: "Invite Link Generated", description: result.message || "You can now share the secure link." });
        } catch(e: any) {
            toast({ variant: 'destructive', title: 'Invite Failed', description: e.message });
            setIsOpen(false);
        } finally {
            setIsLoading(false);
        }
    };
    
    const copyToClipboard = () => {
        navigator.clipboard.writeText(inviteLink);
        toast({ title: 'Link Copied!' });
    }

    const onOpenChange = (open: boolean) => {
        if (!open) {
            setInviteLink('');
        }
        setIsOpen(open);
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title="Invite Lead" disabled={lead.status === 'invited' || lead.status === 'registered'}>
                    <Send className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Invite {lead.companyName}</DialogTitle>
                    <DialogDescription>
                        {inviteLink ? "Share this secure sign-up link. It can be used once for the lead to set their password." : `This will mark the lead as 'invited' and generate a sign-up link. Are you sure?`}
                    </DialogDescription>
                </DialogHeader>

                {isLoading && <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin"/></div>}

                {inviteLink && (
                     <div className="flex items-center space-x-2 py-4">
                        <Input value={inviteLink} readOnly />
                        <Button onClick={copyToClipboard} size="sm" className="px-3">
                            <span className="sr-only">Copy</span>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                )}
                
                <DialogFooter>
                    {inviteLink ? (
                        <Button onClick={() => onOpenChange(false)}>Done</Button>
                    ) : (
                        <>
                            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button onClick={handleInvite} disabled={isLoading}>Generate Link</Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function DuplicateCleaner({ onComplete }: { onComplete: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [duplicates, setDuplicates] = useState<any[][]>([]);
    const [selections, setSelections] = useState<Record<number, string>>({});
    const { toast } = useToast();

    const findDuplicates = async () => {
        setIsLoading(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Auth failed.");
            const response = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'findDuplicateLeads' }),
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            setDuplicates(result.data);
            if (result.data.length === 0) {
                 toast({ title: "No duplicates found." });
            } else {
                 setIsOpen(true);
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error finding duplicates", description: e.message });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSelection = (groupIndex: number, leadId: string) => {
        setSelections(prev => ({...prev, [groupIndex]: leadId}));
    }

    const handleClean = async () => {
        setIsLoading(true);
        const idsToDelete = duplicates.flatMap((group, index) => {
            const idToKeep = selections[index];
            if (!idToKeep) return []; // If no selection for a group, don't delete anything
            return group.filter(lead => lead.id !== idToKeep).map(lead => lead.id);
        });

        if (idsToDelete.length === 0) {
            toast({ title: "No duplicates selected for deletion." });
            setIsLoading(false);
            setIsOpen(false);
            return;
        }

        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Auth failed.");
            const response = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'deleteLeads', payload: { leadIds: idsToDelete } }),
            });
             const result = await response.json();
            if (!result.success) throw new Error(result.error);
            
            toast({ title: "Duplicates Cleaned!", description: `${idsToDelete.length} duplicate records have been deleted.` });
            onComplete();
            setIsOpen(false);
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error cleaning duplicates", description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" onClick={findDuplicates} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Search className="mr-2 h-4 w-4"/>}
                    Find & Clean Duplicates
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
                 <DialogHeader>
                    <DialogTitle>Duplicate Lead Cleaner</DialogTitle>
                    <DialogDescription>
                        We found {duplicates.length} group(s) of duplicate leads based on company name. For each group, select the record you want to keep. The others will be deleted.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 max-h-[60vh] overflow-y-auto p-4">
                    {duplicates.map((group, groupIndex) => (
                        <Card key={groupIndex}>
                            <CardHeader><CardTitle>Group: {group[0]?.companyName}</CardTitle></CardHeader>
                            <CardContent>
                                {group.map(lead => (
                                    <div key={lead.id} className="flex items-start gap-4 p-2 border-b last:border-b-0">
                                        <Checkbox 
                                            id={`lead-${groupIndex}-${lead.id}`} 
                                            checked={selections[groupIndex] === lead.id} 
                                            onCheckedChange={() => handleSelection(groupIndex, lead.id)}
                                        />
                                        <label htmlFor={`lead-${groupIndex}-${lead.id}`} className="text-sm space-y-1">
                                            <p className="font-semibold">{lead.contactPerson || 'No Contact'} - <span className="font-mono text-xs">{lead.id}</span></p>
                                            <p className="text-muted-foreground">{lead.email || 'No Email'} | {lead.phone || 'No Phone'}</p>
                                            <p className="text-xs text-muted-foreground">{lead.address}</p>
                                        </label>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    ))}
                </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleClean} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4"/>}
                        Clean Selected Duplicates
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function LeadsDatabaseComponent() {
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading, forceRefresh } = useCollection(leadsQuery);
  const { toast } = useToast();
  
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [editLead, setEditLead] = useState<any | null>(null);
  const [isEditLeadOpen, setIsEditLeadOpen] = useState(false);
  const [deleteLead, setDeleteLead] = useState<any | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  const newLeadDefaults = useMemo(() => {
    const companyName = searchParams.get('newCompanyName');
    if (companyName) {
      return { 
        companyName, 
        role: searchParams.get('newRole') || '', 
        address: searchParams.get('newAddress') || '', 
        website: searchParams.get('newWebsite') || '',
        phone: searchParams.get('newPhone') || '',
        email: searchParams.get('newEmail') || '',
        contactPerson: searchParams.get('newContactPerson') || '',
      };
    }
    return undefined;
  }, [searchParams]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'add-member' || newLeadDefaults) {
      setIsAddLeadOpen(true);
      // Clean the URL to prevent re-triggering
      const newPath = `${window.location.pathname}?view=leads-database`;
      router.replace(newPath, { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, newLeadDefaults]);

  const handleDelete = async () => {
    if (!deleteLead) return;
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error("Authentication failed.");
      
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteLead', payload: { leadId: deleteLead.id } }),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Failed to delete lead.');
      
      toast({ title: 'Lead Deleted' });
      forceRefresh();
    } catch(e: any) {
      toast({ variant: 'destructive', title: 'Delete Failed', description: e.message });
    } finally {
        setIsDeleteAlertOpen(false);
        setDeleteLead(null);
    }
  };

  const columns: ColumnDef<any>[] = useMemo(() => [
    { accessorKey: 'id', header: 'Lead ID', cell: ({row}) => <div className="font-mono text-xs">{row.original.id}</div> },
    { accessorKey: 'companyName', header: 'Company', cell: ({row}) => <div>{row.original.companyName}</div> },
    { accessorKey: 'contactPerson', header: 'Contact', cell: ({row}) => <div>{row.original.contactPerson}</div> },
    { accessorKey: 'website', header: 'Website', cell: ({row}) => row.original.website ? <a href={row.original.website} target="_blank" rel="noopener noreferrer" className="text-primary underline">{row.original.website}</a> : null},
    { accessorKey: 'address', header: 'Address', cell: ({row}) => <div className="text-xs">{row.original.address}</div>},
    { accessorKey: 'role', header: 'Role', cell: ({row}) => <Badge variant="outline">{row.original.role}</Badge>},
    { accessorKey: 'status', header: 'Status', cell: ({row}) => <Badge className="capitalize">{row.original.status}</Badge>},
    {
      id: 'actions',
      header: <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="text-right flex items-center justify-end">
             <InviteDialog lead={row.original} onInviteSent={forceRefresh} />
            <Button variant="ghost" size="icon" onClick={() => { setEditLead(row.original); setIsEditLeadOpen(true); }}>
                <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => { setDeleteLead(row.original); setIsDeleteAlertOpen(true); }}>
                <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
        </div>
    )},
  ], [forceRefresh]);

  return (
      <>
        <LeadDialog open={isAddLeadOpen} onOpenChange={setIsAddLeadOpen} onSave={forceRefresh} defaultValues={newLeadDefaults} />
        {editLead && <LeadDialog open={isEditLeadOpen} onOpenChange={setIsEditLeadOpen} lead={editLead} onSave={forceRefresh} />}
        <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the lead for {deleteLead?.companyName}.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteLead(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className={buttonVariants({ variant: "destructive" })}>Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle className="flex items-center gap-2"><Users /> Lead Database</CardTitle>
                <CardDescription>Add, edit, and manage your sales leads to build your member database.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <DuplicateCleaner onComplete={forceRefresh} />
                <Button onClick={() => setIsAddLeadOpen(true)}><PlusCircle className="mr-2 h-4 w-4"/>Add Lead</Button>
            </div>
            </CardHeader>
            <CardContent>
            {isLoading ? (
                <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
                <DataTable columns={columns} data={leads || []} />
            )}
            </CardContent>
        </Card>
      </>
  );
}

export default function LeadsDatabase() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <LeadsDatabaseComponent />
        </Suspense>
    );
}
