'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useForm, FormProvider, useFormContext, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, ArrowRight, Save, Truck, Image as ImageIcon, FileText, CheckCircle, UploadCloud, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Progress } from '@/components/ui/progress';
import { getClientSideAuthToken, useUser } from '@/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { provinces } from '@/lib/geodata';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';


const listingSchema = z.object({
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  year: z.string().min(4, "Please select a year"),
  price: z.coerce.number().positive("Price must be a positive number"),
  description: z.string().min(10, "Please provide a more detailed description"),
  mileage: z.coerce.number().min(0).optional(),
  location: z.string().min(1, "Location is required"),
  photos: z.array(z.object({ url: z.string().url() })).optional().default([]),
});

type ListingFormValues = z.infer<typeof listingSchema>;

const wizardSteps = [
    { id: 'details', name: 'Vehicle Details', fields: ['make', 'model', 'year', 'price', 'mileage', 'location', 'description'] },
    { id: 'photos', name: 'Photos', fields: [] },
    { id: 'commercials', name: 'Commercials', fields: [] },
    { id: 'publish', name: 'Publish', fields: [] },
];

const fileToDataUri = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
});

const vehicleMakes = [
  { id: 'scania', name: 'Scania' },
  { id: 'volvo', name: 'Volvo' },
  { id: 'mercedes-benz', name: 'Mercedes-Benz' },
  { id: 'man', name: 'MAN' },
  { id: 'freightliner', name: 'Freightliner' },
  { id: 'henred-fruehauf', name: 'Henred Fruehauf' },
  { id: 'afrit', name: 'Afrit' },
  { id: 'other', name: 'Other' },
];

const vehicleModels: { [key: string]: { id: string; name: string }[] } = {
  scania: [{ id: 'r-series', name: 'R-Series' }, { id: 'g-series', name: 'G-Series' }, { id: 'p-series', name: 'P-Series' }],
  volvo: [{ id: 'fh-series', name: 'FH Series' }, { id: 'fm-series', name: 'FM Series' }, { id: 'fmx-series', name: 'FMX Series' }],
  'mercedes-benz': [{ id: 'actros', name: 'Actros' }, { id: 'axor', name: 'Axor' }, { id: 'atego', name: 'Atego' }],
  man: [{ id: 'tgx', name: 'TGX' }, { id: 'tgs', name: 'TGS' }, { id: 'tgm', name: 'TGM' }],
  freightliner: [{ id: 'cascadia', name: 'Cascadia' }, { id: 'argosy', name: 'Argosy' }],
  'henred-fruehauf': [{ id: 'tautliner', name: 'Tautliner' }, { id: 'flatdeck', name: 'Flatdeck' }, { id: 'refrigerated', name: 'Refrigerated' }],
  afrit: [{ id: 'side-tipper', name: 'Side Tipper' }, { id: 'interlink', name: 'Interlink' }],
  other: [{ id: 'custom', name: 'Custom/Other' }],
};

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 30 }, (_, i) => ({ id: (currentYear - i).toString(), name: (currentYear - i).toString() }));

const locations = provinces.flatMap(p => p.cities.map(c => `${c}, ${p.name}`));


const StepDetails = () => {
    const { control, watch, setValue } = useFormContext<ListingFormValues>();
    const selectedMake = watch('make');

    const models = useMemo(() => {
        if (!selectedMake) return [];
        return vehicleModels[selectedMake] || [];
    }, [selectedMake]);

    useEffect(() => {
        if (selectedMake && models.length > 0) {
            const currentModel = watch('model');
            if (currentModel && !models.some(m => m.id === currentModel)) {
                setValue('model', '');
            }
        }
    }, [selectedMake, models, setValue, watch]);

    return (
        <div className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                    control={control}
                    name="make"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Make</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select make..." /></SelectTrigger></FormControl>
                                <SelectContent>{vehicleMakes.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={control}
                    name="model"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Model</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''} disabled={!selectedMake}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select model..." /></SelectTrigger></FormControl>
                                <SelectContent>{models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={control}
                    name="year"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Year</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select year..." /></SelectTrigger></FormControl>
                                <SelectContent>{years.map(y => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={control} name="price" render={({ field }) => <FormItem><FormLabel>Price (R)</FormLabel><FormControl><Input type="number" placeholder="e.g., 1200000" {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={control} name="mileage" render={({ field }) => <FormItem><FormLabel>Mileage (km, optional)</FormLabel><FormControl><Input type="number" placeholder="e.g., 350000" {...field} /></FormControl><FormMessage /></FormItem>} />
            </div>
            <FormField
                control={control}
                name="location"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Location</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="e.g., Johannesburg, Gauteng" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {locations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField control={control} name="description" render={({ field }) => <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Describe the vehicle's condition, features, and history..." {...field} rows={6}/></FormControl><FormMessage /></FormItem>} />
        </div>
    );
};

const StepPhotos = () => {
    const { control } = useFormContext<ListingFormValues>();
    const { fields, append, remove } = useFieldArray({ control, name: "photos" });
    const { user } = useUser();
    const { toast } = useToast();
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0 || !user) return;

        setUploading(true);
        setProgress(0);

        const uploadedUrls: string[] = [];
        const totalFiles = files.length;

        for (let i = 0; i < totalFiles; i++) {
            const file = files[i];
            try {
                const token = await getClientSideAuthToken();
                if (!token) throw new Error("Authentication failed.");
                
                const fileDataUri = await fileToDataUri(file);
                
                const folder = `user-assets/${user.uid}/vehicle-listings`;
                const fileName = `${Date.now()}_${file.name}`;
                
                const response = await fetch('/api/uploadImageAsset', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileDataUri, folder, fileName })
                });

                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || `Failed to upload ${file.name}.`);
                }
                
                uploadedUrls.push(result.url);
                setProgress(((i + 1) / totalFiles) * 100);

            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: `Upload Failed for ${file.name}`,
                    description: error.message,
                });
            }
        }
        
        if (uploadedUrls.length > 0) {
            uploadedUrls.forEach(url => append({ url }));
            toast({
                title: 'Upload Complete',
                description: `${uploadedUrls.length} of ${totalFiles} images uploaded successfully.`,
            });
        }

        if (e.target) {
            e.target.value = '';
        }

        setUploading(false);
        setProgress(0);
    };
    
    return (
        <div className="space-y-4">
            <div className="p-4 border rounded-md bg-muted/50 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {fields.map((field, index) => (
                         <div key={field.id} className="relative aspect-square">
                            <Image src={field.url} alt={`Vehicle photo ${index + 1}`} fill className="object-cover rounded-md border" />
                            <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={() => remove(index)} disabled={uploading}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                     <label htmlFor="photo-upload" className="relative aspect-square flex items-center justify-center border-2 border-dashed rounded-md cursor-pointer hover:bg-accent hover:border-primary transition-colors">
                        <div className="text-center">
                            <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground"/>
                            <span className="text-sm text-muted-foreground">Upload Photos</span>
                        </div>
                    </label>
                    <Input id="photo-upload" type="file" multiple className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                </div>
                {uploading && (
                    <div className="space-y-1">
                        <Progress value={progress} className="h-2"/>
                    </div>
                )}
            </div>
        </div>
    );
};

const PlaceholderStep = ({ name }: { name: string }) => (
    <div className="flex items-center justify-center h-full bg-muted/50 rounded-lg p-8">
        <div className="text-center">
             <h3 className="text-xl font-semibold text-muted-foreground">{name}</h3>
            <p className="text-muted-foreground mt-2">This section is under construction.</p>
        </div>
    </div>
);


export function VehicleWizard({ listing, onBack, onSaveSuccess, companyId }: { listing?: any, onBack: () => void, onSaveSuccess: () => void, companyId: string | null }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    
    const methods = useForm<ListingFormValues>({
        resolver: zodResolver(listingSchema),
        mode: 'onChange',
        defaultValues: listing || { 
            make: '', model: '', year: '', price: 0, description: '', mileage: 0, location: '', photos: [],
        },
    });

    const handleNext = async () => {
        const currentStepConfig = wizardSteps[currentStep];
        if (!currentStepConfig) return;

        let isValid = false;
        if (currentStepConfig.fields && currentStepConfig.fields.length > 0) {
            isValid = await methods.trigger(currentStepConfig.fields as (keyof ListingFormValues)[]);
        } else {
            isValid = true;
        }

        if (isValid && currentStep < wizardSteps.length - 1) {
            setCurrentStep(s => s + 1);
        } else if (!isValid) {
            toast({ variant: 'destructive', title: 'Validation Error', description: 'Please complete all required fields.' });
        }
    };

    const handleBackWizard = () => { currentStep > 0 ? setCurrentStep(prev => prev - 1) : onBack(); };

    const onSubmit = async (values: ListingFormValues) => {
        setIsSaving(true);
        if (!companyId) {
            toast({ variant: 'destructive', title: "Error", description: "Company ID not found." });
            setIsSaving(false);
            return;
        }
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Auth failed.");

            const path = listing?.id 
                ? `companies/${companyId}/vehicleListings/${listing.id}` 
                : `companies/${companyId}/vehicleListings`;
            
            const dataToSave = { ...values, companyId, status: 'active' };

            const response = await fetch(listing?.id ? '/api/updateUserDoc' : '/api/addUserDoc', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(listing?.id 
                    ? { path, data: { ...dataToSave, updatedAt: { _methodName: 'serverTimestamp' } } }
                    : { collectionPath: path, data: dataToSave }
                ),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to save listing.');
            
            toast({ title: listing?.id ? 'Listing Updated' : 'Listing Created' });
            onSaveSuccess();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error saving listing', description: e.message });
        } finally {
            setIsSaving(false);
        }
    };
    
    const isStepValid = (stepIndex: number) => {
        if (stepIndex < 0) return true;
        const step = wizardSteps[stepIndex];
        if (!step.fields || step.fields.length === 0) return true;
        const fields = step.fields as (keyof ListingFormValues)[];
        return fields.every(field => !methods.formState.errors[field as keyof typeof methods.formState.errors]);
    };
    
     const renderStepContent = () => {
        const stepId = wizardSteps[currentStep]?.id;
        switch (stepId) {
            case 'details': return <StepDetails />;
            case 'photos': return <StepPhotos />;
            default: return <PlaceholderStep name={wizardSteps[currentStep]?.name || 'Step'} />;
        }
    };
    
    return (
        <Card className="w-full">
            <FormProvider {...methods}>
                <form onSubmit={methods.handleSubmit(onSubmit)}>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                             <div>
                                <h2 className="text-2xl font-bold font-headline">{listing ? 'Edit Vehicle Listing' : 'Create New Vehicle Listing'}</h2>
                                <p className="text-muted-foreground">{wizardSteps[currentStep].name}</p>
                            </div>
                             <Button type="button" variant="ghost" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4"/> Back to List</Button>
                        </div>
                    </CardHeader>
                        <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-8">
                             <div className="flex flex-col gap-2 border-r pr-4">
                                {wizardSteps.map((step, index) => {
                                    const isCompleted = index < currentStep && isStepValid(index);
                                    return (
                                        <Button key={step.id} variant={currentStep === index ? 'secondary' : 'ghost'} className="justify-start gap-2" onClick={() => setCurrentStep(index)} disabled={index > currentStep && !isStepValid(currentStep - 1)}>
                                            {isCompleted ? <CheckCircle className="h-5 w-5 text-green-500" /> : <div className={cn("h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold", currentStep >= index ? "bg-primary text-primary-foreground border-2 border-primary" : "bg-muted text-muted-foreground")}>{index + 1}</div>}
                                            {step.name}
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
                        <Button type="button" variant="outline" onClick={handleBackWizard} disabled={currentStep === 0}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                        {currentStep < wizardSteps.length - 1 ? (
                            <Button type="button" onClick={handleNext}>Next <ArrowRight className="ml-2 h-4 w-4"/></Button>
                        ) : (
                            <Button type="submit" disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} {listing ? 'Save Changes' : 'Create Listing'}</Button>
                        )}
                    </CardFooter>
                </form>
            </FormProvider>
        </Card>
    );
}
