'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Handshake, Loader2, MessageSquare, PlusCircle, Edit, Trash2, Send, Copy, Search, RefreshCcw } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser, getClientSideAuthToken, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import Link from 'next/link';
import { collection, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { roles as potentialRoles } from '@/lib/roles';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDateSafe } from '@/lib/utils';

// Schema for the lead form
const leadSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  contactPerson: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  role: z.string().min(1, 'Role is required'),
  status: z.enum(['new', 'contacted', 'qualified', 'unqualified', 'invited', 'registered']).default('new'),
  notes: z.string().optional(),
});

type LeadFormValues = z.infer<typeof leadSchema>;

async function performAdminAction(token: string, action: string, payload: any) {
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

// Shared InviteDialog
function InviteDialog({ lead, companyId, onInviteSent }: { lead: any, companyId: string, onInviteSent: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [inviteLink, setInviteLink] = useState('');
    const { toast } = useToast();

    const onOpenChange = (open: boolean) => {
        if (!open) {
            setInviteLink('');
        }
        setIsOpen(open);
    };

    const handleGenerateLink = async () => {
        if (!lead.email) {
            toast({
                variant: 'destructive',
                title: 'Cannot Invite Lead',
                description: 'This lead does not have an email address. Please edit the lead to add one before inviting.',
            });
            return;
        }

        setIsLoading(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");

            // Update lead status in root collection
            await performAdminAction(token, 'saveCompanyLead', { 
                companyId, 
                lead: { id: lead.id, status: 'invited' } 
            });

            const firstName = lead.firstName || lead.contactPerson?.split(' ')[0] || '';
            const lastName = lead.lastName || lead.contactPerson?.split(' ').slice(1).join(' ') || '';
            
            const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://studio--ecosystem-hub.us-central1.hosted.app';
            const link = `${baseUrl}/join?email=${encodeURIComponent(lead.email)}&firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}&ref=${companyId}`;
            
            setInviteLink(link);
            
            toast({ title: "Invite Link Generated", description: "You can now share the secure link." });
            onInviteSent();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Invite Failed', description: e.message });
            setIsOpen(false);
        } finally {
            setIsLoading(false);
        }
    };
    
    const copyToClipboard = () => {
        if (!inviteLink) return;
        navigator.clipboard.writeText(inviteLink);
        toast({ title: 'Link Copied!' });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title="Invite Lead" disabled={lead.source === 'Member' || lead.status === 'invited'}>
                    <Send className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Invite {lead.companyName}</DialogTitle>
                     <DialogDescription>
                        {inviteLink
                          ? "Share this secure sign-up link. It will pre-fill their email on the registration form."
                          : `This will generate a sign-up link for ${lead.email || 'this lead'}.`}
                    </DialogDescription>
                </DialogHeader>
                
                {isLoading && (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
                )}
                
                {inviteLink && (
                    <div className="flex items-center space-x-2 py-4">
                        <Input value={inviteLink} readOnly />
                        <Button onClick={copyToClipboard}>
                           <Copy className="mr-2 h-4 w-4" />
                           Copy Link
                        </Button>
                    </div>
                )}

                <DialogFooter>
                    {inviteLink ? (
                        <Button onClick={() => onOpenChange(false)}>Done</Button>
                    ) : (
                        <>
                            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
                            <Button onClick={handleGenerateLink} disabled={isLoading}>
                               {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                               Generate Invite Link
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function MessageDialog({ lead }: { lead: any }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const { toast } = useToast();

    const messagesQuery = useMemoFirebase(() => {
        if (!firestore || !lead?.id || !isOpen) return null;
        return query(
            collection(firestore, `leads/${lead.id}/messages`),
            orderBy('timestamp', 'asc')
        );
    }, [firestore, lead, isOpen]);

    const { data: messages, isLoading: areMessagesLoading, forceRefresh } = useCollection(messagesQuery);

    const handleSend = async () => {
        if (!user || !message.trim()) return;
        setIsSending(true);

        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");

            const path = `leads/${lead.id}/messages`;
            const messageData = {
                text: message,
                senderId: user.uid,
                timestamp: serverTimestamp(),
                read: false,
            };

            const response = await fetch('/api/addUserDoc', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ collectionPath: path, data: messageData }),
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Failed to send message.');
            }
            
            setMessage('');
            forceRefresh();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Send Failed', description: error.message });
        } finally {
            setIsSending(false);
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title="Message Lead">
                    <MessageSquare className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md flex flex-col h-[70vh]">
                <DialogHeader>
                    <DialogTitle>Chat with {lead.companyName}</DialogTitle>
                </DialogHeader>
                <ScrollArea className="flex-1 p-4 -mx-6 border-y">
                    <div className="space-y-4 px-6">
                        {areMessagesLoading && <div className="flex justify-center"><Loader2 className="animate-spin" /></div>}
                        {messages?.map((msg: any) => {
                            const isMe = msg.senderId === user?.uid;
                            const alignment = isMe ? "justify-end" : "justify-start";
                            return (
                                <div key={msg.id} className={cn("flex items-end gap-2", alignment)}>
                                    <div className={cn("rounded-lg px-3 py-2 max-w-[80%] text-sm", isMe ? "bg-primary text-primary-foreground" : "bg-muted")}>
                                        <p>{msg.text}</p>
                                        <p className="text-[10px] opacity-70 mt-1 text-right">{formatDateSafe(msg.timestamp, 'HH:mm')}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
                <div className="mt-auto flex items-center gap-2 pt-4">
                    <Input placeholder="Type message..." value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} disabled={isSending} />
                    <Button onClick={handleSend} disabled={isSending || !message.trim()} size="icon">
                        {isSending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4" />}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function LeadDialog({ lead, companyId, onSave, children }: { lead?: any, companyId: string, onSave: () => void, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inviteStep, setInviteStep] = useState(false);
  const [newLeadInfo, setNewLeadInfo] = useState<LeadFormValues | null>(null);

  const { toast } = useToast();
  const form = useForm<LeadFormValues>({ resolver: zodResolver(leadSchema) });

  useEffect(() => {
    if (isOpen) {
      form.reset(lead || { companyName: '', firstName: '', lastName: '', email: '', phone: '', role: '', status: 'new', notes: '' });
    }
  }, [isOpen, lead, form]);

  const onSubmit = async (values: LeadFormValues) => {
    setIsLoading(true);
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error("Authentication failed.");

      await performAdminAction(token, 'saveCompanyLead', { lead: { ...values, id: lead?.id }, companyId });
      
      toast({ title: lead ? 'Lead Updated' : 'Lead Added' });
      onSave();

      if (lead) {
        setIsOpen(false);
      } else {
        setNewLeadInfo(values);
        setInviteStep(true);
      }
    } catch(e: any) {
      toast({ variant: 'destructive', title: 'Operation Failed', description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        {inviteStep && newLeadInfo ? (
            <>
                 <DialogHeader><DialogTitle>Step 2: Invite Your Lead</DialogTitle></DialogHeader>
                 <div className="py-4 space-y-4">
                     <p className="text-sm">The lead for {newLeadInfo.companyName} has been created. Use the Send icon in the table to generate their unique sign-up link.</p>
                 </div>
                 <DialogFooter><Button onClick={() => setIsOpen(false)}>Done</Button></DialogFooter>
            </>
        ) : (
            <>
                <DialogHeader><DialogTitle>{lead ? 'Edit Lead' : 'Add New Lead'}</DialogTitle></DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 text-left">
                      <FormField control={form.control} name="companyName" render={({ field }) => ( <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="firstName" render={({ field }) => ( <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="lastName" render={({ field }) => ( <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                      </div>
                      <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem> )} />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="role" render={({ field }) => ( <FormItem><FormLabel>Potential Role</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent>{potentialRoles.map(r => <SelectItem key={r.id} value={r.title}>{r.title}</SelectItem>)}</SelectContent></Select></FormItem> )} />
                      </div>
                  </form>
                </Form>
                <DialogFooter><Button onClick={form.handleSubmit(onSubmit)} disabled={isLoading}>Save Lead</Button></DialogFooter>
            </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function NetworkContent() {
    const { user, isUserLoading } = useUser();
    const { toast } = useToast();
    const [network, setNetwork] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const companyId = user?.companyId;

    const fetchNetwork = useCallback(async () => {
        if (!companyId) return;
        setIsLoading(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;
            const result = await performAdminAction(token, 'getMyNetwork', {});
            setNetwork(result.data || []);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Network Load Failed', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [companyId, toast]);

    useEffect(() => { fetchNetwork(); }, [fetchNetwork]);

    const columns: ColumnDef<any>[] = useMemo(() => [
        {
          header: 'Entity Name',
          cell: ({ row }) => (
            <div className="flex flex-col text-left">
                <span className="font-bold">{row.original.companyName}</span>
                <Badge variant={row.original.source === 'Member' ? 'default' : 'outline'} className="w-fit text-[8px] h-3.5 mt-1 uppercase">
                    {row.original.source}
                </Badge>
            </div>
          )
        },
        { accessorKey: 'contactPerson', header: 'Contact', cell: ({row}) => <div>{row.original.contactPerson || `${row.original.firstName || ''} ${row.original.lastName || ''}`.trim()}</div> },
        { accessorKey: 'email', header: 'Email' },
        { accessorKey: 'status', header: 'Status', cell: ({ row }) => <Badge className="capitalize text-[10px]">{row.original.status}</Badge> },
        {
          id: 'actions',
          header: <div className="text-right">Actions</div>,
          cell: ({ row }) => (
            <div className="flex items-center justify-end">
              <MessageDialog lead={row.original} />
              <InviteDialog lead={row.original} companyId={companyId!} onInviteSent={fetchNetwork} />
              <LeadDialog lead={row.original} companyId={companyId!} onSave={fetchNetwork}>
                <Button variant="ghost" size="icon" title="Edit"><Edit className="h-4 w-4" /></Button>
              </LeadDialog>
            </div>
          )
        },
    ], [companyId, fetchNetwork]);
    
    return (
        <Card className="text-left">
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="text-left">
                    <CardTitle className="flex items-center gap-2 text-2xl text-left"><Handshake /> My Network & Referrals</CardTitle>
                    <CardDescription className="text-left">Consolidated view of your leads and registered members.</CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchNetwork} disabled={isLoading}><RefreshCcw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} /> Refresh</Button>
                    {companyId && <LeadDialog companyId={companyId} onSave={fetchNetwork}><Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Lead</Button></LeadDialog>}
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : (
                    <DataTable columns={columns} data={network} />
                )}
            </CardContent>
        </Card>
    );
}
