'use client';

import React, { useState, useMemo } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, ArrowRight, Truck, MapPin, Package, DollarSign, ShieldCheck, CheckCircle, ClipboardList, Network, HelpCircle } from 'lucide-react';
import { getClientSideAuthToken, useUser } from '@/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { provinces } from '@/lib/geodata';
import { cn, formatCurrency } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const loadSchema = z.object({
  agreementId: z.string().min(1, "Please select an authorized appointment."),
  loadType: z.enum(['local_distribution', 'long_haul']).default('long_haul'),
  origin: z.string().min(1, "Origin is required."),
  destination: z.string().min(1, "Destination is required."),
  cargoType: z.string().min(1, "Cargo type is required."),
  requiredEquipment: z.array(z.string()).min(1, "Select at least one equipment type."),
  weight: z.coerce.number().positive(),
  totalValue: z.coerce.number().positive("What is the total value of this load?"),
  brokerMargin: z.coerce.number().min(0).max(50, "Margin capped at 50%"),
  collectionDetails: z.string().min(10, "Provide full collection address and contact."),
  deliveryDetails: z.string().min(10, "Provide full delivery address and contact."),
  demurrageConditions: z.string().min(5, "Specify delay penalties."),
  collectionDate: z.string().min(1, "Required."),
  deliveryDate: z.string().min(1, "Required."),
});

const cargoOptions = ["Containers", "Refrigerated", "General Freight", "Bulk Aggregates", "FMCG", "Hazmat"];
const equipmentOptions = ["Skeletal", "Skeletal + Genset", "Tautliner", "Flatbed", "Tipper", "Reefer"];

// Process geodata into simple strings for Select options
const locationOptions = provinces.flatMap(p => 
    p.cities.map(c => `${c.name}, ${p.name}`)
);

const steps = [
    { id: 'type', title: 'Flow Type', icon: Network },
    { id: 'logistics', title: 'Logistics', icon: MapPin },
    { id: 'execution', title: 'Execution', icon: ClipboardList },
    { id: 'cargo', title: 'Cargo & Specs', icon: Package },
    { id: 'commercials', title: 'Commercials', icon: DollarSign },
    { id: 'review', title: 'Publish', icon: ShieldCheck },
];

export function PostLoadWizard({ agreements, onComplete }: { agreements: any[], onComplete: () => void }) {
    const { user } = useUser();
    const { toast } = useToast();
    const [currentStep, setCurrentStep] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const isEarningMember = user?.companyData?.membershipId && user.companyData.membershipId !== 'free';

    const methods = useForm<z.infer<typeof loadSchema>>({
        resolver: zodResolver(loadSchema),
        mode: 'onChange',
        defaultValues: { 
            requiredEquipment: [],
            loadType: 'long_haul',
            brokerMargin: agreements.find(a => a.status === 'verified')?.commissionRate || 5,
            demurrageConditions: 'R2500 per day standing fee if not offloaded within 4 hours of arrival.'
        }
    });

    const commercials = useMemo(() => {
        const total = methods.watch('totalValue') || 0;
        const margin = methods.watch('brokerMargin') || 0;
        const brokerEarn = total * (margin / 100);
        const platformFee = total * 0.025; // 2.5%
        const haulierPayout = total - brokerEarn - platformFee;

        return { brokerEarn, platformFee, haulierPayout };
    }, [methods.watch('totalValue'), methods.watch('brokerMargin')]);

    const onSubmit = async (values: z.infer<typeof loadSchema>) => {
        if (!isEarningMember) return;

        setIsLoading(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Auth failed.");
            
            const res = await fetch('/api/addUserDoc', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    collectionPath: `companies/${user!.companyId}/loads`,
                    data: { 
                        ...values, 
                        brokerId: user!.companyId,
                        brokerName: user?.companyData?.companyName || 'Primary Contractor',
                        ...commercials,
                        status: 'active',
                        createdAt: { _methodName: 'serverTimestamp' } 
                    }
                })
            });
            if (!res.ok) throw new Error("Failed to post load.");
            toast({ title: "Load Posted Successfully" });
            onComplete();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error", description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleNext = async () => {
        const step = steps[currentStep].id as any;
        const isValid = await methods.trigger(step);
        if (isValid && currentStep < steps.length - 1) setCurrentStep(prev => prev + 1);
    };

    return (
        <Card className="max-w-4xl mx-auto shadow-2xl border-none text-left overflow-hidden">
            <CardHeader className="bg-slate-900 text-white p-8 text-left">
                <CardTitle className="text-2xl font-black font-headline flex items-center gap-3 text-white text-left">
                    <Truck className="h-6 w-6 text-primary" />
                    Freight Clearing Wizard
                </CardTitle>
                <CardDescription className="text-slate-400 text-left">Post verified freight instructions to the specialized haulier network.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 bg-white text-foreground">
                <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-8 text-left">
                    <div className="space-y-2 border-r pr-4 text-left">
                        {steps.map((step, i) => (
                            <Button key={step.id} variant={currentStep === i ? "secondary" : "ghost"} className={cn("w-full justify-start gap-3 h-12 px-4 transition-all text-left text-foreground", currentStep === i && "bg-white shadow-sm ring-1 ring-primary/20")} onClick={() => setCurrentStep(i)}>
                                <div className={cn("h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold", currentStep >= i ? "bg-primary text-white" : "bg-muted")}>{i+1}</div>
                                <span className="font-bold">{step.title}</span>
                            </Button>
                        ))}
                    </div>
                    <FormProvider {...methods}>
                        <div className="space-y-8 min-h-[450px] text-left text-foreground">
                            {currentStep === 0 && (
                                <div className="space-y-8 text-left">
                                     <FormField control={methods.control} name="loadType" render={({ field }) => (
                                        <FormItem className="space-y-4 text-left">
                                            <FormLabel className="font-black uppercase text-[10px] tracking-widest text-primary text-left">Select Flow Segment</FormLabel>
                                            <FormControl>
                                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-1 gap-4 text-left">
                                                    <div className={cn("flex items-center space-x-4 p-4 border-2 rounded-2xl cursor-pointer transition-all", field.value === 'local_distribution' ? "border-primary bg-primary/5" : "border-muted")}>
                                                        <RadioGroupItem value="local_distribution" id="local" className="h-5 w-5" />
                                                        <div className="flex-1 cursor-pointer text-left">
                                                            <p className="font-black text-sm uppercase text-left">Local Distribution</p>
                                                            <p className="text-[11px] text-muted-foreground text-left">Inner-city urban Spokes. Sourced from Distribution Mall.</p>
                                                        </div>
                                                    </div>
                                                    <div className={cn("flex items-center space-x-4 p-4 border-2 rounded-2xl cursor-pointer transition-all", field.value === 'long_haul' ? "border-primary bg-primary/5" : "border-muted")}>
                                                        <RadioGroupItem value="long_haul" id="haul" className="h-5 w-5" />
                                                        <div className="flex-1 cursor-pointer text-left">
                                                            <p className="font-black text-sm uppercase text-left">Long-Haul Transport</p>
                                                            <p className="text-[11px] text-muted-foreground text-left">Arterial inter-hub movement. Sourced from Transport Mall.</p>
                                                        </div>
                                                    </div>
                                                </RadioGroup>
                                            </FormControl>
                                        </FormItem>
                                     )} />
                                     
                                     <FormField control={methods.control} name="agreementId" render={({ field }) => (
                                        <FormItem className="text-left text-foreground">
                                            <FormLabel className="font-black uppercase text-[10px] tracking-widest text-primary text-left">Authorized Appointment</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger className="h-11 border-2 text-left text-foreground"><SelectValue placeholder="Select verified provider..." /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {agreements.filter(a => a.status === 'verified').map(a => <SelectItem key={a.id} value={a.id}>{a.providerName}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <FormDescription className="text-[10px] italic text-left">Must be a verified primary contract holder.</FormDescription>
                                        </FormItem>
                                    )} />
                                </div>
                            )}

                            {currentStep === 1 && (
                                <div className="space-y-6 text-left text-foreground">
                                    <h3 className="font-bold text-lg flex items-center gap-2 text-foreground text-left"><MapPin className="h-5 w-5 text-primary" /> Corridor Logistics</h3>
                                    <div className="grid grid-cols-2 gap-4 text-left">
                                        <FormField control={methods.control} name="origin" render={({ field }) => (
                                            <FormItem className="text-left text-foreground">
                                                <FormLabel>Origin Hub</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger className="bg-white text-left text-foreground"><SelectValue/></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {locationOptions.slice(0, 100).map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )} />
                                        <FormField control={methods.control} name="destination" render={({ field }) => (
                                            <FormItem className="text-left text-foreground">
                                                <FormLabel>Destination Hub</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger className="bg-white text-left text-foreground"><SelectValue/></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {locationOptions.slice(0, 100).map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )} />
                                    </div>
                                </div>
                            )}
                            
                            {currentStep === 2 && (
                                <div className="space-y-6 text-left">
                                    <h3 className="font-bold text-lg flex items-center gap-2 text-foreground text-left"><ClipboardList className="h-5 w-5 text-primary" /> Execution Specifics</h3>
                                    <div className="grid grid-cols-2 gap-4 text-left">
                                        <FormField control={methods.control} name="collectionDate" render={({ field }) => (<FormItem className="text-left text-foreground"><FormLabel>Collection Date</FormLabel><FormControl><Input type="date" {...field} className="bg-white" /></FormControl></FormItem>)} />
                                        <FormField control={methods.control} name="deliveryDate" render={({ field }) => (<FormItem className="text-left text-foreground"><FormLabel>Target Delivery</FormLabel><FormControl><Input type="date" {...field} className="bg-white" /></FormControl></FormItem>)} />
                                    </div>
                                    <FormField control={methods.control} name="collectionDetails" render={({ field }) => (
                                        <FormItem className="text-left text-foreground"><FormLabel>Collection Full Address & Contact</FormLabel><FormControl><Textarea placeholder="Precise pickup location..." {...field} className="bg-white" /></FormControl></FormItem>
                                    )} />
                                    <FormField control={methods.control} name="deliveryDetails" render={({ field }) => (
                                        <FormItem className="text-left text-foreground"><FormLabel>Delivery Full Address & Contact</FormLabel><FormControl><Textarea placeholder="Precise offload location..." {...field} className="bg-white" /></FormControl></FormItem>
                                    )} />
                                </div>
                            )}

                            {currentStep === 3 && (
                                <div className="space-y-6 text-left text-foreground">
                                    <div className="grid grid-cols-2 gap-4 text-left">
                                        <FormField control={methods.control} name="cargoType" render={({ field }) => (
                                            <FormItem className="text-left text-foreground">
                                                <FormLabel>Cargo Classification</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger className="bg-white text-left text-foreground"><SelectValue/></SelectTrigger></FormControl>
                                                    <SelectContent>{cargoOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </FormItem>
                                        )} />
                                        <FormField control={methods.control} name="weight" render={({ field }) => (<FormItem className="text-left text-foreground"><FormLabel>Tonnage (Tons)</FormLabel><FormControl><Input type="number" {...field} className="bg-white" /></FormControl></FormItem>)} />
                                    </div>
                                    <div className="space-y-3 text-left">
                                        <Label className="font-bold text-foreground text-left">Required Equipment</Label>
                                        <div className="grid grid-cols-2 gap-2 text-left">
                                            {equipmentOptions.map(opt => (
                                                <FormField key={opt} control={methods.control} name="requiredEquipment" render={({ field }) => (
                                                    <div className="flex items-center space-x-2 p-2 border rounded-md text-left">
                                                        <Checkbox checked={field.value.includes(opt)} onCheckedChange={(checked) => checked ? field.onChange([...field.value, opt]) : field.onChange(field.value.filter((v:any) => v !== opt))} />
                                                        <span className="text-xs text-foreground text-left">{opt}</span>
                                                    </div>
                                                )} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 4 && (
                                <div className="space-y-8 text-left text-foreground">
                                    <div className="grid grid-cols-2 gap-6 text-left">
                                        <FormField control={methods.control} name="totalValue" render={({ field }) => (
                                            <FormItem className="text-left text-foreground">
                                                <FormLabel className="font-black text-primary uppercase text-[10px] text-left">Gross Load Value (ZAR)</FormLabel>
                                                <FormControl><Input type="number" className="h-12 text-xl font-mono bg-white" {...field} /></FormControl>
                                            </FormItem>
                                        )} />
                                        <FormField control={methods.control} name="brokerMargin" render={({ field }) => (
                                            <FormItem className="text-left text-foreground">
                                                <FormLabel className="font-black uppercase text-[10px] text-left">Broker Participation (%)</FormLabel>
                                                <FormControl><Input type="number" className="bg-white" {...field} /></FormControl>
                                            </FormItem>
                                        )} />
                                    </div>
                                    
                                    <div className="bg-slate-50 p-8 rounded-3xl border-2 border-dashed space-y-4 text-left">
                                        <h4 className="font-black uppercase text-[10px] tracking-widest text-muted-foreground mb-4 text-left">Clearing Logic</h4>
                                        <div className="space-y-3 text-left text-sm text-foreground">
                                            <div className="flex justify-between text-left"><span>Your Net Earning</span><span className="font-bold text-green-700">{formatCurrency(commercials.brokerEarn)}</span></div>
                                            <div className="flex justify-between text-left"><span>Platform Fee (2.5%)</span><span className="font-bold">{formatCurrency(commercials.platformFee)}</span></div>
                                            <Separator />
                                            <div className="flex justify-between text-lg font-black text-primary pt-2 text-left"><span>HAULIER PAYOUT</span><span>{formatCurrency(commercials.haulierPayout)}</span></div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 5 && (
                                <div className="space-y-6 text-center py-10">
                                    <CheckCircle className="h-16 w-16 mx-auto text-primary" />
                                    <div className="space-y-2 text-center text-foreground">
                                        <h3 className="text-2xl font-black">Audit Verified</h3>
                                        <p className="text-sm text-muted-foreground max-sm mx-auto leading-relaxed text-center">This load will be broadcasted to the specialized {methods.watch('loadType') === 'local_distribution' ? 'Distribution' : 'Transport'} fleet registry.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </FormProvider>
                </div>
            </CardContent>
            <CardFooter className="p-8 bg-slate-50 border-t flex justify-between text-left">
                <Button variant="ghost" onClick={currentStep === 0 ? onComplete : () => setCurrentStep(prev => prev - 1)} className="text-foreground"><ArrowLeft className="mr-2 h-4 w-4"/> {currentStep === 0 ? 'Cancel' : 'Back'}</Button>
                {currentStep < 5 ? (
                    <Button onClick={handleNext} className="text-white">Next Step <ArrowRight className="ml-2 h-4 w-4"/></Button>
                ) : (
                    <Button onClick={methods.handleSubmit(onSubmit)} disabled={isLoading || !isEarningMember} className="gap-2 font-black uppercase shadow-lg h-12 px-8 text-white">
                        {isLoading ? <Loader2 className="animate-spin h-4 w-4"/> : <ShieldCheck className="h-4 w-4" />}
                        Broadcast & Open Handshake
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
