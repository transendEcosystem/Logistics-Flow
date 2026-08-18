
'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
    if (!response.ok || !result.success) {
        throw new Error(result.error || `API Error for action: ${action}`);
    }
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

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
  });

  useEffect(() => {
    if (open) {
      if (staff) {
        form.reset(staff);
      } else {
        form.reset({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          department: 'Engagement',
          status: 'active',
        });
      }
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
                <DialogDescription>
                    Define internal team members who can be assigned leads and tasks.
                </DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="firstName" render={({ field }) => ( <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="lastName" render={({ field }) => ( <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} type="email"/></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Mobile Number (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="department" render={({ field }) => ( 
                            <FormItem>
                                <FormLabel>Primary Role</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a role..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Engagement">Engagement (Sales)</SelectItem>
                                        <SelectItem value="Technical">Technical (Support)</SelectItem>
                                        <SelectItem value="Finance">Finance</SelectItem>
                                        <SelectItem value="Operations">Operations</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem> 
                        )} />
                        <FormField control={form.control} name="status" render={({ field }) => ( 
                            <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select status..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem> 
                        )} />
                    </div>
                     <DialogFooter className="pt-4">
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />} 
                            Save Team Member
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
  const [error, setError] = useState<string | null>(null);

  const [deptFilter, setDeptFilter] = useState('all');

  const forceRefresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
        const token = await getClientSideAuthToken();
        if (!token) throw new Error("Authentication failed.");
        
        const result = await performAdminAction(token, 'getPlatformStaff', {});
        setStaffList(result.data || []);
    } catch (e: any) {
        setError(e.message);
        toast({ variant: 'destructive', title: 'Error loading team', description: e.message });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    forceRefresh();
  }, [forceRefresh]);

  const filteredStaff = useMemo(() => {
    return staffList.filter(s => {
        return deptFilter === 'all' || s.department === deptFilter;
    });
  }, [staffList, deptFilter]);

  const [dialogState, setDialogState] = useState<{ type: 'add' | 'edit' | 'delete' | null, data?: any }>({ type: null, data: undefined });

  const handleOpenDialog = (type: 'add' | 'edit' | 'delete', data?: any) => {
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
        await performAdminAction(token, 'deletePlatformStaff', { staffId: dialogState.data.id });
        toast({ title: 'Team Member Deleted' });
        handleSave();
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Delete Failed', description: e.message });
    }
  };

  return (
    <>
      <PlatformStaffDialog 
        open={dialogState.type === 'add' || dialogState.type === 'edit'}
        onOpenChange={(isOpen) => !isOpen && handleCloseDialogs()}
        staff={dialogState.type === 'edit' ? dialogState.data : undefined}
        onSave={handleSave}
      />
      <AlertDialog open={dialogState.type === 'delete'} onOpenChange={(isOpen) => !isOpen && handleCloseDialogs()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete team member "{dialogState.data?.firstName} {dialogState.data?.lastName}" from the platform staff registry.</AlertDialogDescription>
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
            <CardTitle className="flex items-center gap-2"><Users /> Platform Staff Registry</CardTitle>
            <CardDescription>Manage internal team members who are responsible for engagement, tech, and operations.</CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog('add')}><PlusCircle className="mr-2 h-4 w-4"/>Add Team Member</Button>
        </CardHeader>
        <CardContent>
            <div className="mb-6 p-4 bg-muted/30 rounded-lg max-w-sm">
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5"><Filter className="h-3 w-3"/> Department Filter</Label>
                    <Select value={deptFilter} onValueChange={setDeptFilter}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Departments</SelectItem>
                            <SelectItem value="Engagement">Engagement</SelectItem>
                            <SelectItem value="Technical">Technical</SelectItem>
                            <SelectItem value="Finance">Finance</SelectItem>
                            <SelectItem value="Operations">Operations</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
          {isLoading ? (
            <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Primary Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(filteredStaff && filteredStaff.length > 0) ? filteredStaff.map(s => (
                    <TableRow key={s.id}>
                      <TableCell><div>{s.firstName} {s.lastName}</div></TableCell>
                      <TableCell><div>{s.email}</div></TableCell>
                      <TableCell><Badge variant="outline">{s.department}</Badge></TableCell>
                      <TableCell><Badge variant={s.status === 'active' ? 'default' : 'secondary'} className="capitalize">{s.status}</Badge></TableCell>
                      <TableCell className="text-right">
                         <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog('edit', s)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog('delete', s)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                         </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center">No platform staff found matching your criteria.</TableCell></TableRow>
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
