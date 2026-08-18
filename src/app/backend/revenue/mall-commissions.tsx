
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
import { Loader2, Save, ShoppingBasket } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const formSchema = z.object({
  financeMall: z.coerce.number().min(0).max(100, 'Must be between 0 and 100'),
  supplierMall: z.coerce.number().min(0).max(100, 'Must be between 0 and 100'),
  transporterMall: z.coerce.number().min(0).max(100, 'Must be between 0 and 100'),
  buySellMall: z.coerce.number().min(0).max(100, 'Must be between 0 and 100'),
  warehouseMall: z.coerce.number().min(0).max(100, 'Must be between 0 and 100'),
  repurposeMall: z.coerce.number().min(0).max(100, 'Must be between 0 and 100'),
  loadsMall: z.coerce.number().min(0).max(100, 'Must be between 0 and 100'),
  distributionMall: z.coerce.number().min(0).max(100, 'Must be between 0 and 100'),
});

type FormValues = z.infer<typeof formSchema>;

export default function MallCommissions() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isLoading, setIsLoading] = useState(false);

  const configRef = useMemoFirebase(() => firestore ? doc(firestore, 'configuration', 'mallCommissions') : null, [firestore]);
  const { data: commissionConfig, isLoading: isConfigLoading } = useDoc<FormValues>(configRef);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      financeMall: 0,
      supplierMall: 0,
      transporterMall: 0,
      buySellMall: 0,
      warehouseMall: 0,
      repurposeMall: 0,
      loadsMall: 0,
      distributionMall: 0,
    },
  });

  useEffect(() => {
    if (commissionConfig) {
      form.reset(commissionConfig);
    }
  }, [commissionConfig, form]);

  const onSubmit = async (values: FormValues) => {
    if (!configRef) return;
    setIsLoading(true);
    
    try {
      await setDoc(configRef, { ...values, updatedAt: serverTimestamp() }, { merge: true });
      toast({ title: 'Mall Commissions Updated!', description: 'The new commission rates have been saved.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
        <CardHeader>
            <div className="flex items-center gap-4">
                <ShoppingBasket className="h-8 w-8 text-primary"/>
                <div>
                    <CardTitle>Mall Commission Rates</CardTitle>
                    <CardDescription>
                        Set the commission percentage (%) TransConnect earns from transactions in each mall.
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <FormField
                            control={form.control}
                            name="financeMall"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Finance Mall (%)</FormLabel>
                                <FormControl><Input type="number" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="supplierMall"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Supplier Mall (%)</FormLabel>
                                <FormControl><Input type="number" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="transporterMall"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Transporter Mall (%)</FormLabel>
                                <FormControl><Input type="number" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="buySellMall"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Buy & Sell Mall (%)</FormLabel>
                                <FormControl><Input type="number" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="warehouseMall"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Warehouse Mall (%)</FormLabel>
                                <FormControl><Input type="number" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="repurposeMall"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Repurpose Mall (%)</FormLabel>
                                <FormControl><Input type="number" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="loadsMall"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Loads Mall (%)</FormLabel>
                                <FormControl><Input type="number" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="distributionMall"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Distribution Mall (%)</FormLabel>
                                <FormControl><Input type="number" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <Button type="submit" disabled={isLoading} className="mt-4">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Commissions
                    </Button>
                </form>
                </Form>
            )}
        </CardContent>
    </Card>
  );
}
