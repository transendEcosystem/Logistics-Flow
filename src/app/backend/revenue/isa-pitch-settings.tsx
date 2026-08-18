
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import { Loader2, Save, Handshake, Percent } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFirestore, useDoc, getClientSideAuthToken, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useConfig } from '@/hooks/use-config';

const formSchema = z.object({
  membershipCommission: z.coerce.number().min(0, "Must be >= 0").max(100, "Must be <= 100"),
  financeMallCommission: z.coerce.number().min(0, "Must be >= 0").max(100, "Must be <= 100"),
  supplierMallCommission: z.coerce.number().min(0, "Must be >= 0").max(100, "Must be <= 100"),
  buySellMallCommission: z.coerce.number().min(0, "Must be >= 0").max(100, "Must be <= 100"),
  marketplaceCommission: z.coerce.number().min(0, "Must be >= 0").max(100, "Must be <= 100"),
});

type FormValues = z.infer<typeof formSchema>;

export default function ISAPitchSettings() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const { data: configData, isLoading: isConfigLoading, forceRefresh } = useConfig<FormValues>('isaPitch');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      membershipCommission: 30,
      financeMallCommission: 20,
      supplierMallCommission: 20,
      buySellMallCommission: 20,
      marketplaceCommission: 50,
    },
  });

  useEffect(() => {
    if (configData) {
      form.reset(configData);
    }
  }, [configData, form]);

  const onSubmit = async (values: FormValues) => {
    setIsSaving(true);
    
    try {
        const token = await getClientSideAuthToken();
        if (!token) throw new Error("Authentication failed.");

        const response = await fetch('/api/updateConfigDoc', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: 'configuration/isaPitch', data: { ...values, updatedAt: { _methodName: 'serverTimestamp' } } }),
        });

        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Failed to save ISA settings.');
        }

      toast({ title: 'ISA Commission Settings Saved!', description: 'The commission splits have been updated.' });
      forceRefresh();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
        <CardHeader>
            <div className="flex items-center gap-4">
                <Handshake className="h-8 w-8 text-primary"/>
                <div>
                    <CardTitle>ISA Commission Settings</CardTitle>
                    <CardDescription>
                        Set the percentage of platform revenue that Independent Sales Agents (ISAs) will earn from different sources.
                    </CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            {isConfigLoading ? (
                 <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-muted-foreground flex items-center gap-2 mb-2"><Percent className="h-5 w-5"/>Commission Splits (%)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField control={form.control} name="membershipCommission" render={({ field }) => (<FormItem><FormLabel>Membership Fee Commission</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="financeMallCommission" render={({ field }) => (<FormItem><FormLabel>Finance Mall Commission</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="supplierMallCommission" render={({ field }) => (<FormItem><FormLabel>Supplier Mall Commission</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="buySellMallCommission" render={({ field }) => (<FormItem><FormLabel>Buy & Sell Mall Commission</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="marketplaceCommission" render={({ field }) => (<FormItem><FormLabel>Marketplace Products Commission</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                    </div>
                    <Button type="submit" disabled={isSaving} className="mt-4">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save ISA Settings
                    </Button>
                </form>
                </Form>
            )}
        </CardContent>
    </Card>
  );
}
