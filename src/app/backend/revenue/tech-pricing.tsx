
'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Loader2, Save, Cpu } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getClientSideAuthToken, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

const formSchema = z.object({
  seoBooster: z.coerce.number().min(0, 'Must be non-negative.'),
  aiImageGenerator: z.coerce.number().min(0, 'Must be non-negative.'),
  imageEnhancer: z.coerce.number().min(0, 'Must be non-negative.'),
  aiVideoGenerator: z.coerce.number().min(0, 'Must be non-negative.'),
  aiFreightMatcher: z.coerce.number().min(0, 'Must be non-negative.'),
  apiAccessPerCall: z.coerce.number().min(0, 'Must be non-negative.'),
  eftTopUpFee: z.coerce.number().min(0, 'Must be non-negative.'),
});

type FormValues = z.infer<typeof formSchema>;

export default function TechPricing() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const firestore = useFirestore();

  const configRef = useMemoFirebase(() => firestore ? doc(firestore, 'configuration', 'techPricing') : null, [firestore]);
  const { data: techPricing, isLoading: isConfigLoading, forceRefresh } = useDoc<FormValues>(configRef);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      seoBooster: 0,
      aiImageGenerator: 0,
      imageEnhancer: 0,
      aiVideoGenerator: 0,
      aiFreightMatcher: 0,
      apiAccessPerCall: 0,
      eftTopUpFee: 0,
    },
  });

  useEffect(() => {
    if (techPricing) {
      form.reset(techPricing);
    }
  }, [techPricing, form]);

  const onSubmit = async (values: FormValues) => {
    setIsSaving(true);
    
    try {
        const token = await getClientSideAuthToken();
        if (!token) throw new Error("Authentication failed.");

        const response = await fetch('/api/updateConfigDoc', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: 'configuration/techPricing', data: { ...values, updatedAt: { _methodName: 'serverTimestamp' } } }),
        });
        
        if (!response.ok) {
            throw new Error((await response.json()).error || 'Failed to save settings.');
        }

      toast({ title: 'Tech Pricing Updated!', description: 'The new SaaS prices have been saved.' });
      forceRefresh();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl">
        <CardHeader>
            <div className="flex items-center gap-4">
                <Cpu className="h-8 w-8 text-primary"/>
                <div>
                    <CardTitle>Tech Component Pricing</CardTitle>
                    <CardDescription>
                        Set pricing for individual technology components and value-added services.
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
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* EFT Fee */}
                        <FormField control={form.control} name="eftTopUpFee" render={({ field }) => (
                            <FormItem>
                                <FormLabel>EFT Top-Up Fee (R)</FormLabel>
                                <FormControl><Input type="number" {...field} step="0.01" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        {/* SEO */}
                        <FormField control={form.control} name="seoBooster" render={({ field }) => (
                            <FormItem>
                                <FormLabel>AI SEO Booster (R/mo)</FormLabel>
                                <FormControl><Input type="number" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        {/* Image */}
                        <FormField control={form.control} name="aiImageGenerator" render={({ field }) => (
                            <FormItem>
                                <FormLabel>AI Designer (R/image)</FormLabel>
                                <FormControl><Input type="number" {...field} step="0.50" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="imageEnhancer" render={({ field }) => (
                            <FormItem>
                                <FormLabel>AI Image Enhancer (R/image)</FormLabel>
                                <FormControl><Input type="number" {...field} step="0.25" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        {/* Video */}
                        <FormField control={form.control} name="aiVideoGenerator" render={({ field }) => (
                            <FormItem>
                                <FormLabel>AI Video Ads (R/video)</FormLabel>
                                <FormControl><Input type="number" {...field} step="1.00" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        {/* Data */}
                        <FormField control={form.control} name="aiFreightMatcher" render={({ field }) => (
                            <FormItem>
                                <FormLabel>AI Freight Matcher (R/mo)</FormLabel>
                                <FormControl><Input type="number" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="apiAccessPerCall" render={({ field }) => (
                            <FormItem>
                                <FormLabel>API Access (R/call)</FormLabel>
                                <FormControl><Input type="number" {...field} step="0.01" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                    
                    <div className="border-t pt-6">
                        <Button type="submit" disabled={isSaving} className="mt-4">
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save All Tech Prices
                        </Button>
                    </div>
                </form>
                </Form>
            )}
        </CardContent>
    </Card>
  );
}
