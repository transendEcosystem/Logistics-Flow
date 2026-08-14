
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
import { Loader2, Save, HandCoins } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFirestore, useDoc, getClientSideAuthToken, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

const formSchema = z.object({
  loyaltyPlanPrice: z.coerce.number().min(0, 'Price must be non-negative.'),
  rewardsPlanPrice: z.coerce.number().min(0, 'Price must be non-negative.'),
  actionsPlanPrice: z.coerce.number().min(0, 'Price must be non-negative.'),
});

type FormValues = z.infer<typeof formSchema>;

export default function ConnectPlanPricing() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);

  const configRef = useMemoFirebase(() => firestore ? doc(firestore, 'configuration', 'connectPlans') : null, [firestore]);
  const { data: connectPlanConfig, isLoading: isConfigLoading, forceRefresh } = useDoc<FormValues>(configRef);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      loyaltyPlanPrice: 50,
      rewardsPlanPrice: 50,
      actionsPlanPrice: 50,
    },
  });

  useEffect(() => {
    if (connectPlanConfig) {
      form.reset(connectPlanConfig);
    }
  }, [connectPlanConfig, form]);

  const onSubmit = async (values: FormValues) => {
    if (!configRef) return;
    setIsSaving(true);
    
    try {
        const token = await getClientSideAuthToken();
        if (!token) throw new Error("Authentication failed.");

        const response = await fetch('/api/updateConfigDoc', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: configRef.path, data: { ...values, updatedAt: { _methodName: 'serverTimestamp' } } }),
        });

        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Failed to save plan prices.');
        }

      toast({ title: 'Connect Plan Prices Updated!', description: 'The new prices have been saved.' });
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
                <HandCoins className="h-8 w-8 text-primary"/>
                <div>
                    <CardTitle>Connect Plan Pricing</CardTitle>
                    <CardDescription>
                        Set the monthly price for the optional Loyalty, Rewards, and Actions plans.
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
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                            control={form.control}
                            name="loyaltyPlanPrice"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Loyalty Plan Price (R)</FormLabel>
                                <FormControl><Input type="number" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="rewardsPlanPrice"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Rewards Plan Price (R)</FormLabel>
                                <FormControl><Input type="number" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="actionsPlanPrice"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Actions Plan Price (R)</FormLabel>
                                <FormControl><Input type="number" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <Button type="submit" disabled={isSaving} className="mt-4">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Prices
                    </Button>
                </form>
                </Form>
            )}
        </CardContent>
    </Card>
  );
}
