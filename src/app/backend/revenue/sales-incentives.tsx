
'use client';

import { useState, useEffect } from 'react';
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
import { Loader2, Save, TrendingUp, Users, Handshake, Trash2, PlusCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFirestore, useDoc, getClientSideAuthToken, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Separator } from '@/components/ui/separator';
import { useConfig } from '@/hooks/use-config';
import { Label } from '@/components/ui/label';

const tierSchema = z.object({
  threshold: z.coerce.number().min(1, "Threshold must be at least 1"),
  bonus: z.coerce.number().min(0, "Bonus must be non-negative"),
});

const formSchema = z.object({
  partnerBaseCommission: z.coerce.number().min(0).max(100),
  partnerOverrideCommission: z.coerce.number().min(0).max(100),
  partnerTiers: z.array(tierSchema),
  networkBaseCommission: z.coerce.number().min(0).max(100),
  networkTiers: z.array(tierSchema),
});

type FormValues = z.infer<typeof formSchema>;

export default function SalesIncentives() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const { data: configData, isLoading: isConfigLoading, forceRefresh } = useConfig<FormValues>('salesIncentives');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      partnerBaseCommission: 27,
      partnerOverrideCommission: 5,
      partnerTiers: [
        { threshold: 10, bonus: 1 },
        { threshold: 20, bonus: 2 },
        { threshold: 30, bonus: 3 },
      ],
      networkBaseCommission: 10,
      networkTiers: [
        { threshold: 5, bonus: 1 },
        { threshold: 10, bonus: 2.5 },
      ],
    },
  });

  const { fields: partnerTiers, append: appendPartner, remove: removePartner } = useFieldArray({ control: form.control, name: "partnerTiers" });
  const { fields: networkTiers, append: appendNetwork, remove: removeNetwork } = useFieldArray({ control: form.control, name: "networkTiers" });


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
            body: JSON.stringify({ path: 'configuration/salesIncentives', data: { ...values, updatedAt: { _methodName: 'serverTimestamp' } } }),
        });

        if (!response.ok) throw new Error((await response.json()).error || 'Failed to save settings.');

      toast({ title: 'Sales Incentives Saved!', description: 'The performance bonus structure has been updated.' });
      forceRefresh();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const renderTierFields = (fields: any, removeFn: (index: number) => void, namePrefix: 'partnerTiers' | 'networkTiers') => (
    <div className="space-y-2">
        {fields.map((field: any, index: number) => (
            <div key={field.id} className="flex items-end gap-2">
                <FormField control={form.control} name={`${namePrefix}.${index}.threshold`} render={({ field }) => (
                    <FormItem className="flex-1"><FormLabel>If &gt; X Members/Mo</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name={`${namePrefix}.${index}.bonus`} render={({ field }) => (
                    <FormItem className="flex-1"><FormLabel>Bonus %</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeFn(index)}><Trash2 className="h-4 w-4" /></Button>
            </div>
        ))}
    </div>
  );

  return (
    <Card className="w-full max-w-4xl">
        <CardHeader>
            <div className="flex items-center gap-4">
                <TrendingUp className="h-8 w-8 text-primary"/>
                <div>
                    <CardTitle>Sales Incentive Structure</CardTitle>
                    <CardDescription>
                        Define the base commissions and performance bonus tiers for both ISA Partners and standard Network Members.
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
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* ISA Partner Settings */}
                        <div className="space-y-6">
                            <h3 className="text-xl font-semibold flex items-center gap-2"><Handshake /> ISA Partner Commissions</h3>
                            <FormField control={form.control} name="partnerBaseCommission" render={({ field }) => (<FormItem><FormLabel>Base Membership Commission (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="partnerOverrideCommission" render={({ field }) => (<FormItem><FormLabel>Network Roll-up/Override Commission (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            
                            <div>
                                <Label className="font-semibold">Performance Bonus Tiers</Label>
                                {renderTierFields(partnerTiers, removePartner, 'partnerTiers')}
                                <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => appendPartner({ threshold: 0, bonus: 0 })}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Partner Tier
                                </Button>
                            </div>
                        </div>

                        {/* Network Member Settings */}
                        <div className="space-y-6">
                             <h3 className="text-xl font-semibold flex items-center gap-2"><Users /> Network Member Commissions</h3>
                            <FormField control={form.control} name="networkBaseCommission" render={({ field }) => (<FormItem><FormLabel>Base Membership Commission (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <div>
                                <Label className="font-semibold">Performance Bonus Tiers</Label>
                                {renderTierFields(networkTiers, removeNetwork, 'networkTiers')}
                                <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => appendNetwork({ threshold: 0, bonus: 0 })}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Network Tier
                                </Button>
                            </div>
                        </div>
                    </div>
                    
                    <Separator />

                    <Button type="submit" disabled={isSaving} className="mt-4">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Incentive Structure
                    </Button>
                </form>
                </Form>
            )}
        </CardContent>
    </Card>
  );
}
