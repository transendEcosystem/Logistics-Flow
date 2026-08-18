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
  userIdUrl: z.string().optional(),
  registrationDocUrl: z.string().optional(),
  afsDocUrl: z.string().optional(),
});

type ApplicationFormValues = z.infer<typeof formSchema>;

const wizardSteps = [
  { id: 'Need', name: 'Need & Channel', fields: ['fundingNeed', 'primaryRegion', 'originationType'] },
  { id: 'Profile', name: 'Business Profile', fields: ['entityType', 'companyLegalName', 'registrationNumber', 'yearsInBusiness', 'annualTurnover'] },
  { id: 'Identity', name: 'Principal Identity', fields: ['userIdUrl', 'directors'] },
  { id: 'Asset', name: 'Asset Specifics', fields: ['assets'] },
  { id: 'History', name: 'Credit & Purpose', fields: ['hasJudgements', 'hasDefaults', 'purpose', 'apiConsent'] },
  { id: 'Finance', name: 'Amount & Terms', fields: ['amountRequested', 'preferredTerm', 'afsDocUrl'] },
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

  const handleNext = async () => {
    const isValid = await methods.trigger(wizardSteps[currentStep].fields as any);
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
                <CardDescription className="text-slate-400">{wizardSteps[currentStep].name}</CardDescription>
            </div>
            <Badge variant="outline" className="border-primary/50 text-primary uppercase font-black text-[10px] tracking-widest px-3 h-6">
                {methods.watch('originationType') === 'direct' ? 'Direct Path' : 'Market Path'}
            </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-8 bg-white">
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
            
            {wizardSteps[currentStep].id === 'Need' && (
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

            {wizardSteps[currentStep].id === 'Profile' && (
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

            {wizardSteps[currentStep].id === 'Identity' && (
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
                             <p className="text-xs text-muted-foreground italic">Add at least one stakeholder responsible for signing authority.</p>
                             <Button type="button" variant="outline" size="sm" className="font-bold"><PlusCircle className="h-4 w-4 mr-2" /> Add Stakeholder</Button>
                        </div>
                    </div>
                </div>
            )}

            {wizardSteps[currentStep].id === 'Asset' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="bg-primary/5 p-6 rounded-2xl border-2 border-primary/20 space-y-4">
                        <h3 className="font-black text-xl flex items-center gap-2"><Truck className="h-7 w-7 text-primary" /> Asset Portfolio Specification</h3>
                        <p className="text-sm text-slate-600 leading-relaxed">Clearly define the equipment or vehicle type intended for finance.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField name="assets.0.vehicleClass" render={({ field }) => (
                            <FormItem><FormLabel>Vehicle Class</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-11 border-2"><SelectValue placeholder="Choose..." /></SelectTrigger></FormControl><SelectContent>{vehicleClasses.map(vc => <SelectItem key={vc} value={vc}>{vc}</SelectItem>)}</SelectContent></Select></FormItem>
                        )} />
                        <FileUploadField name="assets.0.rc1DocUrl" label="Attach RC1 Document" folder="enquiry-assets" />
                    </div>
                </div>
            )}

            {wizardSteps[currentStep].id === 'History' && (
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
                    <Alert className="bg-primary/5 border-primary/20">
                        <Info className="h-5 w-5 text-primary" />
                        <AlertTitle className="font-bold">Automated Analysis</AlertTitle>
                        <AlertDescription className="text-xs">LOGISTICS FLOW will perform a forensic credit check upon submission.</AlertDescription>
                    </Alert>
                </div>
            )}

            {wizardSteps[currentStep].id === 'Finance' && (
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
                            <p className="text-xs text-slate-400">Attach latest Audited Financials (AFS).</p>
                            <FileUploadField name="afsDocUrl" label="Upload AFS" folder="forensic-nca" />
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center pt-8 border-t">
              <Button type="button" variant="outline" onClick={() => setCurrentStep(currentStep - 1)} disabled={currentStep === 0} className="h-12 px-8 font-bold"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
              {currentStep < wizardSteps.length - 1 ? (
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
