
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, UploadCloud, ArrowLeft, ArrowRight, Paperclip, FileText, CheckCircle } from 'lucide-react';
import { getClientSideAuthToken, useUser } from '@/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const fileToDataUri = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
});

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

const securitySchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  agreementId: z.string().min(1, 'Agreement is required'),
  documentName: z.string().min(1, 'Document name is required'),
  documentType: z.string().min(1, 'Document type is required'),
  fileUrl: z.string().min(1, 'A file must be uploaded'),
});
type SecurityFormValues = z.infer<typeof securitySchema>;


const steps = [
    { id: 'association', title: 'Association', fields: ['clientId', 'agreementId'] },
    { id: 'details', title: 'Document Details', fields: ['documentName', 'documentType'] },
    { id: 'upload', title: 'File Upload', fields: ['fileUrl'] },
];

interface EditSecurityWizardProps {
  security?: any;
  clients: any[];
  agreements: any[];
  onSave: () => void;
  onBack: () => void;
}

export function EditSecurityWizard({ security, clients, agreements, onSave, onBack }: EditSecurityWizardProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentStep, setCurrentStep] = useState(0);
    const { user } = useUser();
    const { toast } = useToast();
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const methods = useForm<SecurityFormValues>({
        resolver: zodResolver(securitySchema),
        mode: 'onChange',
    });

    const selectedClientId = methods.watch('clientId');

    const filteredAgreements = useMemo(() => {
        return agreements.filter(a => a.clientId === selectedClientId);
    }, [agreements, selectedClientId]);

    useEffect(() => {
        methods.reset({
            clientId: security?.clientId || '',
            agreementId: security?.agreementId || '',
            documentName: security?.documentName || '',
            documentType: security?.documentType || '',
            fileUrl: security?.fileUrl || '',
        });
    }, [security, methods]);
    
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        setUploading(true);
        setProgress(10);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");
            const fileDataUri = await fileToDataUri(file);
            setProgress(30);

            const folder = `user-assets/${user.uid}/lending-securities`;
            const fileName = `${Date.now()}_${file.name}`;
            
            const response = await fetch('/api/uploadImageAsset', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileDataUri, folder, fileName, contentType: file.type }),
            });
            setProgress(80);
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            
            methods.setValue('fileUrl', result.url, { shouldValidate: true });
            if (!methods.getValues('documentName')) {
                methods.setValue('documentName', file.name);
            }
            setProgress(100);
            toast({ title: 'Upload Successful' });
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Upload Failed', description: err.message });
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
            setUploading(false);
            setProgress(0);
        }
    };


    const onSubmit = async (values: SecurityFormValues) => {
        setIsLoading(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");
            await performAdminAction(token, 'saveLendingSecurity', { security: { id: security?.id, ...values } });
            toast({ title: security ? 'Security Document Updated' : 'Security Document Saved' });
            onSave();
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
        return step.fields.every(field => !methods.formState.errors[field as keyof typeof methods.formState.errors]);
    };
    
    const renderStepContent = () => {
        switch (currentStep) {
            case 0: return (
                <>
                    <FormField control={methods.control} name="clientId" render={({ field }) => (<FormItem><FormLabel>Client</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a client..." /></SelectTrigger></FormControl><SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={methods.control} name="agreementId" render={({ field }) => (<FormItem><FormLabel>Agreement</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedClientId}><FormControl><SelectTrigger><SelectValue placeholder="Select an agreement..." /></SelectTrigger></FormControl><SelectContent>{filteredAgreements.map(a => <SelectItem key={a.id} value={a.id}>{a.description}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                </>
            );
            case 1: return (
                 <div className="space-y-4">
                    <FormField control={methods.control} name="documentName" render={({ field }) => (<FormItem><FormLabel>Document Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={methods.control} name="documentType" render={({ field }) => (<FormItem><FormLabel>Document Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="surety">Surety</SelectItem><SelectItem value="pledge">Pledge</SelectItem><SelectItem value="cession">Cession</SelectItem><SelectItem value="notarial_bond">Notarial Bond</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                 </div>
            );
            case 2: return (
                <FormField control={methods.control} name="fileUrl" render={({ field }) => (
                    <FormItem>
                        <FormLabel>File</FormLabel>
                        <FormControl>
                            <div className="flex items-center gap-2">
                                <Input value={field.value} readOnly className="flex-grow"/>
                                <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                                    <UploadCloud className="h-4 w-4" />
                                </Button>
                                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} disabled={uploading} />
                            </div>
                        </FormControl>
                        {uploading && <Progress value={progress} className="w-full mt-2" />}
                        <FormMessage />
                    </FormItem>
                )} />
            );
            default: return null;
        }
    };

    return (
        <Card>
            <FormProvider {...methods}>
                <form onSubmit={methods.handleSubmit(onSubmit)}>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold font-headline">{security ? 'Edit' : 'Add'} Security Document</h2>
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
                                        <Button key={step.id} type="button" variant={currentStep === index ? 'secondary' : 'ghost'} className="justify-start gap-2" onClick={() => setCurrentStep(index)} disabled={index > currentStep && !isStepValid(currentStep - 1)}>
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
                            <Button type="submit" disabled={isLoading || uploading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save Document
                            </Button>
                        )}
                    </CardFooter>
                </form>
            </FormProvider>
        </Card>
    );
}
