'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, FormProvider, useFormContext, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
    Loader2, Landmark, ArrowLeft, ArrowRight, CheckCircle, ShieldCheck, 
    History, Building, FileUp, Users, UserCircle, ShieldAlert, CheckCircle2, 
    ListChecks, Save, User, UserCheck, Gavel, Scale, Info, Trash2, UserPlus,
    FileText, Sparkles, Wrench, RefreshCcw, MapPin, Banknote, Truck, Zap, PlusCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { getClientSideAuthToken, useFirestore } from '@/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { doc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';

// --- SCHEMAS ---

const stakeholderSchema = z.object({
    name: z.string().min(1, "Full name required."),
    rsaIdNumber: z.string().optional(),
    rsaIdUrl: z.string().optional(),
});

const bankMonthSchema = z.object({
  month: z.string().optional(),
  openingBalance: z.coerce.number().min(0).default(0),
  closingBalance: z.coerce.number().min(0).default(0),
  totalIn: z.coerce.number().min(0).default(0),
  totalOut: z.coerce.number().min(0).default(0),
});

const bankAccountDeclarationSchema = z.object({
  bankName: z.string().optional(),
  accountHolderName: z.string().optional(),
  accountNumber: z.string().optional(),
  months: z.array(bankMonthSchema).length(3).default([
    { month: 'Month 1', openingBalance: 0, closingBalance: 0, totalIn: 0, totalOut: 0 },
    { month: 'Month 2', openingBalance: 0, closingBalance: 0, totalIn: 0, totalOut: 0 },
    { month: 'Month 3', openingBalance: 0, closingBalance: 0, totalIn: 0, totalOut: 0 },
  ]),
});

const vehicleAssetSchema = z.object({
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.coerce.number().optional(),
  value: z.coerce.number().min(0).default(0),
  outstanding: z.coerce.number().min(0).default(0),
  lender: z.string().optional(),
  registrationNumber: z.string().optional(),
  insuranceStatus: z.enum(['unknown', 'insured', 'not_insured']).default('unknown'),
});

const equipmentAssetSchema = z.object({
  description: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.coerce.number().optional(),
  value: z.coerce.number().min(0).default(0),
  outstanding: z.coerce.number().min(0).default(0),
  lender: z.string().optional(),
  insuranceStatus: z.enum(['unknown', 'insured', 'not_insured']).default('unknown'),
});

const propertyAssetSchema = z.object({
  description: z.string().optional(),
  address: z.string().optional(),
  value: z.coerce.number().min(0).default(0),
  outstanding: z.coerce.number().min(0).default(0),
  lender: z.string().optional(),
  insuranceStatus: z.enum(['unknown', 'insured', 'not_insured']).default('unknown'),
});

const supplierWizardSchema = z.object({
  name: z.string().min(1, 'Entity name is required'),
  category: z.string().min(1, 'Category is required'),
  entityType: z.string().optional(),
  registrationId: z.string().optional(),
  vatRegistered: z.boolean().default(false),
  vatNumber: z.string().optional(),
  globalFacilityLimit: z.coerce.number().min(0).default(0),
  shareholderCount: z.coerce.number().min(0).default(0),
  directorCount: z.coerce.number().min(0).default(0),
  shareholders: z.array(stakeholderSchema).optional().default([]),
  directors: z.array(stakeholderSchema).optional().default([]),
  hasJudgements: z.boolean().default(false),
  hasDefaults: z.boolean().default(false),
  ownsOperatingProperty: z.boolean().default(false),
  workAddress: z.object({
      street: z.string().optional(),
      suburb: z.string().optional(),
      city: z.string().optional(),
      province: z.string().optional(),
      postalCode: z.string().optional(),
  }).optional(),
  propertyStanding: z.enum(['rented', 'owned']).default('rented'),
  landlordDetails: z.object({
      name: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
  }).optional(),
  leaseTerms: z.object({
      rentPerMonth: z.coerce.number().optional(),
      expiryDate: z.string().optional(),
      sinceDate: z.string().optional(),
  }).optional(),
  isPropertyFinanced: z.boolean().default(false),
  propertyMarketValue: z.coerce.number().optional(),
  bondDetails: z.object({
      bank: z.string().optional(),
      bondNumber: z.string().optional(),
      accountNumber: z.string().optional(),
      term: z.coerce.number().optional(),
      originalAmount: z.coerce.number().optional(),
      outstandingBalance: z.coerce.number().optional(),
  }).optional(),
  bankAccountDetails: z.object({
      bankName: z.string().optional(),
      accountNumber: z.string().optional(),
      branchCode: z.string().optional(),
      accountType: z.string().optional(),
      accountHolderName: z.string().optional(),
      openBankingAuthorised: z.boolean().default(false),
      openBankingConsentRef: z.string().optional(),
  }).optional(),
  bankAccounts: z.array(bankAccountDeclarationSchema).default([]),
  bankStatement1Url: z.string().optional(),
  bankStatement2Url: z.string().optional(),
  bankStatement3Url: z.string().optional(),
  managementAccountsUrl: z.string().optional(),
  auditors: z.object({
      firmName: z.string().optional(),
      contactName: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      practiceNumber: z.string().optional(),
  }).optional(),
  tradingHistory: z.object({
      tradingSince: z.string().optional(),
      primaryActivities: z.string().optional(),
      keyCustomers: z.string().optional(),
      keySuppliers: z.string().optional(),
      materialEvents: z.string().optional(),
  }).optional(),
  existingBankFacilityDetails: z.object({
      bankName: z.string().optional(),
      holdsCessionOfBookDebts: z.boolean().default(false),
      holdsNotarialBond: z.boolean().default(false),
      facilityAgreementDocUrl: z.string().optional(),
  }).optional(),
  collateralGranted: z.string().optional(),
  vehicleAssets: z.array(vehicleAssetSchema).default([]),
  equipmentAssets: z.array(equipmentAssetSchema).default([]),
  propertyAssets: z.array(propertyAssetSchema).default([]),
  financialSnapshot: z.object({
      monthlyRevenue: z.coerce.number().min(0).default(0),
      monthlyExpenses: z.coerce.number().min(0).default(0),
      monthlyDebtRepayments: z.coerce.number().min(0).default(0),
      cashAtBank: z.coerce.number().min(0).default(0),
      notes: z.string().optional(),
  }).default({ monthlyRevenue: 0, monthlyExpenses: 0, monthlyDebtRepayments: 0, cashAtBank: 0 }),
  insuranceDeclaration: z.object({
      hasBusinessInsurance: z.boolean().default(false),
      insurerName: z.string().optional(),
      policyReference: z.string().optional(),
      lenderInterestNoted: z.boolean().default(false),
  }).default({ hasBusinessInsurance: false, lenderInterestNoted: false }),
  insolvencyDeclaration: z.object({
      hasInsolvencyProceedings: z.boolean().default(false),
      details: z.string().optional(),
  }).default({ hasInsolvencyProceedings: false }),
  userIdUrl: z.string().optional(),
  registrationDocUrl: z.string().optional(),
  ficaDocUrl: z.string().optional(),
  afsDocUrl: z.string().optional(),
  minedServiceWording: z.string().optional(),
});

type SupplierFormValues = z.infer<typeof supplierWizardSchema>;

// --- HELPER COMPONENTS ---

function FileUploadField({ name, label, folder }: { name: any, label: string, folder: string }) {
    const { setValue, watch } = useFormContext<SupplierFormValues>();
    const [isUploading, setIsUploading] = useState(false);
    const { toast } = useToast();
    const currentUrl = watch(name);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const token = await getClientSideAuthToken();
            const reader = new FileReader();
            const dataUri = await new Promise<string>((res) => {
                reader.onload = () => res(reader.result as string);
                reader.readAsDataURL(file);
            });
            const response = await fetch('/api/uploadImageAsset', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileDataUri: dataUri, folder: `${folder}`, fileName: `${name}_${Date.now()}_${file.name}` })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            setValue(name, result.url, { shouldValidate: true, shouldDirty: true });
            toast({ title: "Document Attached" });
        } catch (err: any) {
            toast({ variant: 'destructive', title: "Upload Failed", description: err.message });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-1.5 text-left text-foreground">
            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">{label}</Label>
            <Button 
                type="button" 
                variant="outline" 
                className={cn("w-full h-11 border-2 border-dashed gap-2 font-bold", currentUrl && "border-green-50 bg-green-50 text-green-700")}
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

const StakeholderNode = ({ index, type, onRemove }: { index: number, type: 'shareholders' | 'directors', onRemove: () => void }) => {
    const { control } = useFormContext<SupplierFormValues>();
    return (
        <div className="p-6 border-2 rounded-2xl bg-white shadow-sm space-y-4 relative animate-in fade-in duration-300 text-left text-foreground text-foreground">
            <div className="flex justify-between items-center text-left text-foreground">
                <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2 text-left text-foreground">
                    <UserCircle className="h-4 w-4" /> {type.slice(0, -1)} #{index + 1}
                </h4>
                <Button variant="ghost" size="icon" onClick={onRemove} className="text-destructive h-8 w-8 text-foreground"><Trash2 className="h-4 w-4" /></Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left text-foreground text-foreground">
                <FormField control={control} name={`${type}.${index}.name` as any} render={({ field }) => (<FormItem className="text-left text-foreground"><FormLabel>Full Name</FormLabel><FormControl><Input {...field} className="h-10 border-2 bg-white" /></FormControl></FormItem>)} />
                <FormField control={control} name={`${type}.${index}.rsaIdNumber` as any} render={({ field }) => (<FormItem className="text-left text-foreground"><FormLabel>RSA ID Number</FormLabel><FormControl><Input {...field} className="h-10 border-2 font-mono bg-white" /></FormControl></FormItem>)} />
            </div>
            <FileUploadField name={`${type}.${index}.rsaIdUrl`} label="Attach Identity Scan" folder={`suppliers-${type}`} />
        </div>
    );
};

// --- WIZARD TERMINAL ---

export function EditSupplierWizard({ supplier, onSave, onBack }: { supplier?: any, onSave: () => void, onBack: () => void }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const methods = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierWizardSchema),
    mode: 'onChange',
    defaultValues: supplier || { 
        status: 'draft', 
        shareholderCount: 0, 
        directorCount: 0, 
        shareholders: [], 
        directors: [],
        vatRegistered: false,
        hasJudgements: false,
        hasDefaults: false,
        ownsOperatingProperty: false,
        globalFacilityLimit: 0,
        propertyStanding: 'rented',
        isPropertyFinanced: false,
        bankAccounts: [],
        vehicleAssets: [],
        equipmentAssets: [],
        propertyAssets: [],
        financialSnapshot: { monthlyRevenue: 0, monthlyExpenses: 0, monthlyDebtRepayments: 0, cashAtBank: 0 },
        insuranceDeclaration: { hasBusinessInsurance: false, lenderInterestNoted: false },
        insolvencyDeclaration: { hasInsolvencyProceedings: false }
    }
  });

  const { fields: shareholderFields, append: appendShareholder, remove: removeShareholder } = useFieldArray({ control: methods.control, name: 'shareholders' });
  const { fields: directorFields, append: appendDirector, remove: removeDirector } = useFieldArray({ control: methods.control, name: 'directors' });
  const { fields: bankAccountFields, append: appendBankAccount, remove: removeBankAccount } = useFieldArray({ control: methods.control, name: 'bankAccounts' });
  const { fields: vehicleFields, append: appendVehicle, remove: removeVehicle } = useFieldArray({ control: methods.control, name: 'vehicleAssets' });
  const { fields: equipmentFields, append: appendEquipment, remove: removeEquipment } = useFieldArray({ control: methods.control, name: 'equipmentAssets' });
  const { fields: propertyFields, append: appendProperty, remove: removeProperty } = useFieldArray({ control: methods.control, name: 'propertyAssets' });

  const watched = methods.watch();

  const steps = useMemo(() => {
      const base = [
        { id: 'main', title: '1. Identity', icon: User, fields: ['name', 'category', 'userIdUrl'] },
        { id: 'entity', title: '2. Entity', icon: Building, fields: ['entityType', 'registrationId', 'vatRegistered', 'vatNumber', 'registrationDocUrl', 'globalFacilityLimit'] },
        { id: 'standing', title: '3. Standing', icon: MapPin, fields: ['workAddress', 'propertyStanding'] },
      ];
      if (watched.propertyStanding === 'owned' && watched.isPropertyFinanced) {
          base.push({ id: 'prop_finance', title: '4. Prop Finance', icon: Banknote, fields: ['bondDetails'] });
      }
      base.push({ id: 'bank-account', title: 'Bank & Open Banking', icon: Landmark, fields: ['bankAccountDetails'] });
      base.push({ id: 'bank-statements', title: 'Bank Statements', icon: Banknote, fields: ['bankStatement1Url', 'bankStatement2Url', 'bankStatement3Url'] });
      base.push({ id: 'management-accounts', title: 'Management Accounts', icon: Banknote, fields: ['managementAccountsUrl'] });
      base.push({ id: 'afs', title: 'Annual Financial Statements', icon: FileText, fields: ['afsDocUrl'] });
      base.push({ id: 'auditors', title: 'Auditors', icon: ShieldCheck, fields: ['auditors'] });
      base.push({ id: 'trading-history', title: 'Trading History', icon: History, fields: ['tradingHistory'] });
      base.push({ id: 'assets', title: 'Assets', icon: Truck, fields: [] });
      base.push({ id: 'collateral-granted', title: 'Collateral Granted', icon: Scale, fields: ['collateralGranted'] });
      base.push({ id: 'governance', title: (watched.propertyStanding === 'owned' && watched.isPropertyFinanced) ? '5. Governance' : '4. Governance', icon: Gavel, fields: ['shareholderCount', 'directorCount'] });
      base.push({ id: 'shareholders', title: (watched.propertyStanding === 'owned' && watched.isPropertyFinanced) ? '6. Shareholders' : '5. Shareholders', icon: Users, fields: ['shareholders'] });
      base.push({ id: 'directors', title: (watched.propertyStanding === 'owned' && watched.isPropertyFinanced) ? '7. Directors' : '6. Directors', icon: UserCheck, fields: ['directors'] });
      base.push({ id: 'review', title: 'Audit Check', icon: ShieldCheck, fields: [] });
      return base;
  }, [watched.propertyStanding, watched.isPropertyFinanced]);

  const handleStepTransition = async (direction: 'next' | 'back' | number) => {
    const isMovingForward = direction === 'next' || (typeof direction === 'number' && direction > currentStep);

    if (isMovingForward) {
        const isValid = await methods.trigger(steps[currentStep].fields as any);
        if (!isValid) return;

        // EVENT-DRIVEN STAKEHOLDER SYNC
        if (steps[currentStep].id === 'governance') {
            const sCount = Number(methods.getValues('shareholderCount')) || 0;
            const dCount = Number(methods.getValues('directorCount')) || 0;
            
            const curS = shareholderFields.length;
            if (sCount > curS) {
                for (let i = 0; i < sCount - curS; i++) appendShareholder({ name: '' });
            } else if (sCount < curS) {
                for (let i = 0; i < curS - sCount; i++) removeShareholder(curS - 1 - i);
            }

            const curD = directorFields.length;
            if (dCount > curD) {
                for (let i = 0; i < dCount - curD; i++) appendDirector({ name: '' });
            } else if (dCount < curD) {
                for (let i = 0; i < curD - dCount; i++) removeDirector(curD - 1 - i);
            }
        }
    }

    if (typeof direction === 'number') {
        setCurrentStep(direction);
    } else if (direction === 'next') {
        setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    } else {
        setCurrentStep(prev => Math.max(prev - 1, 0));
    }
  };

  const onSubmit = async (values: SupplierFormValues) => {
    setIsSubmitting(true);
    try {
        const token = await getClientSideAuthToken();
        if (!token) throw new Error("Auth failed.");
        const ref = supplier?.id ? doc(firestore, 'lendingSuppliers', supplier.id) : doc(collection(firestore, 'lendingSuppliers'));
        await setDoc(ref, { ...values, id: ref.id, updatedAt: serverTimestamp() }, { merge: true });
        toast({ title: 'Supplier Node Committed' });
        onSave();
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Commit Failed', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  const currentStepConfig = steps[currentStep];
  const watchedValues = methods.watch();

  return (
    <Card className="max-w-6xl mx-auto shadow-2xl border-none overflow-hidden text-left text-foreground">
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} onKeyDown={(e) => { if(e.key === 'Enter') e.preventDefault(); }}>
          <CardHeader className="bg-slate-900 text-white p-8 border-b border-white/5 text-left text-white text-left">
            <div className="flex justify-between items-center text-left text-white">
              <div className="text-left text-white">
                <CardTitle className="text-2xl font-black font-headline uppercase text-white text-left">Supplier Protocol Terminal</CardTitle>
                <CardDescription className="text-slate-400 text-lg mt-1">Section: {currentStepConfig.title}</CardDescription>
              </div>
              <Button type="button" variant="ghost" className="text-white hover:text-primary" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Exit Terminal</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 text-left">
            <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] text-left">
              <div className="bg-slate-50 border-r p-6 space-y-2 text-left">
                {steps.map((step, i) => (
                  <Button key={step.id} type="button" variant={currentStep === i ? "secondary" : "ghost"} className={cn("w-full justify-start gap-3 h-10 px-3 transition-all text-left", currentStep === i && "bg-white shadow-sm ring-1 ring-primary/20")} onClick={() => handleStepTransition(i)}>
                    {React.createElement(step.icon, { className: cn("h-4 w-4", currentStep >= i ? "text-primary" : "text-muted-foreground") })}
                    <span className={cn("text-[11px] font-black uppercase text-left", currentStep === i ? "text-primary" : "text-muted-foreground")}>{step.title.includes('. ') ? step.title.split('. ')[1] : step.title}</span>
                  </Button>
                ))}
              </div>
              <div className="p-12 min-h-[600px] text-left text-foreground">
                {currentStepConfig.id === 'main' && (
                    <div className="space-y-8 text-left animate-in fade-in duration-500">
                        <FormField control={methods.control} name="name" render={({ field }) => (<FormItem className="text-left text-foreground"><FormLabel>Legal Trading Name</FormLabel><FormControl><Input {...field} value={field.value || ''} className="h-12 border-2 bg-white font-black text-lg" /></FormControl></FormItem>)} />
                        <FormField control={methods.control} name="category" render={({ field }) => (<FormItem className="text-left text-foreground"><FormLabel>Industrial Trade (e.g. Scania Dealer)</FormLabel><FormControl><Input {...field} value={field.value || ''} className="h-11 border-2 bg-white" /></FormControl></FormItem>)} />
                        <div className="p-8 bg-slate-900 text-white rounded-[2rem] shadow-xl space-y-4 text-left text-white text-left">
                            <h4 className="text-[10px] font-black uppercase text-primary flex items-center gap-2 text-left text-white"><User className="h-4 w-4" /> Principal Identity Node</h4>
                            <FileUploadField name="userIdUrl" label="Principal RSA ID / Passport" folder="suppliers-identity" />
                        </div>
                    </div>
                )}
                {currentStepConfig.id === 'entity' && (
                    <div className="space-y-8 text-left animate-in fade-in duration-500 text-foreground">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left text-foreground text-foreground">
                            <div className="space-y-6 text-left">
                                <FormField control={methods.control} name="entityType" render={({ field }) => (
                                    <FormItem className="text-left text-foreground"><FormLabel>Entity Type</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger className="h-11 border-2 bg-white"><SelectValue placeholder="Choose..." /></SelectTrigger></FormControl><SelectContent>{['Pty Ltd', 'Ltd', 'CC', 'Sole Prop', 'Trust'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></FormItem>
                                )} />
                                <FormField control={methods.control} name="registrationId" render={({ field }) => (<FormItem className="text-left text-foreground"><FormLabel>CIPC Registration Number</FormLabel><FormControl><Input {...field} value={field.value || ''} placeholder="20XX/XXXXXX/07" className="h-11 border-2 bg-white" /></FormControl></FormItem>)} />
                                <FormField control={methods.control} name="globalFacilityLimit" render={({ field }) => (
                                    <FormItem className="text-left text-foreground">
                                        <FormLabel className="text-primary font-black uppercase text-[10px]">Global Facility Limit (ZAR)</FormLabel>
                                        <FormControl><Input type="number" {...field} className="h-11 border-2 bg-white font-black text-lg" /></FormControl>
                                    </FormItem>
                                )} />
                                <FormField control={methods.control} name="vatRegistered" render={({ field }) => (
                                    <FormItem className="flex items-center justify-between p-4 border-2 rounded-2xl bg-white text-left text-foreground">
                                        <FormLabel className="font-black uppercase text-xs">VAT Registered?</FormLabel>
                                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    </FormItem>
                                )} />
                                {watchedValues.vatRegistered && (
                                    <FormField control={methods.control} name="vatNumber" render={({ field }) => (<FormItem className="text-left animate-in fade-in slide-in-from-left-2 text-foreground"><FormLabel>VAT Number</FormLabel><FormControl><Input {...field} value={field.value || ''} className="h-11 border-2 font-mono bg-white" /></FormControl></FormItem>)} />
                                )}
                            </div>
                            <div className="p-8 bg-slate-900 text-white rounded-[2rem] shadow-xl flex flex-col justify-center gap-4 text-left text-white text-left">
                                <h4 className="text-[10px] font-black uppercase text-primary flex items-center gap-2 text-left text-white"><FileText className="h-4 w-4" /> Founding Evidence</h4>
                                <FileUploadField name="registrationDocUrl" label="Registration Document" folder="suppliers-legal" />
                            </div>
                        </div>
                    </div>
                )}
                {currentStepConfig.id === 'standing' && (
                    <div className="space-y-10 animate-in fade-in duration-500 text-left text-foreground">
                        <div className="space-y-4 text-left">
                            <h3 className="font-black text-lg uppercase flex items-center gap-2 text-left"><MapPin className="h-6 w-6 text-primary" /> Work Address Ledger</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={methods.control} name="workAddress.street" render={({ field }) => (<FormItem className="text-left"><FormLabel>Street Address</FormLabel><FormControl><Input {...field} className="bg-white border-2" /></FormControl></FormItem>)} />
                                <FormField control={methods.control} name="workAddress.suburb" render={({ field }) => (<FormItem className="text-left"><FormLabel>Suburb</FormLabel><FormControl><Input {...field} className="bg-white border-2" /></FormControl></FormItem>)} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField control={methods.control} name="workAddress.city" render={({ field }) => (<FormItem className="text-left"><FormLabel>City</FormLabel><FormControl><Input {...field} className="bg-white border-2" /></FormControl></FormItem>)} />
                                <FormField control={methods.control} name="workAddress.province" render={({ field }) => (<FormItem className="text-left"><FormLabel>Province</FormLabel><FormControl><Input {...field} className="bg-white border-2" /></FormControl></FormItem>)} />
                                <FormField control={methods.control} name="workAddress.postalCode" render={({ field }) => (<FormItem className="text-left"><FormLabel>Post Code</FormLabel><FormControl><Input {...field} className="bg-white border-2 font-mono" /></FormControl></FormItem>)} />
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-6 text-left">
                            <FormField control={methods.control} name="propertyStanding" render={({ field }) => (
                                <FormItem className="space-y-4 text-left">
                                    <FormLabel className="font-black uppercase text-[10px] text-primary tracking-widest text-left">Premises Infrastructure Standing</FormLabel>
                                    <FormControl>
                                        <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-2 gap-4 text-left">
                                            <div className={cn("p-4 border-2 rounded-2xl cursor-pointer", field.value === 'rented' ? "border-primary bg-primary/5 shadow-md" : "bg-white")}><div className="flex items-center gap-2"><RadioGroupItem value="rented" id="p-rent" /><Label htmlFor="p-rent" className="font-bold uppercase text-xs cursor-pointer text-foreground">Rented / Lease</Label></div></div>
                                            <div className={cn("p-4 border-2 rounded-2xl cursor-pointer", field.value === 'owned' ? "border-primary bg-primary/5 shadow-md" : "bg-white")}><div className="flex items-center gap-2"><RadioGroupItem value="owned" id="p-own" /><Label htmlFor="p-own" className="font-bold uppercase text-xs cursor-pointer text-foreground">Owned Asset</Label></div></div>
                                        </RadioGroup>
                                    </FormControl>
                                </FormItem>
                            )} />

                            {watchedValues.propertyStanding === 'rented' ? (
                                <div className="p-8 border-2 border-dashed rounded-3xl bg-slate-50 space-y-6 animate-in slide-in-from-top-2 text-left">
                                    <h4 className="font-black text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2 text-left"><UserPlus className="h-4 w-4" /> Landlord & Lease Details</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left text-foreground">
                                        <FormField control={methods.control} name="landlordDetails.name" render={({ field }) => (<FormItem className="text-left text-foreground"><FormLabel>Landlord Name</FormLabel><FormControl><Input {...field} className="bg-white" /></FormControl></FormItem>)} />
                                        <FormField control={methods.control} name="landlordDetails.phone" render={({ field }) => (<FormItem className="text-left"><FormLabel>Landlord Phone</FormLabel><FormControl><Input {...field} className="bg-white" /></FormControl></FormItem>)} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                                        <FormField control={methods.control} name="leaseTerms.rentPerMonth" render={({ field }) => (<FormItem className="text-left text-foreground"><FormLabel>Monthly Rent (R)</FormLabel><FormControl><Input type="number" {...field} className="bg-white" /></FormControl></FormItem>)} />
                                        <FormField control={methods.control} name="leaseTerms.sinceDate" render={({ field }) => (<FormItem className="text-left text-foreground"><FormLabel>Tenant Since</FormLabel><FormControl><Input type="date" {...field} className="bg-white" /></FormControl></FormItem>)} />
                                        <FormField control={methods.control} name="leaseTerms.expiryDate" render={({ field }) => (<FormItem className="text-left text-foreground"><FormLabel>Lease Expiry</FormLabel><FormControl><Input type="date" {...field} className="bg-white" /></FormControl></FormItem>)} />
                                    </div>
                                </div>
                            ) : (
                                <div className="p-8 border-2 border-dashed rounded-3xl bg-slate-50 space-y-6 animate-in slide-in-from-top-2 text-left">
                                    <div className="flex items-center justify-between text-left">
                                        <h4 className="font-black text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2 text-left"><Landmark className="h-4 w-4" /> Ownership Standing</h4>
                                        <div className="flex items-center gap-3">
                                            <Label className="text-[10px] font-black uppercase text-muted-foreground">Is Financed (Bonded)?</Label>
                                            <FormField control={methods.control} name="isPropertyFinanced" render={({ field }) => (
                                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                            )} />
                                        </div>
                                    </div>
                                    <FormField control={methods.control} name="propertyMarketValue" render={({ field }) => (
                                        <FormItem className="max-w-xs text-left"><FormLabel>Est. Market Value (ZAR)</FormLabel><FormControl><Input type="number" {...field} className="bg-white border-2" /></FormControl></FormItem>
                                    )} />
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-6 text-left text-foreground">
                                <FileUploadField 
                                    name="ficaDocUrl" 
                                    label={watchedValues.propertyStanding === 'owned' ? "Title Deed / Bond Statement" : "Signed Lease Agreement"} 
                                    folder="suppliers-standing" 
                                />
                            </div>
                        </div>
                    </div>
                )}

                {currentStepConfig.id === 'prop_finance' && (
                    <div className="space-y-10 animate-in fade-in duration-500 text-left">
                        <div className="space-y-4 text-left">
                            <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2 text-left"><Banknote className="h-6 w-6 text-primary" /> Property Finance Node</h3>
                            <p className="text-sm text-muted-foreground text-left">Declare the primary debt instrument attached to the operational premises.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                             <FormField control={methods.control} name="bondDetails.bank" render={({ field }) => (<FormItem className="text-left"><FormLabel>Financing Institution (Bank)</FormLabel><FormControl><Input {...field} className="bg-white border-2" /></FormControl></FormItem>)} />
                             <FormField control={methods.control} name="bondDetails.bondNumber" render={({ field }) => (<FormItem className="text-left"><FormLabel>Bond Reference #</FormLabel><FormControl><Input {...field} className="bg-white border-2 font-mono" /></FormControl></FormItem>)} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                             <FormField control={methods.control} name="bondDetails.originalAmount" render={({ field }) => (<FormItem className="text-left"><FormLabel>Original Amount (R)</FormLabel><FormControl><Input type="number" {...field} className="bg-white border-2 font-bold" /></FormControl></FormItem>)} />
                             <FormField control={methods.control} name="bondDetails.outstandingBalance" render={({ field }) => (<FormItem className="text-left"><FormLabel>Outstanding Balance (R)</FormLabel><FormControl><Input type="number" {...field} className="bg-white border-2 font-black text-destructive" /></FormControl></FormItem>)} />
                             <FormField control={methods.control} name="bondDetails.term" render={({ field }) => (<FormItem className="text-left"><FormLabel>Term (Months)</FormLabel><FormControl><Input type="number" {...field} className="bg-white border-2" /></FormControl></FormItem>)} />
                        </div>
                        <div className="p-8 bg-primary/5 border-2 border-primary/20 rounded-[2.5rem] flex justify-between items-center text-left">
                            <div className="text-left">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Estimated Repaid Capital</Label>
                                <p className="text-4xl font-black text-primary text-left">
                                    {formatCurrency((watched.bondDetails?.originalAmount || 0) - (watched.bondDetails?.outstandingBalance || 0))}
                                </p>
                            </div>
                            <Badge variant="outline" className="bg-white border-primary/20 h-10 px-6 font-black uppercase tracking-widest text-xs text-left">
                                LTV: {((watched.bondDetails?.outstandingBalance || 0) / (watched.propertyMarketValue || 1) * 100).toFixed(1)}%
                            </Badge>
                        </div>
                    </div>
                )}

                {currentStepConfig.id === 'bank-account' && (
                  <div className="space-y-6 animate-in fade-in duration-500 text-left">
                    <div>
                      <h3 className="text-xl font-black uppercase flex items-center gap-2">
                        <Landmark className="h-6 w-6 text-primary" /> Bank Account & Open Banking Authorisation
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Capture supplier bank details and grant Open Banking API authorisation for automated cashflow retrieval during Discovery.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={methods.control} name="bankAccountDetails.bankName" render={({ field }) => (
                        <FormItem className="text-left">
                          <FormLabel>Banking Institution</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger className="border-2 bg-white"><SelectValue placeholder="Select bank..." /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {['Standard Bank', 'FNB', 'ABSA', 'Nedbank', 'Capitec', 'Investec', 'TymeBank', 'Discovery Bank', 'African Bank', 'Other'].map(b => (
                                <SelectItem key={b} value={b}>{b}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />

                      <FormField control={methods.control} name="bankAccountDetails.accountType" render={({ field }) => (
                        <FormItem className="text-left">
                          <FormLabel>Account Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger className="border-2 bg-white"><SelectValue placeholder="Select type..." /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {['Cheque / Current', 'Transmission', 'Savings', 'Corporate'].map(t => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />

                      <FormField control={methods.control} name="bankAccountDetails.accountHolderName" render={({ field }) => (
                        <FormItem className="text-left">
                          <FormLabel>Account Holder Name</FormLabel>
                          <FormControl><Input {...field} value={field.value || ''} placeholder="e.g. Supplier Entity (Pty) Ltd" className="border-2 bg-white font-bold" /></FormControl>
                        </FormItem>
                      )} />

                      <FormField control={methods.control} name="bankAccountDetails.accountNumber" render={({ field }) => (
                        <FormItem className="text-left">
                          <FormLabel>Account Number</FormLabel>
                          <FormControl><Input {...field} value={field.value || ''} placeholder="e.g. 10192837465" className="border-2 bg-white font-mono font-bold" /></FormControl>
                        </FormItem>
                      )} />

                      <FormField control={methods.control} name="bankAccountDetails.branchCode" render={({ field }) => (
                        <FormItem className="text-left">
                          <FormLabel>Branch Code</FormLabel>
                          <FormControl><Input {...field} value={field.value || ''} placeholder="e.g. 051001" className="border-2 bg-white font-mono" /></FormControl>
                        </FormItem>
                      )} />

                      <FormField control={methods.control} name="bankAccountDetails.openBankingConsentRef" render={({ field }) => (
                        <FormItem className="text-left">
                          <FormLabel>Open Banking Consent Ref</FormLabel>
                          <FormControl><Input {...field} value={field.value || ''} placeholder="Auto-generated upon authorisation" className="border-2 bg-white font-mono text-xs" /></FormControl>
                        </FormItem>
                      )} />
                    </div>

                    <div className="p-6 bg-primary/5 border-2 border-primary/20 rounded-2xl space-y-3 text-left">
                      <div className="flex items-center justify-between text-left">
                        <div>
                          <h4 className="font-black text-sm uppercase text-primary flex items-center gap-2">
                            <Zap className="h-4 w-4" /> Open Banking API Authorisation
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Authorize automated 90-day bank statement retrieval & cashflow verification via Open Banking API (Stitch / Mono / TruID).
                          </p>
                        </div>
                        <FormField control={methods.control} name="bankAccountDetails.openBankingAuthorised" render={({ field }) => (
                          <FormControl><Switch checked={Boolean(field.value)} onCheckedChange={(val) => {
                            field.onChange(val);
                            if (val && !methods.getValues('bankAccountDetails.openBankingConsentRef')) {
                              methods.setValue('bankAccountDetails.openBankingConsentRef', `OB-CONSENT-${Date.now().toString().slice(-6)}`);
                            }
                          }} /></FormControl>
                        )} />
                      </div>
                      <p className="text-[11px] text-muted-foreground italic border-t border-primary/10 pt-2">
                        By enabling this authorisation, the supplier grants explicit consent for the platform to query bank cashflow statements, verify turnover, and extract transaction history via secure Open Banking APIs during Discovery.
                      </p>
                    </div>
                  </div>
                )}

                {currentStepConfig.id === 'bank-statements' && (
                  <div className="space-y-8 animate-in fade-in duration-500 text-left">
                    <div>
                      <h3 className="text-xl font-black uppercase flex items-center gap-2"><Banknote className="h-6 w-6 text-primary" /> Bank Statements & Cashflow Declaration</h3>
                      <p className="text-sm text-muted-foreground">List every bank account used by the business and declare opening balance, closing balance, total money in, and total money out for each of the past three months. These figures are a leading affordability indicator and will be extracted and cross-referenced against uploaded statements.</p>
                    </div>
                    {bankAccountFields.map((account, accountIndex) => (
                      <div key={account.id} className="p-5 border-2 rounded-2xl bg-slate-50 space-y-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
                            <FormField control={methods.control} name={`bankAccounts.${accountIndex}.bankName`} render={({ field }) => <FormItem><FormLabel>Bank</FormLabel><FormControl><Input {...field} className="bg-white" /></FormControl></FormItem>} />
                            <FormField control={methods.control} name={`bankAccounts.${accountIndex}.accountHolderName`} render={({ field }) => <FormItem><FormLabel>Account holder</FormLabel><FormControl><Input {...field} className="bg-white" /></FormControl></FormItem>} />
                            <FormField control={methods.control} name={`bankAccounts.${accountIndex}.accountNumber`} render={({ field }) => <FormItem><FormLabel>Account number</FormLabel><FormControl><Input {...field} className="bg-white font-mono" /></FormControl></FormItem>} />
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => removeBankAccount(accountIndex)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {[0, 1, 2].map((monthIndex) => (
                            <div key={monthIndex} className="p-4 bg-white border rounded-xl space-y-3">
                              <h4 className="text-xs font-black uppercase tracking-widest text-primary">Month {monthIndex + 1}</h4>
                              <FormField control={methods.control} name={`bankAccounts.${accountIndex}.months.${monthIndex}.openingBalance`} render={({ field }) => <FormItem><FormLabel>Opening balance</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>} />
                              <FormField control={methods.control} name={`bankAccounts.${accountIndex}.months.${monthIndex}.closingBalance`} render={({ field }) => <FormItem><FormLabel>Closing balance</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>} />
                              <FormField control={methods.control} name={`bankAccounts.${accountIndex}.months.${monthIndex}.totalIn`} render={({ field }) => <FormItem><FormLabel>Total money in</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>} />
                              <FormField control={methods.control} name={`bankAccounts.${accountIndex}.months.${monthIndex}.totalOut`} render={({ field }) => <FormItem><FormLabel>Total money out</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <Button type="button" variant="outline" onClick={() => appendBankAccount({ bankName: '', accountHolderName: '', accountNumber: '', months: [{ month: 'Month 1', openingBalance: 0, closingBalance: 0, totalIn: 0, totalOut: 0 }, { month: 'Month 2', openingBalance: 0, closingBalance: 0, totalIn: 0, totalOut: 0 }, { month: 'Month 3', openingBalance: 0, closingBalance: 0, totalIn: 0, totalOut: 0 }] })}><PlusCircle className="mr-2 h-4 w-4" />Add bank account</Button>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5"><FileUploadField name="bankStatement1Url" label="Statement - Month 1" folder="suppliers-financials/bank-statements" /><FileUploadField name="bankStatement2Url" label="Statement - Month 2" folder="suppliers-financials/bank-statements" /><FileUploadField name="bankStatement3Url" label="Statement - Month 3" folder="suppliers-financials/bank-statements" /></div>
                  </div>
                )}

                {currentStepConfig.id === 'management-accounts' && <div className="space-y-6 animate-in fade-in duration-500"><div><h3 className="text-xl font-black uppercase flex items-center gap-2"><Banknote className="h-6 w-6 text-primary" /> Management Accounts</h3><p className="text-sm text-muted-foreground">Upload current internal management accounts.</p></div><FileUploadField name="managementAccountsUrl" label="Management Accounts" folder="suppliers-financials/management-accounts" /></div>}

                {currentStepConfig.id === 'afs' && <div className="space-y-6 animate-in fade-in duration-500"><div><h3 className="text-xl font-black uppercase flex items-center gap-2"><FileText className="h-6 w-6 text-primary" /> Annual Financial Statements</h3><p className="text-sm text-muted-foreground">Upload the latest signed AFS.</p></div><FileUploadField name="afsDocUrl" label="Annual Financial Statements" folder="suppliers-financials/afs" /></div>}

                {currentStepConfig.id === 'auditors' && <div className="space-y-6 animate-in fade-in duration-500"><h3 className="text-xl font-black uppercase flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary" /> Auditors</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><FormField control={methods.control} name="auditors.firmName" render={({ field }) => <FormItem><FormLabel>Audit firm</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl></FormItem>} /><FormField control={methods.control} name="auditors.practiceNumber" render={({ field }) => <FormItem><FormLabel>Practice number</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl></FormItem>} /><FormField control={methods.control} name="auditors.contactName" render={({ field }) => <FormItem><FormLabel>Contact person</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl></FormItem>} /><FormField control={methods.control} name="auditors.email" render={({ field }) => <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} value={field.value || ''} /></FormControl></FormItem>} /><FormField control={methods.control} name="auditors.phone" render={({ field }) => <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl></FormItem>} /></div></div>}

                {currentStepConfig.id === 'trading-history' && <div className="space-y-6 animate-in fade-in duration-500"><h3 className="text-xl font-black uppercase flex items-center gap-2"><History className="h-6 w-6 text-primary" /> Trading History</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><FormField control={methods.control} name="tradingHistory.tradingSince" render={({ field }) => <FormItem><FormLabel>Trading since</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl></FormItem>} /><FormField control={methods.control} name="tradingHistory.primaryActivities" render={({ field }) => <FormItem><FormLabel>Primary activities</FormLabel><FormControl><Textarea {...field} value={field.value || ''} rows={3} /></FormControl></FormItem>} /><FormField control={methods.control} name="tradingHistory.keyCustomers" render={({ field }) => <FormItem><FormLabel>Key customers</FormLabel><FormControl><Textarea {...field} value={field.value || ''} rows={3} /></FormControl></FormItem>} /><FormField control={methods.control} name="tradingHistory.keySuppliers" render={({ field }) => <FormItem><FormLabel>Key suppliers</FormLabel><FormControl><Textarea {...field} value={field.value || ''} rows={3} /></FormControl></FormItem>} /><FormField control={methods.control} name="tradingHistory.materialEvents" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Material events, losses, or disruptions</FormLabel><FormControl><Textarea {...field} value={field.value || ''} rows={4} /></FormControl></FormItem>} /></div></div>}

                {currentStepConfig.id === 'assets' && (
                  <div className="space-y-8 animate-in fade-in duration-500 text-left">
                    <div>
                      <h3 className="text-xl font-black uppercase flex items-center gap-2"><Truck className="h-6 w-6 text-primary" /> Assets & Liabilities Register</h3>
                      <p className="text-sm text-muted-foreground">List the vehicles, equipment, and property in the supplier environment. Net equity is calculated as value less outstanding finance. A positive net value is an indication for verification, not proof of available collateral.</p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between"><h4 className="font-black text-xs uppercase tracking-widest text-primary">Vehicles</h4><Button type="button" variant="outline" size="sm" onClick={() => appendVehicle({ value: 0, outstanding: 0, insuranceStatus: 'unknown' })}><PlusCircle className="mr-2 h-4 w-4" />Add vehicle</Button></div>
                      {vehicleFields.map((row, index) => (
                        <div key={row.id} className="grid grid-cols-1 md:grid-cols-8 gap-3 rounded-xl border bg-slate-50 p-4">
                          <FormField control={methods.control} name={`vehicleAssets.${index}.make`} render={({ field }) => <FormItem><FormLabel>Make</FormLabel><FormControl><Input {...field} className="bg-white" /></FormControl></FormItem>} />
                          <FormField control={methods.control} name={`vehicleAssets.${index}.model`} render={({ field }) => <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} className="bg-white" /></FormControl></FormItem>} />
                          <FormField control={methods.control} name={`vehicleAssets.${index}.year`} render={({ field }) => <FormItem><FormLabel>Year</FormLabel><FormControl><Input type="number" {...field} className="bg-white" /></FormControl></FormItem>} />
                          <FormField control={methods.control} name={`vehicleAssets.${index}.value`} render={({ field }) => <FormItem><FormLabel>Value</FormLabel><FormControl><Input type="number" {...field} className="bg-white" /></FormControl></FormItem>} />
                          <FormField control={methods.control} name={`vehicleAssets.${index}.outstanding`} render={({ field }) => <FormItem><FormLabel>Outstanding</FormLabel><FormControl><Input type="number" {...field} className="bg-white" /></FormControl></FormItem>} />
                          <FormField control={methods.control} name={`vehicleAssets.${index}.lender`} render={({ field }) => <FormItem><FormLabel>Lender</FormLabel><FormControl><Input {...field} className="bg-white" /></FormControl></FormItem>} />
                          <FormItem><FormLabel>Net equity</FormLabel><div className="h-10 flex items-center rounded-md border bg-white px-3 font-black text-emerald-700">{formatCurrency(Number(methods.watch(`vehicleAssets.${index}.value`)) - Number(methods.watch(`vehicleAssets.${index}.outstanding`)))}</div></FormItem>
                          <Button type="button" variant="ghost" size="icon" className="text-destructive self-end" onClick={() => removeVehicle(index)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between"><h4 className="font-black text-xs uppercase tracking-widest text-primary">Equipment</h4><Button type="button" variant="outline" size="sm" onClick={() => appendEquipment({ value: 0, outstanding: 0, insuranceStatus: 'unknown' })}><PlusCircle className="mr-2 h-4 w-4" />Add equipment</Button></div>
                      {equipmentFields.map((row, index) => (
                        <div key={row.id} className="grid grid-cols-1 md:grid-cols-8 gap-3 rounded-xl border bg-slate-50 p-4">
                          <FormField control={methods.control} name={`equipmentAssets.${index}.description`} render={({ field }) => <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} className="bg-white" /></FormControl></FormItem>} />
                          <FormField control={methods.control} name={`equipmentAssets.${index}.make`} render={({ field }) => <FormItem><FormLabel>Make</FormLabel><FormControl><Input {...field} className="bg-white" /></FormControl></FormItem>} />
                          <FormField control={methods.control} name={`equipmentAssets.${index}.year`} render={({ field }) => <FormItem><FormLabel>Year</FormLabel><FormControl><Input type="number" {...field} className="bg-white" /></FormControl></FormItem>} />
                          <FormField control={methods.control} name={`equipmentAssets.${index}.value`} render={({ field }) => <FormItem><FormLabel>Value</FormLabel><FormControl><Input type="number" {...field} className="bg-white" /></FormControl></FormItem>} />
                          <FormField control={methods.control} name={`equipmentAssets.${index}.outstanding`} render={({ field }) => <FormItem><FormLabel>Outstanding</FormLabel><FormControl><Input type="number" {...field} className="bg-white" /></FormControl></FormItem>} />
                          <FormField control={methods.control} name={`equipmentAssets.${index}.lender`} render={({ field }) => <FormItem><FormLabel>Lender</FormLabel><FormControl><Input {...field} className="bg-white" /></FormControl></FormItem>} />
                          <FormItem><FormLabel>Net equity</FormLabel><div className="h-10 flex items-center rounded-md border bg-white px-3 font-black text-emerald-700">{formatCurrency(Number(methods.watch(`equipmentAssets.${index}.value`)) - Number(methods.watch(`equipmentAssets.${index}.outstanding`)))}</div></FormItem>
                          <Button type="button" variant="ghost" size="icon" className="text-destructive self-end" onClick={() => removeEquipment(index)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between"><h4 className="font-black text-xs uppercase tracking-widest text-primary">Fixed property</h4><Button type="button" variant="outline" size="sm" onClick={() => appendProperty({ value: 0, outstanding: 0, insuranceStatus: 'unknown' })}><PlusCircle className="mr-2 h-4 w-4" />Add property</Button></div>
                      {propertyFields.map((row, index) => (
                        <div key={row.id} className="grid grid-cols-1 md:grid-cols-7 gap-3 rounded-xl border bg-slate-50 p-4">
                          <FormField control={methods.control} name={`propertyAssets.${index}.description`} render={({ field }) => <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} className="bg-white" /></FormControl></FormItem>} />
                          <FormField control={methods.control} name={`propertyAssets.${index}.address`} render={({ field }) => <FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} className="bg-white" /></FormControl></FormItem>} />
                          <FormField control={methods.control} name={`propertyAssets.${index}.value`} render={({ field }) => <FormItem><FormLabel>Value</FormLabel><FormControl><Input type="number" {...field} className="bg-white" /></FormControl></FormItem>} />
                          <FormField control={methods.control} name={`propertyAssets.${index}.outstanding`} render={({ field }) => <FormItem><FormLabel>Outstanding</FormLabel><FormControl><Input type="number" {...field} className="bg-white" /></FormControl></FormItem>} />
                          <FormField control={methods.control} name={`propertyAssets.${index}.lender`} render={({ field }) => <FormItem><FormLabel>Lender</FormLabel><FormControl><Input {...field} className="bg-white" /></FormControl></FormItem>} />
                          <FormItem><FormLabel>Net equity</FormLabel><div className="h-10 flex items-center rounded-md border bg-white px-3 font-black text-emerald-700">{formatCurrency(Number(methods.watch(`propertyAssets.${index}.value`)) - Number(methods.watch(`propertyAssets.${index}.outstanding`)))}</div></FormItem>
                          <Button type="button" variant="ghost" size="icon" className="text-destructive self-end" onClick={() => removeProperty(index)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-black text-xs uppercase tracking-widest text-primary">Quick financial position</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <FormField control={methods.control} name="financialSnapshot.monthlyRevenue" render={({ field }) => <FormItem><FormLabel>Monthly income / revenue</FormLabel><FormControl><Input type="number" {...field} className="bg-white" /></FormControl></FormItem>} />
                        <FormField control={methods.control} name="financialSnapshot.monthlyExpenses" render={({ field }) => <FormItem><FormLabel>Monthly operating expenses</FormLabel><FormControl><Input type="number" {...field} className="bg-white" /></FormControl></FormItem>} />
                        <FormField control={methods.control} name="financialSnapshot.monthlyDebtRepayments" render={({ field }) => <FormItem><FormLabel>Monthly debt repayments</FormLabel><FormControl><Input type="number" {...field} className="bg-white" /></FormControl></FormItem>} />
                        <FormField control={methods.control} name="financialSnapshot.cashAtBank" render={({ field }) => <FormItem><FormLabel>Cash at bank</FormLabel><FormControl><Input type="number" {...field} className="bg-white" /></FormControl></FormItem>} />
                      </div>
                      <FormField control={methods.control} name="financialSnapshot.notes" render={({ field }) => <FormItem><FormLabel>Income and expense notes</FormLabel><FormControl><Textarea {...field} rows={3} placeholder="Explain unusual income, expenses, seasonal changes, or expected changes from the proposed funding." /></FormControl></FormItem>} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-5 border rounded-2xl space-y-4">
                        <h4 className="font-black text-xs uppercase tracking-widest text-primary">Insurance declaration</h4>
                        <FormField control={methods.control} name="insuranceDeclaration.hasBusinessInsurance" render={({ field }) => <FormItem className="flex items-center justify-between"><FormLabel>Business assets insured?</FormLabel><FormControl><Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} /></FormControl></FormItem>} />
                        <FormField control={methods.control} name="insuranceDeclaration.insurerName" render={({ field }) => <FormItem><FormLabel>Insurer</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl></FormItem>} />
                        <FormField control={methods.control} name="insuranceDeclaration.policyReference" render={({ field }) => <FormItem><FormLabel>Policy reference</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl></FormItem>} />
                        <FormField control={methods.control} name="insuranceDeclaration.lenderInterestNoted" render={({ field }) => <FormItem className="flex items-center justify-between"><FormLabel>Lender interest can be noted?</FormLabel><FormControl><Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} /></FormControl></FormItem>} />
                      </div>
                      <div className="p-5 border rounded-2xl space-y-4">
                        <h4 className="font-black text-xs uppercase tracking-widest text-primary">Insolvency declaration</h4>
                        <FormField control={methods.control} name="insolvencyDeclaration.hasInsolvencyProceedings" render={({ field }) => <FormItem className="flex items-center justify-between"><FormLabel>Any insolvency proceedings or compromise?</FormLabel><FormControl><Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} /></FormControl></FormItem>} />
                        <FormField control={methods.control} name="insolvencyDeclaration.details" render={({ field }) => <FormItem><FormLabel>Details or explanation</FormLabel><FormControl><Textarea {...field} value={field.value || ''} rows={4} /></FormControl></FormItem>} />
                      </div>
                    </div>
                  </div>
                )}

                {currentStepConfig.id === 'collateral-granted' && (
                  <div className="space-y-8 animate-in fade-in duration-500 text-left">
                    <div>
                      <h3 className="text-xl font-black uppercase flex items-center gap-2">
                        <Scale className="h-6 w-6 text-primary" /> Collateral & Existing Bank Facility Audit
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Audit prior bank facility agreements, existing cessions of book debts, and notarial bonds.
                      </p>
                    </div>

                    <div className="p-6 border-2 rounded-2xl bg-slate-50 space-y-4 text-left">
                      <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <Landmark className="h-4 w-4" /> Existing Primary Bank Facility Audit
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField control={methods.control} name="existingBankFacilityDetails.bankName" render={({ field }) => (
                          <FormItem className="text-left">
                            <FormLabel>Primary Bank Name</FormLabel>
                            <FormControl><Input {...field} value={field.value || ''} placeholder="e.g. Standard Bank / FNB" className="bg-white border-2" /></FormControl>
                          </FormItem>
                        )} />

                        <FormField control={methods.control} name="existingBankFacilityDetails.holdsCessionOfBookDebts" render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-xl border bg-white p-3">
                            <FormLabel className="m-0 text-xs font-bold">Bank Holds Cession of Book Debts?</FormLabel>
                            <FormControl><Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} /></FormControl>
                          </FormItem>
                        )} />

                        <FormField control={methods.control} name="existingBankFacilityDetails.holdsNotarialBond" render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-xl border bg-white p-3">
                            <FormLabel className="m-0 text-xs font-bold">Bank Holds Notarial Bond?</FormLabel>
                            <FormControl><Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} /></FormControl>
                          </FormItem>
                        )} />
                      </div>
                      <FileUploadField name="existingBankFacilityDetails.facilityAgreementDocUrl" label="Bank Facility Agreement Doc" folder="suppliers-bank-agreements" />
                    </div>

                    <FormField control={methods.control} name="collateralGranted" render={({ field }) => (
                      <FormItem className="text-left">
                        <FormLabel>Additional Existing Collateral, Cessions, Bonds & Sureties</FormLabel>
                        <FormControl><Textarea {...field} value={field.value || ''} placeholder="Secured party, asset/right encumbered, agreement reference, amount, and status" rows={6} /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                )}

                {currentStepConfig.id === 'governance' && (
                    <div className="space-y-10 text-left animate-in fade-in duration-500 text-foreground text-foreground">
                        <div className="grid grid-cols-2 gap-8 text-left text-foreground text-foreground">
                            <FormField control={methods.control} name="shareholderCount" render={({ field }) => (
                                <FormItem className="text-left text-foreground"><FormLabel>Authorized Shareholders</FormLabel><FormControl><Input type="number" {...field} className="h-12 border-2 font-black text-xl bg-white" /></FormControl></FormItem>
                            )} />
                            <FormField control={methods.control} name="directorCount" render={({ field }) => (
                                <FormItem className="text-left text-foreground"><FormLabel>Authorized Directors</FormLabel><FormControl><Input type="number" {...field} className="h-12 border-2 font-black text-xl bg-white" /></FormControl></FormItem>
                            )} />
                        </div>
                        <Alert className="bg-primary/5 border-primary/20 text-left"><Info className="h-4 w-4 text-primary" /><AlertTitle className="font-bold text-left">Resource Control</AlertTitle><AlertDescription className="text-xs text-muted-foreground leading-relaxed text-left">Adjusting these counts will synchronize the registry nodes. These transformations are only processed during section transitions to protect API quota.</AlertDescription></Alert>
                    </div>
                )}
                {currentStepConfig.id === 'shareholders' && (
                    <div className="space-y-6 text-left text-foreground text-foreground text-foreground">
                        {shareholderFields.map((field, index) => (
                            <StakeholderNode key={field.id} index={index} type="shareholders" onRemove={() => { removeShareholder(index); methods.setValue('shareholderCount', shareholderFields.length - 1); }} />
                        ))}
                        {shareholderFields.length === 0 && (
                            <div className="py-20 text-center border-2 border-dashed rounded-3xl opacity-30 text-foreground text-foreground">
                                <Users className="h-12 w-12 mx-auto mb-2 text-center" />
                                <p className="text-sm font-black uppercase text-center">No Shareholders Mapped</p>
                            </div>
                        )}
                    </div>
                )}
                {currentStepConfig.id === 'directors' && (
                    <div className="space-y-6 text-left text-foreground text-foreground text-foreground">
                        {directorFields.map((field, index) => (
                            <StakeholderNode key={field.id} index={index} type="directors" onRemove={() => { removeDirector(index); methods.setValue('directorCount', directorFields.length - 1); }} />
                        ))}
                        {directorFields.length === 0 && (
                            <div className="py-20 text-center border-2 border-dashed rounded-3xl opacity-30 text-foreground text-foreground text-foreground">
                                <UserCheck className="h-12 w-12 mx-auto mb-2 text-center" />
                                <p className="text-sm font-black uppercase text-center">No Directors Mapped</p>
                            </div>
                        )}
                    </div>
                )}
                {currentStepConfig.id === 'review' && (
                    <div className="text-center py-24 space-y-6 animate-in zoom-in-95 duration-700 text-left text-foreground text-foreground">
                        <div className="bg-primary/10 p-6 rounded-full w-fit mx-auto border-2 border-primary/20">
                            <ShieldCheck className="h-20 w-20 text-primary" />
                        </div>
                        <div className="space-y-2 text-center text-foreground text-foreground">
                            <h3 className="text-3xl font-black uppercase text-center">Protocol Verified</h3>
                            <p className="text-sm text-muted-foreground max-sm mx-auto leading-relaxed text-center text-foreground">All technical nodes for this supplier are mapped. Committing to registry initiates the authorized dealership standing.</p>
                        </div>
                    </div>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50 border-t p-8 flex justify-between text-left text-foreground text-foreground text-foreground text-foreground">
            <Button type="button" variant="outline" onClick={() => handleStepTransition('back')} className="font-bold h-12 px-8">Back</Button>
            {currentStep < steps.length - 1 ? (
              <Button type="button" onClick={() => handleStepTransition('next')} className="px-12 font-black uppercase text-xs tracking-widest text-white shadow-lg h-12">Next Protocol Stage <ArrowRight className="ml-2 h-4 w-4" /></Button>
            ) : (
              <Button type="submit" disabled={isSubmitting} className="h-14 px-16 bg-primary hover:bg-primary/90 font-black uppercase tracking-tight text-white shadow-2xl">
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />} Commit Supplier Node
              </Button>
            )}
          </CardFooter>
        </form>
      </FormProvider>
    </Card>
  );
}