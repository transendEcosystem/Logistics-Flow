
'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Calculator, Users, Percent, FileText } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const LENDING_ASSUMPTIONS_KEY = 'adminLendingAssumptions_v1';

const agreementSchema = z.object({
    enabled: z.boolean().default(false),
    amount: z.coerce.number().optional(),
    term: z.coerce.number().optional(),
    rate: z.coerce.number().optional(),
    residual: z.coerce.number().optional(),
    dealsPerMonth: z.coerce.number().optional(),
    recurring: z.boolean().default(true),
    startDate: z.string().optional(),
    firstInstallmentDate: z.string().optional(),
    paymentsInAdvance: z.boolean().default(false),
});

const formSchema = z.object({
    monthlySignups: z.coerce.number().min(0, "Must be non-negative."),
    quoteConversionRate: z.coerce.number().min(0).max(100),
    enquiryConversionRate: z.coerce.number().min(0).max(100),
    applicationConversionRate: z.coerce.number().min(0).max(100),
    loan: agreementSchema,
    installmentSale: agreementSchema,
    lease: agreementSchema,
    factoring: agreementSchema,
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: FormValues = {
    monthlySignups: 100,
    quoteConversionRate: 50,
    enquiryConversionRate: 30,
    applicationConversionRate: 60,
    loan: { enabled: true, amount: 250000, term: 48, rate: 18, residual: 0, dealsPerMonth: 1, recurring: true, startDate: '', firstInstallmentDate: '', paymentsInAdvance: false },
    installmentSale: { enabled: true, amount: 750000, term: 60, rate: 15, residual: 0, dealsPerMonth: 1, recurring: true, startDate: '', firstInstallmentDate: '', paymentsInAdvance: false },
    lease: { enabled: false, amount: 600000, term: 54, rate: 16, residual: 0, dealsPerMonth: 0, recurring: true, startDate: '', firstInstallmentDate: '', paymentsInAdvance: false },
    factoring: { enabled: true, amount: 100000, term: 3, rate: 5, residual: 0, dealsPerMonth: 2, recurring: true, startDate: '', firstInstallmentDate: '', paymentsInAdvance: false },
};

export default function LendingAssumptions() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = React.useState(false);
    const [isClient, setIsClient] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: defaultValues 
    });

    useEffect(() => {
        setIsClient(true);
        try {
            const savedData = localStorage.getItem(LENDING_ASSUMPTIONS_KEY);
            if (savedData) {
                const parsed = JSON.parse(savedData);
                const updated = { ...defaultValues };
                 for (const key in updated) {
                    if (parsed[key] !== undefined) {
                        if (typeof (updated as any)[key] === 'object' && (updated as any)[key] !== null && !Array.isArray((updated as any)[key])) {
                            (updated as any)[key] = { ...(updated as any)[key], ...(parsed as any)[key] };
                        } else {
                            (updated as any)[key] = (parsed as any)[key];
                        }
                    }
                }
                form.reset(updated);
            }
        } catch(e) {
            console.error("Failed to load assumptions from localStorage", e);
        }
    }, [form]);

    const onSubmit = (values: FormValues) => {
        setIsLoading(true);
        try {
            localStorage.setItem(LENDING_ASSUMPTIONS_KEY, JSON.stringify(values));
            toast({ title: "Assumptions Saved", description: "Your lending model inputs have been updated." });
        } catch (e) {
             toast({ variant: 'destructive', title: "Save Failed", description: "Could not save data to local storage." });
        } finally {
            setIsLoading(false);
        }
    };

    const renderAgreementFields = (name: "loan" | "installmentSale" | "lease" | "factoring", title: string) => (
        <Card>
            <CardHeader>
                <FormField
                    control={form.control}
                    name={`${name}.enabled`}
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} id={name}/>
                            </FormControl>
                            <FormLabel htmlFor={name} className="text-lg font-semibold cursor-pointer">
                                {title}
                            </FormLabel>
                        </FormItem>
                    )}
                />
            </CardHeader>
            <CardContent className="space-y-4">
                <fieldset disabled={!form.watch(`${name}.enabled`)} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <FormField control={form.control} name={`${name}.dealsPerMonth`} render={({ field }) => (<FormItem><FormLabel># of Deals / Month</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`${name}.amount`} render={({ field }) => (<FormItem><FormLabel>Avg. Amount (R)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`${name}.term`} render={({ field }) => (<FormItem><FormLabel>Avg. Term (Months)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`${name}.rate`} render={({ field }) => (<FormItem><FormLabel>Avg. Rate (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                         <FormField control={form.control} name={`${name}.residual`} render={({ field }) => (<FormItem><FormLabel>Residual Value (R)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`${name}.startDate`} render={({ field }) => (<FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`${name}.firstInstallmentDate`} render={({ field }) => (<FormItem><FormLabel>First Installment Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-4 border-t">
                        <FormField
                            control={form.control}
                            name={`${name}.recurring`}
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
                                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>Recurring Monthly Deals</FormLabel>
                                        <FormDescription className="text-xs">If checked, originate deals every month. If unchecked, originate only in the first month.</FormDescription>
                                    </div>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name={`${name}.paymentsInAdvance`}
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
                                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>Payments in Advance</FormLabel>
                                        <FormDescription className="text-xs">If checked, the first payment occurs on the start date. Otherwise, it's in arrears.</FormDescription>
                                    </div>
                                </FormItem>
                            )}
                        />
                    </div>
                </fieldset>
            </CardContent>
        </Card>
    );

    if (!isClient) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Calculator /> Lending Model Assumptions</CardTitle>
                    <CardDescription>Define the inputs for your lending book financial model. These values drive the projections.</CardDescription>
                </CardHeader>
            </Card>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Users /> Member Origination Funnel</CardTitle>
                            <CardDescription>Model the flow of members from sign-up to funded application.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <FormField control={form.control} name="monthlySignups" render={({ field }) => (<FormItem><FormLabel>New Members / Month</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="quoteConversionRate" render={({ field }) => (<FormItem><FormLabel>Quote Request Rate (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="enquiryConversionRate" render={({ field }) => (<FormItem><FormLabel>Formal Enquiry Rate (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="applicationConversionRate" render={({ field }) => (<FormItem><FormLabel>Funded Application Rate (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </CardContent>
                    </Card>

                    <Card>
                         <CardHeader>
                            <CardTitle className="flex items-center gap-2"><FileText /> Agreement Product Mix</CardTitle>
                            <CardDescription>Enable the agreement types you want to offer and set their average financial parameters.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {renderAgreementFields("loan", "Loans")}
                            {renderAgreementFields("installmentSale", "Installment Sale")}
                            {renderAgreementFields("lease", "Lease / Rental")}
                            {renderAgreementFields("factoring", "Factoring / Discounting")}
                        </CardContent>
                    </Card>
                    
                    <div className="flex justify-end">
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                            Save Assumptions
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}

