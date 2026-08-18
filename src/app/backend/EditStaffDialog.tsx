
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getClientSideAuthToken } from '@/firebase';
import { usePermissions } from '@/hooks/use-permissions';

const staffFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address').optional(),
  title: z.string().min(1, 'Title is required'),
  role: z.string().min(1, 'Role is required'),
  function: z.string().min(1, 'Function is required'),
  jobDescription: z.string().optional(),
});

type StaffFormValues = z.infer<typeof staffFormSchema>;

interface EditStaffDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  staffMember: any;
  onUpdate: () => void;
}

export function EditStaffDialog({ isOpen, setIsOpen, staffMember, onUpdate }: EditStaffDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { can, isLoading: permissionsLoading } = usePermissions();

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: staffMember, 
  });
  
  useEffect(() => {
    if (staffMember && isOpen) {
        form.reset(staffMember);
    }
  }, [staffMember, form, isOpen]);

  const onSubmit = async (values: StaffFormValues) => {
    setIsLoading(true);

    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error("Authentication failed.");
      
      const response = await fetch('/api/updateUserDoc', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: `companies/${staffMember.companyId}/staff/${staffMember.id}`,
          data: { ...values, updatedAt: { _methodName: 'serverTimestamp' } }
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update staff member.');
      }

      toast({
        title: 'Staff Member Updated',
        description: `${values.firstName} ${values.lastName}'s details have been saved.`,
      });

      onUpdate();
      setIsOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // In the admin context, the admin can always edit.
  const canEditStaff = can('edit', 'staff');

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Edit Staff Member</DialogTitle>
          <DialogDescription>
            Update the details for {staffMember?.firstName} {staffMember?.lastName}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <fieldset disabled={!canEditStaff || permissionsLoading} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                </div>
                <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Email (Cannot be changed)</FormLabel>
                    <FormControl><Input {...field} disabled /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Title</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select a title" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="Executive Director">Executive Director</SelectItem>
                            <SelectItem value="Non-Executive Director">Non-Executive Director</SelectItem>
                            <SelectItem value="Manager">Manager</SelectItem>
                            <SelectItem value="Admin">Admin</SelectItem>
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="operations">Operations</SelectItem>
                            <SelectItem value="marketing">Marketing</SelectItem>
                            <SelectItem value="IT">IT</SelectItem>
                            <SelectItem value="logistics">Logistics</SelectItem>
                            <SelectItem value="store">Store</SelectItem>
                            <SelectItem value="sales">Sales</SelectItem>
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="function"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Function</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select a function" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="Set Policy">Set Policy</SelectItem>
                            <SelectItem value="Manage Staff">Manage Staff</SelectItem>
                            <SelectItem value="Set Budgets">Set Budgets</SelectItem>
                            <SelectItem value="Ensure Implementation">Ensure Implementation</SelectItem>
                            <SelectItem value="Monitor Deliverables">Monitor Deliverables</SelectItem>
                            <SelectItem value="Ensure Compliance">Ensure Compliance</SelectItem>
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                </div>
                <FormField
                control={form.control}
                name="jobDescription"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Job Description (Optional)</FormLabel>
                    <FormControl>
                        <Textarea placeholder="Describe responsibilities..." {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </fieldset>
            <DialogFooter>
              <Button type="submit" disabled={isLoading || !canEditStaff || permissionsLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
