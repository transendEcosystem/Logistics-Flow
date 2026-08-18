'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ArrowRight, ArrowLeft, FileSignature, Truck, Paperclip, Eye, CheckCircle } from 'lucide-react';
import { getClientSideAuthToken, useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { query, collection, doc } from 'firebase/firestore';

// API Helper
async function performAdminAction(token: string, action: string, payload: any) {
    const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
        throw new Error(result.error || `API Error for action: ${action}`);
    }
    return result;
}

// Schemas
const agreementSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  description: z.string().min(1, 'Description is required'),
  totalAdvanced: z.coerce.number().positive('Amount must be positive'),
  interestRate: z.coerce.number().min(0, "Rate can't be negative"),
  numberOfInstallments: z.coerce.number().int().positive('Term must be a positive integer'),
});

const assetSchema = z.object({
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  year: z.string().min(4, 'Year is required'),
  costOfSale: z.coerce.number().positive('Cost must be positive'),
  registrationNumber: z.string().optional(),
});

const securitySchema = z.object({
  documentName: z.string().min(1, 'Document name is required'),
  documentType: z.string().min(1, 'Document type is required'),
  fileUrl: z.string().url('A valid file URL is required after upload.').optional().or(z.literal('')),
});

const wizardSchema = z.object({
    agreement: agreementSchema,
    asset: assetSchema,
    security: securitySchema,
});

type WizardFormValues = z.infer<typeof wizardSchema>;

// Step Components
const StepAgreement = ({ clients }: { clients: any[] }) => {
    const { control } = useFormContext<WizardFormValues>();
    return (
        <div className="space-y-4">
            <FormField control={control} name="agreement.clientId" render={({ field }) => (<FormItem><FormLabel>Client</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a client..." /></SelectTrigger></FormControl><SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
            <FormField control={control} name="agreement.description" render={({ field }) => (<FormItem><FormLabel>Agreement Description</FormLabel><FormControl><Textarea placeholder="e.g., Asset finance for Scania R500" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid grid-cols-3 gap-4">
                <FormField control={control} name="agreement.totalAdvanced" render={({ field }) => (<FormItem><FormLabel>Amount (R)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={control} name="agreement.interestRate" render={({ field }) => (<FormItem><FormLabel>Rate (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={control} name="agreement.numberOfInstallments" render={({ field }) => (<FormItem><FormLabel>Term (Months)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
        </div>
    );
};

const StepAsset = () => {
     const { control } = useFormContext<WizardFormValues>();
     return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={control} name="asset.make" render={({ field }) => (<FormItem><FormLabel>Make</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={control} name="asset.model" render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={control} name="asset.year" render={({ field }) => (<FormItem><FormLabel>Year</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={control} name="asset.costOfSale" render={({ field }) => (<FormItem><FormLabel>Cost (Excl. VAT)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={control} name="asset.registrationNumber" render={({ field }) => (<FormItem><FormLabel>Registration #</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
        </div>
    );
};

const StepSecurity = () => {
    const { control } = useFormContext<WizardFormValues>();
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField control={control} name="security.documentName" render={({ field }) => (<FormItem><FormLabel>Document Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={control} name="security.documentType" render={({ field }) => (<FormItem><FormLabel>Document Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="surety">Surety</SelectItem><SelectItem value="pledge">Pledge</SelectItem><SelectItem value="cession">Cession</SelectItem><SelectItem value="notarial_bond">Notarial Bond</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
            </div>
            <FormField control={control} name="security.fileUrl" render={({ field }) => (<FormItem><FormLabel>File URL (Upload Later)</FormLabel><FormControl><Input {...field} placeholder="URL will be generated after upload" /></FormControl><FormMessage /></FormItem>)} />
        </div>
    );
};

const steps = [
    { id: 'agreement', title: 'Agreement Details', icon: FileSignature, fields: ['agreement.clientId', 'agreement.description', 'agreement.totalAdvanced', 'agreement.interestRate', 'agreement.numberOfInstallments'] },
    { id: 'asset', title: 'Asset Details', icon: Truck, fields: ['asset.make', 'asset.model', 'asset.year', 'asset.costOfSale'] },
    { id: 'security', title: 'Security Document', icon: Paperclip, fields: ['security.documentName', 'security.documentType'] },
    { id: 'review', title: 'Review & Submit', icon: Eye, fields: [] },
];

interface InstallmentSaleWizardProps {
  clients: any[];
  onSaveSuccess: () => void;
  onBack: () => void;
  agreement?: any; // Make agreement optional for create/edit
}

export function InstallmentSaleWizard({ clients, onSaveSuccess, onBack, agreement }: InstallmentSaleWizardProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const firestore = useFirestore();

    const methods = useForm<WizardFormValues>({ resolver: zodResolver(wizardSchema) });

    // Fetch related data if in edit mode
    const assetRef = useMemoFirebase(() => {
        if (!firestore || !agreement?.assetId) return null;
        return doc(firestore, 'lendingAssets', agreement.assetId);
    }, [firestore, agreement]);
    const { data: assetData, isLoading: isAssetLoading } = useDoc(assetRef);

    const securityQuery = useMemoFirebase(() => {
        if (!firestore || !agreement) return null;
        return query(collection(firestore, `lendingClients/${agreement.clientId}/agreements/${agreement.id}/securities`));
    }, [firestore, agreement]);
    const { data: securityData, isLoading: isSecurityLoading } = useCollection(securityQuery);
    const securityDoc = securityData?.[0];
    
    const isEditing = !!agreement;
    const isEditDataLoading = isEditing && (isAssetLoading || isSecurityLoading);

    useEffect(() => {
        if (isEditing && assetData && securityDoc !== undefined) {
             methods.reset({
                agreement: { 
                    clientId: agreement.clientId,
                    description: agreement.description,
                    totalAdvanced: agreement.totalAdvanced,
                    interestRate: agreement.interestRate,
                    numberOfInstallments: agreement.numberOfInstallments
                },
                asset: { 
                    make: assetData.make,
                    model: assetData.model,
                    year: assetData.year,
                    costOfSale: assetData.costOfSale,
                    registrationNumber: assetData.registrationNumber
                },
                security: {
                    documentName: securityDoc.documentName,
                    documentType: securityDoc.documentType,
                    fileUrl: securityDoc.fileUrl,
                }
            });
        } else if (!isEditing) {
            methods.reset({}); // Reset for new entry
        }
    }, [isEditing, agreement, assetData, securityDoc, methods]);


    const onSubmit = async (values: WizardFormValues) => {
        setIsLoading(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");

            if (agreement) { // UPDATE LOGIC
                // This is a simplified update. A real-world scenario might need more complex logic.
                await performAdminAction(token, 'saveLendingAgreement', { agreement: { id: agreement.id, ...values.agreement } });
                if (assetData) {
                    await performAdminAction(token, 'saveLendingAsset', { asset: { id: assetData.id, ...values.asset, clientId: values.agreement.clientId } });
                }
                if (securityDoc) {
                    await performAdminAction(token, 'saveLendingSecurity', { security: { id: securityDoc.id, ...values.security, clientId: values.agreement.clientId, agreementId: agreement.id } });
                }
                toast({ title: 'Installment Sale Agreement Updated!' });
            } else { // CREATE LOGIC
                await performAdminAction(token, 'saveInstallmentSalePackage', values);
                toast({ title: 'Installment Sale Agreement Created!' });
            }
            onSaveSuccess();
            setCurrentStep(0);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleNext = async () => {
        const stepFields = steps[currentStep].fields;
        const isValid = await methods.trigger(stepFields as any);
        if (isValid && currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else if (!isValid) {
            toast({ variant: "destructive", title: "Please complete all required fields for this step." });
        }
    };
    
    const handleBackStep = () => setCurrentStep(prev => prev - 1);
    
     const isStepValid = (stepIndex: number) => {
        if (stepIndex < 0 || stepIndex >= steps.length) return true;
        const step = steps[stepIndex];
        if (!step.fields || step.fields.length === 0) return true;
        const fields = step.fields as (keyof WizardFormValues)[];
        // This is a simplification; for nested objects, you'd need a more robust check
        return fields.every(field => !methods.formState.errors[field as keyof typeof methods.formState.errors]);
    };
    
    const renderStepContent = () => {
        if (isEditDataLoading) {
            return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div>
        }
        const stepId = steps[currentStep]?.id;
        switch (stepId) {
            case 'agreement': return <StepAgreement clients={clients} />;
            case 'asset': return <StepAsset />;
            case 'security': return <StepSecurity />;
            case 'review': return <div className="text-center p-8"><p>Review all details and click {agreement ? 'Update Agreement' : 'Create Agreement'}.</p></div>
            default: return <div>Step not found</div>;
        }
    };

    return (
        <Card>
             <FormProvider {...methods}>
                <form onSubmit={methods.handleSubmit(onSubmit)}>
                    <CardHeader>
                         <div className="flex justify-between items-start">
                             <div>
                                <h2 className="text-2xl font-bold font-headline">{agreement ? 'Edit' : 'Create'} Installment Sale</h2>
                                <p className="text-muted-foreground">{steps[currentStep].title}</p>
                            </div>
                             <Button type="button" variant="ghost" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4"/> Back to List</Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-8">
                             <div className="flex flex-col gap-2 border-r pr-4">
                                {steps.map((step, index) => {
                                    const isCompleted = index < currentStep && isStepValid(index);
                                    return (
                                        <Button 
                                            key={step.id} 
                                            type="button"
                                            variant={currentStep === index ? 'secondary' : 'ghost'}
                                            className="justify-start gap-2" 
                                            onClick={() => setCurrentStep(index)} 
                                            disabled={index > currentStep && !isStepValid(currentStep - 1)}
                                        >
                                            {isCompleted ? <CheckCircle className="h-5 w-5 text-green-500" /> : <div className={cn("h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold", currentStep >= index ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{index + 1}</div>}
                                            {step.title}
                                        </Button>
                                    );
                                })}
                            </div>
                             <div className="space-y-6 min-h-[400px]">
                                {renderStepContent()}
                             </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t pt-6 mt-6">
                        <Button type="button" variant="outline" onClick={handleBackStep} disabled={currentStep === 0 || isLoading}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                        {currentStep < steps.length - 1 ? (
                            <Button type="button" onClick={handleNext}>
                                Next <ArrowRight className="ml-2 h-4 w-4"/>
                            </Button>
                        ) : (
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                {agreement ? 'Update Agreement' : 'Create Agreement'}
                            </Button>
                        )}
                    </CardFooter>
                </form>
            </FormProvider>
        </Card>
    );
}
