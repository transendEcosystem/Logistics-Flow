'use client';

import React, { useState, useEffect } from 'react';
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
import { Loader2, Save, Award } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useConfig } from '@/hooks/use-config';
import { getClientSideAuthToken } from '@/firebase';
import Link from 'next/link';

const formSchema = z.object({
  bronzePoints: z.coerce.number().min(0, "Must be non-negative."),
  silverPoints: z.coerce.number().min(0, "Must be non-negative."),
  goldPoints: z.coerce.number().min(0, "Must be non-negative."),
});

type FormValues = z.infer<typeof formSchema>;

export default function TierBenefits() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  const { data: loyaltySettings, isLoading: isConfigLoading, forceRefresh } = useConfig<any>('loyaltySettings');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bronzePoints: 0,
      silverPoints: 1000,
      goldPoints: 5000,
    },
  });
  
  useEffect(() => {
    if (loyaltySettings) {
      form.reset({
        bronzePoints: loyaltySettings.bronzePoints ?? 0,
        silverPoints: loyaltySettings.silverPoints ?? 1000,
        goldPoints: loyaltySettings.goldPoints ?? 5000,
      });
    }
  }, [loyaltySettings, form]);

  const onSubmit = async (values: FormValues) => {
    setIsSaving(true);
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error("Authentication failed.");

      const response = await fetch('/api/updateConfigDoc', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: 'configuration/loyaltySettings',
          data: { ...loyaltySettings, ...values, updatedAt: { _methodName: 'serverTimestamp' } }
        }),
      });

      if (!response.ok) throw new Error((await response.json()).error || 'Failed to save settings.');

      toast({ title: 'Loyalty Plan Settings Saved!', description: 'Tier thresholds have been updated.' });
      forceRefresh();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
    } finally {
      setIsSaving(false);
    }
  };


  if (isConfigLoading) {
    return <div className="flex justify-center items-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }
  
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Award className="h-6 w-6" />
                    Loyalty Plan Settings
                </CardTitle>
                <CardDescription>
                    Define the point <span className="font-bold">thresholds</span> required to reach each loyalty tier. 
                    To set the benefits for each tier, visit the <Link href="/backend?view=rewards-plan" className="underline text-primary">Rewards Plan</Link> page.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                       <div>
                            <h3 className="text-lg font-semibold">Tier Point Thresholds</h3>
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                                <FormField
                                    control={form.control}
                                    name="bronzePoints"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Bronze</FormLabel>
                                            <FormControl><Input type="number" {...field} disabled /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="silverPoints"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Silver</FormLabel>
                                            <FormControl><Input type="number" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="goldPoints"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Gold</FormLabel>
                                            <FormControl><Input type="number" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                       </div>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Tier Settings
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
