
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
import { getClientSideAuthToken } from '@/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const memberFormSchema = z.object({
  companyName: z.string().min(1, 'Company name is required.'),
  status: z.enum(['pending', 'active', 'suspended']),
});

type MemberFormValues = z.infer<typeof memberFormSchema>;

interface EditMemberDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  member: any;
  onUpdate: () => void;
}

export function EditMemberDialog({ isOpen, setIsOpen, member, onUpdate }: EditMemberDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberFormSchema),
  });
  
  useEffect(() => {
    if (member && isOpen) {
        form.reset({
            companyName: member.companyName || '',
            status: member.status || 'pending',
        });
    }
  }, [member, isOpen, form]);

  const onSubmit = async (values: MemberFormValues) => {
    setIsLoading(true);

    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error("Authentication failed.");
      
      const dataToUpdate = {
        ...values,
        updatedAt: { _methodName: 'serverTimestamp' }
      };

      const response = await fetch('/api/updateUserDoc', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: `companies/${member.id}`,
          data: dataToUpdate
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update member details.');
      }

      toast({
        title: 'Member Updated',
        description: `${values.companyName}'s profile has been updated.`,
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Member Management</DialogTitle>
          <DialogDescription>
            Update core profile and status for {member?.companyName}. Plan upgrades must be initiated by the member.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Account Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="active">Member (Active)</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="pending">Provisional/Pending</SelectItem>
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
            
            <div className="p-3 bg-muted rounded-md text-xs text-muted-foreground">
                Current Plan: <span className="font-bold text-foreground capitalize">{member?.membershipId || 'Free'}</span>
                <p className="mt-1">Membership tiers can only be changed by the member in their account settings.</p>
            </div>

            <DialogFooter className="pt-4">
              <Button type="submit" disabled={isLoading} className="w-full">
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
