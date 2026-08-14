
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
import { Loader2, Save, Store, FileText, Heart, LifeBuoy, Gift } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';

const productSchema = z.object({
  monthlyPrice: z.coerce.number().min(0, 'Must be non-negative'),
  annualDiscount: z.coerce.number().min(0).max(100, 'Must be 0-100'),
  commissionRate: z.coerce.number().min(0).max(100, 'Must be 0-100'),
});

const formSchema = z.object({
  rafAssist: productSchema,
  olRoadside: productSchema,
  olFuneral: productSchema,
  mahalaHub: productSchema,
});

type FormValues = z.infer<typeof formSchema>;

const productDetails = [
    { id: 'rafAssist', name: 'RAF Assist', icon: FileText },
    { id: 'olRoadside', name: 'OL Roadside Assist', icon: LifeBuoy },
    { id: 'olFuneral', name: 'OL Funeral', icon: Heart },
    { id: 'mahalaHub', name: 'Mahala Hub', icon: Gift },
] as const;


export default function MarketplaceFees() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isLoading, setIsLoading] = useState(false);

  const configRef = useMemoFirebase(() => firestore ? doc(firestore, 'configuration', 'marketplaceFees') : null, [firestore]);
  const { data: feeConfig, isLoading: isConfigLoading } = useDoc<FormValues>(configRef);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rafAssist: { monthlyPrice: 0, annualDiscount: 0, commissionRate: 0 },
      olRoadside: { monthlyPrice: 0, annualDiscount: 0, commissionRate: 0 },
      olFuneral: { monthlyPrice: 0, annualDiscount: 0, commissionRate: 0 },
      mahalaHub: { monthlyPrice: 0, annualDiscount: 0, commissionRate: 0 },
    },
  });

  useEffect(() => {
    if (feeConfig) {
      form.reset(feeConfig);
    }
  }, [feeConfig, form]);

  const onSubmit = async (values: FormValues) => {
    if (!configRef) return;
    setIsLoading(true);
    
    try {
      await setDoc(configRef, { ...values, updatedAt: serverTimestamp() }, { merge: true });
      toast({ title: 'Marketplace Fees Updated!', description: 'The product pricing and commissions have been saved.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl">
        <CardHeader>
            <div className="flex items-center gap-4">
                <Store className="h-8 w-8 text-primary"/>
                <div>
                    <CardTitle>Marketplace Product Pricing</CardTitle>
                    <CardDescription>
                        Set the pricing and commission for key marketplace products like RAF Assist and Open Loyalty plans.
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
                    {productDetails.map(({ id, name, icon: Icon }) => (
                       <div key={id}>
                            <div className="flex items-center gap-3 mb-4">
                               <Icon className="h-6 w-6 text-muted-foreground" />
                               <h3 className="text-xl font-semibold">{name}</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-9">
                                <FormField
                                    control={form.control}
                                    name={`${id}.monthlyPrice`}
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Monthly Price (R)</FormLabel>
                                        <FormControl><Input type="number" {...field} /></FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`${id}.annualDiscount`}
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Annual Discount (%)</FormLabel>
                                        <FormControl><Input type="number" {...field} /></FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`${id}.commissionRate`}
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Commission Rate (%)</FormLabel>
                                        <FormControl><Input type="number" {...field} /></FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                       </div>
                    ))}
                    <Separator />
                    <Button type="submit" disabled={isLoading} className="mt-4">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save All Marketplace Fees
                    </Button>
                </form>
                </Form>
            )}
        </CardContent>
    </Card>
  );
}
