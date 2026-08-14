'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useForm, FormProvider, useFormContext, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getClientSideAuthToken, useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { 
    Loader2, Save, CheckCircle, Truck, MapPin, 
    Banknote, ArrowRight, ArrowLeft, ImageIcon, 
    Warehouse, ShieldCheck, PackageSearch,
    ClipboardList, Sparkles, Store, FileUp, Trash2, PlusCircle, 
    Package, Info, Clock, Camera, ListOrdered, Edit, Tag, Zap,
    FileText, Lock, Globe, UploadCloud
} from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, formatCurrency } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Image from 'next/image';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { collection, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { provinces } from '@/lib/geodata';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supplierCategories } from '@/app/adminaccount/marketing/discovery-engine';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const routeRateSchema = z.object({
    origin: z.string().min(1, "Origin required"),
    destination: z.string().min(1, "Destination required"),
    price: z.coerce.number().positive("Price required"),
});

const productSchema = z.object({
    name: z.string().min(1, "Product name required."),
    description: z.string().min(10, "Provide a brief description."),
    price: z.coerce.number().positive("Price must be positive."),
    stock: z.coerce.number().int().min(0).default(0),
    imageUrls: z.array(z.string()).optional().default([]),
});

const nodeFormSchema = z.object({
  shopName: z.string().min(1, "Identity label is required."),
  category: z.string().min(1, "Classification required."),
  contactEmail: z.string().email("Valid email required.").optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  homeHeading: z.string().min(5, "Headline required."),
  aboutText: z.string().min(20, "Summary required."),
  logoUrl: z.string().optional(),
  availablePallets: z.coerce.number().min(0).optional(),
  upliftFee: z.coerce.number().min(0).optional(),
  placementFee: z.coerce.number().min(0).optional(),
  monthlyStorageFee: z.coerce.number().min(0).optional(),
  services: z.array(z.string()).default([]),
  securityFeatures: z.array(z.string()).default([]),
  accessControl: z.string().optional(),
  rollerDoors: z.string().optional(),
  operatingHours: z.string().optional(),
  rateType: z.enum(['none', 'route', 'per_km']).default('none'),
  kmRate: z.coerce.number().min(0).optional(),
  routeRates: z.array(routeRateSchema).default([]),
  imageUrls: z.array(z.string()).default([]),
  termsText: z.string().optional(),
  privacyText: z.string().optional(),
});

type NodeFormValues = z.infer<typeof nodeFormSchema>;

function StepMain() {
    const { control } = useFormContext<NodeFormValues>();
    return (
        <div className="space-y-6 text-left">
            <h3 className="text-xl font-black font-headline flex items-center gap-2"><Store className="h-6 w-6 text-primary"/> Node Identity</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={control} name="shopName" render={({ field }) => (
                    <FormItem className="text-left"><FormLabel>Identity Label (Business Name)</FormLabel><FormControl><Input {...field} className="h-11 border-2 bg-white" /></FormControl></FormItem>
                )} />
                <FormField control={control} name="category" render={({ field }) => (
                    <FormItem className="text-left"><FormLabel>Industrial Classification</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-11 border-2 bg-white"><SelectValue placeholder="Select classification..." /></SelectTrigger></FormControl><SelectContent>{supplierCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent></Select></FormItem>
                )} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={control} name="contactEmail" render={({ field }) => (
                    <FormItem className="text-left"><FormLabel>Public Contact Email</FormLabel><FormControl><Input {...field} type="email" className="h-11 border-2 bg-white" /></FormControl></FormItem>
                )} />
                <FormField control={control} name="contactPhone" render={({ field }) => (
                    <FormItem className="text-left"><FormLabel>Public Contact Number</FormLabel><FormControl><Input {...field} className="h-11 border-2 bg-white" /></FormControl></FormItem>
                )} />
            </div>
        </div>
    );
}

function StepWarehouseFees() {
    const { control } = useFormContext<NodeFormValues>();
    return (
        <div className="space-y-8 text-left">
            <h3 className="text-xl font-black font-headline flex items-center gap-2">
                <Banknote className="h-6 w-6 text-primary" />
                Storage Yield Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <FormField control={control} name="availablePallets" render={({ field }) => (
                        <FormItem><FormLabel>Current Pallet Positions</FormLabel><FormControl><Input type="number" {...field} className="h-11 border-2 bg-white" /></FormControl></FormItem>
                    )} />
                    <FormField control={control} name="monthlyStorageFee" render={({ field }) => (
                        <FormItem><FormLabel>Monthly Storage Rate (per plt)</FormLabel><FormControl><Input type="number" {...field} className="h-11 border-2 bg-white" /></FormControl></FormItem>
                    )} />
                </div>
                <div className="space-y-6">
                    <FormField control={control} name="upliftFee" render={({ field }) => (
                        <FormItem><FormLabel>Inbound Handling (Uplift)</FormLabel><FormControl><Input type="number" {...field} className="h-11 border-2 bg-white" /></FormControl></FormItem>
                    )} />
                    <FormField control={control} name="placementFee" render={({ field }) => (
                        <FormItem><FormLabel>Outbound Handling (Placement)</FormLabel><FormControl><Input type="number" {...field} className="h-11 border-2 bg-white" /></FormControl></FormItem>
                    )} />
                </div>
            </div>
        </div>
    );
}

function StepWarehouseSecurity() {
    const { control } = useFormContext<NodeFormValues>();
    const securityOptions = ["24/7 Guards", "Electric Fencing", "CCTV Surveillance", "Biometric Access", "Alarm Response", "Internal Cage"];

    return (
        <div className="space-y-8 text-left">
            <h3 className="text-xl font-black font-headline flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary" /> Security & Access</h3>
            <div className="grid grid-cols-2 gap-2">
                {securityOptions.map(opt => (
                    <FormField key={opt} control={control} name="securityFeatures" render={({ field }) => (
                        <div className="flex items-center space-x-2 p-2 border rounded-md bg-white">
                            <Checkbox checked={field.value?.includes(opt)} onCheckedChange={(checked) => field.onChange(checked ? [...(field.value || []), opt] : field.value.filter((v: string) => v !== opt))} />
                            <span className="text-xs font-medium">{opt}</span>
                        </div>
                    )} />
                ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
                <FormField control={control} name="accessControl" render={({ field }) => (
                    <FormItem><FormLabel>Access Type</FormLabel><FormControl><Input {...field} className="h-10 border-2 bg-white" /></FormControl></FormItem>
                )} />
                <FormField control={control} name="operatingHours" render={({ field }) => (
                    <FormItem><FormLabel>Receiving Hours</FormLabel><FormControl><Input placeholder="e.g. Mon-Fri 08:00-16:30" {...field} className="h-10 border-2 bg-white" /></FormControl></FormItem>
                )} />
            </div>
        </div>
    );
}

function StepRateSheet() {
    const { control, watch } = useFormContext<NodeFormValues>();
    const rateType = watch('rateType');
    const { fields, append, remove } = useFieldArray({ control, name: 'routeRates' });
    const locationOptions = provinces.flatMap(p => p.cities.map(c => `${c.name}, ${p.name}`));

    return (
        <div className="space-y-8 text-left">
            <h3 className="text-xl font-black font-headline flex items-center gap-2"><ListOrdered className="h-6 w-6 text-primary" /> Fleet Rate Sheet</h3>
            <FormField control={control} name="rateType" render={({ field }) => (
                <FormItem className="space-y-4">
                    <FormLabel className="font-bold">Select Rate Structure</FormLabel>
                    <FormControl>
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-3 gap-4">
                            <div className={cn("flex items-center space-x-2 p-4 border rounded-xl cursor-pointer", field.value === 'none' ? "bg-primary/5 border-primary" : "bg-white")}>
                                <RadioGroupItem value="none" id="r-none" /><Label htmlFor="r-none">None</Label>
                            </div>
                            <div className={cn("flex items-center space-x-2 p-4 border rounded-xl cursor-pointer", field.value === 'route' ? "bg-primary/5 border-primary" : "bg-white")}>
                                <RadioGroupItem value="route" id="r-route" /><Label htmlFor="r-route">Route</Label>
                            </div>
                            <div className={cn("flex items-center space-x-2 p-4 border rounded-xl cursor-pointer", field.value === 'per_km' ? "bg-primary/5 border-primary" : "bg-white")}>
                                <RadioGroupItem value="per_km" id="r-km" /><Label htmlFor="r-km">Per KM</Label>
                            </div>
                        </RadioGroup>
                    </FormControl>
                </FormItem>
            )} />

            {rateType === 'per_km' && (
                <FormField control={control} name="kmRate" render={({ field }) => (
                    <FormItem className="max-w-xs"><FormLabel>Rate per KM (ZAR)</FormLabel><FormControl><Input type="number" {...field} className="h-12 text-xl font-bold bg-white" /></FormControl></FormItem>
                )} />
            )}

            {rateType === 'route' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center"><Label className="font-bold">Common Route Rates</Label><Button type="button" size="sm" variant="outline" onClick={() => append({ origin: '', destination: '', price: 0 })}><PlusCircle className="h-4 w-4 mr-2" /> Add Route</Button></div>
                    {fields.map((item, index) => (
                        <div key={item.id} className="grid grid-cols-3 gap-4 items-end p-4 border rounded-xl bg-white shadow-sm">
                            <FormField control={control} name={`routeRates.${index}.origin` as any} render={({ field }) => (
                                <FormItem><FormLabel className="text-[10px] uppercase font-black">Origin</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-9 bg-white text-left"><SelectValue/></SelectTrigger></FormControl><SelectContent>{locationOptions.slice(0,50).map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select></FormItem>
                            )} />
                            <FormField control={control} name={`routeRates.${index}.destination` as any} render={({ field }) => (
                                <FormItem><FormLabel className="text-[10px] uppercase font-black">Destination</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-9 bg-white text-left"><SelectValue/></SelectTrigger></FormControl><SelectContent>{locationOptions.slice(0,50).map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select></FormItem>
                            )} />
                            <div className="flex items-center gap-2">
                                <FormField control={control} name={`routeRates.${index}.price` as any} render={({ field }) => (
                                    <FormItem className="flex-1"><FormLabel className="text-[10px] uppercase font-black">Price</FormLabel><FormControl><Input type="number" {...field} className="h-9 bg-white" /></FormControl></FormItem>
                                )} />
                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="mb-0.5 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function ProductDialogContent({ shop, product, onComplete }: { shop: any, product?: any, onComplete: () => void }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const form = useForm({ 
        resolver: zodResolver(productSchema),
        defaultValues: product || { name: '', description: '', price: 0, stock: 0, imageUrls: [] } 
    });

    const onSubmit = async (values: any) => {
        setLoading(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Auth failed");
            const collectionPath = `companies/${shop.companyId}/shops/${shop.id}/products`;
            const res = await fetch(product ? '/api/updateUserDoc' : '/api/addUserDoc', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(product 
                    ? { path: `${collectionPath}/${product.id}`, data: { ...values, updatedAt: { _methodName: 'serverTimestamp' } } }
                    : { collectionPath, data: values }
                )
            });
            if (!res.ok) throw new Error("Failed to save product.");
            toast({ title: "Catalogue Updated" });
            onComplete();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <DialogContent className="sm:max-w-xl text-left text-foreground">
            <DialogHeader>
                <DialogTitle>Product Management</DialogTitle>
                <DialogDescription>Define the technical and commercial details of this item.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Product Name</FormLabel><FormControl><Input placeholder="e.g. Heavy Duty Differential" {...field} className="bg-white" /></FormControl></FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                         <FormField control={form.control} name="price" render={({ field }) => (
                           <FormItem><FormLabel>Sales Price (R)</FormLabel><FormControl><Input type="number" {...field} className="bg-white" /></FormControl></FormItem>
                         )} />
                         <FormField control={form.control} name="stock" render={({ field }) => (
                           <FormItem><FormLabel>Current Stock</FormLabel><FormControl><Input type="number" {...field} className="bg-white" /></FormControl></FormItem>
                         )} />
                    </div>
                    <FormField control={form.control} name="description" render={({ field }) => (
                      <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Technical specifics..." {...field} className="bg-white" /></FormControl></FormItem>
                    )} />
                    <DialogFooter className="bg-slate-50 p-6 border-t rounded-b-lg">
                        <Button type="submit" disabled={loading} className="w-full h-12 font-bold uppercase tracking-widest text-white">
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Commit Product
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    );
}

function StepCatalog({ shop }: { shop: any }) {
    const firestore = useFirestore();
    const [isAddOpen, setIsAddOpen] = useState(false);
    
    const prodQuery = useMemoFirebase(() => {
        if (!firestore || !shop?.id) return null;
        return query(collection(firestore, `companies/${shop.companyId}/shops/${shop.id}/products`), orderBy('updatedAt', 'desc'));
    }, [firestore, shop]);
    const { data: products, isLoading, forceRefresh } = useCollection(prodQuery);

    const columns: ColumnDef<any>[] = [
        { header: 'Product Item', cell: ({row}) => <div className="font-bold">{row.original.name}</div> },
        { header: 'Price', cell: ({row}) => <span className="font-mono text-primary font-bold">{formatCurrency(row.original.price)}</span> },
        { header: 'Inventory', cell: ({row}) => <span>{row.original.stock} Units</span> },
        { id: 'actions', header: <div className="text-right">Manage</div>, cell: ({row}) => (
            <div className="text-right">
                <Dialog>
                    <DialogTrigger asChild><Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button></DialogTrigger>
                    <ProductDialogContent shop={shop} product={row.original} onComplete={forceRefresh} />
                </Dialog>
            </div>
        )}
    ];

    return (
        <div className="space-y-6 text-left">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-black font-headline flex items-center gap-2 text-foreground"><ListOrdered className="h-6 w-6 text-primary" /> Product Catalogue</h3>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild><Button className="gap-2 font-bold"><PlusCircle className="h-4 w-4" /> Add New Item</Button></DialogTrigger>
                    <ProductDialogContent shop={shop} onComplete={() => { forceRefresh(); setIsAddOpen(false); }} />
                </Dialog>
            </div>
            <Card className="border-none shadow-xl bg-white text-left">
                <CardContent className="pt-6">
                    {isLoading ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div> : (
                        <DataTable columns={columns} data={products || []} />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function StepMedia() {
    const { control, watch, setValue } = useFormContext<NodeFormValues>();
    const { user } = useUser();
    const { toast } = useToast();
    const [uploading, setUploading] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);

    const imageUrls = watch('imageUrls') || [];

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'gallery') => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        setUploading(type);
        setProgress(10);
        try {
            const token = await getClientSideAuthToken();
            const reader = new FileReader();
            const dataUri = await new Promise<string>(res => {
                reader.onload = () => res(reader.result as string);
                reader.readAsDataURL(file);
            });
            const res = await fetch('/api/uploadImageAsset', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileDataUri: dataUri, folder: `shops/${user.uid}`, fileName: `${type}_${Date.now()}_${file.name}` })
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            
            if (type === 'logo') setValue('logoUrl', result.url);
            else setValue('imageUrls', [...imageUrls, result.url]);
            
            toast({ title: "Upload Success" });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Upload Failed", description: e.message });
        } finally {
            setUploading(null);
            setProgress(0);
        }
    };

    return (
        <div className="space-y-10 text-left">
             <div className="space-y-4">
                <h3 className="text-xl font-black font-headline flex items-center gap-2 text-foreground text-left"><Camera className="h-6 w-6 text-primary" /> Media Assets</h3>
                <p className="text-sm text-muted-foreground text-left">Upload your official logo and facility/fleet images to establish forensic trust.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-left">
                <div className="space-y-4 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Company Logo</Label>
                    <div className="flex items-center gap-6 text-left">
                        <div className="relative h-24 w-24 rounded-2xl border-2 border-dashed bg-muted flex items-center justify-center overflow-hidden shrink-0">
                            {watch('logoUrl') ? <Image src={watch('logoUrl')!} alt="Logo" fill className="object-contain" /> : <ImageIcon className="h-8 w-8 text-muted-foreground opacity-20" />}
                        </div>
                        <div className="flex-1 space-y-2 text-left">
                            <input type="file" id="logo-up" className="hidden" onChange={e => handleUpload(e, 'logo')} />
                            <Button variant="outline" size="sm" onClick={() => document.getElementById('logo-up')?.click()} disabled={!!uploading}>
                                {uploading === 'logo' ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <UploadCloud className="h-4 w-4 mr-2" />}
                                Upload Logo
                            </Button>
                            <p className="text-[10px] text-muted-foreground">PNG or JPG. Square recommended.</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 text-left">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Facility Gallery</Label>
                     <div className="grid grid-cols-3 gap-2 text-left">
                        {imageUrls.map((url, i) => (
                            <div key={i} className="relative aspect-square rounded-lg border bg-muted overflow-hidden group">
                                <Image src={url} alt="Gallery" fill className="object-cover" />
                                <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setValue('imageUrls', imageUrls.filter((_, idx) => idx !== i))}>
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        ))}
                        <button type="button" onClick={() => document.getElementById('gallery-up')?.click()} className="aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 hover:border-primary transition-colors text-muted-foreground hover:text-primary">
                            <PlusCircle className="h-5 w-5" />
                            <span className="text-[9px] font-bold uppercase">Add Photo</span>
                        </button>
                        <input type="file" id="gallery-up" className="hidden" onChange={e => handleUpload(e, 'gallery')} />
                     </div>
                </div>
            </div>
            {uploading && <Progress value={progress} className="h-1" />}
        </div>
    );
}

function StepLegal() {
    const { control } = useFormContext<NodeFormValues>();
    return (
        <div className="space-y-8 text-left text-foreground">
            <h3 className="text-xl font-black font-headline flex items-center gap-2 text-foreground text-left text-foreground text-foreground"><Lock className="h-6 w-6 text-primary" /> Legal & Compliance</h3>
            <p className="text-sm text-muted-foreground">Define your operational boundaries and data privacy commitments.</p>
            <div className="space-y-6 text-left">
                <FormField control={control} name="termsText" render={({ field }) => (
                    <FormItem className="text-left"><FormLabel>Terms of Engagement</FormLabel><FormControl><Textarea placeholder="Explain your payment terms, delivery conditions, and liability caps..." {...field} className="min-h-[150px] bg-white border-2" /></FormControl></FormItem>
                )} />
                <FormField control={control} name="privacyText" render={({ field }) => (
                    <FormItem className="text-left"><FormLabel>Privacy Policy (POPI)</FormLabel><FormControl><Textarea placeholder="How you handle client data and POPI compliance..." {...field} className="min-h-[100px] bg-white border-2" /></FormControl></FormItem>
                )} />
            </div>
        </div>
    );
}

export function ShopWizard({ shop, nodeType, onUpdate }: { shop: any, nodeType: string, onUpdate: () => void }) {
    const { toast } = useToast();
    const [currentStep, setCurrentStep] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

    const isWarehouse = nodeType === 'warehouse';
    const isTransport = nodeType === 'transport';
    const isSupplier = nodeType === 'supplier' || nodeType === 'default';

    const wizardSteps = useMemo(() => {
        const base = [
            { id: 'main', title: 'Identity', icon: Store, fields: ['shopName', 'category', 'contactEmail', 'contactPhone'] },
        ];
        if (isWarehouse) {
            base.push({ id: 'fees', title: 'Storage Yield', icon: Banknote, fields: ['availablePallets', 'monthlyStorageFee', 'upliftFee', 'placementFee'] });
            base.push({ id: 'security', title: 'Security Protocol', icon: ShieldCheck, fields: ['securityFeatures', 'accessControl', 'rollerDoors', 'operatingHours'] });
        }
        if (isTransport) {
            base.push({ id: 'rates', title: 'Rate Sheet', icon: ListOrdered, fields: ['rateType', 'kmRate', 'routeRates'] });
        }
        if (isSupplier) {
            base.push({ id: 'catalog', title: 'Product Catalog', icon: ListOrdered, fields: [] });
        }
        base.push({ id: 'media', title: 'Media Assets', icon: Camera, fields: ['logoUrl', 'imageUrls'] });
        base.push({ id: 'branding', title: 'Brand Presence', icon: Sparkles, fields: ['homeHeading', 'aboutText'] });
        base.push({ id: 'legal', title: 'Legal & Privacy', icon: Lock, fields: ['termsText', 'privacyText'] });
        base.push({ id: 'submit', title: 'Audit Submission', icon: ShieldCheck, fields: [] });
        return base;
    }, [isWarehouse, isTransport, isSupplier]);

    const methods = useForm<NodeFormValues>({
        resolver: zodResolver(nodeFormSchema),
        mode: 'onChange',
        defaultValues: {
            ...shop,
            routeRates: shop.routeRates || [],
            securityFeatures: shop.securityFeatures || [],
            imageUrls: shop.imageUrls || []
        }
    });

    const onSubmit = async (values: NodeFormValues) => {
        setIsSaving(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Auth failed");
            
            await fetch('/api/updateUserDoc', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: `companies/${shop.companyId}/shops/${shop.id}`,
                    data: { ...values, status: 'pending_review', updatedAt: { _methodName: 'serverTimestamp' } }
                })
            });
            
            toast({ title: "Terminal Handshake Complete", description: "Node submitted for platform audit." });
            onUpdate();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Update Failed", description: e.message });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className="max-w-6xl mx-auto shadow-2xl border-none overflow-hidden text-left text-foreground">
            <CardHeader className="bg-slate-900 text-white p-8 border-b border-white/5 text-left text-foreground">
                <div className="flex items-center gap-4 text-white text-left">
                    <div className="bg-primary/20 p-3 rounded-xl text-left"><PackageSearch className="h-6 w-6 text-primary" /></div>
                    <div className="text-left text-foreground">
                        <CardTitle className="text-2xl font-black font-headline text-white text-left">Node Terminal: {wizardSteps[currentStep].title}</CardTitle>
                        <CardDescription className="text-slate-400">Identity: <span className="font-mono text-[10px] uppercase font-bold">{shop.id}</span></CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-8 text-left">
                <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-12 text-left">
                    <div className="space-y-2 border-r pr-6 text-left">
                        {wizardSteps.map((step, i) => {
                            const Icon = step.icon;
                            return (
                                <Button key={step.id} variant={currentStep === i ? "secondary" : "ghost"} className={cn("w-full justify-start gap-3 h-11 px-3 transition-all text-left text-foreground", currentStep === i && "bg-white shadow-sm ring-1 ring-primary/20")} onClick={() => setCurrentStep(i)}>
                                    <div className={cn("h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold", currentStep >= i ? "bg-primary text-white" : "bg-muted")}>{i+1}</div>
                                    <Icon className="h-4 w-4" />
                                    <span className={cn("text-xs", currentStep === i ? "font-black" : "font-medium")}>{step.title}</span>
                                </Button>
                            );
                        })}
                    </div>
                    <FormProvider {...methods}>
                        <div className="min-h-[500px] text-left text-foreground">
                            {wizardSteps[currentStep].id === 'main' && <StepMain />}
                            {wizardSteps[currentStep].id === 'fees' && <StepWarehouseFees />}
                            {wizardSteps[currentStep].id === 'security' && <StepWarehouseSecurity />}
                            {wizardSteps[currentStep].id === 'rates' && <StepRateSheet />}
                            {wizardSteps[currentStep].id === 'catalog' && <StepCatalog shop={shop} />}
                            {wizardSteps[currentStep].id === 'media' && <StepMedia />}
                            {wizardSteps[currentStep].id === 'branding' && (
                                <div className="space-y-8 text-left text-foreground">
                                    <h3 className="text-xl font-black font-headline flex items-center gap-2 text-foreground text-left text-foreground text-foreground"><Sparkles className="h-6 w-6 text-primary"/> Brand Presence</h3>
                                    <div className="space-y-4 text-left">
                                         <FormField control={methods.control} name="homeHeading" render={({ field }) => (
                                            <FormItem className="text-left text-foreground"><FormLabel>Public Headline</FormLabel><FormControl><Input placeholder="e.g. Premium Scania Spares Durban" {...field} className="h-11 border-2 bg-white font-bold" /></FormControl></FormItem>
                                         )} />
                                         <FormField control={methods.control} name="aboutText" render={({ field }) => (
                                            <FormItem className="text-left text-foreground"><FormLabel>Professional Summary (300 Words)</FormLabel><FormControl><Textarea placeholder="Explain your standing and technical reliability..." {...field} className="min-h-[200px] border-2 bg-white leading-relaxed" /></FormControl></FormItem>
                                         )} />
                                    </div>
                                </div>
                            )}
                            {wizardSteps[currentStep].id === 'legal' && <StepLegal />}
                            {wizardSteps[currentStep].id === 'submit' && (
                                <div className="text-center py-20 space-y-6 text-left text-foreground">
                                    <div className="bg-primary/10 p-6 rounded-full w-fit mx-auto mb-4 border border-primary/20">
                                        <ShieldCheck className="h-16 w-16 text-primary" />
                                    </div>
                                    <div className="space-y-2 text-center">
                                        <h3 className="text-3xl font-black">Audit Verified</h3>
                                        <p className="text-muted-foreground max-sm mx-auto">This digital node is ready for platform publishing. Submitting initiates the forensic handshake with our Mall administrators.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </FormProvider>
                </div>
            </CardContent>
            <CardFooter className="bg-slate-50 border-t p-8 flex justify-between text-left text-foreground">
                <Button variant="ghost" onClick={() => setCurrentStep(prev => prev - 1)} disabled={currentStep === 0}><ArrowLeft className="mr-2 h-4 w-4"/> Back</Button>
                {currentStep < wizardSteps.length - 1 ? (
                    <Button onClick={() => setCurrentStep(prev => prev + 1)} className="px-8 font-black uppercase text-xs tracking-widest text-white">Next Step <ArrowRight className="ml-2 h-4 w-4"/></Button>
                ) : (
                    <Button onClick={methods.handleSubmit(onSubmit)} disabled={isSaving} className="h-14 px-12 font-black uppercase tracking-tight text-lg shadow-xl text-white">
                        {isSaving ? <Loader2 className="animate-spin h-6 w-6 mr-2" /> : <Save className="mr-2 h-6 w-6" />} Submit Handshake
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
