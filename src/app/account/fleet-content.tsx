
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
import { Loader2, Save, Truck, Package, MapPin, ShieldCheck, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const fleetSchema = z.object({
    poweredUnits: z.array(z.string()).min(1, "Please select at least one unit type."),
    trailers: z.array(z.string()).min(1, "Please select at least one trailer type."),
    primaryRegions: z.array(z.string()).min(1, "Please select your primary regions."),
    cargoTypes: z.array(z.string()).min(1, "Please select cargo types you can carry."),
});

const fleetOptions = {
    powered: ['Horse', '8-ton Rigid', '4-ton Rigid', 'Bakkie'],
    trailers: ['Skeletal', 'Skeletal + Genset', 'Tautliner', 'Flatbed', 'Tipper', 'Lowbed', 'Reefer'],
    regions: ['Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Free State', 'Mpumalanga', 'Limpopo', 'North West', 'Northern Cape', 'Cross-Border'],
    cargo: ['General Freight', 'Containers', 'Refrigerated Containers', 'Bulk / Aggregates', 'Abnormal Loads', 'Perishables', 'Hazmat', 'FMCG']
};

export default function FleetContent() {
    const { user, isUserLoading, forceRefresh } = useUser();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<z.infer<typeof fleetSchema>>({
        resolver: zodResolver(fleetSchema),
        defaultValues: {
            poweredUnits: user?.companyData?.fleet?.poweredUnits || [],
            trailers: user?.companyData?.fleet?.trailers || [],
            primaryRegions: user?.companyData?.fleet?.primaryRegions || [],
            cargoTypes: user?.companyData?.fleet?.cargoTypes || [],
        }
    });

    useEffect(() => {
        if (user?.companyData?.fleet) {
            form.reset(user.companyData.fleet);
        }
    }, [user, form]);

    const onSubmit = async (values: z.infer<typeof fleetSchema>) => {
        setIsSaving(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Auth failed.");

            const response = await fetch('/api/updateUserDoc', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: `companies/${user.companyId}`,
                    data: { fleet: values, updatedAt: { _methodName: 'serverTimestamp' } }
                })
            });

            if (!response.ok) throw new Error("Update failed.");
            toast({ title: "Fleet Settings Saved", description: "Your intelligence profile has been updated." });
            forceRefresh();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error", description: e.message });
        } finally {
            setIsSaving(false);
        }
    };

    if (isUserLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

    return (
        <Card className="max-w-4xl mx-auto shadow-xl">
            <CardHeader className="border-b bg-muted/20 text-left">
                <div className="flex items-center gap-4 text-left">
                    <div className="bg-primary/10 p-3 rounded-xl text-left"><Truck className="h-6 w-6 text-primary" /></div>
                    <div className="text-left">
                        <CardTitle className="text-2xl font-bold text-left">Fleet & Service Profile</CardTitle>
                        <CardDescription className="text-left">Declare your specific vehicle and equipment configuration for accurate marketplace matching.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent className="p-8 space-y-10 text-left">
                        <Alert className="bg-primary/5 border-primary/20 text-left">
                            <Info className="h-5 w-5 text-primary" />
                            <AlertTitle className="font-bold text-left">Matching Intelligence</AlertTitle>
                            <AlertDescription className="text-sm text-muted-foreground leading-relaxed mt-1 text-left">
                                Our platform uses this data to match your fleet with suitable loads. For example, declaring "Skeletal + Genset" trailers is a strict requirement to be visible for Refrigerated Container transport searches.
                            </AlertDescription>
                        </Alert>
                        
                        {/* Powered Units */}
                        <div className="space-y-4 text-left">
                            <h3 className="font-bold flex items-center gap-2 text-lg text-foreground text-left"><Truck className="h-5 w-5 text-primary" /> Powered Units</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
                                {fleetOptions.powered.map(item => (
                                    <FormField key={item} control={form.control} name="poweredUnits" render={({ field }) => (
                                        <FormItem className="flex items-center space-x-3 space-y-0 p-3 border rounded-md hover:bg-muted/50 transition-colors text-left">
                                            <FormControl><Checkbox checked={field.value?.includes(item)} onCheckedChange={(checked) => checked ? field.onChange([...field.value, item]) : field.onChange(field.value?.filter((v: string) => v !== item))} /></FormControl>
                                            <FormLabel className="font-medium text-sm cursor-pointer text-left">{item}</FormLabel>
                                        </FormItem>
                                    )} />
                                ))}
                            </div>
                        </div>

                        {/* Trailers */}
                        <div className="space-y-4 text-left">
                            <h3 className="font-bold flex items-center gap-2 text-lg text-foreground text-left"><ShieldCheck className="h-5 w-5 text-primary" /> Trailer Configurations</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
                                {fleetOptions.trailers.map(item => (
                                    <FormField key={item} control={form.control} name="trailers" render={({ field }) => (
                                        <FormItem className="flex items-center space-x-3 space-y-0 p-3 border rounded-md hover:bg-muted/50 transition-colors text-left">
                                            <FormControl><Checkbox checked={field.value?.includes(item)} onCheckedChange={(checked) => checked ? field.onChange([...field.value, item]) : field.onChange(field.value?.filter((v: string) => v !== item))} /></FormControl>
                                            <FormLabel className="font-medium text-sm cursor-pointer text-left">{item}</FormLabel>
                                        </FormItem>
                                    )} />
                                ))}
                            </div>
                            <p className="text-[10px] text-muted-foreground italic text-left">Note: "Skeletal + Genset" is required to be matched for Refrigerated Container transport.</p>
                        </div>

                        {/* Regions */}
                        <div className="space-y-4 text-left">
                            <h3 className="font-bold flex items-center gap-2 text-lg text-foreground text-left"><MapPin className="h-5 w-5 text-primary" /> Primary Operating Regions</h3>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-left">
                                {fleetOptions.regions.map(item => (
                                    <FormField key={item} control={form.control} name="primaryRegions" render={({ field }) => (
                                        <FormItem className="flex items-center space-x-3 space-y-0 p-3 border rounded-md hover:bg-muted/50 transition-colors text-left">
                                            <FormControl><Checkbox checked={field.value?.includes(item)} onCheckedChange={(checked) => checked ? field.onChange([...field.value, item]) : field.onChange(field.value?.filter((v: string) => v !== item))} /></FormControl>
                                            <FormLabel className="font-medium text-[11px] cursor-pointer text-left">{item}</FormLabel>
                                        </FormItem>
                                    )} />
                                ))}
                            </div>
                        </div>

                        {/* Cargo Types */}
                        <div className="space-y-4 text-left">
                            <h3 className="font-bold flex items-center gap-2 text-lg text-foreground text-left"><Package className="h-5 w-5 text-primary" /> Permissible Cargo</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
                                {fleetOptions.cargo.map(item => (
                                    <FormField key={item} control={form.control} name="cargoTypes" render={({ field }) => (
                                        <FormItem className="flex items-center space-x-3 space-y-0 p-3 border rounded-md hover:bg-muted/50 transition-colors text-left">
                                            <FormControl><Checkbox checked={field.value?.includes(item)} onCheckedChange={(checked) => checked ? field.onChange([...field.value, item]) : field.onChange(field.value?.filter((v: string) => v !== item))} /></FormControl>
                                            <FormLabel className="font-medium text-sm cursor-pointer text-left">{item}</FormLabel>
                                        </FormItem>
                                    )} />
                                ))}
                            </div>
                        </div>

                    </CardContent>
                    <CardFooter className="bg-slate-50 border-t p-6 flex justify-end text-left">
                        <Button type="submit" disabled={isSaving} size="lg" className="h-12 px-10 font-bold gap-2 text-left">
                            {isSaving ? <Loader2 className="h-5 w-5 animate-spin text-left"/> : <Save className="h-5 w-5 text-left" />}
                            Update Fleet Intelligence
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    );
}
    