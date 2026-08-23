'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, ClipboardList, Handshake, Loader2, Mail, MessageSquare, PlusCircle, Edit, Trash2, Send, Copy, Search, RefreshCcw, Smartphone } from 'lucide-react';
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

const engagementMaterials = {
    introduction: {
        subject: 'Invitation to Join Logistics Flow',
        body: 'Hi [Lead Name],\n\nI would like to invite you to join Logistics Flow, a digital ecosystem built to help businesses access opportunities, reduce operating costs, and grow their network.\n\nCreate your member account using my referral link: [Referral Link]\n\nKind regards,\n[Member Name]',
    },
    opportunity: {
        subject: 'How Logistics Flow Can Benefit Your Business',
        body: 'Hi [Lead Name],\n\nLogistics Flow connects businesses to supplier, transport, funding, and marketplace opportunities in one ecosystem. I believe it can create practical value for your business.\n\nJoin using my referral link: [Referral Link]\n\nKind regards,\n[Member Name]',
    },
    network: {
        subject: 'Build Your Network with Logistics Flow',
        body: 'Hi [Lead Name],\n\nLogistics Flow rewards members who help the ecosystem grow. Once you join, you can build your own referral network and participate in the opportunities it creates.\n\nJoin using my referral link: [Referral Link]\n\nKind regards,\n[Member Name]',
    },
};

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

async function saveNetworkLead(token: string, lead: Record<string, unknown>) {
    const response = await fetch('/api/getNetwork', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || 'Unable to save the lead.');
    return result;
}

// Shared InviteDialog
function InviteDialog({ lead, companyId, onInviteSent }: { lead: any, companyId: string, onInviteSent: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [inviteLink, setInviteLink] = useState('');
    const { toast } = useToast();

    const buildInviteLink = () => {
        const firstName = lead.firstName || lead.contactPerson?.split(' ')[0] || '';
        const lastName = lead.lastName || lead.contactPerson?.split(' ').slice(1).join(' ') || '';
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://logisticsflow.co.za');
        return `${baseUrl}/join?email=${encodeURIComponent(lead.email || '')}&firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}&ref=${companyId}`;
    };

    const inviteMessage = `Hi ${lead.firstName || lead.contactPerson || ''}, I would like to invite you to join Logistics Flow. Create your member account using my referral link: ${inviteLink}`;

    const onOpenChange = (open: boolean) => {
        if (!open) {
            setInviteLink('');
        }
        setIsOpen(open);
    };

    const handleGenerateLink = async () => {
        setIsLoading(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");

            await saveNetworkLead(token, { id: lead.id, status: 'invited' });

            setInviteLink(buildInviteLink());
            
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

    const shareViaWhatsApp = () => {
        if (!inviteLink) return;
        window.open(`https://wa.me/?text=${encodeURIComponent(inviteMessage)}`, '_blank', 'noopener,noreferrer');
    };

    const shareViaEmail = () => {
        if (!inviteLink) return;
        const subject = encodeURIComponent('Invitation to join Logistics Flow');
        window.location.href = `mailto:${encodeURIComponent(lead.email || '')}?subject=${subject}&body=${encodeURIComponent(inviteMessage)}`;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title={lead.status === 'invited' ? 'Resend Invite' : 'Invite Lead'} disabled={lead.source === 'Member'}>
                    <Send className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Invite {lead.companyName}</DialogTitle>
                     <DialogDescription>
                        {inviteLink
                                                    ? "Share the invitation by WhatsApp, email, or a copied link. The recipient can update the pre-filled email during sign-up."
                                                    : `This will generate a reusable sign-up link for ${lead.companyName || 'this lead'}.`}
                    </DialogDescription>
                </DialogHeader>
                
                {isLoading && (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
                )}
                
                {inviteLink && (
                    <div className="space-y-3 py-4">
                        <div className="flex items-center space-x-2">
                            <Input value={inviteLink} readOnly />
                            <Button onClick={copyToClipboard} size="icon" title="Copy invite link"><Copy className="h-4 w-4" /></Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={shareViaWhatsApp} variant="outline"><Smartphone className="mr-2 h-4 w-4" />WhatsApp</Button>
                            <Button onClick={shareViaEmail} variant="outline"><Mail className="mr-2 h-4 w-4" />Email</Button>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    {inviteLink ? (
                        <Button onClick={() => onOpenChange(false)}>Done</Button>
                    ) : lead.status === 'invited' ? (
                        <Button onClick={() => setInviteLink(buildInviteLink())}>Open Invite Link</Button>
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

function LeadEngagementDialog({ lead, companyId, memberName, onEngaged }: { lead: any; companyId: string; memberName?: string; onEngaged: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [materialKey, setMaterialKey] = useState<keyof typeof engagementMaterials>('introduction');
    const [isSending, setIsSending] = useState(false);
    const { toast } = useToast();
    const material = engagementMaterials[materialKey];
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://logisticsflow.co.za');
    const referralLink = `${baseUrl}/join?ref=${companyId}`;
    const recipientName = lead.firstName || lead.contactPerson || lead.companyName || 'there';
    const message = material.body
        .replace('[Lead Name]', recipientName)
        .replace('[Referral Link]', referralLink)
        .replace('[Member Name]', memberName || 'A Logistics Flow member');

    const launch = async (channel: 'WhatsApp' | 'Email') => {
        setIsSending(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error('Authentication failed.');
            const response = await fetch('/api/getNetwork', {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadId: lead.id, channel, subject: material.subject }),
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || 'Unable to record the engagement.');
            if (channel === 'WhatsApp') {
                window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
            } else {
                window.location.href = `mailto:${encodeURIComponent(lead.email || '')}?subject=${encodeURIComponent(material.subject)}&body=${encodeURIComponent(message)}`;
            }
            toast({ title: 'Engagement Ready', description: `${channel} outreach was recorded for this lead.` });
            onEngaged();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Engagement Failed', description: error.message });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild><Button variant="ghost" size="icon" title="Engage lead"><MessageSquare className="h-4 w-4" /></Button></DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader><DialogTitle>Engage {lead.companyName}</DialogTitle><DialogDescription>Select and share a proven network outreach message.</DialogDescription></DialogHeader>
                <Select value={materialKey} onValueChange={(value) => setMaterialKey(value as keyof typeof engagementMaterials)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="introduction">Introduction</SelectItem>
                        <SelectItem value="opportunity">Business Opportunity</SelectItem>
                        <SelectItem value="network">Network Opportunity</SelectItem>
                    </SelectContent>
                </Select>
                <div className="space-y-2"><Input value={material.subject} readOnly /><Textarea value={message} readOnly className="min-h-64" /></div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => launch('WhatsApp')} disabled={isSending}><Smartphone className="mr-2 h-4 w-4" />WhatsApp</Button>
                    <Button onClick={() => launch('Email')} disabled={isSending}><Mail className="mr-2 h-4 w-4" />Email</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DeleteLeadButton({ lead, onDeleted }: { lead: any; onDeleted: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const { toast } = useToast();

    const deleteLead = async () => {
        setIsDeleting(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error('Authentication failed.');
            const response = await fetch('/api/getNetwork', {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadId: lead.id }),
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || 'Unable to delete the lead.');
            toast({ title: 'Lead Deleted' });
            setIsOpen(false);
            onDeleted();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <Button variant="ghost" size="icon" title="Delete lead" onClick={() => setIsOpen(true)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Delete this lead?</AlertDialogTitle><AlertDialogDescription>This removes {lead.companyName} and its member-owned engagement history from your network.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={deleteLead} className={buttonVariants({ variant: 'destructive' })} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete Lead'}</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function ClientCrmTools({ client, lifecycleLead, companyId, memberName, onUpdate }: { client: any; lifecycleLead: any; companyId: string; memberName?: string; onUpdate: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [activePanel, setActivePanel] = useState<'communication' | 'tasks' | 'oversight'>('oversight');
    const [activity, setActivity] = useState<{ communications: any[]; tasks: any[] }>({ communications: [], tasks: [] });
    const [isLoading, setIsLoading] = useState(false);
    const [taskTitle, setTaskTitle] = useState('');
    const [communicationSubject, setCommunicationSubject] = useState('');
    const [notes, setNotes] = useState('');
    const { toast } = useToast();

    const loadActivity = async () => {
        setIsLoading(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error('Authentication failed.');
            const response = await fetch('/api/getNetwork', { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ leadId: lifecycleLead.id }) });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load client activity.');
            setActivity(result.data);
        } catch (error: any) { toast({ variant: 'destructive', title: 'Activity Load Failed', description: error.message }); }
        finally { setIsLoading(false); }
    };

    const addRecord = async (action: 'addCommunication' | 'addTask') => {
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error('Authentication failed.');
            const response = await fetch('/api/getNetwork', { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action, leadId: lifecycleLead.id, type: 'Manual', subject: communicationSubject || taskTitle, title: taskTitle, notes }) });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || 'Unable to save client activity.');
            setTaskTitle(''); setCommunicationSubject(''); setNotes(''); await loadActivity(); onUpdate();
            toast({ title: action === 'addTask' ? 'Task Added' : 'Communication Logged' });
        } catch (error: any) { toast({ variant: 'destructive', title: 'CRM Update Failed', description: error.message }); }
    };

    const openPanel = (panel: 'communication' | 'tasks' | 'oversight') => { setActivePanel(panel); setIsOpen(true); loadActivity(); };
    return <>
        <LeadEngagementDialog lead={lifecycleLead} companyId={companyId} memberName={memberName} onEngaged={onUpdate} />
        <Button variant="ghost" size="icon" title="Add communication" onClick={() => openPanel('communication')}><MessageSquare className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" title="View and manage tasks" onClick={() => openPanel('tasks')}><ClipboardList className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" title="Oversight activity" onClick={() => openPanel('oversight')}><Activity className="h-4 w-4" /></Button>
        <Dialog open={isOpen} onOpenChange={setIsOpen}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>Client CRM: {client.companyName}</DialogTitle><DialogDescription>Communications, follow-up tasks, and oversight activity for this network client.</DialogDescription></DialogHeader>{activePanel === 'communication' && <div className="space-y-2"><Label>Add Communication</Label><Input value={communicationSubject} onChange={event => setCommunicationSubject(event.target.value)} placeholder="Communication subject" /><Textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Communication notes" /><Button size="sm" onClick={() => addRecord('addCommunication')} disabled={!communicationSubject}>Log Communication</Button></div>}{activePanel === 'tasks' && <div className="space-y-2"><Label>Add Follow-up Task</Label><Input value={taskTitle} onChange={event => setTaskTitle(event.target.value)} placeholder="Task title" /><Textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Task notes" /><Button size="sm" variant="outline" onClick={() => addRecord('addTask')} disabled={!taskTitle}>Add Task</Button></div>}<ScrollArea className="h-52 border rounded-md p-3"><div className="space-y-3">{isLoading ? <Loader2 className="animate-spin mx-auto" /> : <>{activity.communications.map(record => <div key={record.id} className="text-sm border-b pb-2"><p className="font-medium">{record.subject}</p><p className="text-xs text-muted-foreground">Communication · {formatDateSafe(record.timestamp, 'dd MMM yyyy, HH:mm')}</p></div>)}{activity.tasks.map(record => <div key={record.id} className="text-sm border-b pb-2"><p className="font-medium">{record.title}</p><p className="text-xs text-muted-foreground">Task · {record.status || 'pending'}</p></div>)}{!activity.communications.length && !activity.tasks.length && <p className="text-sm text-muted-foreground">No activity recorded for this client yet.</p>}</>}</div></ScrollArea></DialogContent></Dialog>
    </>;
}

function RemoveMemberFromNetworkButton({ client, lifecycleLead, onRemoved }: { client: any; lifecycleLead: any; onRemoved: () => void }) {
    const [isOpen, setIsOpen] = useState(false); const [isRemoving, setIsRemoving] = useState(false); const { toast } = useToast();
    const removeClient = async () => { setIsRemoving(true); try { const token = await getClientSideAuthToken(); if (!token) throw new Error('Authentication failed.'); const response = await fetch('/api/getNetwork', { method: 'DELETE', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ memberCompanyId: client.id, leadId: lifecycleLead.id }) }); const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.error || 'Unable to remove client.'); toast({ title: 'Client Removed From Network' }); setIsOpen(false); onRemoved(); } catch (error: any) { toast({ variant: 'destructive', title: 'Removal Failed', description: error.message }); } finally { setIsRemoving(false); } };
    return <AlertDialog open={isOpen} onOpenChange={setIsOpen}><Button variant="ghost" size="icon" title="Remove client from my network" onClick={() => setIsOpen(true)}><Trash2 className="h-4 w-4 text-destructive" /></Button><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove client from your network?</AlertDialogTitle><AlertDialogDescription>This detaches {client.companyName} from your referral network but does not delete their member account.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel><AlertDialogAction onClick={removeClient} className={buttonVariants({ variant: 'destructive' })} disabled={isRemoving}>{isRemoving ? 'Removing...' : 'Remove Client'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
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

    await saveNetworkLead(token, { ...values, id: lead?.id });
      
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
            const response = await fetch('/api/getNetwork', {
                headers: { Authorization: `Bearer ${token}` },
                cache: 'no-store',
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Unable to load your network.');
            }
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
                            {(() => { const lifecycleLead = row.original.source === 'Lead' ? row.original : { ...row.original, id: row.original.sourceLeadId, source: 'Lead' }; return lifecycleLead.id ? <>
                                {row.original.source === 'Member' ? <ClientCrmTools client={row.original} lifecycleLead={lifecycleLead} companyId={companyId!} memberName={user?.displayName} onUpdate={fetchNetwork} /> : <><LeadEngagementDialog lead={lifecycleLead} companyId={companyId!} memberName={user?.displayName} onEngaged={fetchNetwork} /><InviteDialog lead={lifecycleLead} companyId={companyId!} onInviteSent={fetchNetwork} /></>}
                                <LeadDialog lead={lifecycleLead} companyId={companyId!} onSave={fetchNetwork}>
                                    <Button variant="ghost" size="icon" title="Edit lead"><Edit className="h-4 w-4" /></Button>
                                </LeadDialog>
                                {row.original.source === 'Member' ? <RemoveMemberFromNetworkButton client={row.original} lifecycleLead={lifecycleLead} onRemoved={fetchNetwork} /> : <DeleteLeadButton lead={lifecycleLead} onDeleted={fetchNetwork} />}
                            </> : null; })()}
            </div>
          )
        },
        ], [companyId, fetchNetwork, user?.displayName]);
    
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
