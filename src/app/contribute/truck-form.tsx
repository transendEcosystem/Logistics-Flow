
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

const truckSchema = z.object({
  make: z.string().min(1, 'Vehicle make is required'),
  model: z.string().min(1, 'Model/Series is required'),
  year: z.string().min(4, 'Enter a valid year').max(4, 'Enter a valid year'),
  vin: z.string().min(1, 'VIN is required'),
  engineNumber: z.string().min(1, 'Engine number is required'),
  tare: z.string().min(1, 'Tare weight is required'),
  gvm: z.string().min(1, 'GVM is required'),
  registerNumber: z.string().min(1, 'Register number is required'),
  titleholder: z.string().min(1, 'Titleholder is required'),
  owner: z.string().min(1, 'Owner is required'),
  firstRegistrationDate: z.string().min(1, 'Date of first registration is required'),
  classification: z.string().min(1, 'Classification is required'),
});

const formSchema = z.object({
  trucks: z.array(truckSchema).min(1, 'Please add at least one truck.'),
});


type TruckFormValues = z.infer<typeof formSchema>;

export default function TruckForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useUser();

  const form = useForm<TruckFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      trucks: [{
        make: '', model: '', year: '', vin: '', engineNumber: '', tare: '', gvm: '',
        registerNumber: '', titleholder: '', owner: '', firstRegistrationDate: '', classification: '',
      }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'trucks',
  });

  const onSubmit = async (values: TruckFormValues) => {
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
        body: JSON.stringify({ type: 'truck', items: values.trucks }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to submit contribution.');
      }
      
      toast({
        title: 'Submission Received!',
        description: `Thank you for contributing ${values.trucks.length} truck(s). Reward points have been added to your account.`,
      });
      
      form.reset({
        trucks: [{ make: '', model: '', year: '', vin: '', engineNumber: '', tare: '', gvm: '', registerNumber: '', titleholder: '', owner: '', firstRegistrationDate: '', classification: '' }],
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
             <h3 className="font-medium">Truck #{index + 1}</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField control={form.control} name={`trucks.${index}.make`} render={({ field }) => (<FormItem><FormLabel>Vehicle Make</FormLabel><FormControl><Input placeholder="e.g., Scania" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name={`trucks.${index}.model`} render={({ field }) => (<FormItem><FormLabel>Model / Series</FormLabel><FormControl><Input placeholder="e.g., R 560" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name={`trucks.${index}.year`} render={({ field }) => (<FormItem><FormLabel>Year of Manufacture</FormLabel><FormControl><Input placeholder="e.g., 2018" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name={`trucks.${index}.vin`} render={({ field }) => (<FormItem><FormLabel>Vehicle Identification Number (VIN)</FormLabel><FormControl><Input placeholder="Vehicle VIN" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name={`trucks.${index}.engineNumber`} render={({ field }) => (<FormItem><FormLabel>Engine Number</FormLabel><FormControl><Input placeholder="Engine Number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name={`trucks.${index}.tare`} render={({ field }) => (<FormItem><FormLabel>Tare (kg)</FormLabel><FormControl><Input placeholder="e.g., 9000" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name={`trucks.${index}.gvm`} render={({ field }) => (<FormItem><FormLabel>Gross Vehicle Mass (GVM - kg)</FormLabel><FormControl><Input placeholder="e.g., 26000" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name={`trucks.${index}.registerNumber`} render={({ field }) => (<FormItem><FormLabel>Register #</FormLabel><FormControl><Input placeholder="Register Number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name={`trucks.${index}.titleholder`} render={({ field }) => (<FormItem><FormLabel>Titleholder</FormLabel><FormControl><Input placeholder="Titleholder" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name={`trucks.${index}.owner`} render={({ field }) => (<FormItem><FormLabel>Owner</FormLabel><FormControl><Input placeholder="Owner" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name={`trucks.${index}.firstRegistrationDate`} render={({ field }) => (<FormItem><FormLabel>Date of First Registration</FormLabel><FormControl><Input placeholder="YYYY-MM-DD" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name={`trucks.${index}.classification`} render={({ field }) => (<FormItem><FormLabel>Classification</FormLabel><FormControl><Input placeholder="e.g., Goods Vehicle" {...field} /></FormControl><FormMessage /></FormItem>)} />
             </div>
             {fields.length > 1 && (
                <Button variant="destructive" size="icon" className="absolute top-2 right-2" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
             )}
          </div>
        ))}
        
        <div className="flex justify-between items-center">
            <Button type="button" variant="outline" onClick={() => append({ make: '', model: '', year: '', vin: '', engineNumber: '', tare: '', gvm: '', registerNumber: '', titleholder: '', owner: '', firstRegistrationDate: '', classification: '' })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Another Truck
            </Button>
            <Button type="submit" disabled={isLoading || !user}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Truck Details
            </Button>
        </div>
      </form>
    </Form>
  );
}
