
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatDateSafe } from '@/lib/utils';

const tierSchema = z.object({
  threshold: z.coerce.number().min(1, "Threshold must be at least 1"),
  bonus: z.coerce.number().min(0, "Bonus must be non-negative"),
});

const formSchema = z.object({
  membershipCommissionPercent: z.coerce.number().min(0).max(100),
  transactionCommissionPercent: z.coerce.number().min(0).max(100),
  incentivesProductCommissionPercent: z.coerce.number().min(0).max(100),
});

type FormValues = z.infer<typeof formSchema>;

export default function SalesIncentives() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [commissionEntries, setCommissionEntries] = useState<any[]>([]);
  const [isLoadingCommissions, setIsLoadingCommissions] = useState(true);

  const { data: configData, isLoading: isConfigLoading, forceRefresh } = useConfig<FormValues>('salesIncentives');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      membershipCommissionPercent: 30,
      transactionCommissionPercent: 20,
      incentivesProductCommissionPercent: 50,
    },
  });


  useEffect(() => {
    if (configData) {
      form.reset(configData);
    }
  }, [configData, form]);

  useEffect(() => {
    const loadCommissions = async () => {
      setIsLoadingCommissions(true);
      try {
        const token = await getClientSideAuthToken();
        if (!token) throw new Error('Authentication failed.');
        const response = await fetch('/api/admin', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getNetworkCommissions', payload: {} }),
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load commissions.');
        setCommissionEntries((result.data || []).sort((left: any, right: any) => new Date(right.earnedAt || 0).getTime() - new Date(left.earnedAt || 0).getTime()));
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Commission Ledger Failed', description: error.message });
      } finally {
        setIsLoadingCommissions(false);
      }
    };
    loadCommissions();
  }, [toast]);

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

  return (
    <Card className="w-full max-w-4xl">
        <CardHeader>
            <div className="flex items-center gap-4">
                <TrendingUp className="h-8 w-8 text-primary"/>
                <div>
                    <CardTitle>Sales Incentive Structure</CardTitle>
                    <CardDescription>
                      Define the three revenue shares earned by any member who refers and grows a network.
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
                    <div className="grid md:grid-cols-3 gap-6">
                      <FormField control={form.control} name="membershipCommissionPercent" render={({ field }) => (<FormItem><FormLabel>Benefit 1: Membership Revenue Share (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="transactionCommissionPercent" render={({ field }) => (<FormItem><FormLabel>Benefit 2: Retained Transaction Revenue Share (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="incentivesProductCommissionPercent" render={({ field }) => (<FormItem><FormLabel>Benefit 3: Incentives Product Revenue Share (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                    
                    <Separator />

                    <Button type="submit" disabled={isSaving} className="mt-4">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Incentive Structure
                    </Button>
                </form>
                </Form>
            )}
              <Separator className="my-8" />
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Network Owner Commission Ledger</h3>
                  <p className="text-sm text-muted-foreground">Accrued commissions are scheduled for payment by the 7th of the following month.</p>
                </div>
                {isLoadingCommissions ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Seller Company</TableHead><TableHead>Benefit</TableHead><TableHead>Referred Member</TableHead><TableHead>Earned</TableHead><TableHead>Payment Due</TableHead><TableHead className="text-right">Commission</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {commissionEntries.length ? commissionEntries.map(entry => <TableRow key={`${entry.ownerCompanyId}-${entry.id}`}><TableCell className="font-medium">{entry.ownerCompanyId || '-'}</TableCell><TableCell>{String(entry.type || '').replace(/_/g, ' ')}</TableCell><TableCell>{entry.referredCompanyName || '-'}</TableCell><TableCell>{formatDateSafe(entry.earnedAt, 'dd MMM yyyy')}</TableCell><TableCell>{formatDateSafe(entry.payoutEligibleAt, 'dd MMM yyyy')}</TableCell><TableCell className="text-right font-medium">{formatCurrency(Number(entry.commissionAmount || 0))}</TableCell></TableRow>) : <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No network-owner commissions have accrued yet.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                )}
              </div>
        </CardContent>
    </Card>
  );
}
