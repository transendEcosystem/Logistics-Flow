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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Zap, DollarSign, ShieldAlert, Layers, Info, Smartphone, ImageIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getClientSideAuthToken, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';

const formSchema = z.object({
  instanceBatchSize: z.coerce.number().min(1, 'Batch size must be at least 1'),
  pricePerBatch: z.coerce.number().min(1, 'Price must be at least R1'),
  flyerMultiplier: z.coerce.number().min(1, 'Multiplier must be at least 1x'),
  billboardMultiplier: z.coerce.number().min(1, 'Multiplier must be at least 1x'),
  isEngineActive: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

export default function AdPricingSettings() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const firestore = useFirestore();

  const configRef = useMemoFirebase(() => firestore ? doc(firestore, 'configuration', 'adPricing') : null, [firestore]);
  const { data: adPricing, isLoading: isConfigLoading, forceRefresh } = useDoc<FormValues>(configRef);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      instanceBatchSize: 1000,
      pricePerBatch: 100,
      flyerMultiplier: 2.5,
      billboardMultiplier: 1.5,
      isEngineActive: true,
    },
  });

  useEffect(() => {
    if (adPricing) {
      form.reset(adPricing);
    }
  }, [adPricing, form]);

  const onSubmit = async (values: FormValues) => {
    setIsSaving(true);
    try {
        const token = await getClientSideAuthToken();
        if (!token) throw new Error("Authentication failed.");

        const response = await fetch('/api/updateConfigDoc', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: 'configuration/adPricing', data: { ...values, updatedAt: { _methodName: 'serverTimestamp' } } }),
        });
        
        if (!response.ok) {
            throw new Error((await response.json()).error || 'Failed to save settings.');
        }

      toast({ title: 'Ad Pricing Updated!', description: 'Visual and Intelligence pricing is now live.' });
      forceRefresh();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl text-left border-primary/20 bg-primary/5 shadow-xl">
        <CardHeader className="bg-white rounded-t-lg border-b p-8 text-left text-foreground text-foreground">
            <div className="flex items-center gap-4 text-left">
                <div className="bg-primary/10 p-3 rounded-xl">
                    <Zap className="h-8 w-8 text-primary"/>
                </div>
                <div className="text-left text-foreground">
                    <CardTitle className="text-xl font-black uppercase tracking-tight text-left">Visibility Economics</CardTitle>
                    <CardDescription className="text-left">
                        Define pricing for Intelligence Boosts and Visual Broadcasts.
                    </CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent className="p-8 space-y-8 text-left text-foreground text-foreground">
            {isConfigLoading ? (
                 <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10 text-left text-foreground">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left text-foreground text-foreground">
                        <FormField control={form.control} name="instanceBatchSize" render={({ field }) => (
                            <FormItem className="text-left text-foreground">
                                <FormLabel className="flex items-center gap-2 font-bold"><Layers className="h-4 w-4 text-primary"/> Base Batch Size</FormLabel>
                                <FormControl><Input type="number" {...field} className="h-12 border-2 bg-white text-lg font-black" /></FormControl>
                                <FormDescription className="text-[10px] uppercase font-bold text-muted-foreground text-left">Impressions per standard batch.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="pricePerBatch" render={({ field }) => (
                            <FormItem className="text-left text-foreground">
                                <FormLabel className="flex items-center gap-2 font-bold"><DollarSign className="h-4 w-4 text-primary"/> Price per Batch (R)</FormLabel>
                                <FormControl><Input type="number" {...field} className="h-12 border-2 bg-white text-lg font-black" /></FormControl>
                                <FormDescription className="text-[10px] uppercase font-bold text-muted-foreground text-left">Standard debit amount per batch.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>

                    <Separator />

                    <div className="space-y-4 text-left text-foreground">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1 text-left text-foreground">Visual Format Multipliers</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left text-foreground">
                            <FormField control={form.control} name="billboardMultiplier" render={({ field }) => (
                                <FormItem className="p-4 bg-white border-2 rounded-xl text-left text-foreground">
                                    <FormLabel className="flex items-center gap-2 font-bold text-foreground"><ImageIcon className="h-4 w-4 text-muted-foreground" /> Billboard Multiplier</FormLabel>
                                    <FormControl><Input type="number" step="0.1" {...field} className="h-10 border-none bg-slate-50 text-xl font-black" /></FormControl>
                                    <FormDescription className="text-[9px] italic">Premium markup for dashboard/mall banners.</FormDescription>
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="flyerMultiplier" render={({ field }) => (
                                <FormItem className="p-4 bg-white border-2 rounded-xl text-left text-foreground">
                                    <FormLabel className="flex items-center gap-2 font-bold text-foreground"><Smartphone className="h-4 w-4 text-muted-foreground" /> Flyer Multiplier</FormLabel>
                                    <FormControl><Input type="number" step="0.1" {...field} className="h-10 border-none bg-slate-50 text-xl font-black" /></FormControl>
                                    <FormDescription className="text-[9px] italic">Premium markup for login pop-ups.</FormDescription>
                                </FormItem>
                            )} />
                        </div>
                    </div>

                    <FormField control={form.control} name="isEngineActive" render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-6 bg-white border-2 border-dashed rounded-2xl text-left text-foreground">
                            <div className="space-y-1 text-left">
                                <FormLabel className="text-sm font-black flex items-center gap-2 uppercase tracking-tight text-foreground">
                                    <ShieldAlert className="h-5 w-5 text-primary" />
                                    Global Inventory Switch
                                </FormLabel>
                                <FormDescription className="text-xs text-muted-foreground text-left">Toggle to instantly stop or start all ad rendering.</FormDescription>
                            </div>
                            <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-primary" />
                            </FormControl>
                        </FormItem>
                    )} />
                    
                    <div className="flex justify-end pt-4 text-left">
                        <Button type="submit" disabled={isSaving} className="h-14 px-12 font-black uppercase tracking-widest shadow-2xl text-white">
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Publish Visibility Pricing
                        </Button>
                    </div>
                </form>
                </Form>
            )}
        </CardContent>
    </Card>
  );
}
