'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button, buttonVariants } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getClientSideAuthToken } from '@/firebase';
import { Loader2, PlusCircle, Users, Edit, Trash2, Save, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';

async function performAdminAction(token: string, action: string, payload: any) {
    const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || `API Error for action: ${action}`);
    return result;
}

const staffSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  department: z.enum(['Engagement', 'Technical', 'Finance', 'Operations']),
  status: z.enum(['active', 'inactive']),
});

type StaffFormValues = z.infer<typeof staffSchema>;

function PlatformStaffDialog({ open, onOpenChange, staff, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; staff?: any; onSave: () => void; }) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const form = useForm<StaffFormValues>({ resolver: zodResolver(staffSchema) });

  useEffect(() => {
    if (open) {
      if (staff) form.reset(staff);
      else form.reset({ firstName: '', lastName: '', email: '', phone: '', department: 'Engagement', status: 'active' });
    }
  }, [open, staff, form]);

  const onSubmit = async (values: StaffFormValues) => {
    setIsLoading(true);
    try {
        const token = await getClientSideAuthToken();
        if (!token) throw new Error("Authentication failed.");
        await performAdminAction(token, 'savePlatformStaff', { staff: { id: staff?.id, ...values } });
        toast({ title: staff ? 'Team Member Updated' : 'Team Member Added' });
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
                <DialogTitle>{staff ? 'Edit' : 'Add New'} Platform Staff</DialogTitle>
                <DialogDescription>Define internal team members responsible for oversight.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="firstName" render={({ field }) => ( <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="lastName" render={({ field }) => ( <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                    <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} type="email"/></FormControl><FormMessage /></FormItem> )} />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="department" render={({ field }) => ( 
                            <FormItem>
                                <FormLabel>Department</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Engagement">Engagement</SelectItem>
                                        <SelectItem value="Technical">Technical</SelectItem>
                                        <SelectItem value="Finance">Finance</SelectItem>
                                        <SelectItem value="Operations">Operations</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormItem> 
                        )} />
                         <FormField control={form.control} name="status" render={({ field }) => ( 
                            <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                                </Select>
                            </FormItem> 
                        )} />
                    </div>
                     <DialogFooter className="pt-4">
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />} Save
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    </Dialog>
  );
}

export default function PlatformStaffManagement() {
  const { toast } = useToast();
  const [staffList, setStaffList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogState, setDialogState] = useState<{ type: 'add' | 'edit' | 'delete' | null, data?: any }>({ type: null });

  const forceRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
        const token = await getClientSideAuthToken();
        if (!token) return;
        const result = await performAdminAction(token, 'getPlatformStaff', {});
        setStaffList(result.data || []);
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);
  
  useEffect(() => { forceRefresh(); }, [forceRefresh]);

  const handleDelete = async () => {
    if (!dialogState.data) return;
    try {
        const token = await getClientSideAuthToken();
        if (!token) return;
        await performAdminAction(token, 'deletePlatformStaff', { staffId: dialogState.data.id });
        toast({ title: 'Deleted' });
        forceRefresh();
        setDialogState({ type: null });
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Delete Failed', description: e.message });
    }
  };

  return (
    <>
      <PlatformStaffDialog open={dialogState.type === 'add' || dialogState.type === 'edit'} onOpenChange={(o) => !o && setDialogState({ type: null })} staff={dialogState.type === 'edit' ? dialogState.data : undefined} onSave={forceRefresh} />
      <AlertDialog open={dialogState.type === 'delete'} onOpenChange={(o) => !o && setDialogState({ type: null })}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>Delete "{dialogState.data?.firstName}"?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel onClick={() => setDialogState({ type: null })}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className={buttonVariants({ variant: "destructive" })}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle><Users /> Platform Staff</CardTitle></div>
          <Button onClick={() => setDialogState({ type: 'add' })}><PlusCircle className="mr-2 h-4 w-4"/>Add Member</Button>
        </CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center items-center py-10"><Loader2 className="animate-spin mx-auto h-8 w-8 text-primary" /></div> : (
            <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Department</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {staffList.map(s => (
                    <TableRow key={s.id}>
                      <TableCell>{s.firstName} {s.lastName}</TableCell>
                      <TableCell>{s.email}</TableCell>
                      <TableCell><Badge variant="outline">{s.department}</Badge></TableCell>
                      <TableCell className="text-right">
                         <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setDialogState({ type: 'edit', data: s })}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => setDialogState({ type: 'delete', data: s })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                         </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
