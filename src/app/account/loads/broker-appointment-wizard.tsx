
'use client';

import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, ArrowRight, Handshake, Building, FileUp, ShieldCheck, CheckCircle, Lock, Info, Gavel } from 'lucide-react';
import { getClientSideAuthToken, useUser } from '@/firebase';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const appointmentSchema = z.object({
  providerName: z.string().min(1, "Debtor/Provider name is required."),
  subcontractingClause: z.string().min(1, "Please specify the clause number authorizing subcontracting."),
  commissionRate: z.coerce.number().min(0).max(50),
  primaryContractUrl: z.string().min(1, "Primary contract is required for verification."),
  subcontractorAgreementUrl: z.string().min(1, "Subcontractor agreement with No-Circumvention is required.")
});

const steps = [
    { id: 'provider', title: 'Load Provider', icon: Building },
    { id: 'legal', title: 'Contractual Rights', icon: Gavel },
    { id: 'documents', title: 'Evidence & Trust', icon: FileUp },
    { id: 'review', title: 'Submit for Audit', icon: CheckCircle },
];

export function BrokerAppointmentWizard({ onComplete }: { onComplete: () => void }) {
    const { user } = useUser();
    const { toast } = useToast();
    const [currentStep, setCurrentStep] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [uploadingField, setUploadingField] = useState<string | null>(null);

    const methods = useForm<z.infer<typeof appointmentSchema>>({
        resolver: zodResolver(appointmentSchema),
        defaultValues: { commissionRate: 5, primaryContractUrl: '', subcontractorAgreementUrl: '', subcontractingClause: '' }
    });

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'primaryContractUrl' | 'subcontractorAgreementUrl') => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        setUploadingField(fieldName);
        try {
            const token = await getClientSideAuthToken();
            const reader = new FileReader();
            const dataUri = await new Promise<string>(res => {
                reader.onload = () => res(reader.result as string);
                reader.readAsDataURL(file);
            });
            const response = await fetch('/api/uploadImageAsset', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileDataUri: dataUri, folder: `broker-docs/${user.uid}`, fileName: `${fieldName}_${Date.now()}_${file.name}` })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            methods.setValue(fieldName, result.url, { shouldValidate: true });
            toast({ title: "Document Uploaded" });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Upload Failed", description: e.message });
        } finally {
            setUploadingField(null);
        }
    };

    const onSubmit = async (values: z.infer<typeof appointmentSchema>) => {
        setIsLoading(true);
        try {
            const token = await getClientSideAuthToken();
            const res = await fetch('/api/addUserDoc', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    collectionPath: `companies/${user!.companyId}/brokerAgreements`,
                    data: { ...values, brokerId: user!.companyId, status: 'pending', createdAt: { _methodName: 'serverTimestamp' } }
                })
            });
            if (!res.ok) throw new Error("Failed to save authorization request.");
            toast({ title: "Audit Submitted", description: "A platform admin will verify your subcontracting rights." });
            onComplete();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error", description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="max-w-4xl mx-auto shadow-2xl border-none text-left">
            <CardHeader className="bg-slate-900 text-white rounded-t-xl p-8">
                <CardTitle className="text-2xl font-black font-headline flex items-center gap-3">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                    Subcontractor Authorization Wizard
                </CardTitle>
                <CardDescription className="text-slate-400">Establish the legal foundation for posting and distributing freight.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-8">
                    <div className="space-y-2 border-r pr-4">
                        {steps.map((step, i) => (
                            <Button key={step.id} variant={currentStep === i ? "secondary" : "ghost"} className="w-full justify-start gap-2 h-10 px-2" onClick={() => i < currentStep && setCurrentStep(i)}>
                                <div className={cn("h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold", currentStep >= i ? "bg-primary text-white" : "bg-muted")}>{i+1}</div>
                                {step.title}
                            </Button>
                        ))}
                    </div>
                    <FormProvider {...methods}>
                        <div className="space-y-8 min-h-[350px] text-left text-foreground">
                            {currentStep === 0 && (
                                <div className="space-y-6 text-left">
                                    <h3 className="font-bold text-lg flex items-center gap-2">
                                        <Building className="h-5 w-5 text-primary" />
                                        Primary Debtor Entity
                                    </h3>
                                    <FormField control={methods.control} name="providerName" render={({ field }) => (
                                        <FormItem className="text-left">
                                            <FormLabel>Who is the original Load Provider (Debtor)?</FormLabel>
                                            <FormControl><Input placeholder="Legal name as per contract..." {...field} /></FormControl>
                                            <FormDescription>This is the company you hold the primary contract with.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                            )}

                            {currentStep === 1 && (
                                <div className="space-y-6 text-left">
                                    <h3 className="font-bold text-lg flex items-center gap-2">
                                        <Gavel className="h-5 w-5 text-primary" />
                                        Subcontracting Rights
                                    </h3>
                                    <Alert className="bg-primary/5 border-primary/20">
                                        <Info className="h-4 w-4 text-primary" />
                                        <AlertTitle className="font-bold">Legal Integrity Check</AlertTitle>
                                        <AlertDescription className="text-xs">
                                            The platform must verify that you have the right to appoint substitutes or subcontractors under your primary agreement.
                                        </AlertDescription>
                                    </Alert>
                                    <FormField control={methods.control} name="subcontractingClause" render={({ field }) => (
                                        <FormItem className="text-left">
                                            <FormLabel>Subcontracting Clause Reference</FormLabel>
                                            <FormControl><Input placeholder="e.g. Clause 14.2 (Substitute Provision)" {...field} /></FormControl>
                                            <FormDescription>Specify the clause in your primary contract that allows for this.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                            )}

                            {currentStep === 2 && (
                                <div className="space-y-8 text-left">
                                    <h3 className="font-bold text-lg flex items-center gap-2">
                                        <FileUp className="h-5 w-5 text-primary" />
                                        Evidence & Trust Binding
                                    </h3>
                                    
                                    <div className="grid gap-6">
                                        <div className="p-6 border-2 border-dashed rounded-xl bg-slate-50 space-y-4">
                                            <div className="flex justify-between items-center">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-bold">1. Primary Contract Upload</p>
                                                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Confidential Audit Only</p>
                                                </div>
                                                <input type="file" id="primary-up" className="hidden" onChange={(e) => handleFileUpload(e, 'primaryContractUrl')} />
                                                <Button variant="outline" size="sm" onClick={() => document.getElementById('primary-up')?.click()} disabled={!!uploadingField}>
                                                    {uploadingField === 'primaryContractUrl' ? <Loader2 className="h-4 w-4 animate-spin"/> : <FileUp className="h-4 w-4 mr-2" />}
                                                    {methods.watch('primaryContractUrl') ? 'Update File' : 'Select File'}
                                                </Button>
                                            </div>
                                            {methods.watch('primaryContractUrl') && <div className="flex items-center gap-2 text-green-600 text-[10px] font-bold uppercase"><ShieldCheck className="h-4 w-4"/> Document Ready</div>}
                                        </div>

                                        <div className="p-6 border-2 border-dashed rounded-xl bg-slate-50 space-y-4">
                                            <div className="flex justify-between items-center">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-bold">2. Subcontractor Agreement</p>
                                                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Requires No-Circumvention Clause</p>
                                                </div>
                                                <input type="file" id="sub-up" className="hidden" onChange={(e) => handleFileUpload(e, 'subcontractorAgreementUrl')} />
                                                <Button variant="outline" size="sm" onClick={() => document.getElementById('sub-up')?.click()} disabled={!!uploadingField}>
                                                    {uploadingField === 'subcontractorAgreementUrl' ? <Loader2 className="h-4 w-4 animate-spin"/> : <FileUp className="h-4 w-4 mr-2" />}
                                                    {methods.watch('subcontractorAgreementUrl') ? 'Update File' : 'Select File'}
                                                </Button>
                                            </div>
                                            {methods.watch('subcontractorAgreementUrl') && <div className="flex items-center gap-2 text-green-600 text-[10px] font-bold uppercase"><ShieldCheck className="h-4 w-4"/> Document Ready</div>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 3 && (
                                <div className="text-center py-12 space-y-6">
                                    <div className="bg-primary/10 p-4 rounded-full w-fit mx-auto">
                                        <CheckCircle className="h-16 w-16 text-primary" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black font-headline">Ready for Legal Audit</h3>
                                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">An administrator will review your primary contract rights and no-circumvention clauses before authorizing your brokerage node.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </FormProvider>
                </div>
            </CardContent>
            <CardFooter className="p-8 bg-slate-50 border-t flex justify-between">
                <Button variant="ghost" onClick={currentStep === 0 ? onComplete : () => setCurrentStep(prev => prev - 1)}><ArrowLeft className="mr-2 h-4 w-4"/> {currentStep === 0 ? 'Cancel' : 'Back'}</Button>
                {currentStep < 3 ? (
                    <Button onClick={() => setCurrentStep(prev => prev + 1)}>Next Step <ArrowRight className="ml-2 h-4 w-4"/></Button>
                ) : (
                    <Button onClick={methods.handleSubmit(onSubmit)} disabled={isLoading} className="gap-2 font-black uppercase shadow-lg h-12 px-8">
                        {isLoading ? <Loader2 className="animate-spin h-4 w-4"/> : <ShieldCheck className="h-4 w-4" />}
                        Submit Authorization
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
