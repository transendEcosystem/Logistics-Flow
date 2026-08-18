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
    FileText, UserCircle as UserCircleIcon, RefreshCcw, MapPin, Banknote
} from 'lucide-react';
import { getClientSideAuthToken, useFirestore } from '@/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { cn, formatCurrency } from '@/lib/utils';
import { doc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { provinces } from '@/lib/geodata';

// --- SCHEMAS ---

const stakeholderSchema = z.object({
    name: z.string().min(1, "Full name required."),
    rsaIdNumber: z.string().optional(),
    rsaIdUrl: z.string().optional(),
});

const clientWizardSchema = z.object({
  applyingCapacity: z.enum(['individual', 'entity']).default('entity'),
  entityType: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  registrationId: z.string().optional(),
  status: z.enum(['draft', 'active', 'inactive']).default('active'),
  
  // Work Address Node
  workAddress: z.object({
      street: z.string().optional(),
      suburb: z.string().optional(),
      city: z.string().optional(),
      province: z.string().optional(),
      postalCode: z.string().optional(),
  }).optional(),

  // Property Standing Node
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
  
  // Bond Detail Node
  bondDetails: z.object({
      bank: z.string().optional(),
      bondNumber: z.string().optional(),
      accountNumber: z.string().optional(),
      term: z.coerce.number().optional(),
      originalAmount: z.coerce.number().optional(),
      outstandingBalance: z.coerce.number().optional(),
  }).optional(),

  globalFacilityLimit: z.coerce.number().min(0).default(0),
  shareholderCount: z.coerce.number().min(0).default(0),
  directorCount: z.coerce.number().min(0).default(0),
  shareholders: z.array(stakeholderSchema).optional().default([]),
  directors: z.array(stakeholderSchema).optional().default([]),
  hasJudgements: z.boolean().default(false),
  hasDefaults: z.boolean().default(false),
  userIdUrl: z.string().optional(),
  registrationDocUrl: z.string().optional(),
  ficaDocUrl: z.string().optional(),
  afsDocUrl: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientWizardSchema>;

// --- HELPER COMPONENTS ---

function FileUploadField({ name, label, folder }: { name: any, label: string, folder: string }) {
    const { setValue, watch } = useFormContext<ClientFormValues>();
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
        <div className="space-y-1.5 text-left">
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
    const { control } = useFormContext<ClientFormValues>();
    return (
        <div className="p-6 border-2 rounded-2xl bg-white shadow-sm space-y-4 relative animate-in fade-in duration-300 text-left text-foreground">
            <div className="flex justify-between items-center text-left">
                <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <UserCircleIcon className="h-4 w-4" /> {type.slice(0, -1)} #{index + 1}
                </h4>
                <Button variant="ghost" size="icon" onClick={onRemove} className="text-destructive h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <FormField control={control} name={`${type}.${index}.name` as any} render={({ field }) => (<FormItem className="text-left"><FormLabel>Full Name</FormLabel><FormControl><Input {...field} className="h-10 border-2 bg-white" /></FormControl></FormItem>)} />
                <FormField control={control} name={`${type}.${index}.rsaIdNumber` as any} render={({ field }) => (<FormItem className="text-left"><FormLabel>RSA ID Number</FormLabel><FormControl><Input {...field} className="h-10 border-2 font-mono bg-white" /></FormControl></FormItem>)} />
            </div>
            <FileUploadField name={`${type}.${index}.rsaIdUrl`} label="Attach Identity Scan" folder={`clients-${type}`} />
        </div>
    );
};

// --- WIZARD TERMINAL ---

export function EditClientWizard({ client, onSave, onBack, targetCollection = 'lendingClients' }: { client?: any, onSave: () => void, onBack: () => void, targetCollection?: string }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const methods = useForm<ClientFormValues>({
    resolver: zodResolver(clientWizardSchema),
    mode: 'onChange',
    defaultValues: client || { applyingCapacity: 'entity', status: 'active', shareholderCount: 0, directorCount: 0, shareholders: [], directors: [], propertyStanding: 'rented', isPropertyFinanced: false }
  });

  const { fields: shareholderFields, append: appendShareholder, remove: removeShareholder } = useFieldArray({ control: methods.control, name: 'shareholders' });
  const { fields: directorFields, append: appendDirector, remove: removeDirector } = useFieldArray({ control: methods.control, name: 'directors' });

  const watched = methods.watch();

  const steps = useMemo(() => {
      const base = [
        { id: 'main', title: '1. Identity', icon: User, fields: ['name', 'status', 'userIdUrl'] },
        { id: 'entity', title: '2. Entity', icon: Building, fields: ['entityType', 'registrationId', 'registrationDocUrl'] },
        { id: 'standing', title: '3. Standing', icon: MapPin, fields: ['workAddress', 'propertyStanding'] },
      ];
      if (watched.propertyStanding === 'owned' && watched.isPropertyFinanced) {
          base.push({ id: 'prop_finance', title: '4. Prop Finance', icon: Banknote, fields: ['bondDetails'] });
      }
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

  const onSubmit = async (values: ClientFormValues) => {
    setIsSubmitting(true);
    try {
        const token = await getClientSideAuthToken();
        if (!token) throw new Error("Auth failed.");
        const ref = client?.id ? doc(firestore, targetCollection, client.id) : doc(collection(firestore, targetCollection));
        await setDoc(ref, { ...values, id: ref.id, updatedAt: serverTimestamp() }, { merge: true });
        toast({ title: 'Client Record Saved' });
        onSave();
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Commit Failed', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  const currentStepId = steps[currentStep]?.id;

  return (
    <Card className="max-w-6xl mx-auto shadow-2xl border-none overflow-hidden text-left text-foreground">
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} onKeyDown={(e) => { if(e.key === 'Enter') e.preventDefault(); }}>
          <CardHeader className="bg-slate-900 text-white p-8">
            <div className="flex justify-between items-center text-left">
              <div className="text-left text-white">
                <CardTitle className="text-2xl font-black font-headline uppercase text-white">Client Protocol Terminal</CardTitle>
                <CardDescription className="text-slate-400">Step: {steps[currentStep].title}</CardDescription>
              </div>
              <Button type="button" variant="ghost" className="text-white hover:text-primary" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Exit Terminal</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 text-left">
            <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] text-left">
              <div className="bg-slate-50 border-r p-6 space-y-2 text-left">
                {steps.map((step, i) => (
                  <Button key={step.id} type="button" variant={currentStep === i ? "secondary" : "ghost"} className={cn("w-full justify-start gap-3 h-10 px-3 transition-all", currentStep === i && "bg-white shadow-sm ring-1 ring-primary/20")} onClick={() => handleStepTransition(i)}>
                    {React.createElement(step.icon, { className: cn("h-4 w-4", currentStep >= i ? "text-primary" : "text-muted-foreground") })}
                    <span className={cn("text-[11px] font-black uppercase", currentStep === i ? "text-primary" : "text-muted-foreground")}>{step.title.split('. ')[1]}</span>
                  </Button>
                ))}
              </div>
              <div className="p-10 min-h-[500px] text-left">
                
                {currentStepId === 'main' && (
                    <div className="space-y-8 animate-in fade-in duration-500 text-left">
                         <div className="grid grid-cols-2 gap-4 text-left">
                            <FormField control={methods.control} name="status" render={({ field }) => (
                                <FormItem className="text-left text-foreground">
                                    <FormLabel className="text-[10px] font-black uppercase text-primary tracking-widest ml-1">Account Standing</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger className="bg-white border-2 font-bold"><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="draft">Draft (Researching)</SelectItem>
                                            <SelectItem value="inactive">Inactive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                            <FormField control={methods.control} name="applyingCapacity" render={({ field }) => (
                                <FormItem className="text-left">
                                    <FormLabel className="text-[10px] font-black uppercase text-primary tracking-widest ml-1">Legal Capacity</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger className="bg-white border-2 font-bold"><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="entity">Legal Entity (Company/CC)</SelectItem>
                                            <SelectItem value="individual">Individual / Sole Prop</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                         </div>
                        <FormField control={methods.control} name="name" render={({ field }) => (<FormItem className="text-left"><FormLabel>Full Client Label</FormLabel><FormControl><Input {...field} className="h-12 border-2 bg-white font-black text-lg" /></FormControl></FormItem>)} />
                        <FileUploadField name="userIdUrl" label="Primary Identity Node (RSA ID)" folder="lending-identity" />
                    </div>
                )}

                {currentStepId === 'entity' && (
                    <div className="space-y-8 animate-in fade-in duration-500 text-left">
                         <div className="grid grid-cols-2 gap-4">
                            <FormField control={methods.control} name="entityType" render={({ field }) => (
                                <FormItem><FormLabel>Entity Type</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger className="border-2 bg-white"><SelectValue placeholder="Choose..." /></SelectTrigger></FormControl><SelectContent>{['Pty Ltd', 'Ltd', 'CC', 'Sole Prop', 'Trust'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></FormItem>
                            )} />
                            <FormField control={methods.control} name="registrationId" render={({ field }) => (<FormItem><FormLabel>Registration Number</FormLabel><FormControl><Input {...field} placeholder="20XX/XXXXXX/07" className="border-2 bg-white font-mono" /></FormControl></FormItem>)} />
                        </div>
                        <div className="p-8 bg-slate-900 text-white rounded-[2rem] shadow-xl flex justify-between items-center text-left text-white">
                            <div className="space-y-1 text-left">
                                <h4 className="text-[10px] font-black uppercase text-primary flex items-center gap-2 text-left"><FileText className="h-4 w-4" /> Founding Record</h4>
                                <p className="text-xs text-slate-400 text-left">Attach CIPC COR14.3 or Founding Statement.</p>
                            </div>
                            <FileUploadField name="registrationDocUrl" label="Registration Doc" folder="lending-legal" />
                        </div>
                    </div>
                )}

                {currentStepId === 'standing' && (
                    <div className="space-y-10 animate-in fade-in duration-500 text-left">
                        <div className="space-y-4 text-left">
                            <h3 className="font-black text-lg uppercase flex items-center gap-2 text-left"><MapPin className="h-6 w-6 text-primary" /> Work Address Ledger</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={methods.control} name="workAddress.street" render={({ field }) => (<FormItem className="text-left"><FormLabel>Street Address</FormLabel><FormControl><Input {...field} className="bg-white border-2" /></FormControl></FormItem>)} />
                                <FormField control={methods.control} name="workAddress.suburb" render={({ field }) => (<FormItem className="text-left"><FormLabel>Suburb</FormLabel><FormControl><Input {...field} className="bg-white border-2" /></FormControl></FormItem>)} />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
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
                                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-4 text-left">
                                            <div className={cn("p-4 border-2 rounded-2xl cursor-pointer", field.value === 'rented' ? "border-primary bg-primary/5 shadow-md" : "bg-white")}><div className="flex items-center gap-2"><RadioGroupItem value="rented" id="p-rent" /><Label htmlFor="p-rent" className="font-bold uppercase text-xs cursor-pointer text-foreground">Rented / Lease</Label></div></div>
                                            <div className={cn("p-4 border-2 rounded-2xl cursor-pointer", field.value === 'owned' ? "border-primary bg-primary/5 shadow-md" : "bg-white")}><div className="flex items-center gap-2"><RadioGroupItem value="owned" id="p-own" /><Label htmlFor="p-own" className="font-bold uppercase text-xs cursor-pointer text-foreground">Owned Asset</Label></div></div>
                                        </RadioGroup>
                                    </FormControl>
                                </FormItem>
                            )} />

                            {watched.propertyStanding === 'rented' ? (
                                <div className="p-8 border-2 border-dashed rounded-3xl bg-slate-50 space-y-6 animate-in slide-in-from-top-2 text-left">
                                    <h4 className="font-black text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2 text-left"><UserPlus className="h-4 w-4" /> Landlord & Lease Details</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left text-foreground">
                                        <FormField control={methods.control} name="landlordDetails.name" render={({ field }) => (<FormItem className="text-left text-foreground"><FormLabel>Landlord Name</FormLabel><FormControl><Input {...field} className="bg-white" /></FormControl></FormItem>)} />
                                        <FormField control={methods.control} name="landlordDetails.phone" render={({ field }) => (<FormItem className="text-left"><FormLabel>Landlord Phone</FormLabel><FormControl><Input {...field} className="bg-white" /></FormControl></FormItem>)} />
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 text-left">
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
                        </div>
                    </div>
                )}

                {currentStepId === 'prop_finance' && (
                    <div className="space-y-10 animate-in fade-in duration-500 text-left">
                        <div className="space-y-4 text-left">
                            <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2 text-left"><Banknote className="h-6 w-6 text-primary" /> Property Finance Node</h3>
                            <p className="text-sm text-muted-foreground text-left">Declare the primary debt instrument attached to the operational premises.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-6 text-left">
                             <FormField control={methods.control} name="bondDetails.bank" render={({ field }) => (<FormItem className="text-left"><FormLabel>Financing Institution (Bank)</FormLabel><FormControl><Input {...field} className="bg-white border-2" /></FormControl></FormItem>)} />
                             <FormField control={methods.control} name="bondDetails.bondNumber" render={({ field }) => (<FormItem className="text-left"><FormLabel>Bond Reference #</FormLabel><FormControl><Input {...field} className="bg-white border-2 font-mono" /></FormControl></FormItem>)} />
                        </div>
                        <div className="grid grid-cols-3 gap-6 text-left">
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

                 {currentStepId === 'governance' && (
                    <div className="space-y-10 animate-in fade-in duration-500 text-left">
                        <div className="grid grid-cols-2 gap-8 text-left">
                            <FormField control={methods.control} name="shareholderCount" render={({ field }) => (
                                <FormItem className="text-left"><FormLabel>Authorized Shareholders</FormLabel><FormControl><Input type="number" {...field} className="h-12 border-2 bg-white font-black text-xl" /></FormControl></FormItem>
                            )} />
                            <FormField control={methods.control} name="directorCount" render={({ field }) => (
                                <FormItem className="text-left"><FormLabel>Authorized Directors</FormLabel><FormControl><Input type="number" {...field} className="h-12 border-2 bg-white font-black text-xl" /></FormControl></FormItem>
                            )} />
                        </div>
                        <Alert className="bg-primary/5 border-primary/20 text-left"><Info className="h-4 w-4 text-primary" /><AlertTitle className="font-bold text-left">Governance Sync</AlertTitle><AlertDescription className="text-xs text-muted-foreground leading-relaxed text-left text-foreground">Adjusting these counts will synchronize the identity nodes in the next section.</AlertDescription></Alert>
                    </div>
                )}

                {currentStepId === 'shareholders' && (
                    <div className="space-y-6 text-left">
                        {shareholderFields.map((field, index) => (
                            <StakeholderNode key={field.id} index={index} type="shareholders" onRemove={() => removeShareholder(index)} />
                        ))}
                    </div>
                )}

                {currentStepId === 'directors' && (
                    <div className="space-y-6 text-left">
                        {directorFields.map((field, index) => (
                            <StakeholderNode key={field.id} index={index} type="directors" onRemove={() => removeDirector(index)} />
                        ))}
                    </div>
                )}

                {currentStepId === 'review' && (
                    <div className="text-center py-24 space-y-6 animate-in zoom-in-95 duration-500 text-center">
                        <CheckCircle2 className="h-20 w-20 text-primary mx-auto opacity-30" />
                        <div className="space-y-2 text-center text-foreground">
                            <h3 className="text-3xl font-black uppercase text-center">Audit Check Complete</h3>
                            <p className="text-sm text-muted-foreground max-sm mx-auto leading-relaxed text-center">Verify data integrity before committing this client node to the grid.</p>
                        </div>
                    </div>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50 border-t p-8 flex justify-between text-left text-foreground">
            <Button type="button" variant="outline" onClick={() => handleStepTransition('back')} className="font-bold h-12 px-8">Back</Button>
            {currentStep < steps.length - 1 ? (
              <Button type="button" onClick={() => handleStepTransition('next')} className="px-12 font-black uppercase text-xs tracking-widest text-white shadow-lg h-12">Next Protocol Stage <ArrowRight className="ml-2 h-4 w-4" /></Button>
            ) : (
              <Button type="submit" disabled={isSubmitting} className="h-14 px-16 bg-primary hover:bg-primary/90 shadow-lg font-black uppercase tracking-tight text-white shadow-2xl">{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Commit Node to Ledger</Button>
            )}
          </CardFooter>
        </form>
      </FormProvider>
    </Card>
  );
}
