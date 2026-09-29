
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ArrowLeft, ArrowRight, Landmark, Building, ShieldCheck, Gavel, CheckCircle2, Info, Scale, Lock } from 'lucide-react';
import { getClientSideAuthToken, useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn, formatCurrency, fetchFromAdminAPI } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { LENDING_ONBOARDING_WORKFLOW, getNextOnboardingStage, getOnboardingStageDefinition } from '@/lib/lending/onboarding-workflow';
import { TaskEvidenceReviewer } from './task-evidence-reviewer';

const facilitySchema = z.object({
  id: z.string().optional(),
  parentId: z.string().optional().nullable(),
  ownerType: z.enum(['client', 'debtor', 'supplier']).default('client'),
  facilityClass: z.enum(['global', 'sub']).default('global'),
  clientId: z.string().optional().nullable(),
  debtorId: z.string().optional().nullable(),
  sourceDealerId: z.string().optional().nullable(),
  associatedClientId: z.string().optional().nullable(), 
  type: z.string().min(1, 'Product type or identifier is required'),
  limit: z.coerce.number().min(0, 'Limit must be a positive number'),
  status: z.string().default('active'),
    onboardingStage: z.string().default('lead'),
    onboardingTasks: z.record(z.boolean()).default({}),
        onboardingEvidence: z.record(z.string()).default({}),
});

type FacilityFormValues = z.infer<typeof facilitySchema>;

const allSteps = [
    { id: 'type', title: 'Context & Branch', icon: Landmark, fields: ['ownerType'] },
    { id: 'association', title: 'Global Limit', icon: Building, fields: ['clientId', 'debtorId', 'sourceDealerId', 'limit'] },
    { id: 'agreement_limit', title: 'Sub-Node Authorization', icon: Gavel, fields: ['type', 'limit', 'associatedClientId'] },
    { id: 'review', title: 'Audit Readiness', icon: ShieldCheck, fields: [] },
];

interface EditFacilityWizardProps {
  facility?: any;
  parentFacility?: any; 
  clients: any[];
  debtors: any[];
  suppliers: any[];
  onSave: () => void;
  onBack: () => void;
  initialOwnerType?: 'client' | 'debtor' | 'supplier';
  initialFacilityClass?: 'global' | 'sub';
}

export function EditFacilityWizard({ 
    facility, 
    parentFacility, 
    clients, 
    debtors, 
    suppliers,
    onSave, 
    onBack,
    initialOwnerType,
    initialFacilityClass
}: EditFacilityWizardProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [reviewTaskId, setReviewTaskId] = useState<string | null>(null);
    const { toast } = useToast();
    
    const isSubLimitMode = useMemo(() => !!parentFacility || initialFacilityClass === 'sub' || facility?.facilityClass === 'sub', [parentFacility, initialFacilityClass, facility]);

    const methods = useForm<FacilityFormValues>({
        resolver: zodResolver(facilitySchema),
        mode: 'onChange',
        defaultValues: { 
            ownerType: initialOwnerType || parentFacility?.ownerType || facility?.ownerType || 'client', 
            facilityClass: initialFacilityClass || (isSubLimitMode ? 'sub' : 'global'),
            parentId: parentFacility?.id || facility?.parentId || null,
            clientId: parentFacility?.clientId || facility?.clientId || null,
            debtorId: parentFacility?.debtorId || facility?.debtorId || null,
            sourceDealerId: parentFacility?.sourceDealerId || facility?.sourceDealerId || null,
            limit: facility?.limit || 0, 
            status: facility?.status || 'pending_credit',
            type: facility?.type || (isSubLimitMode ? 'Sub-Limit' : 'Global Ceiling'),
            associatedClientId: facility?.associatedClientId || null,
            onboardingStage: facility?.onboardingStage || 'lead',
            onboardingTasks: facility?.onboardingTasks || {},
            onboardingEvidence: facility?.onboardingEvidence || {},
        }
    });

    const watched = methods.watch();

    useEffect(() => {
        const defaults = { 
            ownerType: initialOwnerType || parentFacility?.ownerType || facility?.ownerType || 'client', 
            facilityClass: initialFacilityClass || (isSubLimitMode ? 'sub' : 'global'),
            parentId: parentFacility?.id || facility?.parentId || null,
            clientId: parentFacility?.clientId || facility?.clientId || null,
            debtorId: parentFacility?.debtorId || facility?.debtorId || null,
            sourceDealerId: parentFacility?.sourceDealerId || facility?.sourceDealerId || null,
            limit: facility?.limit || 0, 
            status: facility?.status || 'pending_credit',
            type: facility?.type || (isSubLimitMode ? 'Sub-Limit' : 'Global Ceiling'),
            associatedClientId: facility?.associatedClientId || null,
            onboardingStage: facility?.onboardingStage || 'lead',
            onboardingTasks: facility?.onboardingTasks || {},
            onboardingEvidence: facility?.onboardingEvidence || {},
        };
        methods.reset(defaults);
        setCurrentStep(0);
    }, [facility, parentFacility, initialOwnerType, initialFacilityClass, isSubLimitMode, methods]);

    const steps = useMemo(() => {
        return allSteps.filter(step => {
            if (step.id === 'type' && (initialOwnerType || isSubLimitMode)) return false;
            if (step.id === 'association' && isSubLimitMode) return false;
            if (step.id === 'agreement_limit' && !isSubLimitMode) return false;
            return true;
        });
    }, [initialOwnerType, isSubLimitMode]);

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

    const onSubmit = async (values: FacilityFormValues) => {
        setIsLoading(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");

            const allValues = methods.getValues();
            const activeStage = getOnboardingStageDefinition(allValues.onboardingStage);
            const tasksComplete = activeStage.tasks.length > 0 && activeStage.tasks.every(task => allValues.onboardingTasks?.[task.id]);
            const nextStage = tasksComplete ? getNextOnboardingStage(allValues.onboardingStage) : allValues.onboardingStage;
            const shouldAdvance = tasksComplete && nextStage !== allValues.onboardingStage;

            const finalPayload = {
                ...allValues,
                id: facility?.id || undefined,
                limit: Number(allValues.limit),
                parentId: parentFacility?.id || allValues.parentId || null,
                facilityClass: isSubLimitMode ? 'sub' : 'global',
                ownerType: initialOwnerType || parentFacility?.ownerType || facility?.ownerType || allValues.ownerType,
                clientId: parentFacility?.clientId || facility?.clientId || allValues.clientId || null,
                debtorId: parentFacility?.debtorId || facility?.debtorId || allValues.debtorId || null,
                sourceDealerId: parentFacility?.sourceDealerId || facility?.sourceDealerId || allValues.sourceDealerId || null,
                onboardingStage: nextStage || 'lead',
                onboardingTasks: shouldAdvance ? {} : (allValues.onboardingTasks || {}),
                onboardingEvidence: shouldAdvance ? {} : (allValues.onboardingEvidence || {}),
            };

            await fetchFromAdminAPI(token, 'saveLendingFacility', { facility: finalPayload });
            toast({ title: shouldAdvance ? 'Milestone Complete' : 'Authority Node Committed', description: shouldAdvance ? `Facility moved to ${getOnboardingStageDefinition(nextStage).label}.` : 'Onboarding progress saved.' });
            onSave();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: e.message });
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
                toast({ variant: "destructive", title: "Incomplete Node", description: "Fill in all requirements for this protocol stage." });
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

    const resolvedTargetName = useMemo(() => {
        const type = initialOwnerType || parentFacility?.ownerType || facility?.ownerType || watched.ownerType;
        const cId = parentFacility?.clientId || facility?.clientId || watched.clientId;
        const dId = parentFacility?.debtorId || facility?.debtorId || watched.debtorId;
        const sId = parentFacility?.sourceDealerId || facility?.sourceDealerId || watched.sourceDealerId;
        
        if (type === 'client') return clients.find(c => c.id === cId)?.name || 'Unassigned Client';
        if (type === 'supplier') return suppliers.find(s => s.id === sId)?.name || 'Unassigned Supplier';
        return debtors.find(d => d.id === dId)?.name || 'Unassigned Debtor';
    }, [watched.ownerType, watched.clientId, watched.debtorId, watched.sourceDealerId, initialOwnerType, parentFacility, facility, clients, debtors, suppliers]);

    const currentStage = getOnboardingStageDefinition(watched.onboardingStage);
    const completedTaskCount = currentStage.tasks.filter(task => watched.onboardingTasks?.[task.id]).length;
    const reviewTask = currentStage.tasks.find(task => task.id === reviewTaskId) || null;

    const getEvidenceRows = (taskId?: string): Array<[string, string]> => {
        const currentOwnerType = initialOwnerType || parentFacility?.ownerType || facility?.ownerType || watched.ownerType;
        const selectedClient = clients.find(c => c.id === (parentFacility?.clientId || facility?.clientId || watched.clientId));
        const selectedDebtor = debtors.find(d => d.id === (parentFacility?.debtorId || facility?.debtorId || watched.debtorId));
        const selectedSupplier = suppliers.find(s => s.id === (parentFacility?.sourceDealerId || facility?.sourceDealerId || watched.sourceDealerId));
        const parentName = parentFacility?.ownerName || parentFacility?.clientName || parentFacility?.name || 'No parent master facility linked';
        const ownerName = selectedClient?.name || selectedDebtor?.name || selectedSupplier?.name || resolvedTargetName;
        const commonRows: Array<[string, string]> = [
            ['Facility class', isSubLimitMode ? 'Agreement-level sub-facility' : 'Global master facility'],
            ['Owner type', currentOwnerType || 'Not captured'],
            ['Owner / borrower', ownerName || 'Not captured'],
            ['Facility type', watched.type || 'Not captured'],
            ['Facility limit', formatCurrency(watched.limit || 0)],
            ['Parent master facility', isSubLimitMode ? parentName : 'This record is the master facility'],
            ['Status', watched.status || 'Not captured'],
        ];

        if (taskId === 'source_confirmed') {
            return [
                ['Source record', facility?.id || parentFacility?.id ? 'Existing facility record' : 'New facility record'],
                ['Created by', facility?.createdByName || facility?.createdBy || 'Not captured'],
                ['Created at', facility?.createdAt || 'Not captured'],
                ...commonRows,
            ];
        }
        if (taskId === 'borrower_identified' || taskId === 'contact_verified') {
            return [
                ['Client name', selectedClient?.name || ownerName || 'Not captured'],
                ['Client email', selectedClient?.email || selectedClient?.contactEmail || 'Not captured'],
                ['Client phone', selectedClient?.phone || selectedClient?.contactPhone || 'Not captured'],
                ['Registration number', selectedClient?.registrationId || 'Not captured'],
                ...commonRows,
            ];
        }
        if (taskId === 'product_fit_selected' || taskId === 'indicative_limit_confirmed') {
            return [
                ['Agreement facility type', watched.type || 'Not captured'],
                ['Authorized limit', formatCurrency(watched.limit || 0)],
                ['Master facility', isSubLimitMode ? parentName : ownerName],
                ...commonRows,
            ];
        }
        if (taskId === 'policy_fit_checked' || taskId === 'policy_limit_confirmed') {
            return [
                ['Policy check basis', 'Agreement type, amount, term, province and city'],
                ['Agreement facility type', watched.type || 'Not captured'],
                ['Requested / authorized amount', formatCurrency(watched.limit || 0)],
                ...commonRows,
            ];
        }
        return commonRows;
    };

    const renderOnboardingMilestone = () => (
        <Card className="border-2 border-primary/10 bg-primary/5 shadow-none">
            <CardHeader className="pb-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <CardTitle className="text-base font-black uppercase tracking-widest text-primary">Onboarding Milestone</CardTitle>
                        <CardDescription className="mt-1 text-foreground">{currentStage.milestone}</CardDescription>
                    </div>
                    <FormField control={methods.control} name="onboardingStage" render={({ field }) => (
                        <FormItem className="min-w-48">
                            <Select onValueChange={(value) => { field.onChange(value); methods.setValue('onboardingTasks', {}, { shouldDirty: true }); }} value={field.value || 'lead'}>
                                <FormControl><SelectTrigger className="h-10 border-2 bg-white font-bold"><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {LENDING_ONBOARDING_WORKFLOW.map(stage => <SelectItem key={stage.id} value={stage.id}>{stage.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </FormItem>
                    )} />
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {currentStage.tasks.map(task => (
                    <FormField key={task.id} control={methods.control} name={`onboardingTasks.${task.id}` as any} render={({ field }) => (
                        <FormItem className="flex flex-col gap-3 rounded-md border bg-white p-3 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-3">
                                <FormControl><input type="checkbox" checked={Boolean(field.value)} onChange={(event) => field.onChange(event.target.checked)} /></FormControl>
                                <FormLabel className="m-0 text-sm font-semibold">{task.label}</FormLabel>
                            </div>
                            <Button type="button" variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase" onClick={() => setReviewTaskId(task.id)}>
                                Review Evidence
                            </Button>
                        </FormItem>
                    )} />
                ))}
                <div className="flex flex-col gap-3 border-t pt-4 md:flex-row md:items-center md:justify-between">
                    <Badge variant="outline" className="w-fit text-[10px] font-black uppercase">{completedTaskCount}/{currentStage.tasks.length} tasks complete</Badge>
                    <p className="text-xs font-semibold text-muted-foreground">Complete all tasks, then commit to ledger to advance automatically.</p>
                </div>
            </CardContent>
            <Dialog open={Boolean(reviewTask)} onOpenChange={(open) => !open && setReviewTaskId(null)}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto text-left">
                    <DialogHeader>
                        <DialogTitle>{reviewTask?.label || 'Review evidence'}</DialogTitle>
                        <DialogDescription>Review forensic evidence, document checklists, public discovery, and variance analysis for this task.</DialogDescription>
                    </DialogHeader>
                    {reviewTask && (
                        <TaskEvidenceReviewer
                            taskId={reviewTask.id}
                            facility={facility}
                            parentFacility={parentFacility}
                            selectedClient={clients.find(c => c.id === (parentFacility?.clientId || facility?.clientId || watched.clientId))}
                            selectedDebtor={debtors.find(d => d.id === (parentFacility?.debtorId || facility?.debtorId || watched.debtorId))}
                            selectedSupplier={suppliers.find(s => s.id === (parentFacility?.sourceDealerId || facility?.sourceDealerId || watched.sourceDealerId))}
                            watchedForm={watched}
                            evidenceNote={methods.watch(`onboardingEvidence.${reviewTask.id}` as any) || ''}
                            onEvidenceNoteChange={(note) => methods.setValue(`onboardingEvidence.${reviewTask.id}` as any, note, { shouldDirty: true })}
                        />
                    )}
                    <DialogFooter>
                        <Button type="button" onClick={() => setReviewTaskId(null)}>Close Evidence Review</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
    
    const renderStepContent = () => {
        const stepId = steps[currentStep]?.id;
        switch (stepId) {
            case 'type': return (
                 <div className="space-y-6 text-left text-foreground">
                    <FormField control={methods.control} name="ownerType" render={({ field }) => (
                        <FormItem className="space-y-4">
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Identify Authority Branch</FormLabel>
                            <FormControl>
                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                                    <div className={cn("p-4 border-2 rounded-2xl cursor-pointer transition-all", field.value === 'client' ? "border-primary bg-primary/5 shadow-md" : "bg-white")}><RadioGroupItem value="client" id="type-client" /><Label htmlFor="type-client" className="cursor-pointer font-bold uppercase text-xs">Client Branch</Label></div>
                                    <div className={cn("p-4 border-2 rounded-2xl cursor-pointer transition-all", field.value === 'debtor' ? "border-primary bg-primary/5 shadow-md" : "bg-white")}><RadioGroupItem value="debtor" id="type-debtor" /><Label htmlFor="type-debtor" className="cursor-pointer font-bold uppercase text-xs">Debtor Branch</Label></div>
                                    <div className={cn("p-4 border-2 rounded-2xl cursor-pointer transition-all", field.value === 'supplier' ? "border-primary bg-primary/5 shadow-md" : "bg-white")}><RadioGroupItem value="supplier" id="type-supp" /><Label htmlFor="type-supp" className="cursor-pointer font-bold uppercase text-xs">Supplier Branch</Label></div>
                                </RadioGroup>
                            </FormControl>
                        </FormItem>
                    )} />
                </div>
            );
            case 'association': return (
                <div className="space-y-8 animate-in fade-in duration-500 text-left text-foreground">
                    {watched.ownerType === 'client' && (
                        <FormField control={methods.control} name="clientId" render={({ field }) => (
                            <FormItem className="text-left"><FormLabel>Select Member Client</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger className="h-11 border-2 bg-white"><SelectValue placeholder="Choose client..." /></SelectTrigger></FormControl><SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></FormItem>
                        )} />
                    )}
                    {watched.ownerType === 'debtor' && (
                        <FormField control={methods.control} name="debtorId" render={({ field }) => (
                            <FormItem className="text-left"><FormLabel>Select Debtor (Cessionary)</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger className="h-11 border-2 bg-white"><SelectValue placeholder="Choose debtor..." /></SelectTrigger></FormControl><SelectContent>{debtors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></FormItem>
                        )} />
                    )}
                    {watched.ownerType === 'supplier' && (
                        <FormField control={methods.control} name="sourceDealerId" render={({ field }) => (
                            <FormItem className="text-left"><FormLabel>Select Authorized Supplier</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger className="h-11 border-2 bg-white"><SelectValue placeholder="Choose supplier..." /></SelectTrigger></FormControl><SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></FormItem>
                        )} />
                    )}

                    <FormField control={methods.control} name="limit" render={({ field }) => (
                        <FormItem className="text-left">
                            <FormLabel className="text-primary font-black uppercase text-[10px]">{isSubLimitMode ? 'Agreement Facility Limit (ZAR)' : 'Committee-Determined Global Ceiling (ZAR)'}</FormLabel>
                            <FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} className="h-12 border-2 bg-white text-xl font-black" /></FormControl>
                        </FormItem>
                    )} />
                </div>
            );
            case 'agreement_limit': return (
                <div className="space-y-8 animate-in fade-in duration-500 text-left text-foreground">
                    <div className="p-8 border-2 rounded-3xl bg-white space-y-6 shadow-sm text-left">
                        <div className="p-4 bg-muted/30 rounded-xl border border-dashed text-left">
                            <Label className="text-[9px] font-black uppercase text-muted-foreground block mb-1">Parent Node</Label>
                            <p className="text-sm font-bold text-slate-900">{resolvedTargetName}</p>
                        </div>

                        <FormField control={methods.control} name="type" render={({ field }) => (
                            <FormItem className="text-left">
                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Partition for Product / Asset Class</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ''}>
                                    <FormControl><SelectTrigger className="h-11 border-2 bg-white font-bold"><SelectValue placeholder="Select context..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="loan-pv-term">Loan / Working Capital</SelectItem>
                                        <SelectItem value="installment-sale-term">Installment Sale</SelectItem>
                                        <SelectItem value="rental-term">Lease / Rental</SelectItem>
                                        <SelectItem value="discounting">Discounting Products</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )} />

                        <FormField control={methods.control} name="limit" render={({ field }) => (
                            <FormItem className="text-left">
                                <FormLabel className="text-[10px] font-black uppercase text-primary ml-1">Authorized Sub-Limit (ZAR)</FormLabel>
                                <FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} className="h-12 border-2 bg-white text-xl font-black" /></FormControl>
                            </FormItem>
                        )} />
                    </div>
                </div>
            );
            case 'review': return (
                <div className="space-y-8 animate-in zoom-in-95 duration-500 text-left text-foreground">
                    <div className="p-8 bg-slate-900 text-white rounded-3xl space-y-6 shadow-2xl text-left">
                        <div className="flex justify-between items-baseline text-left">
                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Authorized Limit Ceiling</span>
                            <span className="text-4xl font-black text-primary">{formatCurrency(watched.limit)}</span>
                        </div>
                        <Separator className="bg-white/10" />
                        <div className="grid grid-cols-2 gap-6 text-left">
                            <div className="space-y-1 text-left">
                                <Label className="text-[9px] font-black uppercase text-slate-500">Target Entity</Label>
                                <p className="font-bold text-sm text-white">{resolvedTargetName}</p>
                            </div>
                            <div className="space-y-1 text-right">
                                <Label className="text-[9px] font-black uppercase text-slate-500">Node Class</Label>
                                <p className="font-bold text-sm text-white capitalize">{watched.facilityClass} {watched.ownerType}</p>
                            </div>
                        </div>
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
                        <div className="flex justify-between items-center text-left">
                            <div className="text-left text-white">
                                <CardTitle className="text-3xl font-black font-headline uppercase text-white">Authority Node Terminal</CardTitle>
                                <CardDescription className="text-slate-400 text-lg mt-1 text-white">Section: {steps[currentStep]?.title || 'Audit'}</CardDescription>
                            </div>
                            <Button type="button" variant="ghost" className="text-white hover:text-primary" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Ledger</Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 text-left text-foreground">
                        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] text-left text-foreground">
                             <div className="bg-slate-50 border-r p-8 space-y-2 text-left text-foreground text-foreground">
                                {steps.map((step, index) => {
                                    const Icon = step.icon;
                                    const isCompleted = index < currentStep && isStepValid(index);
                                    return (
                                        <Button 
                                            key={step.id} 
                                            type="button" 
                                            variant={currentStep === index ? 'secondary' : 'ghost'} 
                                            className={cn("w-full justify-start gap-4 h-12 px-4 transition-all", currentStep === index && "bg-white shadow-sm ring-1 ring-primary/20")} 
                                            onClick={(e) => { if(index <= currentStep) setCurrentStep(index); }}
                                        >
                                            {isCompleted ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <div className={cn("h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-black", currentStep >= index ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>{index + 1}</div>}
                                            <Icon className={cn("h-5 w-5", currentStep >= index ? "text-primary" : "text-muted-foreground")} />
                                            <span className={cn("text-[10px] font-black uppercase tracking-[0.1em]", currentStep === index ? "text-primary" : "text-muted-foreground")}>{step.title}</span>
                                        </Button>
                                    );
                                })}
                            </div>
                             <div className="p-12 space-y-12 bg-white min-h-[500px] text-left text-foreground">
                                          {renderOnboardingMilestone()}
                                {renderStepContent()}
                             </div>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-slate-50 border-t p-10 flex justify-between text-left text-foreground text-foreground">
                        <Button type="button" variant="outline" onClick={handleBackStep} className="font-bold h-12 px-8">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                        <div className="flex gap-3">
                            {currentStep < steps.length - 1 && (
                                <Button type="button" onClick={handleNext} className="h-12 px-12 font-black uppercase text-xs text-white shadow-lg">
                                    Next Protocol Stage <ArrowRight className="ml-2 h-4 w-4"/>
                                </Button>
                            )}
                            <Button type="submit" disabled={isLoading} className="h-14 px-16 bg-primary hover:bg-primary/90 shadow-2xl font-black uppercase tracking-tight text-white">
                                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                                Commit Node to Ledger
                            </Button>
                        </div>
                    </CardFooter>
                </form>
            </FormProvider>
        </Card>
    );
}
