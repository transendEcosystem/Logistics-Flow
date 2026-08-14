
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
import { Loader2, Building, Save, Banknote, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, getClientSideAuthToken } from '@/firebase';
import { Separator } from '@/components/ui/separator';
import { useRouter, useSearchParams } from 'next/navigation';

const companyFormSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  registrationNumber: z.string().optional(),
  vatNumber: z.string().optional(),
  streetAddress: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  bankName: z.string().optional(),
  branchCode: z.string().optional(),
  accountNumber: z.string().optional(),
  accountHolderName: z.string().optional(),
});

type CompanyFormValues = z.infer<typeof companyFormSchema>;

export default function CompanyContent() {
  const { user, isUserLoading, forceRefresh } = useUser();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromWallet = searchParams.get('from') === 'wallet';

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      companyName: '',
      registrationNumber: '',
      vatNumber: '',
      streetAddress: '',
      city: '',
      province: '',
      postalCode: '',
      bankName: '',
      branchCode: '',
      accountNumber: '',
      accountHolderName: '',
    },
  });

  useEffect(() => {
    if (user?.companyData) {
      const companyData = user.companyData;
      let companyName = companyData.companyName;
      if ((!companyName || companyName === 'My Company') && user?.displayName) {
        companyName = `${user.displayName}'s Company`;
      }
      form.reset({
        companyName: companyName || '',
        registrationNumber: companyData.registrationNumber || '',
        vatNumber: companyData.vatNumber || '',
        streetAddress: companyData.streetAddress || '',
        city: companyData.city || '',
        province: companyData.province || '',
        postalCode: companyData.postalCode || '',
        bankName: companyData.bankName || '',
        branchCode: companyData.branchCode || '',
        accountNumber: companyData.accountNumber || '',
        accountHolderName: companyData.accountHolderName || '',
      });
    }
  }, [user, form]);

  const onSubmit = async (values: CompanyFormValues) => {
    setIsSaving(true);
    const companyId = user?.companyId;
    if (!companyId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Your company profile is still being created. Please refresh the page in a moment and try again.' });
      setIsSaving(false);
      return;
    }
    
    try {
        const token = await getClientSideAuthToken();
        if (!token) throw new Error("Authentication failed.");

        const response = await fetch('/api/updateUserDoc', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                path: `companies/${companyId}`,
                data: { ...values, updatedAt: { _methodName: 'serverTimestamp' } }
            }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to update company info.');

        toast({
            title: 'Company Info Updated',
            description: 'Your company information has been saved.',
        });
        forceRefresh();
        if (fromWallet) {
            router.push('/account?view=wallet');
        }
    } catch(e: any) {
         toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
    } finally {
        setIsSaving(false);
    }
  };
  
  const isAwaitingCompanyId = !isUserLoading && user && !user.companyId;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Building /> Company Profile</CardTitle>
        <CardDescription>View and update your company's information and payout bank details.</CardDescription>
      </CardHeader>
      <CardContent>
        {isUserLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Form {...form}>
            {isAwaitingCompanyId && (
              <div className="flex items-center gap-4 p-4 mb-6 text-sm text-primary-foreground bg-primary/90 rounded-md">
                <Loader2 className="h-5 w-5 animate-spin" />
                <div>
                  <p className="font-semibold">Finalizing your company profile...</p>
                  <p className="text-xs">The real-time listener will update your dashboard automatically.</p>
                </div>
              </div>
            )}
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">
              <div>
                <h3 className="text-lg font-medium text-left text-foreground">Business Details</h3>
                <Separator className="my-2" />
                <div className="space-y-4 pt-2 text-left">
                     <FormField control={form.control} name="companyName" render={({ field }) => (
                        <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="registrationNumber" render={({ field }) => (
                            <FormItem><FormLabel>Registration Number</FormLabel><FormControl><Input placeholder="e.g., 2024/123456/07" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="vatNumber" render={({ field }) => (
                            <FormItem><FormLabel>VAT Number (Optional)</FormLabel><FormControl><Input placeholder="e.g., 4000123456" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                 </div>
              </div>

               <div>
                <h3 className="text-lg font-medium text-left text-foreground">Physical Address</h3>
                <Separator className="my-2" />
                <div className="space-y-4 pt-2 text-left">
                     <FormField control={form.control} name="streetAddress" render={({ field }) => (
                        <FormItem><FormLabel>Street Address</FormLabel><FormControl><Input placeholder="123 Transport Lane" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField control={form.control} name="city" render={({ field }) => (
                            <FormItem><FormLabel>City</FormLabel><FormControl><Input placeholder="Johannesburg" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="province" render={({ field }) => (
                            <FormItem><FormLabel>Province</FormLabel><FormControl><Input placeholder="Gauteng" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                         <FormField control={form.control} name="postalCode" render={({ field }) => (
                            <FormItem><FormLabel>Postal Code</FormLabel><FormControl><Input placeholder="2196" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                 </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium flex items-center gap-2 text-left text-foreground"><Banknote/> Bank Details for Payouts</h3>
                 <p className="text-sm text-muted-foreground text-left">This is the account where your earnings from sales and commissions will be paid.</p>
                <Separator className="my-2" />
                <div className="space-y-4 pt-2 text-left">
                     <FormField control={form.control} name="accountHolderName" render={({ field }) => (
                        <FormItem><FormLabel>Account Holder Name</FormLabel><FormControl><Input placeholder="Your Company (Pty) Ltd" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField control={form.control} name="bankName" render={({ field }) => (
                            <FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input placeholder="e.g., FNB" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="branchCode" render={({ field }) => (
                            <FormItem><FormLabel>Branch Code</FormLabel><FormControl><Input placeholder="e.g., 250655" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                         <FormField control={form.control} name="accountNumber" render={({ field }) => (
                            <FormItem><FormLabel>Account Number</FormLabel><FormControl><Input placeholder="e.g., 62000000000" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                 </div>
              </div>

              <div className="flex items-center gap-4">
                <Button type="submit" disabled={isSaving || isUserLoading}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Changes
                </Button>
                {fromWallet && (
                    <Button variant="outline" type="button" onClick={() => router.push('/account?view=wallet')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Return to Wallet
                    </Button>
                )}
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
