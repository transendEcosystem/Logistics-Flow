'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, FormProvider, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
    Loader2, Save, ArrowLeft, ArrowRight, Truck, Database, ShieldCheck, 
    ShoppingBag, CheckCircle2, RefreshCcw, Car, Bus, Monitor, Info, Building, User,
    FileText, Scale, PlusCircle, Trash2, Receipt
} from 'lucide-react';
import { getClientSideAuthToken, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from '@/components/ui/card';
import { cn, fetchFromAdminAPI, formatCurrency } from '@/lib/utils';
import { collection, query, where, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { LendingAssetControlRecord } from '@/lib/lending/asset-architecture';

const invoiceLineItemSchema = z.object({
    description: z.string().min(1, 'Item description required'),
    quantity: z.coerce.number().min(0).default(1),
    unitPrice: z.coerce.number().min(0).default(0),
    amount: z.coerce.number().min(0).default(0),
});

const assetSchema = z.object({
  sourceType: z.enum(['dealer', 'client', 'stock']).default('dealer'),
  sourceDealerId: z.string().optional().nullable(),
  sourceClientId: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
  debtorId: z.string().optional().nullable(),
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.string().optional(),
  costOfSale: z.coerce.number().positive('Cost must be positive'),
  status: z.enum(['pending_acquisition', 'available', 'financed', 'sold', 'decommissioned']).default('pending_acquisition'),
  classification: z.string().min(1, "Asset class required"),
  registrationNumber: z.string().optional(),
  vin: z.string().optional(),
  engineNumber: z.string().optional(),
  // Invoice (receivable) header fields
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().optional(),
  invoiceDueDate: z.string().optional(),
  invoiceReference: z.string().optional(),
  invoiceNotes: z.string().optional(),
  invoiceItems: z.array(invoiceLineItemSchema).default([]),
  // Receivable right (cession) fields
  contractReference: z.string().optional(),
  contractName: z.string().optional(),
  cessionDate: z.string().optional(),
  cessionValue: z.coerce.number().min(0).optional(),
  cessionNotes: z.string().optional(),
  cessionDocumentId: z.string().optional(),
  cessionDocumentUrl: z.string().optional(),
});

type AssetFormValues = z.infer<typeof assetSchema>;

const PHYSICAL_CLASSES = ['Truck', 'Trailer', 'Bakkie', 'Equipment'];
const FINANCIAL_CLASSES = ['Invoice', 'Receivable Right'];
const isInvoiceClass = (classification?: string) => classification === 'Invoice';
const isReceivableRightClass = (classification?: string) => classification === 'Receivable Right';
const isFinancialClass = (classification?: string) => FINANCIAL_CLASSES.includes(classification || '');

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
    const watchedInvoiceItems = methods.watch('invoiceItems') || [];
    const invoiceTotal = useMemo(() => watchedInvoiceItems.reduce((sum, item) => sum + (Number(item.amount) || (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)), 0), [watchedInvoiceItems]);

    const { fields: invoiceItemFields, append: appendInvoiceItem, remove: removeInvoiceItem } = useFieldArray({ control: methods.control, name: 'invoiceItems' });

    // 1. Fetch Suppliers (Dealers) for the source dropdown
    const suppliersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'lendingSuppliers'), where('status', '==', 'active')) : null, [firestore]);
    const { data: suppliers } = useCollection(suppliersQuery);

    // 2. Fetch Clients for trade-in/source dropdown
    const clientsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'lendingClients'), where('status', '==', 'active')) : null, [firestore]);
    const { data: clients } = useCollection(clientsQuery);

    // 3. Fetch Debtors for financial asset (invoice/right) linking
    const debtorsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'lendingDebtors'), where('status', '==', 'active')) : null, [firestore]);
    const { data: debtors } = useCollection(debtorsQuery);

    const wizardSteps = useMemo(() => {
        if (isInvoiceClass(watchedClass)) {
            return [
                { id: 'source', title: '1. Debtor (Invoice)', icon: Building, fields: ['debtorId'] },
                { id: 'invoice-header', title: '2. Invoice Header', icon: Receipt, fields: ['invoiceNumber', 'invoiceDate', 'invoiceDueDate', 'costOfSale'] },
                { id: 'invoice-items', title: '3. Invoice Items', icon: FileText, fields: ['invoiceItems'] },
                { id: 'audit', title: '4. Forensic Audit', icon: ShieldCheck, fields: [] },
            ];
        }
        if (isReceivableRightClass(watchedClass)) {
            return [
                { id: 'source', title: '1. Debtor (Cession)', icon: Scale, fields: ['debtorId'] },
                { id: 'right-details', title: '2. Contract & Cession', icon: FileText, fields: ['contractReference', 'cessionValue', 'costOfSale'] },
                { id: 'audit', title: '3. Forensic Audit', icon: ShieldCheck, fields: [] },
            ];
        }
        return steps;
    }, [watchedClass]);

    const onSubmit = async (values: AssetFormValues) => {
        setIsLoading(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");
            
            const ref = asset?.id ? doc(firestore, 'lendingAssets', asset.id) : doc(collection(firestore, 'lendingAssets'));
            
            const financial = isFinancialClass(values.classification);
            const controlFields: Partial<LendingAssetControlRecord> = financial
                ? {
                    assetKind: 'receivable_right',
                    ownership: 'lender_conditional',
                    treatment: 'out_and_out_cession',
                    stockTreatment: 'underlying_asset_not_owned',
                    accountingStatus: 'rights_only',
                    clientId: values.debtorId || values.clientId || undefined,
                    cessionDocumentId: values.cessionDocumentId || undefined,
                    cessionDocumentUrl: values.cessionDocumentUrl || undefined,
                }
                : {
                    assetKind: 'physical_asset',
                    ownership: values.status === 'sold' ? 'borrower' : 'lender_inventory',
                    treatment: 'acquired_for_resale',
                };

            const displayMake = financial
                ? (isInvoiceClass(values.classification) ? `Invoice ${values.invoiceNumber || ''}`.trim() : `Receivable Right ${values.contractReference || ''}`.trim())
                : values.make;
            const displayModel = financial
                ? (isInvoiceClass(values.classification) ? 'Debtor Invoice' : 'Contract Right (Cession)')
                : values.model;

            await setDoc(ref, { 
                ...values,
                make: displayMake || values.classification,
                model: displayModel || '',
                year: values.year || new Date().getFullYear().toString(),
                ...controlFields,
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
        const stepFields = wizardSteps[currentStep].fields;
        methods.trigger(stepFields as any).then(isValid => {
            if (isValid && currentStep < wizardSteps.length - 1) {
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
        if (stepIndex < 0 || stepIndex >= wizardSteps.length) return true;
        const step = wizardSteps[stepIndex];
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
        const stepId = wizardSteps[currentStep]?.id;
        const isFinancial = isFinancialClass(watchedClass);
        switch (stepId) {
            case 'source':
                if (isFinancial) {
                    return (
                        <div className="space-y-8 animate-in fade-in duration-500 text-left">
                            <div className="space-y-4">
                                <FormLabel className="text-[10px] font-black uppercase text-primary tracking-widest">
                                    Select Debtor
                                </FormLabel>
                                <p className="text-sm text-muted-foreground">
                                    {isInvoiceClass(watchedClass) 
                                        ? 'Link this invoice receivable to the authorized debtor entity that issued it.' 
                                        : 'Link this cession-based right to the authorized debtor entity that granted the underlying contract.'}
                                </p>
                                <FormField control={methods.control} name="debtorId" render={({ field }) => (
                                    <FormItem className="animate-in slide-in-from-left-2 text-left">
                                        <FormLabel>Select Authorized Debtor</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || ''}>
                                            <FormControl>
                                                <SelectTrigger className="h-12 border-2 bg-white text-left text-foreground">
                                                    <SelectValue placeholder="Choose debtor from DMS..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {debtors?.map((d: any) => (
                                                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )} />
                            </div>
                            <div className="p-6 bg-primary/5 border-2 border-primary/20 rounded-2xl">
                                <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                    <Info className="h-4 w-4" /> Financial Asset Mode
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                    This asset is classified as a {isInvoiceClass(watchedClass) ? 'Receivable (Invoice)' : 'Receivable Right (Cession)'}. It will be tracked as a right to payment rather than a physical inventory item.
                                </p>
                            </div>
                        </div>
                    );
                }
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
                                            <SelectItem value="Invoice">Invoice (Receivable)</SelectItem>
                                            <SelectItem value="Receivable Right">Receivable Right (Cession)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                            <FormField control={methods.control} name="costOfSale" render={({ field }) => (
                                <FormItem className="text-left text-foreground">
                                    <FormLabel className="text-primary font-black uppercase text-[10px]">
                                        {isFinancial ? 'Face Value / Amount (ZAR)' : 'Purchase Valuation (Excl. VAT)'}
                                    </FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} className="h-12 border-2 bg-white text-xl font-black" />
                                    </FormControl>
                                </FormItem>
                            )} />
                        </div>
                        {!isFinancial && (
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
                        )}
                    </div>
                );
            case 'invoice-header':
                return (
                    <div className="space-y-8 animate-in fade-in duration-500 text-left">
                        <div>
                            <h3 className="text-xl font-black uppercase flex items-center gap-2"><Receipt className="h-6 w-6 text-primary" /> Invoice Header</h3>
                            <p className="text-sm text-muted-foreground">Capture the invoice meta-data. The total amount should equal the sum of line items.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField control={methods.control} name="invoiceNumber" render={({ field }) => (
                                <FormItem className="text-left"><FormLabel>Invoice Number</FormLabel><FormControl><Input {...field} placeholder="INV-2026-001" className="border-2 bg-white font-mono" /></FormControl></FormItem>
                            )} />
                            <FormField control={methods.control} name="invoiceReference" render={({ field }) => (
                                <FormItem className="text-left"><FormLabel>Customer Reference / PO Number</FormLabel><FormControl><Input {...field} className="border-2 bg-white" /></FormControl></FormItem>
                            )} />
                            <FormField control={methods.control} name="invoiceDate" render={({ field }) => (
                                <FormItem className="text-left"><FormLabel>Invoice Date</FormLabel><FormControl><Input type="date" {...field} className="border-2 bg-white" /></FormControl></FormItem>
                            )} />
                            <FormField control={methods.control} name="invoiceDueDate" render={({ field }) => (
                                <FormItem className="text-left"><FormLabel>Due Date</FormLabel><FormControl><Input type="date" {...field} className="border-2 bg-white" /></FormControl></FormItem>
                            )} />
                        </div>
                        <FormField control={methods.control} name="invoiceNotes" render={({ field }) => (
                            <FormItem className="text-left"><FormLabel>Invoice Description / Notes</FormLabel><FormControl><Textarea {...field} rows={3} className="border-2 bg-white" placeholder="Brief description of goods/services delivered..." /></FormControl></FormItem>
                        )} />
                    </div>
                );
            case 'invoice-items':
                return (
                    <div className="space-y-8 animate-in fade-in duration-500 text-left">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black uppercase flex items-center gap-2"><FileText className="h-6 w-6 text-primary" /> Invoice Line Items</h3>
                                <p className="text-sm text-muted-foreground">Capture each line item exactly as it appears on the invoice body.</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black uppercase text-muted-foreground">Computed Total</p>
                                <p className="text-2xl font-black text-primary">{formatCurrency(invoiceTotal)}</p>
                            </div>
                        </div>
                        {invoiceItemFields.map((item, index) => (
                            <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 rounded-xl border bg-slate-50 p-4">
                                <div className="md:col-span-5">
                                    <FormField control={methods.control} name={`invoiceItems.${index}.description`} render={({ field }) => <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} className="bg-white" /></FormControl></FormItem>} />
                                </div>
                                <div className="md:col-span-2">
                                    <FormField control={methods.control} name={`invoiceItems.${index}.quantity`} render={({ field }) => <FormItem><FormLabel>Qty</FormLabel><FormControl><Input type="number" {...field} className="bg-white" onChange={(e) => { field.onChange(e); const qty = Number(e.target.value) || 0; const price = methods.getValues(`invoiceItems.${index}.unitPrice`) || 0; methods.setValue(`invoiceItems.${index}.amount`, qty * price); }} /></FormControl></FormItem>} />
                                </div>
                                <div className="md:col-span-2">
                                    <FormField control={methods.control} name={`invoiceItems.${index}.unitPrice`} render={({ field }) => <FormItem><FormLabel>Unit Price</FormLabel><FormControl><Input type="number" {...field} className="bg-white" onChange={(e) => { field.onChange(e); const price = Number(e.target.value) || 0; const qty = methods.getValues(`invoiceItems.${index}.quantity`) || 0; methods.setValue(`invoiceItems.${index}.amount`, qty * price); }} /></FormControl></FormItem>} />
                                </div>
                                <div className="md:col-span-2">
                                    <FormField control={methods.control} name={`invoiceItems.${index}.amount`} render={({ field }) => <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" {...field} readOnly className="bg-white font-black" /></FormControl></FormItem>} />
                                </div>
                                <div className="md:col-span-1 flex items-end">
                                    <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => removeInvoiceItem(index)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        ))}
                        <Button type="button" variant="outline" onClick={() => appendInvoiceItem({ description: '', quantity: 1, unitPrice: 0, amount: 0 })}><PlusCircle className="mr-2 h-4 w-4" />Add Line Item</Button>
                    </div>
                );
            case 'right-details':
                return (
                    <div className="space-y-8 animate-in fade-in duration-500 text-left">
                        <div>
                            <h3 className="text-xl font-black uppercase flex items-center gap-2"><Scale className="h-6 w-6 text-primary" /> Contract & Cession Details</h3>
                            <p className="text-sm text-muted-foreground">Capture the underlying contract right acquired via cession.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField control={methods.control} name="contractReference" render={({ field }) => (
                                <FormItem className="text-left"><FormLabel>Contract / Agreement Reference</FormLabel><FormControl><Input {...field} placeholder="e.g. CTR-2026-8841" className="border-2 bg-white font-mono" /></FormControl></FormItem>
                            )} />
                            <FormField control={methods.control} name="contractName" render={({ field }) => (
                                <FormItem className="text-left"><FormLabel>Contract Description</FormLabel><FormControl><Input {...field} placeholder="e.g. Monthly Logistics Services Agreement" className="border-2 bg-white" /></FormControl></FormItem>
                            )} />
                            <FormField control={methods.control} name="cessionDate" render={({ field }) => (
                                <FormItem className="text-left"><FormLabel>Cession Effective Date</FormLabel><FormControl><Input type="date" {...field} className="border-2 bg-white" /></FormControl></FormItem>
                            )} />
                            <FormField control={methods.control} name="cessionValue" render={({ field }) => (
                                <FormItem className="text-left"><FormLabel>Cession Value (ZAR)</FormLabel><FormControl><Input type="number" {...field} className="border-2 bg-white" /></FormControl></FormItem>
                            )} />
                        </div>
                        <FormField control={methods.control} name="cessionNotes" render={({ field }) => (
                            <FormItem className="text-left"><FormLabel>Cession Notes</FormLabel><FormControl><Textarea {...field} rows={3} className="border-2 bg-white" placeholder="Details of the cession instrument, underlying obligations, and conditions..." /></FormControl></FormItem>
                        )} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField control={methods.control} name="cessionDocumentId" render={({ field }) => (
                                <FormItem className="text-left"><FormLabel>Cession Document ID</FormLabel><FormControl><Input {...field} className="border-2 bg-white font-mono" /></FormControl></FormItem>
                            )} />
                            <FormField control={methods.control} name="cessionDocumentUrl" render={({ field }) => (
                                <FormItem className="text-left"><FormLabel>Cession Document URL</FormLabel><FormControl><Input {...field} className="border-2 bg-white" placeholder="https://..." /></FormControl></FormItem>
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
                            <p className="text-sm text-muted-foreground max-sm mx-auto leading-relaxed text-center">
                                {isFinancial 
                                    ? `Verify the ${isInvoiceClass(watchedClass) ? 'invoice' : 'cession'} details before committing this financial asset to the registry.`
                                    : 'Ensure all technical nodes and valuations are verified before committing this node to the registry.'}
                            </p>
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
                                <CardDescription className="text-slate-400 text-lg mt-1 text-white">Phase: {wizardSteps[currentStep]?.title || 'Audit'}</CardDescription>
                            </div>
                            <Button type="button" variant="ghost" className="text-white hover:text-primary" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Exit Terminal</Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 text-left">
                        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] text-left">
                             <div className="bg-slate-50 border-r p-8 space-y-2 text-left">
                                {wizardSteps.map((step, index) => {
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
                        {currentStep < wizardSteps.length - 1 ? (
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
