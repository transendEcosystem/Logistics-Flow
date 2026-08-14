'use client';

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
import { useState, useEffect } from 'react';
import { Loader2, Banknote, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const formSchema = z.object({
  bankName: z.string().min(1, 'Bank name is required'),
  branchName: z.string().min(1, 'Branch name is required'),
  accountHolder: z.string().min(1, 'Account holder is required'),
  accountType: z.string().min(1, 'Account type is required'),
  accountNumber: z.string().min(1, 'Account number is required'),
  branchCode: z.string().min(1, 'Branch code is required'),
});

type BankDetailsFormValues = z.infer<typeof formSchema>;

export default function BankDetailsSettings() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);

  const configRef = useMemoFirebase(() => firestore ? doc(firestore, 'configuration', 'bankDetails') : null, [firestore]);
  const { data: bankDetailsConfig, isLoading: isConfigLoading } = useDoc<BankDetailsFormValues>(configRef);

  const form = useForm<BankDetailsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bankName: '',
      branchName: '',
      accountHolder: '',
      accountType: '',
      accountNumber: '',
      branchCode: '',
    },
  });

  useEffect(() => {
    if (bankDetailsConfig) {
      form.reset(bankDetailsConfig);
    }
  }, [bankDetailsConfig, form]);


  const onSubmit = async (values: BankDetailsFormValues) => {
    if (!configRef) {
        toast({ variant: 'destructive', title: 'Error', description: 'Firestore not available.' });
        return;
    }
    setIsSaving(true);
    
    try {
      await setDoc(configRef, { ...values, updatedAt: serverTimestamp() }, { merge: true });
      toast({ title: 'Bank Details Saved!', description: 'The platform bank details have been updated successfully.' });
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
                <Banknote className="h-8 w-8 text-primary"/>
                <div>
                    <CardTitle>Platform Bank Details</CardTitle>
                    <CardDescription>
                        Set the central bank account details for EFT payments.
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
                        name="bankName"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Bank Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., First National Bank" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="branchName"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Branch</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Sandton City" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>
                    <FormField
                    control={form.control}
                    name="accountHolder"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Holder</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., TransConnect (Pty) Ltd" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                        control={form.control}
                        name="accountType"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Account Type</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Cheque" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="accountNumber"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Acc Number</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., 62800012345" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>
                    <FormField
                        control={form.control}
                        name="branchCode"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Branch Code</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., 250655" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />

                    <Button type="submit" disabled={isSaving} className="mt-4">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Bank Details
                    </Button>
                </form>
                </Form>
            )}
        </CardContent>
    </Card>
  );
}
