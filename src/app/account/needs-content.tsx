
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { useUser, getClientSideAuthToken } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ShoppingCart, Package, MapPin, Sparkles, Info, Clock, Weight, Hammer } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';

const needsSchema = z.object({
    cargoTypes: z.array(z.string()).min(1, "Please select at least one cargo type."),
    routes: z.array(z.string()).min(1, "Please select your primary routes."),
    approxMonthlyLoads: z.coerce.number().optional(),
    loadingConstraints: z.array(z.string()).optional().default([]),
    operatingHours: z.string().optional(),
});

const cargoOptions = ['General Freight', 'Containers', 'Refrigerated Containers', 'Bulk / Aggregates', 'Abnormal Loads', 'Perishables', 'Hazmat', 'FMCG'];
const routeOptions = ['Intra-Gauteng', 'GP to KZN', 'GP to WC', 'GP to EC', 'WC to KZN', 'KZN to EC', 'Cross-Border (SADC)'];
const constraintOptions = ['Dock Loading', 'Forklift On-Site', 'Crane Required', 'Side-Load Only', 'Hand-Offloading Only', 'Secure Overnight Parking'];

export default function NeedsContent() {
    const { user, isUserLoading, forceRefresh } = useUser();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<z.infer<typeof needsSchema>>({
        resolver: zodResolver(needsSchema),
        defaultValues: {
            cargoTypes: [],
            routes: [],
            approxMonthlyLoads: 0,
            loadingConstraints: [],
            operatingHours: '',
        }
    });

    useEffect(() => {
        if (user?.companyData?.logisticsNeeds) {
            form.reset(user.companyData.logisticsNeeds);
        }
    }, [user, form]);

    const onSubmit = async (values: z.infer<typeof needsSchema>) => {
        setIsSaving(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Auth failed.");

            const response = await fetch('/api/updateUserDoc', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: `companies/${user.companyId}`,
                    data: { logisticsNeeds: values, updatedAt: { _methodName: 'serverTimestamp' } }
                })
            });

            if (!response.ok) throw new Error("Update failed.");
            toast({ title: "Strategic Needs Saved", description: "Your shipping profile has been updated." });
            forceRefresh();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error", description: e.message });
        } finally {
            setIsSaving(false);
        }
    };

    if (isUserLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

    return (
        <Card className="max-w-4xl mx-auto shadow-xl text-left">
            <CardHeader className="border-b bg-muted/20 text-left">
                <div className="flex items-center gap-4 text-left">
                    <div className="bg-primary/10 p-3 rounded-xl text-left"><ShoppingCart className="h-6 w-6 text-primary" /></div>
                    <div className="text-left">
                        <CardTitle className="text-2xl font-bold text-left">Shipping Requirements</CardTitle>
                        <CardDescription className="text-left">Declare your regular logistics needs to enable AI-powered matching with vetted hauliers.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent className="p-8 space-y-10 text-left">
                        <Alert className="bg-primary/5 border-primary/20 text-left">
                            <Info className="h-5 w-5 text-primary" />
                            <AlertTitle className="font-bold text-left">The Information Flow Advantage</AlertTitle>
                            <AlertDescription className="text-sm text-muted-foreground leading-relaxed mt-1 text-left">
                                By specifying your cargo profile and regular routes, you allow our matching engine to proactively find the most efficient hauliers in the registry. This reduces manual searching and drives down your spot-market procurement costs.
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-4 text-left">
                            <h3 className="font-bold flex items-center gap-2 text-lg text-foreground text-left"><Package className="h-5 w-5 text-primary" /> Regular Cargo Types</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
                                {cargoOptions.map(item => (
                                    <FormField key={item} control={form.control} name="cargoTypes" render={({ field }) => (
                                        <FormItem className="flex items-center space-x-3 space-y-0 p-3 border rounded-md hover:bg-muted/50 transition-colors text-left">
                                            <FormControl><Checkbox checked={field.value?.includes(item)} onCheckedChange={(checked) => checked ? field.onChange([...field.value, item]) : field.onChange(field.value?.filter((v: string) => v !== item))} /></FormControl>
                                            <FormLabel className="font-medium text-xs cursor-pointer text-left">{item}</FormLabel>
                                        </FormItem>
                                    )} />
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4 text-left">
                            <h3 className="font-bold flex items-center gap-2 text-lg text-foreground text-left"><MapPin className="h-5 w-5 text-primary" /> Regular Service Corridors</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
                                {routeOptions.map(item => (
                                    <FormField key={item} control={form.control} name="routes" render={({ field }) => (
                                        <FormItem className="flex items-center space-x-3 space-y-0 p-3 border rounded-md hover:bg-muted/50 transition-colors text-left">
                                            <FormControl><Checkbox checked={field.value?.includes(item)} onCheckedChange={(checked) => checked ? field.onChange([...field.value, item]) : field.onChange(field.value?.filter((v: string) => v !== item))} /></FormControl>
                                            <FormLabel className="font-medium text-[10px] cursor-pointer text-left">{item}</FormLabel>
                                        </FormItem>
                                    )} />
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4 text-left">
                            <h3 className="font-bold flex items-center gap-2 text-lg text-foreground text-left"><Hammer className="h-5 w-5 text-primary" /> Facility Constraints</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-left">
                                {constraintOptions.map(item => (
                                    <FormField key={item} control={form.control} name="loadingConstraints" render={({ field }) => (
                                        <FormItem className="flex items-center space-x-3 space-y-0 p-3 border rounded-md hover:bg-muted/50 transition-colors text-left">
                                            <FormControl><Checkbox checked={field.value?.includes(item)} onCheckedChange={(checked) => checked ? field.onChange([...field.value, item]) : field.onChange(field.value?.filter((v: string) => v !== item))} /></FormControl>
                                            <FormLabel className="font-medium text-[10px] cursor-pointer text-left">{item}</FormLabel>
                                        </FormItem>
                                    )} />
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                            <div className="space-y-4 text-left">
                                <h3 className="font-bold flex items-center gap-2 text-lg text-foreground text-left"><Weight className="h-5 w-5 text-primary" /> Volume Declaration</h3>
                                <FormField control={form.control} name="approxMonthlyLoads" render={({ field }) => (
                                    <FormItem className="max-w-xs text-left">
                                        <FormLabel>Approx. Loads per Month</FormLabel>
                                        <FormControl><Input type="number" placeholder="e.g. 10" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                            <div className="space-y-4 text-left">
                                <h3 className="font-bold flex items-center gap-2 text-lg text-foreground text-left"><Clock className="h-5 w-5 text-primary" /> Site Operating Hours</h3>
                                <FormField control={form.control} name="operatingHours" render={({ field }) => (
                                    <FormItem className="max-w-xs text-left">
                                        <FormLabel>Daily Receiving Hours</FormLabel>
                                        <FormControl><Input placeholder="e.g. 08:00 - 16:30" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-slate-50 border-t p-6 flex justify-end text-left">
                        <Button type="submit" disabled={isSaving} size="lg" className="h-12 px-10 font-bold gap-2 text-left">
                            {isSaving ? <Loader2 className="h-5 w-5 animate-spin text-left"/> : <Save className="h-5 w-5 text-left" />}
                            Update Shipping Profile
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    );
}
    