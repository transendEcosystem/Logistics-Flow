
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
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
import { useState } from 'react';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { useUser, getClientSideAuthToken } from '@/firebase';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const supplierSchema = z.object({
  supplierName: z.string().min(1, 'Supplier name is required'),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Please enter a valid email.').optional().or(z.literal('')),
  itemsPurchased: z.string().min(1, 'Please list items you purchase.'),
  paymentTerms: z.string().optional(),
  memberSince: z.string().optional(),
  hasCreditFacility: z.enum(['yes', 'no', '']),
});

const formSchema = z.object({
  suppliers: z.array(supplierSchema).min(1, 'Please add at least one supplier.'),
});


type SupplierFormValues = z.infer<typeof formSchema>;

export default function SupplierForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useUser();

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      suppliers: [{
        supplierName: '', contactPerson: '', phone: '', email: '',
        itemsPurchased: '', paymentTerms: '', memberSince: '', hasCreditFacility: '',
      }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'suppliers',
  });

  const onSubmit = async (values: SupplierFormValues) => {
    setIsLoading(true);

    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to contribute.' });
      setIsLoading(false);
      return;
    }
    
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error("Authentication token not found.");
      
      const response = await fetch('/api/createContribution', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'supplier', items: values.suppliers }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to submit contribution.');
      }
      
      toast({
        title: 'Submission Received!',
        description: `Thank you for contributing ${values.suppliers.length} supplier(s). Reward points have been added to your account.`,
      });
      
      form.reset({
        suppliers: [{ supplierName: '', contactPerson: '', phone: '', email: '', itemsPurchased: '', paymentTerms: '', memberSince: '', hasCreditFacility: '' }],
      });

    } catch (error: any) {
       toast({
        variant: 'destructive',
        title: 'An unexpected error occurred',
        description: error.message || 'Please try again later.',
      });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
         {fields.map((field, index) => (
            <div key={field.id} className="p-4 border rounded-lg space-y-4 relative">
                <h3 className="font-medium">Supplier #{index + 1}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormField control={form.control} name={`suppliers.${index}.supplierName`} render={({ field }) => (<FormItem><FormLabel>Supplier Name</FormLabel><FormControl><Input placeholder="e.g., Parts Inc." {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name={`suppliers.${index}.contactPerson`} render={({ field }) => (<FormItem><FormLabel>Contact Person (Optional)</FormLabel><FormControl><Input placeholder="e.g., John Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name={`suppliers.${index}.phone`} render={({ field }) => (<FormItem><FormLabel>Phone (Optional)</FormLabel><FormControl><Input placeholder="e.g., 011 123 4567" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name={`suppliers.${index}.email`} render={({ field }) => (<FormItem><FormLabel>Email (Optional)</FormLabel><FormControl><Input placeholder="e.g., sales@partsinc.co.za" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name={`suppliers.${index}.paymentTerms`} render={({ field }) => (<FormItem><FormLabel>Payment Terms (Optional)</FormLabel><FormControl><Input placeholder="e.g., 30 Days from statement" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name={`suppliers.${index}.memberSince`} render={({ field }) => (<FormItem><FormLabel>Using Since (Year, optional)</FormLabel><FormControl><Input placeholder="e.g., 2015" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name={`suppliers.${index}.hasCreditFacility`} render={({ field }) => (<FormItem><FormLabel>Has Credit Facility? (Optional)</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select an option" /></SelectTrigger></FormControl><SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                    <div className="lg:col-span-3">
                        <FormField control={form.control} name={`suppliers.${index}.itemsPurchased`} render={({ field }) => (<FormItem><FormLabel>Items/Services Purchased</FormLabel><FormControl><Textarea placeholder="e.g., Tires, engine oil, brake pads, filters..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                </div>
                 {fields.length > 1 && (
                    <Button variant="destructive" size="icon" className="absolute top-2 right-2" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                 )}
            </div>
         ))}
        
        <div className="flex justify-between items-center">
            <Button type="button" variant="outline" onClick={() => append({ supplierName: '', contactPerson: '', phone: '', email: '', itemsPurchased: '', paymentTerms: '', memberSince: '', hasCreditFacility: '' })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Another Supplier
            </Button>
            <Button type="submit" disabled={isLoading || !user}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Supplier Details
            </Button>
        </div>
      </form>
    </Form>
  );
}
