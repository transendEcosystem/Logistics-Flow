
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { getClientSideAuthToken } from '@/firebase';
import { Loader2, PlusCircle, Bot, Edit, Trash2, Send, Copy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type ColumnDef } from '@/hooks/use-data-table';
import Link from 'next/link';

async function performAdminAction(token: string, action: string, payload: any) {
    const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, payload }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
        throw new Error(result.error || `API Error for action: ${action}`);
    }
    return result;
}

const partnerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  companyName: z.string().optional(),
  status: z.enum(['active', 'inactive']),
});

type PartnerFormValues = z.infer<typeof partnerSchema>;

function ISADialog({ open, onOpenChange, partner, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; partner?: any; onSave: () => void; }) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<PartnerFormValues>({
    resolver: zodResolver(partnerSchema),
  });

  useEffect(() => {
    if (open) {
      if (partner) {
        form.reset(partner);
      } else {
        form.reset({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          companyName: '',
          status: 'active',
        });
      }
    }
  }, [open, partner, form]);

  const onSubmit = async (values: PartnerFormValues) => {
    setIsLoading(true);
    try {
        const token = await getClientSideAuthToken();
        if (!token) throw new Error("Authentication failed.");
        
        await performAdminAction(token, 'savePartner', { partner: { id: partner?.id, ...values, type: 'isa' } });

        toast({ title: partner ? 'ISA Updated' : 'ISA Added' });
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
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>{partner ? 'Edit ISA' : 'Add New ISA'}</DialogTitle>
                <DialogDescription>
                    Enter the details for the Independent Sales Agent.
                </DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="firstName" render={({ field }) => ( <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="lastName" render={({ field }) => ( <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} type="email"/></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Mobile Number (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                    <FormField control={form.control} name="companyName" render={({ field }) => ( <FormItem><FormLabel>Company Name (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="status" render={({ field }) => ( <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                     <DialogFooter className="pt-4">
                        <Button type="submit" disabled={isLoading}>{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Save ISA</Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    </Dialog>
  );
}

function ISAActionMenu({ onInvite, onEdit, onDelete }: { onInvite: () => void; onEdit: () => void; onDelete: () => void; }) {
  return (
    <div className="flex justify-end items-center gap-1">
      <Button variant="ghost" size="icon" onClick={onInvite} title="Invite ISA">
        <Send className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={onEdit} title="Edit ISA">
        <Edit className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={onDelete} title="Delete ISA">
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

export default function ISAManagement() {
  const { toast } = useToast();
  const [partners, setPartners] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const forceRefresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
        const token = await getClientSideAuthToken();
        if (!token) throw new Error("Authentication failed.");
        
        const result = await performAdminAction(token, 'getPartnersByType', { type: 'isa' });
        setPartners(result.data || []);
    } catch (e: any) {
        setError(e.message);
        toast({ variant: 'destructive', title: 'Error loading ISAs', description: e.message });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    forceRefresh();
  }, [forceRefresh]);

  const [dialogState, setDialogState] = useState<{ type: 'add' | 'edit' | 'delete' | 'invite' | null, data?: any }>({ type: null, data: undefined });

  const handleOpenDialog = async (type: 'add' | 'edit' | 'delete' | 'invite', data?: any) => {
    if (type === 'invite' && data) {
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");
            await performAdminAction(token, 'invitePartner', {
                partnerId: data.id
            });
            forceRefresh();
            toast({ title: "ISA Invite Ready", description: "Status updated to 'invited'. You can now send the link." });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Action Failed', description: `Could not update ISA status: ${e.message}` });
            return;
        }
    }
    setDialogState({ type, data });
  };
  
  const handleCloseDialogs = () => {
    setDialogState({ type: null, data: undefined });
  };

  const handleSave = () => {
    forceRefresh();
    handleCloseDialogs();
  };
  
  const handleDelete = async () => {
    if (dialogState.type !== 'delete' || !dialogState.data) return;
    try {
        const token = await getClientSideAuthToken();
        if (!token) throw new Error("Authentication failed.");
        await performAdminAction(token, 'deletePartner', { partnerId: dialogState.data.id });
        toast({ title: 'ISA Deleted' });
        handleSave();
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Delete Failed', description: e.message });
    }
  };
  
  const baseUrl = 'https://studio--ecosystem-hub.us-central1.hosted.app';
  const inviteLink = dialogState.type === 'invite' && dialogState.data
    ? `${baseUrl}/join?email=${encodeURIComponent(dialogState.data.email)}&firstName=${encodeURIComponent(dialogState.data.firstName)}&lastName=${encodeURIComponent(dialogState.data.lastName)}${dialogState.data.phone ? `&phone=${encodeURIComponent(dialogState.data.phone)}` : ''}`
    : '';

  const copyInviteLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    toast({ title: 'Invite Link Copied!' });
  };
  
  const invitationStatusColors: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
    pending: 'secondary',
    invited: 'outline',
    registered: 'default',
  };

  const columns: ColumnDef<any>[] = useMemo(() => [
    { accessorKey: 'firstName', header: 'Name', cell: ({row}) => <div>{row.original.firstName} {row.original.lastName}</div> },
    { accessorKey: 'email', header: 'Email', cell: ({row}) => <div>{row.original.email}</div> },
    { accessorKey: 'phone', header: 'Phone', cell: ({row}) => <div>{row.original.phone}</div> },
    { accessorKey: 'companyName', header: 'Company', cell: ({row}) => <div>{row.original.companyName}</div> },
    { accessorKey: 'status', header: 'Status', cell: ({row}) => <Badge className="capitalize">{row.original.status}</Badge>},
    { accessorKey: 'invitationStatus', header: 'Invite Status', cell: ({row}) => ( <Badge variant={invitationStatusColors[row.original.invitationStatus] || 'secondary'} className="capitalize"> {row.original.invitationStatus?.replace(/_/g, ' ') || 'Pending'} </Badge> ) },
    { id: 'actions', header: <div className="text-right">Actions</div>, cell: ({ row }) => ( <ISAActionMenu onInvite={() => handleOpenDialog('invite', row.original)} onEdit={() => handleOpenDialog('edit', row.original)} onDelete={() => handleOpenDialog('delete', row.original)} /> ) },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  return (
    <>
      <ISADialog 
        open={dialogState.type === 'add' || dialogState.type === 'edit'}
        onOpenChange={(isOpen) => !isOpen && handleCloseDialogs()}
        partner={dialogState.type === 'edit' ? dialogState.data : undefined}
        onSave={handleSave}
      />
      <Dialog open={dialogState.type === 'invite'} onOpenChange={(isOpen) => !isOpen && handleCloseDialogs()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite {dialogState.data?.firstName}</DialogTitle>
            <DialogDescription>Send this unique sign-up link to the ISA. They must use this email to register.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Input value={inviteLink} readOnly />
            <Button onClick={copyInviteLink} className="w-full">
              <Copy className="mr-2 h-4 w-4" /> Copy Link
            </Button>
          </div>
          <DialogFooter><Button onClick={handleCloseDialogs}>Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={dialogState.type === 'delete'} onOpenChange={(isOpen) => !isOpen && handleCloseDialogs()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete ISA "{dialogState.data?.firstName} {dialogState.data?.lastName}".</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseDialogs}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className={buttonVariants({ variant: "destructive" })}>Yes, delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Bot /> ISA Management</CardTitle>
            <CardDescription>Manage your Independent Sales Agents (ISAs).</CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog('add')}><PlusCircle className="mr-2 h-4 w-4"/>Add ISA</Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Company</TableHead><TableHead>Status</TableHead><TableHead>Invite Status</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(partners && partners.length > 0) ? partners.map(partner => (
                    <TableRow key={partner.id}>
                      <TableCell><div>{partner.firstName} {partner.lastName}</div></TableCell>
                      <TableCell><div>{partner.email}</div></TableCell>
                       <TableCell><div>{partner.phone}</div></TableCell>
                      <TableCell><div>{partner.companyName}</div></TableCell>
                      <TableCell><Badge className="capitalize">{partner.status}</Badge></TableCell>
                      <TableCell>
                          <Badge variant={invitationStatusColors[partner.invitationStatus] || 'secondary'} className="capitalize">
                            {partner.invitationStatus?.replace(/_/g, ' ') || 'Pending'}
                          </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <ISAActionMenu
                            onInvite={() => handleOpenDialog('invite', partner)}
                            onEdit={() => handleOpenDialog('edit', partner)}
                            onDelete={() => handleOpenDialog('delete', partner)}
                        />
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={7} className="h-24 text-center">No ISAs found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

    