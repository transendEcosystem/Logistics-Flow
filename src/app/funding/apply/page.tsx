'use client';

import React, { Suspense, useState, useEffect, useMemo } from 'react';
import { useForm, FormProvider, useFormContext, useFieldArray } from 'react-hook-form';
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
import { Loader2, Landmark, ArrowLeft, ArrowRight, CheckCircle, CheckCircle2, ShieldCheck, History, Package, Sparkles, Building, FileUp, Users, PlusCircle, Trash2, UserCheck, Truck, FileText, Navigation, MapPin, Info, Gavel, Scale, Database } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useUser, getClientSideAuthToken, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { doc, serverTimestamp } from 'firebase/firestore';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { provinces } from '@/lib/geodata';

const fundingNeeds = {
  'loan-pv-term': 'Working Capital / Business Loan',
  'installment-sale-term': 'Equipment Finance',
  'vehicles': 'Vehicle Finance',
  'disclosed-confirmed-factoring': 'Cashflow Support (Factoring)',
};

const entityTypes = ["Ltd", "Private Company (Pty Ltd)", "Sole Proprietorship", "Close Corporation (CC)", "Trust", "Individual", "Partnership"];
const termOptions = ['1-12 Months', '12-24 Months', '24-36 Months', '36-48 Months', '48-60 Months', '60-72+ Months'];
const vehicleClasses = ["Heavy Truck (Horse)", "Trailer", "Rigid Truck (8t-14t)", "Light Commercial (Bakkie)", "Bus", "Other"];

const stakeholderSchema = z.object({
    name: z.string().min(1, "Full Name required."),
    rsaIdNumber: z.string().optional(),
    position: z.string().optional(),
    rsaIdUrl: z.string().optional(),
});

const assetDetailSchema = z.object({
    vehicleClass: z.string().optional(),
    vehicleMake: z.string().optional(),
    vehicleModel: z.string().optional(),
    vehicleYear: z.string().optional(),
    vehicleVin: z.string().optional(),
    registrationNumber: z.string().optional(),
    engineNumber: z.string().optional(),
    trafficRegisterNumber: z.string().optional(),
    licenceExpiry: z.string().optional(),
    tareWeight: z.string().optional(),
    grossVehicleMass: z.string().optional(),
    colour: z.string().optional(),
    rc1DocUrl: z.string().optional(),
});

const formSchema = z.object({
  originationType: z.enum(['direct', 'market']).default('market'),
  fundingNeed: z.string().min(1, 'Select what you need funds for.'),
  primaryRegion: z.string().min(1, 'Select operating region.'),
  amountRequested: z.coerce.number().positive('Enter a valid amount.'),
  preferredTerm: z.string().min(1, 'Required.'),
  entityType: z.string().min(1, 'Select entity type.'),
  companyLegalName: z.string().min(1, 'Legal name required.'),
  registrationNumber: z.string().optional(),
  annualTurnover: z.coerce.number().min(0).default(0),
  yearsInBusiness: z.coerce.number().min(0).default(0),
  purpose: z.string().min(10, 'Provide more detail.'),
  hasJudgements: z.boolean().default(false),
  hasDefaults: z.boolean().default(false),
  apiConsent: z.boolean().default(true),
  directors: z.array(stakeholderSchema).optional().default([]),
  assets: z.array(assetDetailSchema).optional().default([]),
    assetSourced: z.enum(['yes', 'no']).optional(),
    supplierId: z.string().optional(),
    supplierName: z.string().optional(),
    supplierContactName: z.string().optional(),
    supplierEmail: z.string().email().optional().or(z.literal('')),
    supplierPhone: z.string().optional(),
    supplierAddress: z.string().optional(),
    supplierVatNumber: z.string().optional(),
    proformaInvoiceNumber: z.string().optional(),
    proformaInvoiceDate: z.string().optional(),
    proformaSubtotal: z.coerce.number().min(0).optional(),
    proformaVat: z.coerce.number().min(0).optional(),
    proformaTotal: z.coerce.number().min(0).optional(),
    depositAmount: z.coerce.number().min(0).optional(),
    proformaInvoiceUrl: z.string().optional(),
  userIdUrl: z.string().optional(),
  registrationDocUrl: z.string().optional(),
  afsDocUrl: z.string().optional(),
    bankStatementsUrl: z.string().optional(),
});

type ApplicationFormValues = z.infer<typeof formSchema>;

const wizardSteps = [
  { id: 'Need', name: 'Need & Channel', fields: ['fundingNeed', 'primaryRegion', 'originationType'] },
  { id: 'Profile', name: 'Business Profile', fields: ['entityType', 'companyLegalName', 'registrationNumber', 'yearsInBusiness', 'annualTurnover'] },
  { id: 'Identity', name: 'Principal Identity', fields: ['userIdUrl', 'directors'] },
  { id: 'History', name: 'Credit & Purpose', fields: ['hasJudgements', 'hasDefaults', 'purpose', 'apiConsent'] },
    { id: 'Finance', name: 'Amount, Terms & Financial Evidence', fields: ['amountRequested', 'preferredTerm', 'afsDocUrl', 'bankStatementsUrl'] },
];

function FileUploadField({ name, label, folder }: { name: any, label: string, folder: string }) {
    const { setValue, watch } = useFormContext<ApplicationFormValues>();
    const [isUploading, setIsUploading] = useState(false);
    const { user } = useUser();
    const { toast } = useToast();
    const currentUrl = watch(name);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        setIsUploading(true);
        try {
            const token = await getClientSideAuthToken();
            const reader = new FileReader();
            const dataUri = await new Promise<string>((res) => {
                reader.onload = () => res(reader.result as string);
                reader.readAsDataURL(file);
            });
            const res = await fetch('/api/uploadImageAsset', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileDataUri: dataUri, folder: `${folder}/${user.uid}`, fileName: `${name}_${Date.now()}_${file.name}` })
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            setValue(name, result.url, { shouldValidate: true });
            toast({ title: `${label} Attached` });
        } catch (err: any) {
            toast({ variant: 'destructive', title: "Upload Failed", description: err.message });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-1.5 text-left">
            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">{label}</Label>
            <Button 
                type="button" 
                variant="outline" 
                className={cn("w-full h-11 border-2 border-dashed gap-2 font-bold", currentUrl && "border-green-500 bg-green-50 text-green-700")}
                onClick={() => document.getElementById(`upload-${name}`)?.click()}
                disabled={isUploading}
            >
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin"/> : currentUrl ? <CheckCircle2 className="h-4 w-4" /> : <FileUp className="h-4 w-4" />}
                {currentUrl ? `Update ${label}` : `Attach ${label}`}
            </Button>
            <input id={`upload-${name}`} type="file" className="hidden" onChange={handleUpload} />
        </div>
    );
}

function ApplicationForm() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
    const [isLookingUpSupplier, setIsLookingUpSupplier] = useState(false);
    const [supplierLookupMessage, setSupplierLookupMessage] = useState<string | null>(null);

  const methods = useForm<ApplicationFormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      fundingNeed: searchParams.get('type') || '',
      amountRequested: Number(searchParams.get('amount')) || 0,
      originationType: (searchParams.get('origination') as any) || 'market',
      assets: [{}],
      directors: [{}],
    },
  });
    const directors = useFieldArray({ control: methods.control, name: 'directors' });
    const fundingNeed = methods.watch('fundingNeed');
    const needsAssetEvidence = ['vehicles', 'installment-sale-term', 'disclosed-confirmed-factoring'].includes(fundingNeed);
    const hasSelectedAssetOrCounterparty = methods.watch('assetSourced') === 'yes';
    const activeWizardSteps = needsAssetEvidence
        ? [
                ...wizardSteps.slice(0, 3),
                { id: 'AssetDiscovery', name: 'Asset / Counterparty Discovery', fields: ['assetSourced'] },
                ...(hasSelectedAssetOrCounterparty ? [
                    { id: 'Supplier', name: 'Supplier / Counterparty', fields: ['supplierName'] },
                    { id: 'Asset', name: 'RC1 Asset Details', fields: ['assets'] },
                    { id: 'Proforma', name: 'Proforma Invoice', fields: ['proformaInvoiceNumber', 'proformaTotal', 'proformaInvoiceUrl'] },
                ] : []),
                ...wizardSteps.slice(3),
            ]
        : wizardSteps;

    useEffect(() => {
        setCurrentStep(current => Math.min(current, activeWizardSteps.length - 1));
    }, [activeWizardSteps.length]);

    const lookupSupplier = async () => {
        const term = methods.getValues('supplierName')?.trim();
        if (!term) return;
        setIsLookingUpSupplier(true);
        setSupplierLookupMessage(null);
        try {
            const token = await getClientSideAuthToken();
            const response = await fetch('/api/searchLeads', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'supplier', query: term }),
            });
            const result = await response.json();
            const match = (result.data || result.records || []).find((record: any) =>
                String(record.companyName || record.name || '').toLowerCase() === term.toLowerCase()
            );
            if (!match) {
                setSupplierLookupMessage('No exact supplier record found. Complete the supplier details below to create a deal-ready counterparty record.');
                return;
            }
            methods.setValue('supplierId', match.id);
            methods.setValue('supplierName', match.companyName || match.name || term);
            methods.setValue('supplierContactName', match.contactPerson || match.ownerName || '');
            methods.setValue('supplierEmail', match.email || '');
            methods.setValue('supplierPhone', match.phone || match.mobile || '');
            methods.setValue('supplierAddress', match.address || '');
            methods.setValue('supplierVatNumber', match.vatNumber || '');
            setSupplierLookupMessage(`Existing supplier found: ${match.companyName || match.name}. Contact details were loaded for review.`);
        } catch {
            setSupplierLookupMessage('Supplier lookup is unavailable. Complete the supplier details manually.');
        } finally {
            setIsLookingUpSupplier(false);
        }
    };

  const handleNext = async () => {
        const step = activeWizardSteps[currentStep];
        if (step.id === 'AssetDiscovery' && !methods.getValues('assetSourced')) {
            methods.setError('assetSourced', { message: 'Select whether you have identified the asset or counterparty.' });
            return;
        }
        if (step.id === 'Supplier' && !methods.getValues('supplierName')?.trim()) {
            methods.setError('supplierName', { message: 'Supplier or counterparty name is required.' });
            return;
        }
        if (step.id === 'Asset') {
            const asset = methods.getValues('assets.0');
            const requiredFields = ['vehicleClass', 'vehicleMake', 'vehicleModel', 'vehicleYear', 'registrationNumber', 'vehicleVin', 'trafficRegisterNumber', 'colour', 'tareWeight', 'grossVehicleMass', 'rc1DocUrl'];
            const missing = requiredFields.some(field => !asset?.[field as keyof typeof asset]);
            const needsEngineNumber = asset?.vehicleClass !== 'Trailer';
            if (missing || (needsEngineNumber && !asset?.engineNumber)) {
                toast({ variant: 'destructive', title: 'Complete RC1 details', description: 'Capture the RC1 particulars and attach the RC1 certificate before continuing.' });
                return;
            }
        }
        if (step.id === 'Proforma') {
            const required = ['proformaInvoiceNumber', 'proformaTotal', 'proformaInvoiceUrl'];
            if (required.some(field => !methods.getValues(field as any))) {
                toast({ variant: 'destructive', title: 'Proforma evidence required', description: 'Enter the proforma number and total, then attach the proforma invoice.' });
                return;
            }
        }
        const isValid = await methods.trigger(step.fields as any);
    if (isValid) setCurrentStep(prev => prev + 1);
  };

  const onSubmit = async (values: ApplicationFormValues) => {
    setIsSubmitting(true);
    try {
        const token = await getClientSideAuthToken();
        const companyId = user?.companyData?.id;
        if (!token || !companyId) throw new Error("Authentication node not found.");

        const path = `companies/${companyId}/enquiries`;
        const data = { ...values, companyId, status: 'pending', createdAt: serverTimestamp(), updatedAt: serverTimestamp() };

        const response = await fetch('/api/addUserDoc', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ collectionPath: path, data }),
        });

        if (!response.ok) throw new Error("Registry commit failed.");

        toast({ title: 'Application Submitted', description: 'Forensic audit initiated.' });
        router.push('/account?view=dashboard');
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Submission Failed', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl shadow-2xl border-none overflow-hidden text-left text-foreground">
      <CardHeader className="bg-slate-900 text-white p-8">
        <div className="flex justify-between items-center">
            <div className="text-left">
                <CardTitle className="text-2xl font-black flex items-center gap-2 text-white text-left"><Landmark className="text-primary"/> Forensic Intake Terminal</CardTitle>
                <CardDescription className="text-slate-400">{activeWizardSteps[currentStep].name}</CardDescription>
            </div>
            <Badge variant="outline" className="border-primary/50 text-primary uppercase font-black text-[10px] tracking-widest px-3 h-6">
                {methods.watch('originationType') === 'direct' ? 'Direct Path' : 'Market Path'}
            </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-8 bg-white">
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
            
            {activeWizardSteps[currentStep].id === 'Need' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <FormField control={methods.control} name="originationType" render={({ field }) => (
                        <FormItem className="space-y-4">
                            <FormLabel className="font-black uppercase text-[10px] text-primary tracking-widest">Select Handshake Channel</FormLabel>
                            <FormControl>
                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-4">
                                    <div className={cn("p-4 border-2 rounded-2xl cursor-pointer", field.value === 'direct' ? "border-primary bg-primary/5" : "bg-white")}>
                                        <div className="flex items-center gap-3"><RadioGroupItem value="direct" id="ch-dir" /><Label htmlFor="ch-dir" className="font-bold text-xs uppercase cursor-pointer">Direct Division</Label></div>
                                        <p className="text-[10px] text-muted-foreground mt-2 leading-tight">Private, relationship-driven path to in-house capital.</p>
                                    </div>
                                    <div className={cn("p-4 border-2 rounded-2xl cursor-pointer", field.value === 'market' ? "border-primary bg-primary/5" : "bg-white")}>
                                        <div className="flex items-center gap-3"><RadioGroupItem value="market" id="ch-mkt" /><Label htmlFor="ch-mkt" className="font-bold text-xs uppercase cursor-pointer">Finance Mall</Label></div>
                                        <p className="text-[10px] text-muted-foreground mt-2 leading-tight">Broadcast to market. Compare 85+ specialized lenders.</p>
                                    </div>
                                </RadioGroup>
                            </FormControl>
                        </FormItem>
                    )} />
                    <FormField control={methods.control} name="fundingNeed" render={({ field }) => (
                        <FormItem><FormLabel>Funding Requirement</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-12 border-2"><SelectValue placeholder="Select type..." /></SelectTrigger></FormControl><SelectContent>{Object.entries(fundingNeeds).map(([id, name]) => (<SelectItem key={id} value={id}>{name}</SelectItem>))}</SelectContent></Select></FormItem>
                    )} />
                    <FormField control={methods.control} name="primaryRegion" render={({ field }) => (
                        <FormItem><FormLabel>Primary Operating Province</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-12 border-2"><SelectValue placeholder="Select province..." /></SelectTrigger></FormControl><SelectContent>{provinces.map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}</SelectContent></Select></FormItem>
                    )} />
                </div>
            )}

            {activeWizardSteps[currentStep].id === 'Profile' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <FormField control={methods.control} name="companyLegalName" render={({ field }) => (<FormItem><FormLabel>Registered Entity Name</FormLabel><FormControl><Input {...field} className="h-11 border-2 font-bold" /></FormControl></FormItem>)} />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={methods.control} name="registrationNumber" render={({ field }) => (<FormItem><FormLabel>Registration Number</FormLabel><FormControl><Input placeholder="20XX/XXXXXX/07" {...field} className="h-11 border-2" /></FormControl></FormItem>)} />
                        <FormField control={methods.control} name="entityType" render={({ field }) => (<FormItem><FormLabel>Entity Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-11 border-2"><SelectValue /></SelectTrigger></FormControl><SelectContent>{entityTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={methods.control} name="annualTurnover" render={({ field }) => (<FormItem><FormLabel>Annual Turnover (ZAR)</FormLabel><FormControl><Input type="number" {...field} className="h-11 border-2" /></FormControl></FormItem>)} />
                        <FormField control={methods.control} name="yearsInBusiness" render={({ field }) => (<FormItem><FormLabel>Years in Operation</FormLabel><FormControl><Input type="number" {...field} className="h-11 border-2" /></FormControl></FormItem>)} />
                    </div>
                </div>
            )}

            {activeWizardSteps[currentStep].id === 'Identity' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="p-8 bg-slate-900 text-white rounded-[2rem] shadow-xl flex justify-between items-center">
                        <div className="space-y-1">
                            <h4 className="text-xs font-black uppercase text-primary">Principal Identity node</h4>
                            <p className="text-xs text-slate-400">Upload RSA ID or Passport of the primary applicant.</p>
                        </div>
                        <FileUploadField name="userIdUrl" label="Principal ID" folder="forensic-identity" />
                    </div>
                    <Separator />
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Key Management / Directors</h4>
                        <div className="p-6 border-2 border-dashed rounded-2xl space-y-4 bg-slate-50">
                             <p className="text-xs text-muted-foreground italic">Add each director, owner or authorised signatory responsible for this application.</p>
                             <div className="space-y-4">
                                {directors.fields.map((director, index) => (
                                    <div key={director.id} className="relative grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border bg-white p-4">
                                        <FormField control={methods.control} name={`directors.${index}.name`} render={({ field }) => (
                                            <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} placeholder="Director or authorised signatory" className="h-11" /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={methods.control} name={`directors.${index}.position`} render={({ field }) => (
                                            <FormItem><FormLabel>Position</FormLabel><FormControl><Input {...field} placeholder="e.g. Director, Owner, CFO" className="h-11" /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={methods.control} name={`directors.${index}.rsaIdNumber`} render={({ field }) => (
                                            <FormItem><FormLabel>RSA ID / Passport Number</FormLabel><FormControl><Input {...field} placeholder="Optional for this intake" className="h-11" /></FormControl></FormItem>
                                        )} />
                                        <div className="flex items-end justify-between gap-3">
                                            <FileUploadField name={`directors.${index}.rsaIdUrl`} label="Stakeholder ID" folder="forensic-stakeholders" />
                                            <Button type="button" variant="ghost" size="icon" className="text-destructive shrink-0" title="Remove stakeholder" onClick={() => directors.remove(index)} disabled={directors.fields.length === 1}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                ))}
                             </div>
                             <Button type="button" variant="outline" size="sm" className="font-bold" onClick={() => directors.append({ name: '', rsaIdNumber: '', position: '', rsaIdUrl: '' })}><PlusCircle className="h-4 w-4 mr-2" /> Add Stakeholder</Button>
                        </div>
                    </div>
                </div>
            )}

            {activeWizardSteps[currentStep].id === 'AssetDiscovery' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="bg-primary/5 p-6 rounded-2xl border-2 border-primary/20 space-y-2"><h3 className="font-black text-xl flex items-center gap-2"><Truck className="h-6 w-6 text-primary" /> Asset or Counterparty Discovery</h3><p className="text-sm text-muted-foreground">For asset finance, vehicle finance and discounting, establish whether the asset or counterparty has already been identified.</p></div>
                    <FormField control={methods.control} name="assetSourced" render={({ field }) => (
                        <FormItem><FormLabel>Have you found the asset, supplier or discounting counterparty?</FormLabel><FormControl><RadioGroup value={field.value} onValueChange={field.onChange} className="grid grid-cols-1 md:grid-cols-2 gap-4"><label className={cn('cursor-pointer border-2 rounded-xl p-5', field.value === 'yes' && 'border-primary bg-primary/5')}><RadioGroupItem value="yes" className="mr-3" />Yes, I have the details</label><label className={cn('cursor-pointer border-2 rounded-xl p-5', field.value === 'no' && 'border-primary bg-primary/5')}><RadioGroupItem value="no" className="mr-3" />No, help me source one</label></RadioGroup></FormControl><FormMessage /></FormItem>
                    )} />
                    {methods.watch('assetSourced') === 'no' && <Alert className="bg-amber-50 border-amber-200"><Info className="h-5 w-5 text-amber-600" /><AlertTitle>Continue without a selected asset</AlertTitle><AlertDescription>We will retain your requirement for matching. RC1 and proforma evidence can be added once an asset or counterparty is identified.</AlertDescription></Alert>}
                </div>
            )}

            {activeWizardSteps[currentStep].id === 'Supplier' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="flex items-center justify-between gap-4"><div><h3 className="font-black text-xl">Supplier / Counterparty</h3><p className="text-sm text-muted-foreground">Search our supplier records first, then complete any missing details for underwriting.</p></div><Badge variant="outline">Deal counterparty</Badge></div>
                    <div className="flex gap-3"><FormField control={methods.control} name="supplierName" render={({ field }) => <FormItem className="flex-1"><FormLabel>Supplier or Counterparty Name</FormLabel><FormControl><Input {...field} placeholder="Start typing the legal or trading name" className="h-11" /></FormControl><FormMessage /></FormItem>} /><Button type="button" variant="outline" className="self-end h-11" onClick={lookupSupplier} disabled={isLookingUpSupplier}>{isLookingUpSupplier ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Find Existing Supplier'}</Button></div>
                    {supplierLookupMessage && <Alert className="bg-muted/40"><Info className="h-4 w-4" /><AlertDescription>{supplierLookupMessage}</AlertDescription></Alert>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={methods.control} name="supplierContactName" render={({ field }) => <FormItem><FormLabel>Contact Person</FormLabel><FormControl><Input {...field} className="h-11" /></FormControl></FormItem>} />
                      <FormField control={methods.control} name="supplierEmail" render={({ field }) => <FormItem><FormLabel>Business Email</FormLabel><FormControl><Input type="email" {...field} className="h-11" /></FormControl><FormMessage /></FormItem>} />
                      <FormField control={methods.control} name="supplierPhone" render={({ field }) => <FormItem><FormLabel>Business Telephone</FormLabel><FormControl><Input {...field} className="h-11" /></FormControl></FormItem>} />
                      <FormField control={methods.control} name="supplierVatNumber" render={({ field }) => <FormItem><FormLabel>VAT Number</FormLabel><FormControl><Input {...field} className="h-11" /></FormControl></FormItem>} />
                    </div>
                    <FormField control={methods.control} name="supplierAddress" render={({ field }) => <FormItem><FormLabel>Physical Address</FormLabel><FormControl><Textarea {...field} className="min-h-20" /></FormControl></FormItem>} />
                </div>
            )}

            {activeWizardSteps[currentStep].id === 'Asset' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="bg-primary/5 p-6 rounded-2xl border-2 border-primary/20 space-y-4">
                        <h3 className="font-black text-xl flex items-center gap-2"><Truck className="h-7 w-7 text-primary" /> RC1 Asset Details</h3>
                        <p className="text-sm text-slate-600 leading-relaxed">Capture the vehicle or asset particulars exactly as reflected on the RC1 certificate. Upload the certificate for later extraction and verification.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={methods.control} name="assets.0.vehicleClass" render={({ field }) => (
                            <FormItem><FormLabel>Vehicle Class</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-11 border-2"><SelectValue placeholder="Choose..." /></SelectTrigger></FormControl><SelectContent>{vehicleClasses.map(vc => <SelectItem key={vc} value={vc}>{vc}</SelectItem>)}</SelectContent></Select></FormItem>
                        )} />
                        <FormField control={methods.control} name="assets.0.vehicleMake" render={({ field }) => <FormItem><FormLabel>Make</FormLabel><FormControl><Input {...field} className="h-11" /></FormControl></FormItem>} />
                        <FormField control={methods.control} name="assets.0.vehicleModel" render={({ field }) => <FormItem><FormLabel>Model / Body Type</FormLabel><FormControl><Input {...field} className="h-11" /></FormControl></FormItem>} />
                        <FormField control={methods.control} name="assets.0.vehicleYear" render={({ field }) => <FormItem><FormLabel>Year of Manufacture</FormLabel><FormControl><Input {...field} className="h-11" /></FormControl></FormItem>} />
                        <FormField control={methods.control} name="assets.0.registrationNumber" render={({ field }) => <FormItem><FormLabel>Registration Number</FormLabel><FormControl><Input {...field} className="h-11" /></FormControl></FormItem>} />
                        <FormField control={methods.control} name="assets.0.vehicleVin" render={({ field }) => <FormItem><FormLabel>VIN / Chassis Number</FormLabel><FormControl><Input {...field} className="h-11" /></FormControl></FormItem>} />
                        <FormField control={methods.control} name="assets.0.engineNumber" render={({ field }) => <FormItem><FormLabel>Engine Number</FormLabel><FormControl><Input {...field} className="h-11" /></FormControl></FormItem>} />
                        <FormField control={methods.control} name="assets.0.trafficRegisterNumber" render={({ field }) => <FormItem><FormLabel>Traffic Register Number</FormLabel><FormControl><Input {...field} className="h-11" /></FormControl></FormItem>} />
                        <FormField control={methods.control} name="assets.0.colour" render={({ field }) => <FormItem><FormLabel>Colour</FormLabel><FormControl><Input {...field} className="h-11" /></FormControl></FormItem>} />
                        <FormField control={methods.control} name="assets.0.tareWeight" render={({ field }) => <FormItem><FormLabel>Tare Weight (kg)</FormLabel><FormControl><Input {...field} className="h-11" /></FormControl></FormItem>} />
                        <FormField control={methods.control} name="assets.0.grossVehicleMass" render={({ field }) => <FormItem><FormLabel>Gross Vehicle Mass (kg)</FormLabel><FormControl><Input {...field} className="h-11" /></FormControl></FormItem>} />
                        <FormField control={methods.control} name="assets.0.licenceExpiry" render={({ field }) => <FormItem><FormLabel>Licence Expiry</FormLabel><FormControl><Input type="date" {...field} className="h-11" /></FormControl></FormItem>} />
                        <FileUploadField name="assets.0.rc1DocUrl" label="Attach RC1 Certificate" folder="enquiry-assets" />
                    </div>
                </div>
            )}

            {activeWizardSteps[currentStep].id === 'Proforma' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="bg-primary/5 p-6 rounded-2xl border-2 border-primary/20"><h3 className="font-black text-xl flex items-center gap-2"><FileText className="h-6 w-6 text-primary" /> Proforma Invoice Evidence</h3><p className="text-sm text-muted-foreground mt-2">Enter the commercial terms from the proforma invoice and upload it for later extraction and validation.</p></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={methods.control} name="proformaInvoiceNumber" render={({ field }) => <FormItem><FormLabel>Proforma Invoice Number</FormLabel><FormControl><Input {...field} className="h-11" /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={methods.control} name="proformaInvoiceDate" render={({ field }) => <FormItem><FormLabel>Invoice Date</FormLabel><FormControl><Input type="date" {...field} className="h-11" /></FormControl></FormItem>} />
                    <FormField control={methods.control} name="proformaSubtotal" render={({ field }) => <FormItem><FormLabel>Subtotal (ZAR)</FormLabel><FormControl><Input type="number" {...field} className="h-11" /></FormControl></FormItem>} />
                    <FormField control={methods.control} name="proformaVat" render={({ field }) => <FormItem><FormLabel>VAT (ZAR)</FormLabel><FormControl><Input type="number" {...field} className="h-11" /></FormControl></FormItem>} />
                    <FormField control={methods.control} name="proformaTotal" render={({ field }) => <FormItem><FormLabel>Invoice Total (ZAR)</FormLabel><FormControl><Input type="number" {...field} className="h-11" /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={methods.control} name="depositAmount" render={({ field }) => <FormItem><FormLabel>Applicant Deposit (ZAR)</FormLabel><FormControl><Input type="number" {...field} className="h-11" /></FormControl></FormItem>} />
                  </div>
                  <FileUploadField name="proformaInvoiceUrl" label="Attach Proforma Invoice" folder="enquiry-proformas" />
                </div>
            )}

            {activeWizardSteps[currentStep].id === 'History' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={methods.control} name="hasJudgements" render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-4 border-2 rounded-2xl bg-white">
                                <FormLabel className="font-bold text-xs">Active Judgements?</FormLabel>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )} />
                        <FormField control={methods.control} name="hasDefaults" render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-4 border-2 rounded-2xl bg-white">
                                <FormLabel className="font-bold text-xs">Active Defaults?</FormLabel>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )} />
                    </div>
                    <FormField control={methods.control} name="purpose" render={({ field }) => (<FormItem><FormLabel>Technical Purpose of Funds</FormLabel><FormControl><Textarea placeholder="Explain the commercial application of this capital..." {...field} className="min-h-[120px] border-2" /></FormControl></FormItem>)} />
                    <FormField control={methods.control} name="apiConsent" render={({ field }) => (
                        <FormItem className="flex items-center justify-between gap-4 p-4 border-2 rounded-2xl bg-white"><div><FormLabel className="font-bold text-sm">Credit and verification consent</FormLabel><p className="text-xs text-muted-foreground mt-1">I authorise credit, identity, supplier and document verification for this finance application.</p></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                    )} />
                    <Alert className="bg-primary/5 border-primary/20">
                        <Info className="h-5 w-5 text-primary" />
                        <AlertTitle className="font-bold">Automated Analysis</AlertTitle>
                        <AlertDescription className="text-xs">LOGISTICS FLOW will perform a forensic credit check upon submission.</AlertDescription>
                    </Alert>
                </div>
            )}

            {activeWizardSteps[currentStep].id === 'Finance' && (
                <div className="space-y-10 animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <FormField control={methods.control} name="amountRequested" render={({ field }) => (
                                <FormItem><FormLabel className="text-lg font-black text-primary uppercase">Amount Required (ZAR)</FormLabel><FormControl><Input type="number" {...field} className="h-14 text-2xl font-black font-mono border-2" /></FormControl></FormItem>
                            )} />
                            <FormField control={methods.control} name="preferredTerm" render={({ field }) => (
                                <FormItem><FormLabel>Preferred Term</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-11 border-2"><SelectValue placeholder="Select term..." /></SelectTrigger></FormControl><SelectContent>{termOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></FormItem>
                            )} />
                        </div>
                        <div className="p-8 bg-slate-900 text-white rounded-[2rem] shadow-xl flex flex-col justify-center gap-4">
                            <h4 className="text-[10px] font-black uppercase text-primary flex items-center gap-2"><FileText className="h-4 w-4" /> Financial Evidence</h4>
                            <p className="text-xs text-slate-400">Attach latest audited financials and recent business bank statements for underwriting.</p>
                            <FileUploadField name="afsDocUrl" label="Upload AFS" folder="forensic-nca" />
                            <FileUploadField name="bankStatementsUrl" label="Upload Bank Statements" folder="forensic-nca" />
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center pt-8 border-t">
              <Button type="button" variant="outline" onClick={() => setCurrentStep(currentStep - 1)} disabled={currentStep === 0} className="h-12 px-8 font-bold"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
              {currentStep < activeWizardSteps.length - 1 ? (
                <Button type="button" onClick={handleNext} className="h-12 px-10 font-bold">Next Step <ArrowRight className="ml-2 h-4 w-4" /></Button>
              ) : (
                <Button type="submit" disabled={isSubmitting} className="h-12 bg-primary hover:bg-primary/90 shadow-lg font-black uppercase tracking-tight text-white">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                    Analyze & Commit Node
                </Button>
              )}
            </div>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}

export default function ApplyPage() {
    return (
        <div className="container mx-auto flex min-h-screen items-center justify-center px-4 py-20 bg-slate-50 text-left text-foreground">
            <Suspense fallback={<Loader2 className="animate-spin h-12 w-12 text-primary" />}><ApplicationForm /></Suspense>
        </div>
    )
}
