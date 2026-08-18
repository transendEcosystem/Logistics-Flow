'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
    Loader2, Save, ArrowLeft, ArrowRight, Truck, Database, ShieldCheck, 
    ShoppingBag, CheckCircle2, RefreshCcw, Car, Bus, Monitor, Info, Building, User
} from 'lucide-react';
import { getClientSideAuthToken, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from '@/components/ui/card';
import { cn, fetchFromAdminAPI, formatCurrency } from '@/lib/utils';
import { collection, query, where, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

const assetSchema = z.object({
  sourceType: z.enum(['dealer', 'client', 'stock']).default('dealer'),
  sourceDealerId: z.string().optional().nullable(),
  sourceClientId: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(), 
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  year: z.string().min(4, 'Year is required'),
  costOfSale: z.coerce.number().positive('Cost must be positive'),
  status: z.enum(['pending_acquisition', 'available', 'financed', 'sold', 'decommissioned']).default('pending_acquisition'),
  classification: z.string().min(1, "Asset class required"),
  registrationNumber: z.string().optional(),
  vin: z.string().optional(),
  engineNumber: z.string().optional(),
});

type AssetFormValues = z.infer<typeof assetSchema>;

const steps = [
    { id: 'source', title: '1. Asset Source', icon: ShoppingBag, fields: ['sourceType', 'sourceDealerId', 'sourceClientId'] },
    { id: 'details', title: '2. Technical Node', icon: Truck, fields: ['make', 'model', 'year', 'costOfSale', 'classification'] },
    { id: 'identifiers', title: '3. Identifiers', icon: Database, fields: ['registrationNumber', 'vin', 'engineNumber'] },
    { id: 'audit', title: '4. Forensic Audit', icon: ShieldCheck, fields: [] },
];

export function EditAssetWizard({ asset, onSave, onBack, assetType: initialType, clientId: initialClientId }: { asset?: any, onSave: () => void, onBack: () => void, assetType?: string | null, clientId?: string | null }) {
    const [isLoading, setIsLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const { toast } = useToast();
    const firestore = useFirestore();
    
    const methods = useForm<AssetFormValues>({
        resolver: zodResolver(assetSchema),
        mode: 'onChange',
        defaultValues: asset || { 
            sourceType: 'dealer',
            classification: initialType || 'Truck',
            clientId: initialClientId || null,
            status: 'pending_acquisition',
            costOfSale: 0
        }
    });

    const watchedSource = methods.watch('sourceType');
    const watchedClass = methods.watch('classification');

    // 1. Fetch Suppliers (Dealers) for the source dropdown
    const suppliersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'lendingSuppliers'), where('status', '==', 'active')) : null, [firestore]);
    const { data: suppliers } = useCollection(suppliersQuery);

    // 2. Fetch Clients for trade-in/source dropdown
    const clientsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'lendingClients'), where('status', '==', 'active')) : null, [firestore]);
    const { data: clients } = useCollection(clientsQuery);

    const onSubmit = async (values: AssetFormValues) => {
        setIsLoading(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");
            
            const ref = asset?.id ? doc(firestore, 'lendingAssets', asset.id) : doc(collection(firestore, 'lendingAssets'));
            
            await setDoc(ref, { 
                ...values, 
                id: ref.id, 
                updatedAt: serverTimestamp(),
                createdAt: asset?.createdAt || serverTimestamp()
            }, { merge: true });

            toast({ title: 'Asset Node Committed to Registry' });
            onSave();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Commit Failed', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleNext = (e: React.MouseEvent) => {
        e.preventDefault();
        const stepFields = steps[currentStep].fields;
        methods.trigger(stepFields as any).then(isValid => {
            if (isValid && currentStep < steps.length - 1) {
                setCurrentStep(prev => prev + 1);
            } else if (!isValid) {
                toast({ variant: 'destructive', title: "Validation Exception", description: "Complete all required technical nodes." });
            }
        });
    };
    
    const handleBackStep = (e: React.MouseEvent) => {
        e.preventDefault();
        if (currentStep === 0) {
            onBack();
            return;
        }
        setCurrentStep(prev => prev - 1);
    };

    const isStepValid = (stepIndex: number) => {
        if (stepIndex < 0 || stepIndex >= steps.length) return true;
        const step = steps[stepIndex];
        if (!step.fields || step.fields.length === 0) return true;
        const errors = methods.formState.errors;
        return step.fields.every(field => {
            const path = field.split('.');
            let error: any = errors;
            for (const segment of path) {
                error = error?.[segment];
            }
            return !error;
        });
    };

    const renderStepContent = () => {
        const stepId = steps[currentStep]?.id;
        switch (stepId) {
            case 'source':
                return (
                    <div className="space-y-8 animate-in fade-in duration-500 text-left">
                        <FormField control={methods.control} name="sourceType" render={({ field }) => (
                            <FormItem className="space-y-4">
                                <FormLabel className="text-[10px] font-black uppercase text-primary tracking-widest">Select Acquisition Path</FormLabel>
                                <FormControl>
                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                                        <div className={cn("p-4 border-2 rounded-2xl cursor-pointer transition-all", field.value === 'dealer' ? "border-primary bg-primary/5 shadow-md" : "bg-white")}>
                                            <div className="flex items-center gap-2">
                                                <RadioGroupItem value="dealer" id="src-dealer" />
                                                <Label htmlFor="src-dealer" className="font-bold text-xs uppercase cursor-pointer text-foreground">Dealer (Supplier)</Label>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">Purchased from an authorized platform supplier.</p>
                                        </div>
                                        <div className={cn("p-4 border-2 rounded-2xl cursor-pointer transition-all", field.value === 'client' ? "border-primary bg-primary/5 shadow-md" : "bg-white")}>
                                            <div className="flex items-center gap-2">
                                                <RadioGroupItem value="client" id="src-client" />
                                                <Label htmlFor="src-client" className="font-bold text-xs uppercase cursor-pointer text-foreground">Client (Trade-in)</Label>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">Sourced as a trade-in from an existing member.</p>
                                        </div>
                                        <div className={cn("p-4 border-2 rounded-2xl cursor-pointer transition-all", field.value === 'stock' ? "border-primary bg-primary/5 shadow-md" : "bg-white")}>
                                            <div className="flex items-center gap-2">
                                                <RadioGroupItem value="stock" id="src-stock" />
                                                <Label htmlFor="src-stock" className="font-bold text-xs uppercase cursor-pointer text-foreground">Internal Stock</Label>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">Already in possession. Move from inventory.</p>
                                        </div>
                                    </RadioGroup>
                                </FormControl>
                            </FormItem>
                        )} />
                        
                        {watchedSource === 'dealer' && (
                            <FormField control={methods.control} name="sourceDealerId" render={({ field }) => (
                                <FormItem className="animate-in slide-in-from-left-2 text-left">
                                    <FormLabel>Select Authorized Dealer</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || ''}>
                                        <FormControl>
                                            <SelectTrigger className="h-12 border-2 bg-white text-left text-foreground">
                                                <SelectValue placeholder="Choose supplier from DMS..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {suppliers?.map((s: any) => (
                                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                        )}

                        {watchedSource === 'client' && (
                            <FormField control={methods.control} name="sourceClientId" render={({ field }) => (
                                <FormItem className="animate-in slide-in-from-left-2 text-left">
                                    <FormLabel>Select Trade-in Client</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || ''}>
                                        <FormControl>
                                            <SelectTrigger className="h-12 border-2 bg-white text-left text-foreground">
                                                <SelectValue placeholder="Choose source member..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {clients?.map((c: any) => (
                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                        )}
                    </div>
                );
            case 'details':
                return (
                    <div className="space-y-8 animate-in fade-in duration-500 text-left">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <FormField control={methods.control} name="classification" render={({ field }) => (
                                <FormItem className="text-left">
                                    <FormLabel>Asset Class</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || ''}>
                                        <FormControl>
                                            <SelectTrigger className="h-12 border-2 bg-white font-bold text-left text-foreground text-foreground">
                                                <SelectValue placeholder="Select class..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Truck">Heavy Vehicle (Truck)</SelectItem>
                                            <SelectItem value="Trailer">Interlink / Trailer</SelectItem>
                                            <SelectItem value="Bakkie">Light Commercial</SelectItem>
                                            <SelectItem value="Equipment">Industrial Equipment</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                            <FormField control={methods.control} name="costOfSale" render={({ field }) => (
                                <FormItem className="text-left text-foreground">
                                    <FormLabel className="text-primary font-black uppercase text-[10px]">Purchase Valuation (Excl. VAT)</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} className="h-12 border-2 bg-white text-xl font-black" />
                                    </FormControl>
                                </FormItem>
                            )} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                            <FormField control={methods.control} name="make" render={({ field }) => (
                                <FormItem className="text-left"><FormLabel>Make</FormLabel><FormControl><Input {...field} className="border-2 bg-white" /></FormControl></FormItem>
                            )} />
                            <FormField control={methods.control} name="model" render={({ field }) => (
                                <FormItem className="text-left"><FormLabel>Model</FormLabel><FormControl><Input {...field} className="border-2 bg-white" /></FormControl></FormItem>
                            )} />
                            <FormField control={methods.control} name="year" render={({ field }) => (
                                <FormItem className="text-left"><FormLabel>Year</FormLabel><FormControl><Input type="number" {...field} className="border-2 bg-white" /></FormControl></FormItem>
                            )} />
                        </div>
                    </div>
                );
            case 'identifiers':
                return (
                    <div className="space-y-8 animate-in fade-in duration-500 text-left text-foreground">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left text-foreground">
                            <FormField control={methods.control} name="registrationNumber" render={({ field }) => (
                                <FormItem className="text-left">
                                    <FormLabel>RSA Registration Number</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="e.g. AB 12 CD GP" className="h-12 border-2 font-black uppercase bg-white" />
                                    </FormControl>
                                </FormItem>
                            )} />
                            <FormField control={methods.control} name="vin" render={({ field }) => (
                                <FormItem className="text-left">
                                    <FormLabel>VIN / Chassis Number</FormLabel>
                                    <FormControl>
                                        <Input {...field} className="h-12 border-2 font-mono uppercase bg-white" />
                                    </FormControl>
                                </FormItem>
                            )} />
                        </div>
                        {watchedClass !== 'Trailer' && (
                            <FormField control={methods.control} name="engineNumber" render={({ field }) => (
                                <FormItem className="animate-in slide-in-from-top-2 text-left">
                                    <FormLabel>Engine Number</FormLabel>
                                    <FormControl>
                                        <Input {...field} className="h-12 border-2 font-mono uppercase bg-white" />
                                    </FormControl>
                                </FormItem>
                            )} />
                        )}
                    </div>
                );
            case 'audit':
                return (
                    <div className="text-center py-20 space-y-6 text-foreground">
                        <ShieldCheck className="h-20 w-20 text-primary mx-auto opacity-30" />
                        <div className="space-y-2 text-center text-foreground text-foreground">
                            <h3 className="text-3xl font-black uppercase text-center text-foreground">Final Protocol Check</h3>
                            <p className="text-sm text-muted-foreground max-sm mx-auto leading-relaxed text-center">Ensure all technical nodes and valuations are verified before committing this node to the registry.</p>
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <Card className="max-w-6xl mx-auto shadow-2xl border-none overflow-hidden text-left text-foreground">
            <FormProvider {...methods}>
                <form onSubmit={methods.handleSubmit(onSubmit)} onKeyDown={(e) => { if(e.key === 'Enter') e.preventDefault(); }}>
                    <CardHeader className="bg-slate-900 text-white p-10 border-b border-white/5 text-left text-white">
                         <div className="flex justify-between items-center text-left text-white text-left">
                            <div className="text-left text-white">
                                <CardTitle className="text-3xl font-black font-headline uppercase text-white text-left">Asset movement terminal</CardTitle>
                                <CardDescription className="text-slate-400 text-lg mt-1 text-white">Phase: {steps[currentStep]?.title || 'Audit'}</CardDescription>
                            </div>
                            <Button type="button" variant="ghost" className="text-white hover:text-primary" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Exit Terminal</Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 text-left">
                        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] text-left">
                             <div className="bg-slate-50 border-r p-8 space-y-2 text-left">
                                {steps.map((step, index) => {
                                    const Icon = step.icon;
                                    const isCompleted = index < currentStep && isStepValid(index);
                                    return (
                                        <Button 
                                            key={step.id} 
                                            type="button" 
                                            variant={currentStep === index ? 'secondary' : 'ghost'} 
                                            className={cn("w-full justify-start gap-4 h-12 px-4 transition-all text-left text-foreground", currentStep === index && "bg-white shadow-sm ring-1 ring-primary/20")} 
                                            onClick={(e) => { if(index <= currentStep) setCurrentStep(index); }}
                                        >
                                            {isCompleted ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <div className={cn("h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-black", currentStep >= index ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>{index + 1}</div>}
                                            <Icon className={cn("h-5 w-5", currentStep >= index ? "text-primary" : "text-muted-foreground")} />
                                            <span className={cn("text-[10px] font-black uppercase tracking-widest text-left", currentStep === index ? "text-primary" : "text-muted-foreground")}>{step.title.split('. ')[1]}</span>
                                        </Button>
                                    );
                                })}
                            </div>
                             <div className="p-12 space-y-10 bg-white min-h-[500px] text-left text-foreground">
                                {renderStepContent()}
                             </div>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-slate-50 border-t p-10 flex justify-between text-left">
                        <Button type="button" variant="outline" onClick={handleBackStep} className="font-bold h-12 px-8">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                        {currentStep < steps.length - 1 ? (
                            <Button type="button" onClick={handleNext} className="h-12 px-12 font-black uppercase text-xs text-white shadow-lg">
                                Next Protocol Stage <ArrowRight className="ml-2 h-4 w-4"/>
                            </Button>
                        ) : (
                            <Button type="submit" disabled={isLoading} className="h-14 px-16 bg-primary hover:bg-primary/90 shadow-2xl font-black uppercase tracking-tight text-white">
                                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                                Commit Move-In Node
                            </Button>
                        )}
                    </CardFooter>
                </form>
            </FormProvider>
        </Card>
    );
}
