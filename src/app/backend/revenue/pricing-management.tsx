'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, PlusCircle, Save, Edit, Trash2, Eye, EyeOff, Layers, Info, Search, Store, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { getClientSideAuthToken, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogHeader, 
    AlertDialogTitle, 
    AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import featuresData from '@/lib/features.json';
import { formatCurrency } from '@/lib/utils';

const planSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  name: z.string().min(1, 'Plan name is required'),
  description: z.string().min(1, 'Description is required'),
  price: z.coerce.number().min(0),
  type: z.enum(['access', 'data_silo']).default('access'),
  intelligenceQueries: z.coerce.number().min(0),
  shopProducts: z.coerce.number().min(0),
  loadsLimit: z.coerce.number().min(0),
  features: z.array(z.string()).default([]),
  isPopular: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

type PlanFormValues = z.infer<typeof planSchema>;

const coreIds = ['basic', 'standard', 'premium', 'intelligence'];

function PlanDialog({ plan, onSave }: { plan?: any; onSave: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const methods = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: plan || {
        id: '', name: '', description: '', price: 0, type: 'access',
        intelligenceQueries: 0, shopProducts: 0, loadsLimit: 0,
        features: [], isPopular: false, isActive: true
    }
  });

  useEffect(() => {
    if (isOpen) {
        if (plan) methods.reset({ ...plan, isActive: plan.isActive !== false });
        else methods.reset({ id: '', name: '', description: '', price: 0, type: 'access', intelligenceQueries: 0, shopProducts: 0, loadsLimit: 0, features: [], isPopular: false, isActive: true });
    }
  }, [isOpen, plan, methods]);

  const watchedFeatures = methods.watch('features') || [];
  const planId = methods.watch('id')?.toLowerCase();
  const isCore = coreIds.includes(planId);

  const handleFeatureToggle = (featureKey: string) => {
    const current = methods.getValues('features') || [];
    const updated = current.includes(featureKey) 
        ? current.filter(f => f !== featureKey) 
        : [...current, featureKey];
    methods.setValue('features', updated, { shouldDirty: true, shouldValidate: true });
  };

  const onSubmit = async (values: PlanFormValues) => {
    setIsLoading(true);
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error("Auth failed");
      
      const finalId = values.id.trim().toLowerCase();
      const finalType = coreIds.includes(finalId) ? 'access' : values.type;
      
      const response = await fetch('/api/updateConfigDoc', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: `memberships/${finalId}`,
          data: { ...values, id: finalId, type: finalType, updatedAt: { _methodName: 'serverTimestamp' } }
        }),
      });

      if (!response.ok) throw new Error("Save failed");
      toast({ title: 'Protocol Node Synced' });
      onSave();
      setIsOpen(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {plan ? <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button> : <Button className="gap-2"><PlusCircle className="h-4 w-4" /> Create Node</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 text-left text-foreground">
        <DialogHeader className="p-6 pb-2 text-left">
          <DialogTitle className="text-2xl font-black uppercase tracking-tight">{plan ? 'Audit' : 'Initialize'} Node Protocol</DialogTitle>
          <DialogDescription className="text-left text-foreground">Define commercial boundaries and B2B yield for this digital node.</DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-6 py-4 space-y-8 text-left text-foreground">
            <div className="grid grid-cols-2 gap-4 text-left">
                <FormField name="type" render={({ field }) => (
                    <FormItem className="text-left">
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Classification</FormLabel>
                        <Select onValueChange={field.onChange} value={isCore ? 'access' : field.value}>
                            <FormControl><SelectTrigger className="bg-white border-2" disabled={isCore}><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent><SelectItem value="access">Access Control (Member Tier)</SelectItem><SelectItem value="data_silo">Data Silo (B2B IP)</SelectItem></SelectContent>
                        </Select>
                    </FormItem>
                )} />
                 <FormField name="name" render={({ field }) => (
                    <FormItem className="text-left text-foreground"><FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Node Label</FormLabel><FormControl><Input {...field} className="bg-white border-2 font-bold" /></FormControl></FormItem>
                )} />
            </div>

            <div className="grid grid-cols-3 gap-4 text-left">
                <FormField name="price" render={({ field }) => (
                    <FormItem className="text-left text-foreground"><FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Monthly Price (R)</FormLabel><FormControl><Input type="number" {...field} className="bg-white border-2" /></FormControl></FormItem>
                )} />
                <FormField name="isPopular" render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 pt-8 text-left text-foreground"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="cursor-pointer text-xs font-bold uppercase">Highlight</FormLabel></FormItem>
                )} />
                <FormField name="isActive" render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 pt-8 text-left text-foreground"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="cursor-pointer text-primary font-bold text-xs uppercase">Active</FormLabel></FormItem>
                )} />
            </div>

            <FormField name="description" render={({ field }) => (
              <FormItem className="text-left text-foreground"><FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Value Prop</FormLabel><FormControl><Textarea {...field} className="bg-white border-2" /></FormControl></FormItem>
            )} />

            {methods.watch('type') === 'access' && (
                <div className="space-y-6 text-left">
                    <Separator />
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary text-left">Platform Capabilities</h4>
                    <div className="grid grid-cols-1 gap-6 text-left">
                        {featuresData.featureSections.map((section) => (
                            <div key={section.name} className="space-y-3 text-left">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase bg-muted/50 px-2 py-1 rounded text-left">{section.name}</Label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-2 text-left">
                                    {section.features.map((feature) => (
                                        <div key={feature.key} className="flex items-center space-x-3 p-3 border rounded-xl hover:bg-slate-50 transition-all text-left">
                                            <Checkbox 
                                                id={`feat-${planId}-${feature.key}`} 
                                                checked={watchedFeatures.includes(feature.key)}
                                                onCheckedChange={() => handleFeatureToggle(feature.key)} 
                                            />
                                            <Label 
                                                htmlFor={`feat-${planId}-${feature.key}`} 
                                                className="text-[10px] font-black uppercase tracking-tight cursor-pointer flex-1 py-1 text-left"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {feature.name}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="pt-4 text-left">
                <FormField name="id" render={({ field }) => (
                  <FormItem className="text-left text-foreground"><FormLabel className="text-[10px] font-black uppercase text-muted-foreground">ID</FormLabel><FormControl><Input {...field} disabled={!!plan} className="h-8 font-mono text-xs bg-slate-50" /></FormControl></FormItem>
                )} />
            </div>
          </form>
        </FormProvider>
        <DialogFooter className="p-6 border-t"><Button type="button" onClick={methods.handleSubmit(onSubmit)} disabled={isLoading} className="w-full h-12 font-black uppercase text-white shadow-lg">{isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />} Save Protocol</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PricingManagement() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const q = useMemoFirebase(() => firestore ? query(collection(firestore, 'memberships')) : null, [firestore]);
  const { data: plans, isLoading, forceRefresh } = useCollection(q);

  const handleDelete = async (id: string) => {
    try {
        const token = await getClientSideAuthToken();
        if (!token) return;
        await fetch('/api/deleteConfigDoc', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ path: `memberships/${id}` }) });
        toast({ title: "Node Expunged" });
        forceRefresh();
    } catch (e) { toast({ variant: 'destructive', title: "Delete Failed" }); }
  };

  const categorized = useMemo(() => {
      const access = (plans || []).filter(p => p.type === 'access' || coreIds.includes(p.id?.toLowerCase())).sort((a,b) => (a.price || 0) - (b.price || 0));
      const silos = (plans || []).filter(p => p.type === 'data_silo' && !coreIds.includes(p.id?.toLowerCase())).sort((a,b) => (a.price || 0) - (b.price || 0));
      return { access, silos };
  }, [plans]);

  const columns: ColumnDef<any>[] = [
    { header: 'Status', cell: ({row}) => <Badge variant={row.original.isActive ? 'default' : 'secondary'}>{row.original.isActive ? 'Active' : 'Draft'}</Badge> },
    { header: 'Label', cell: ({row}) => <div className="text-left"><p className="font-bold">{row.original.name}</p><span className="text-[9px] font-mono text-muted-foreground uppercase">{row.original.id}</span></div> },
    { header: 'Yield (R)', cell: ({row}) => <span className="font-mono font-bold text-primary">{formatCurrency(row.original.price)}</span> },
    { id: 'actions', header: <div className="text-right">Audit</div>, cell: ({row}) => (
        <div className="text-right flex justify-end gap-1 text-left text-foreground">
            <PlanDialog plan={row.original} onSave={forceRefresh} />
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="text-left text-foreground">
                    <AlertDialogHeader className="text-left text-foreground"><AlertDialogTitle className="text-left text-foreground">Expunge Node Protocol?</AlertDialogTitle><AlertDialogDescription className="text-left text-foreground">Permanent deletion of "{row.original.name}".</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter className="text-left text-foreground"><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(row.original.id)} className={buttonVariants({ variant: 'destructive' })}>Delete Node</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )}
  ];

  return (
    <div className="space-y-12 text-left text-foreground">
      <div className="flex justify-between items-center text-left">
        <div className="text-left text-foreground">
            <CardTitle className="text-3xl font-black font-headline flex items-center gap-3 text-left text-foreground">
                <Layers className="text-primary h-8 w-8"/> Commercial Node Ledger
            </CardTitle>
            <CardDescription className="text-left">Define access boundaries for members and B2B pricing for data IP.</CardDescription>
        </div>
        <PlanDialog onSave={forceRefresh} />
      </div>

      <div className="space-y-12 text-left">
        <div className="space-y-4 text-left">
            <h3 className="text-xl font-black uppercase border-l-4 border-primary pl-4 text-left">1. Access Control Tiers</h3>
            <Card className="border-none shadow-xl bg-white"><CardContent className="pt-6"><DataTable columns={columns} data={categorized.access} /></CardContent></Card>
        </div>
        <div className="space-y-4 text-left text-foreground">
            <h3 className="text-xl font-black uppercase border-l-4 border-slate-900 pl-4 text-left text-foreground">2. Proprietary Data Silos</h3>
            <Card className="border-none shadow-xl bg-white text-left"><CardContent className="pt-6 text-left"><DataTable columns={columns} data={categorized.silos} /></CardContent></Card>
        </div>
      </div>

      <div className="p-10 bg-slate-900 text-white rounded-[3rem] shadow-2xl relative overflow-hidden text-left text-foreground">
            <div className="absolute top-0 right-0 p-12 opacity-5 text-left"><Zap className="h-40 w-40 text-primary" /></div>
            <div className="relative z-10 flex items-start gap-6 text-left text-white">
                <div className="bg-primary/20 p-4 rounded-3xl shrink-0"><Info className="h-8 w-8 text-primary" /></div>
                <div className="space-y-2 text-left">
                    <h4 className="text-xl font-black uppercase text-left text-white">Commercial Ledger Stability</h4>
                    <p className="text-slate-400 text-sm leading-relaxed max-w-4xl text-left text-white">Core plans are hard-coded to the Access Tiers section to prevent misclassification. Data Silos are reserved for B2B intelligence modules and are hidden from public view.</p>
                </div>
            </div>
      </div>
    </div>
  );
}
