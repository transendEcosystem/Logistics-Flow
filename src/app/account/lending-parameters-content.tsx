
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { getClientSideAuthToken, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Landmark, Banknote, ShieldCheck, Zap, Truck, Tag, MapPin, RefreshCcw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import React from 'react';

const productHierarchy = [
    {
        id: "loans",
        name: "Loan Products",
        items: [
            { id: "loan-pv-term", name: "Loan (PV) – term" },
            { id: "loan-pv-interest-only", name: "Loan (PV) - interest only" },
            { id: "loan-pv-single-payment", name: "Loan (PV) - single payment" },
            { id: "loan-fl-term-daily", name: "Loan (FL) – term daily" },
            { id: "loan-fl-term-weekly", name: "Loan (FL) term weekly" },
            { id: "loan-fl-term-bi-monthly", name: "Loan (FL) term bi-monthly" },
            { id: "loan-fl-term-monthly", name: "Loan (FL) term monthly" },
            { id: "loan-revolving-credit", name: "Loan Revolving credit" },
        ]
    },
    {
        id: "installment-sale",
        name: "Installment Sale Products",
        items: [
            { id: "installment-sale-term", name: "Term Agreement" },
            { id: "installment-sale-balloon", name: "Balloon Payment" }
        ]
    },
    {
        id: "rental",
        name: "Rental / Lease Products",
        items: [
             { id: "rental-term", name: "Term Agreement" },
             { id: "rental-balloon", name: "Balloon (Residual) Agreement" }
        ]
    },
    {
        id: "discounting",
        name: "Discounting Products",
        items: [
            { id: "disclosed-confirmed-factoring", title: "Factoring", name: "Disclosed confirmed factoring 75% advance" },
            { id: "disclosed-unconfirmed-factoring", name: "Disclosed un-confirmed factoring 0% advance" },
            { id: "invoice-discounting", name: "Invoice discounting 100% advance" },
            { id: "rights-discounting", name: "Rights discounting" }
        ]
    }
];

const termOptions = ['1-12 Months', '12-24 Months', '24-36 Months', '36-48 Months', '48-60 Months', '60-72+ Months'];
const entityOptions = ['Ltd', 'Private Company (Pty Ltd)', 'Sole Proprietor', 'Close Corporation (CC)', 'Trust', 'Individual', 'Partnership'];
const regionOptions = ['Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Free State', 'Mpumalanga', 'Limpopo', 'North West', 'Northern Cape', 'Cross-Border'];

const productCriteriaSchema = z.object({
    enabled: z.boolean().default(false),
    minAmount: z.coerce.number().min(0).default(0),
    maxAmount: z.coerce.number().min(0).default(0),
    preferredTerms: z.array(z.string()).default([]),
});

const lendingSchema = z.object({
    productCriteria: z.record(z.string(), productCriteriaSchema).optional(),
    entityTypes: z.array(z.string()).min(1, "Select at least one entity type."),
    minYearsInBusiness: z.coerce.number().min(0),
    minAnnualTurnover: z.coerce.number().min(0),
    minCreditScore: z.coerce.number().min(0).max(999).optional(),
    requiresNoJudgements: z.boolean().default(false),
    requiresNoDefaults: z.boolean().default(false),
    requiresNoArrears: z.boolean().default(false),
    assetTypes: z.array(z.string()).min(1, "Select at least one asset focus."),
    supportedBrands: z.array(z.string()).min(1, "Select at least one supported brand."),
    serviceRegions: z.array(z.string()).min(1, "Select your primary funding regions."),
    industrial_tags: z.array(z.string()).default([]),
});

type LendingFormValues = z.infer<typeof lendingSchema>;

export default function LendingParametersContent() {
    const { user, isUserLoading, forceRefresh } = useUser();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const isAdmin = user && (
        user.email === 'beyondtransport@gmail.com' || 
        user.email === 'mkoton100@gmail.com' || 
        user.email === 'michael@logisticsflow.co.za' ||
        user.claims?.admin === true
    );

    const isPaid = user?.companyData?.membershipId && user.companyData.membershipId !== 'free';

    const form = useForm<LendingFormValues>({
        resolver: zodResolver(lendingSchema),
        mode: 'onChange',
        defaultValues: {
            productCriteria: {},
            entityTypes: [],
            minYearsInBusiness: 0,
            minAnnualTurnover: 0,
            minCreditScore: 600,
            requiresNoJudgements: false,
            requiresNoDefaults: false,
            requiresNoArrears: false,
            assetTypes: [],
            supportedBrands: [],
            serviceRegions: [],
            industrial_tags: [],
        }
    });

    useEffect(() => {
        if (user?.companyData?.lendingParams) {
            form.reset(user.companyData.lendingParams);
        }
    }, [user, form]);

    const onSubmit = async (values: LendingFormValues) => {
        setIsSaving(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Auth failed.");

            const response = await fetch('/api/updateUserDoc', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: `companies/${user.companyId}`,
                    data: { 
                        lendingParams: values, 
                        declaredRole: 'lender',
                        updatedAt: { _methodName: 'serverTimestamp' } 
                    }
                })
            });

            if (!response.ok) throw new Error("Update failed.");
            toast({ title: "Lending Focus Saved", description: "Your investment parameters have been updated." });
            if (forceRefresh) forceRefresh();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error", description: e.message });
        } finally {
            setIsSaving(false);
        }
    };

    if (isUserLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

    return (
        <div className="space-y-6 text-left text-foreground">
            <div className="flex items-center gap-4 text-left text-foreground text-foreground">
                <div className="bg-primary/10 p-3 rounded-xl text-left"><Landmark className="h-8 w-8 text-primary" /></div>
                <div className="text-left text-foreground">
                    <h1 className="text-3xl font-black font-headline text-left text-foreground">Lending Focus & Portfolio</h1>
                    <p className="text-muted-foreground text-left">Define your credit appetite per product to receive matched deal flow.</p>
                </div>
            </div>

            {!isPaid && !isAdmin && (
                <Alert className="bg-amber-50 border-amber-200 text-left">
                    <Zap className="h-5 w-5 text-amber-600" />
                    <div className="text-left ml-2">
                        <AlertTitle className="font-bold text-amber-800 text-left">Draft Mode: Free Account</AlertTitle>
                        <AlertDescription className="text-sm text-amber-700 leading-relaxed mt-1 text-left">
                            You can configure your lending focus now, but your profile will only receive **Matched Enquiries** once you upgrade to a paid membership.
                        </AlertDescription>
                    </div>
                </Alert>
            )}

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="text-left text-foreground">
                    <Tabs defaultValue="criteria" className="w-full text-left">
                        <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted/50 text-left">
                            <TabsTrigger value="criteria" className="py-2.5 font-bold uppercase tracking-widest text-[10px]">Product Criteria</TabsTrigger>
                            <TabsTrigger value="risk" className="py-2.5 font-bold uppercase tracking-widest text-[10px]">Entity Risk Profile</TabsTrigger>
                            <TabsTrigger value="portfolio" className="py-2.5 font-bold uppercase tracking-widest text-[10px]">Industry Portfolio</TabsTrigger>
                        </TabsList>

                        <TabsContent value="criteria" className="mt-6 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 text-left text-foreground">
                             <div className="space-y-4 text-left text-foreground">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Agreement Specifics</Label>
                                <Accordion type="multiple" className="w-full space-y-4 text-left">
                                    {productHierarchy.map(group => (
                                        <AccordionItem key={group.id} value={group.id} className="border rounded-xl bg-white overflow-hidden px-4 text-left text-foreground">
                                            <AccordionTrigger className="hover:no-underline py-6 text-left">
                                                <div className="flex items-center gap-3 text-left text-foreground">
                                                    <div className="bg-muted p-2 rounded-lg"><Banknote className="h-4 w-4 text-primary" /></div>
                                                    <div className="text-left text-foreground">
                                                        <span className="text-lg font-bold text-left">{group.name}</span>
                                                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest text-left">{group.items.length} Products Available</p>
                                                    </div>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="space-y-6 pt-2 pb-8 text-left text-foreground">
                                                {group.items.map(product => {
                                                    const productEnabled = form.watch(`productCriteria.${product.id}.enabled`);
                                                    return (
                                                        <div key={product.id} className={cn("p-6 border-2 rounded-xl transition-all text-left", productEnabled ? "border-primary bg-primary/5" : "border-slate-100 bg-slate-50/50")}>
                                                            <div className="flex items-center justify-between mb-6 text-left text-foreground">
                                                                <div className="flex items-center gap-3 text-left">
                                                                     <FormField
                                                                        control={form.control}
                                                                        name={`productCriteria.${product.id}.enabled`}
                                                                        render={({ field }) => (
                                                                            <FormItem className="flex items-center space-x-2 space-y-0 text-left">
                                                                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                                                                <FormLabel className="text-base font-black cursor-pointer text-left text-foreground"> {product.name}</FormLabel>
                                                                            </FormItem>
                                                                        )}
                                                                    />
                                                                </div>
                                                                {productEnabled && <Badge className="bg-primary text-white border-none uppercase text-[8px] tracking-[0.2em] font-black h-4 px-2">Enabled for Matching</Badge>}
                                                            </div>
                                                            
                                                            {productEnabled && (
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in zoom-in-95 duration-300 text-left text-foreground">
                                                                    <div className="space-y-4 text-left">
                                                                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Amount Filter (ZAR)</Label>
                                                                        <div className="grid grid-cols-2 gap-4 text-left">
                                                                            <FormField control={form.control} name={`productCriteria.${product.id}.minAmount`} render={({ field }) => (
                                                                                <FormItem className="text-left"><FormLabel className="text-[9px] uppercase font-bold">Min</FormLabel><FormControl><Input type="number" {...field} className="bg-white border-2" /></FormControl></FormItem>
                                                                            )} />
                                                                            <FormField control={form.control} name={`productCriteria.${product.id}.maxAmount`} render={({ field }) => (
                                                                                <FormItem className="text-left"><FormLabel className="text-[9px] uppercase font-bold">Max</FormLabel><FormControl><Input type="number" {...field} className="bg-white border-2" /></FormControl></FormItem>
                                                                            )} />
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-4 text-left">
                                                                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-left">Acceptable Terms</Label>
                                                                        <div className="grid grid-cols-2 gap-2 text-left">
                                                                            {termOptions.map(term => (
                                                                                <FormField key={term} control={form.control} name={`productCriteria.${product.id}.preferredTerms`} render={({ field }) => (
                                                                                    <div className="flex items-center space-x-2 p-2 border rounded-md bg-white text-left">
                                                                                        <Checkbox 
                                                                                            checked={field.value?.includes(term)} 
                                                                                            onCheckedChange={(checked) => {
                                                                                                const current = field.value || [];
                                                                                                if (checked) {
                                                                                                    field.onChange([...current, term]);
                                                                                                } else {
                                                                                                    field.onChange(current.filter((t: string) => t !== term));
                                                                                                }
                                                                                            }} 
                                                                                        />
                                                                                        <Label className="text-[10px] font-bold cursor-pointer text-left">{term}</Label>
                                                                                    </div>
                                                                                )} />
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                             </div>
                        </TabsContent>

                        <TabsContent value="risk" className="mt-6 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 text-left text-foreground">
                             <Card className="text-left text-foreground">
                                <CardHeader className="border-b bg-muted/20 text-left text-foreground">
                                    <CardTitle className="text-lg flex items-center gap-2 text-left">
                                        <ShieldCheck className="h-5 w-5 text-primary"/> 
                                        Entity Risk Parameters
                                    </CardTitle>
                                    <CardDescription className="text-left">Universal risk filters applied across all deal origination.</CardDescription>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 text-left text-foreground">
                                    <div className="space-y-6 text-left">
                                        <div className="space-y-4 text-left">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Entity Maturity</Label>
                                            <FormField control={form.control} name="minYearsInBusiness" render={({ field }) => (
                                                <FormItem className="text-left"><FormLabel>Min Entity Age (Years)</FormLabel><FormControl><Input type="number" placeholder="e.g. 2" {...field} className="border-2"/></FormControl></FormItem>
                                            )} />
                                        </div>
                                        <div className="space-y-4 text-left">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Minimum Annual Turnover (R)</Label>
                                            <FormField control={form.control} name="minAnnualTurnover" render={({ field }) => (
                                                <FormItem className="text-left"><FormControl><Input type="number" placeholder="e.g. 1000000" {...field} className="border-2" /></FormControl></FormItem>
                                            )} />
                                        </div>
                                    </div>
                                    <div className="space-y-4 text-left text-foreground">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Hard Risk Exclusions</Label>
                                        <div className="grid grid-cols-1 gap-2 text-left">
                                            <FormField control={form.control} name="requiresNoJudgements" render={({ field }) => (
                                                <FormItem className="flex items-center justify-between space-x-3 space-y-0 p-4 border rounded-xl bg-slate-50/50 text-left">
                                                    <FormLabel className="font-bold text-xs cursor-pointer text-left">Exclude records with judgments</FormLabel>
                                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="requiresNoDefaults" render={({ field }) => (
                                                <FormItem className="flex items-center justify-between space-x-3 space-y-0 p-4 border rounded-xl bg-slate-50/50 text-left">
                                                    <FormLabel className="font-bold text-xs cursor-pointer">Exclude records with defaults</FormLabel>
                                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                                </FormItem>
                                            )} />
                                             <FormField control={form.control} name="requiresNoArrears" render={({ field }) => (
                                                <FormItem className="flex items-center justify-between space-x-3 space-y-0 p-4 border rounded-xl bg-slate-50/50 text-left">
                                                    <FormLabel className="font-bold text-xs cursor-pointer">Exclude records in arrears</FormLabel>
                                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                                </FormItem>
                                            )} />
                                        </div>
                                    </div>
                                </CardContent>
                                <CardContent className="space-y-4 border-t pt-8 text-left text-foreground">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Acceptable Legal Structures</Label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left text-foreground text-foreground">
                                        {entityOptions.map(item => (
                                            <FormField key={item} control={form.control} name="entityTypes" render={({ field }) => (
                                                <div className="flex items-center space-x-3 p-3 border rounded-md hover:bg-muted/50 transition-colors text-left text-foreground text-foreground text-foreground">
                                                    <Checkbox 
                                                        checked={field.value?.includes(item)} 
                                                        onCheckedChange={(checked) => {
                                                            const current = field.value || [];
                                                            if (checked) {
                                                                    field.onChange([...current, item]);
                                                            } else {
                                                                    field.onChange(current.filter((v: string) => v !== item));
                                                            }
                                                        }} 
                                                    />
                                                    <Label className="font-medium text-[11px] cursor-pointer text-left">{item}</Label>
                                                </div>
                                            )} />
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="portfolio" className="mt-6 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 text-left text-foreground text-foreground">
                             <Card className="text-left text-foreground text-foreground">
                                <CardHeader className="border-b bg-muted/20 text-left text-foreground text-foreground">
                                    <CardTitle className="text-lg flex items-center gap-2 text-left text-foreground"><Tag className="h-5 w-5 text-primary"/> Specialized Product Focus</CardTitle>
                                    <CardDescription className="text-left text-foreground text-foreground">Target specific industrial categories and forensic tags derived from registry notes.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-10 pt-8 text-left text-foreground">
                                    <div className="space-y-4 text-left text-foreground">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 ml-1 text-left text-foreground">
                                            <Zap className="h-4 w-4" /> 
                                            Specialized Credit Products
                                        </Label>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left text-foreground">
                                            {["Asset Finance", "Working Capital", "Factoring", "Insurance"].map(item => (
                                                <FormField key={item} control={form.control} name="industrial_tags" render={({ field }) => (
                                                    <div className="flex items-center space-x-3 p-3 border rounded-md hover:bg-muted/50 transition-colors text-left text-foreground text-foreground text-foreground text-foreground">
                                                        <Checkbox 
                                                            checked={field.value?.includes(item)} 
                                                            onCheckedChange={(checked) => {
                                                                const current = field.value || [];
                                                                if (checked) {
                                                                        field.onChange([...current, item]);
                                                                } else {
                                                                        field.onChange(current.filter((v: string) => v !== item));
                                                                }
                                                            }} 
                                                        />
                                                        <Label className="font-medium text-[11px] cursor-pointer leading-tight text-left">{item}</Label>
                                                    </div>
                                                )} />
                                            ))}
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="space-y-4 text-left text-foreground">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 ml-1 text-left text-foreground">
                                            <Truck className="h-4 w-4" /> 
                                            Asset Focus (Collateral)
                                        </Label>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left text-foreground text-foreground text-foreground text-foreground text-foreground">
                                            {["Heavy Truck (Horse)", "Trailer", "Rigid Truck", "Bakkie"].map(item => (
                                                <FormField key={item} control={form.control} name="assetTypes" render={({ field }) => (
                                                    <div className="flex items-center space-x-3 p-3 border rounded-md hover:bg-muted/50 transition-colors text-left">
                                                        <Checkbox 
                                                            checked={field.value?.includes(item)} 
                                                            onCheckedChange={(checked) => {
                                                                const current = field.value || [];
                                                                if (checked) {
                                                                        field.onChange([...current, item]);
                                                                } else {
                                                                        field.onChange(current.filter((v: string) => v !== item));
                                                                }
                                                            }} 
                                                        />
                                                        <Label className="font-medium text-[11px] cursor-pointer leading-tight text-left">{item}</Label>
                                                    </div>
                                                )} />
                                            ))}
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="space-y-4 text-left text-foreground">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 ml-1 text-left text-foreground">
                                            <MapPin className="h-4 w-4" /> 
                                            Target Funding Regions
                                        </Label>
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-left text-foreground text-foreground text-foreground text-foreground text-foreground">
                                            {regionOptions.map(item => (
                                                <FormField key={item} control={form.control} name="serviceRegions" render={({ field }) => (
                                                    <div className="flex items-center space-x-3 p-3 border rounded-md hover:bg-muted/50 transition-colors text-left text-foreground">
                                                        <Checkbox 
                                                            checked={field.value?.includes(item)} 
                                                            onCheckedChange={(checked) => {
                                                                const current = field.value || [];
                                                                if (checked) {
                                                                        field.onChange([...current, item]);
                                                                } else {
                                                                        field.onChange(current.filter((v: string) => v !== item));
                                                                }
                                                            }} 
                                                        />
                                                        <Label className="font-medium text-[11px] cursor-pointer text-left">{item}</Label>
                                                    </div>
                                                )} />
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>

                    <div className="bg-slate-50 border-t p-8 flex justify-end mt-12 rounded-2xl shadow-inner text-left text-foreground">
                        <Button type="submit" disabled={isSaving} size="lg" className="h-14 px-12 font-black uppercase tracking-widest gap-2 shadow-xl text-left text-white">
                            {isSaving ? <Loader2 className="h-5 w-5 animate-spin"/> : <Save className="h-5 w-5" />}
                            Update Global Matching Logic
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
