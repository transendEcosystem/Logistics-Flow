'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, FormProvider, useFormContext, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ArrowLeft, ArrowRight, CheckCircle, Handshake, Building, User, Phone, Globe, Users, Banknote, FileText, BarChart, PlusCircle, Trash2 } from 'lucide-react';
import { getClientSideAuthToken } from '@/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

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


// --- ZOD Schemas ---
const contactSchema = z.object({
    name: z.string().optional(),
    position: z.string().optional(),
    cell: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
});

const ownerSchema = z.object({
    name: z.string().optional(), address: z.string().optional(), suburb: z.string().optional(), city: z.string().optional(),
    postCode: z.string().optional(), idNumber: z.string().optional(), cell: z.string().optional(), position: z.string().optional(),
    qualification: z.string().optional(), since: z.string().optional(), percentageHeld: z.coerce.number().optional(),
});
const managementSchema = z.object({
    name: z.string().optional(), address: z.string().optional(), suburb: z.string().optional(), city: z.string().optional(),
    postCode: z.string().optional(), idNumber: z.string().optional(), cell: z.string().optional(), position: z.string().optional(),
    qualification: z.string().optional(), since: z.string().optional(),
});
const bankAccountSchema = z.object({
    bankName: z.string().optional(), branchCode: z.string().optional(), accountNumber: z.string().optional(), branchName: z.string().optional(),
    bankCode: z.string().optional(), address: z.string().optional(), postCode: z.string().optional(), phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')), contactPerson: z.string().optional(),
});
const balanceSheetSchema = z.object({
    periodEndDate: z.string().optional(),
    propertyPlantEquipment: z.coerce.number().optional(),
    intangibleAssets: z.coerce.number().optional(),
    financialAssetsNonCurrent: z.coerce.number().optional(),
    deferredTaxAssets: z.coerce.number().optional(),
    inventories: z.coerce.number().optional(),
    tradeAndOtherReceivables: z.coerce.number().optional(),
    cashAndCashEquivalents: z.coerce.number().optional(),
    financialAssetsCurrent: z.coerce.number().optional(),
    shareCapital: z.coerce.number().optional(),
    retainedEarnings: z.coerce.number().optional(),
    revaluationSurplus: z.coerce.number().optional(),
    otherReserves: z.coerce.number().optional(),
    longTermBorrowings: z.coerce.number().optional(),
    longTermLeaseLiabilities: z.coerce.number().optional(),
    deferredTaxLiabilities: z.coerce.number().optional(),
    tradeAndOtherPayables: z.coerce.number().optional(),
    shortTermBorrowings: z.coerce.number().optional(),
    currentPortionOfLongTermDebt: z.coerce.number().optional(),
    currentTaxPayable: z.coerce.number().optional(),
});
const incomeStatementSchema = z.object({
    periodEndDate: z.string().optional(),
    revenue: z.coerce.number().optional(),
    costOfSales: z.coerce.number().optional(),
    otherIncome: z.coerce.number().optional(),
    distributionCosts: z.coerce.number().optional(),
    administrativeExpenses: z.coerce.number().optional(),
    otherExpenses: z.coerce.number().optional(),
    financeIncome: z.coerce.number().optional(),
    financeCosts: z.coerce.number().optional(),
    incomeTaxExpense: z.coerce.number().optional(),
});

const partnerWizardSchema = z.object({
  name: z.string().min(1, 'Partner name is required'),
  type: z.string().min(1, 'Partner type is required'),
  status: z.enum(['draft', 'active', 'inactive']).default('draft'),
  globalFacilityLimit: z.coerce.number().optional(),
  code: z.string().optional(),
  category: z.string().optional(),
  language: z.string().optional(),
  vatRegistered: z.boolean().default(false),
  registrationId: z.string().optional(),
  physicalAddress: z.string().optional(),
  physicalPostalCode: z.string().optional(),
  postalAddress: z.string().optional(),
  postalPostalCode: z.string().optional(),
  contactPerson: z.string().optional(),
  telWork: z.string().optional(),
  telHome: z.string().optional(),
  fax: z.string().optional(),
  cell: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  url: z.string().url().optional().or(z.literal('')),
  owners: z.array(ownerSchema).optional(),
  management: z.array(managementSchema).optional(),
  bankAccounts: z.array(bankAccountSchema).optional(),
  balanceSheets: z.array(balanceSheetSchema).optional(),
  incomeStatements: z.array(incomeStatementSchema).optional(),
});

type PartnerWizardFormValues = z.infer<typeof partnerWizardSchema>;


// --- STEP COMPONENTS ---
const StepMain = () => {
    const { control } = useFormContext<PartnerWizardFormValues>();
    return (
         <div className="space-y-4">
            <FormField control={control} name="name" render={({ field }) => (<FormItem><FormLabel>Partner Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid grid-cols-2 gap-4">
                <FormField control={control} name="type" render={({ field }) => (<FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a type..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="supplier">Supplier</SelectItem><SelectItem value="vendor">Vendor</SelectItem><SelectItem value="associate">Affiliate</SelectItem><SelectItem value="debtor">Debtor</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField control={control} name="status" render={({ field }) => (<FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
            </div>
             <div className="grid grid-cols-2 gap-4">
                 <FormField control={control} name="registrationId" render={({ field }) => (<FormItem><FormLabel>Registration ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={control} name="vatRegistered" render={({ field }) => (<FormItem className="flex items-center space-x-2 pt-8"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><Label>VAT Registered?</Label></FormItem>)} />
            </div>
             <div className="grid grid-cols-2 gap-4">
                <FormField control={control} name="category" render={({ field }) => (<FormItem><FormLabel>Category</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={control} name="code" render={({ field }) => (<FormItem><FormLabel>Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
             <FormField control={control} name="globalFacilityLimit" render={({ field }) => (<FormItem><FormLabel>Global Facility Limit (R)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
        </div>
    )
};
const StepAddress = () => {
    const { control } = useFormContext<PartnerWizardFormValues>();
    return (
        <div className="space-y-6">
            <div>
                <h4 className="font-semibold mb-2">Physical Address</h4>
                <div className="space-y-4 p-4 border rounded-md">
                    <FormField control={control} name="physicalAddress" render={({ field }) => (<FormItem><FormLabel>Street Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={control} name="physicalPostalCode" render={({ field }) => (<FormItem><FormLabel>Postal Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
            </div>
             <div>
                <h4 className="font-semibold mb-2">Postal Address</h4>
                <div className="space-y-4 p-4 border rounded-md">
                    <FormField control={control} name="postalAddress" render={({ field }) => (<FormItem><FormLabel>Street Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={control} name="postalPostalCode" render={({ field }) => (<FormItem><FormLabel>Postal Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
            </div>
        </div>
    );
};

const ArrayStep = ({ name, title, fieldsConfig }: { name: any, title: string, fieldsConfig: {id: string, label: string, type: string}[] }) => {
    const { control } = useFormContext<PartnerWizardFormValues>();
    const { fields, append, remove } = useFieldArray({ control, name });

    return (
        <div className="space-y-4">
            {fields.map((item, index) => (
                <div key={item.id} className="p-4 border rounded-lg relative">
                    <h4 className="font-medium mb-2">{title} #{index + 1}</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {fieldsConfig.map(config => (
                            <FormField
                                control={control}
                                key={`${item.id}-${config.id}`}
                                name={`${name}.${index}.${config.id}` as any}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{config.label}</FormLabel>
                                        <FormControl>
                                            <Input
                                                type={config.type}
                                                {...field}
                                                onChange={e => field.onChange(config.type === 'number' ? parseFloat(e.target.value) || '' : e.target.value)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        ))}
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
            ))}
            <Button type="button" variant="outline" onClick={() => append({})}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add {title}
            </Button>
        </div>
    )
}

// --- WIZARD COMPONENT ---
const steps = [
    { id: 'main', title: 'Main', icon: Handshake, fields: ['name', 'type', 'status', 'registrationId', 'vatRegistered'] },
    { id: 'address', title: 'Address', icon: Building, fields: ['physicalAddress', 'physicalPostalCode', 'postalAddress', 'postalPostalCode'] },
    { id: 'contact', title: 'Contact', icon: User, fields: ['contactPerson', 'telWork', 'email', 'cell', 'url'] },
    { id: 'owners', title: 'Owners', icon: Users, fields: ['owners'] },
    { id: 'management', title: 'Management', icon: Users, fields: ['management'] },
    { id: 'bankAccounts', title: 'Bank Accounts', icon: Banknote, fields: ['bankAccounts'] },
    { id: 'balanceSheet', title: 'Balance Sheet', icon: FileText, fields: ['balanceSheets'] },
    { id: 'incomeStatement', title: 'Income Statement', icon: BarChart, fields: ['incomeStatements'] },
    { id: 'review', title: 'Review & Submit', icon: CheckCircle, fields: [] },
];

interface EditLendingPartnerWizardProps {
  partner?: any;
  onSave: () => void;
  onBack: () => void;
}

export function EditLendingPartnerWizard({ partner, onSave, onBack }: EditLendingPartnerWizardProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [completedSteps, setCompletedSteps] = useState(new Set<string>());
    const { toast } = useToast();

    const methods = useForm<PartnerWizardFormValues>({
        resolver: zodResolver(partnerWizardSchema),
        mode: 'onChange',
        defaultValues: partner || { status: 'draft', vatRegistered: false, contacts: [], owners: [], management: [], bankAccounts: [], balanceSheets: [], incomeStatements: [] },
    });

    useEffect(() => {
        const initialValues = partner || { status: 'draft', vatRegistered: false, contacts: [], owners: [], management: [], bankAccounts: [], balanceSheets: [], incomeStatements: [] };
        methods.reset(initialValues);
        
        const validateInitialSteps = async () => {
            const initiallyCompleted = new Set<string>();
            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                if (step.fields.length > 0) {
                    const isValid = await methods.trigger(step.fields as any);
                    if (isValid) {
                        initiallyCompleted.add(step.id);
                    }
                }
            }
            setCompletedSteps(initiallyCompleted);
        };

        if (partner) {
            validateInitialSteps();
        } else {
             setCompletedSteps(new Set());
        }
    }, [partner, methods]);

    const onSubmit = async (values: PartnerWizardFormValues) => {
        setIsLoading(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");
            await performAdminAction(token, 'saveLendingPartner', { partner: { id: partner?.id, ...values } });
            toast({ title: partner ? 'Partner Updated' : 'Partner Created' });
            onSave();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleNext = async () => {
        const stepFields = steps[currentStep].fields;
        if (!stepFields || stepFields.length === 0) {
             if (currentStep < steps.length - 1) {
                setCompletedSteps(prev => new Set(prev).add(steps[currentStep].id));
                setCurrentStep(prev => prev + 1);
            }
            return;
        }

        const isValid = await methods.trigger(stepFields as any);
        if (isValid) {
             setCompletedSteps(prev => new Set(prev).add(steps[currentStep].id));
            if (currentStep < steps.length - 1) {
                setCurrentStep(prev => prev + 1);
            }
        } else {
            toast({ variant: "destructive", title: "Please complete all required fields for this step." });
        }
    };
    
    const handleBackStep = () => setCurrentStep(prev => prev - 1);
    
    const renderStepContent = () => {
        const stepId = steps[currentStep]?.id;
        switch (stepId) {
            case 'main': return <StepMain />;
            case 'address': return <StepAddress />;
            case 'contact': return <ArrayStep name="contacts" title="Contact" fieldsConfig={[ { id: 'name', label: 'Name', type: 'text' }, { id: 'position', label: 'Position', type: 'text' }, { id: 'cell', label: 'Cell', type: 'text'}, { id: 'email', label: 'Email', type: 'email'} ]} />;
            case 'owners': return <ArrayStep name="owners" title="Owner" fieldsConfig={[ { id: 'name', label: 'Name', type: 'text' }, { id: 'idNumber', label: 'ID Number', type: 'text' }, { id: 'cell', label: 'Cell', type: 'text'}, { id: 'percentageHeld', label: '% Held', type: 'number'} ]} />;
            case 'management': return <ArrayStep name="management" title="Manager" fieldsConfig={[ { id: 'name', label: 'Name', type: 'text' }, { id: 'idNumber', label: 'ID Number', type: 'text' }, { id: 'cell', label: 'Cell', type: 'text'}, { id: 'position', label: 'Position', type: 'text'} ]} />;
            case 'bankAccounts': return <ArrayStep name="bankAccounts" title="Bank Account" fieldsConfig={[ { id: 'bankName', label: 'Bank Name', type: 'text' }, { id: 'accountNumber', label: 'Account #', type: 'text' }, { id: 'branchCode', label: 'Branch Code', type: 'text'} ]} />;
            case 'balanceSheet': return <ArrayStep name="balanceSheets" title="Balance Sheet" fieldsConfig={[ { id: 'periodEndDate', label: 'Period End', type: 'date' }, { id: 'propertyPlantEquipment', label: 'Property, Plant & Equip.', type: 'number' }, { id: 'intangibleAssets', label: 'Intangible Assets', type: 'number' }, { id: 'financialAssetsNonCurrent', label: 'Financial Assets (Non-Current)', type: 'number'}, { id: 'deferredTaxAssets', label: 'Deferred Tax Assets', type: 'number'}, { id: 'inventories', label: 'Inventory', type: 'number' }, { id: 'tradeAndOtherReceivables', label: 'Trade & Other Receivables', type: 'number' }, { id: 'cashAndCashEquivalents', label: 'Cash & Equivalents', type: 'number' }, { id: 'financialAssetsCurrent', label: 'Financial Assets (Current)', type: 'number' }, { id: 'shareCapital', label: 'Share Capital', type: 'number' }, { id: 'retainedEarnings', label: 'Retained Earnings', type: 'number' }, { id: 'revaluationSurplus', label: 'Revaluation Surplus', type: 'number'}, { id: 'otherReserves', label: 'Other Reserves', type: 'number' }, { id: 'longTermBorrowings', label: 'Long-Term Loans/Borrowings', type: 'number' }, { id: 'longTermLeaseLiabilities', label: 'Long-Term Lease Liabilities', type: 'number' }, { id: 'deferredTaxLiabilities', label: 'Deferred Tax Liabilities', type: 'number' }, { id: 'tradeAndOtherPayables', label: 'Trade & Other Payables', type: 'number' }, { id: 'shortTermBorrowings', label: 'Short-Term Loans/Borrowings', type: 'number' }, { id: 'currentPortionOfLongTermDebt', label: 'Current Portion of Long-Term Debt', type: 'number' }, { id: 'currentTaxPayable', label: 'Current Tax Payable', type: 'number' } ]} />;
            case 'incomeStatement': return <ArrayStep name="incomeStatements" title="Income Statement" fieldsConfig={[ { id: 'periodEndDate', label: 'Period End Date', type: 'date' }, { id: 'revenue', label: 'Revenue', type: 'number' }, { id: 'costOfSales', label: 'Cost of Sales', type: 'number' }, { id: 'otherIncome', label: 'Other Income', type: 'number' }, { id: 'distributionCosts', label: 'Distribution Costs', type: 'number'}, { id: 'administrativeExpenses', label: 'Administrative Expenses', type: 'number'}, { id: 'otherExpenses', label: 'Other Expenses', type: 'number'}, { id: 'financeIncome', label: 'Finance Income', type: 'number'}, { id: 'financeCosts', label: 'Finance Costs', type: 'number'}, { id: 'incomeTaxExpense', label: 'Income Tax Expense', type: 'number' } ]} />;
            case 'review': return <div className="text-center p-8"><h3 className="text-lg font-semibold">Review and Submit</h3><p className="text-muted-foreground">Please confirm all details before saving the partner.</p></div>;
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
                                <h2 className="text-2xl font-bold font-headline">{partner ? 'Edit' : 'Add'} Lending Partner</h2>
                                <p className="text-muted-foreground">{steps[currentStep].title}</p>
                            </div>
                            <Button type="button" variant="ghost" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4"/>Back to List</Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-8">
                            <div className="flex flex-col gap-2 border-r pr-4">
                                {steps.map((step, index) => {
                                    const isCompleted = completedSteps.has(step.id);
                                    return (
                                        <Button key={step.id} type="button" variant={currentStep === index ? 'secondary' : 'ghost'} className="justify-start gap-2" onClick={() => setCurrentStep(index)}>
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
                                {partner ? 'Update Partner' : 'Create Partner'}
                            </Button>
                        )}
                    </CardFooter>
                </form>
            </FormProvider>
        </Card>
    );
}
