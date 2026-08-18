
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
import { Loader2, Save, ShoppingBag, Package, MapPin, Sparkles, Info, Building2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { supplierCategories } from '@/app/adminaccount/marketing/discovery-engine';

const productProfileSchema = z.object({
    categories: z.array(z.string()).min(1, "Please select at least one industrial category."),
    supportedBrands: z.array(z.string()).min(1, "Please select at least one supported brand."),
    serviceRegions: z.array(z.string()).min(1, "Please select your service regions."),
    specialization: z.string().optional(),
});

const brandOptions = ['Scania', 'Volvo', 'Mercedes-Benz', 'MAN', 'Freightliner', 'Iveco', 'DAF', 'UD Trucks', 'Isuzu', 'Hino', 'Toyota (Bakkie)', 'Universal/All'];
const regionOptions = ['Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Free State', 'Mpumalanga', 'Limpopo', 'North West', 'Northern Cape', 'Cross-Border'];

export default function SupplierProductContent() {
    const { user, isUserLoading, forceRefresh } = useUser();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<z.infer<typeof productProfileSchema>>({
        resolver: zodResolver(productProfileSchema),
        defaultValues: {
            categories: user?.companyData?.productProfile?.categories || [],
            supportedBrands: user?.companyData?.productProfile?.supportedBrands || [],
            serviceRegions: user?.companyData?.productProfile?.serviceRegions || [],
            specialization: user?.companyData?.productProfile?.specialization || '',
        }
    });

    useEffect(() => {
        if (user?.companyData?.productProfile) {
            form.reset(user.companyData.productProfile);
        }
    }, [user, form]);

    const onSubmit = async (values: z.infer<typeof productProfileSchema>) => {
        setIsSaving(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Auth failed.");

            const response = await fetch('/api/updateUserDoc', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: `companies/${user.companyId}`,
                    data: { productProfile: values, updatedAt: { _methodName: 'serverTimestamp' } }
                })
            });

            if (!response.ok) throw new Error("Update failed.");
            toast({ title: "Product Portfolio Saved", description: "Your professional supplier profile has been updated." });
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
                    <div className="bg-primary/10 p-3 rounded-xl text-left"><Building2 className="h-6 w-6 text-primary" /></div>
                    <div className="text-left">
                        <CardTitle className="text-2xl font-bold text-left">Product Portfolio</CardTitle>
                        <CardDescription className="text-left">Declare your specific industrial capabilities to enable AI matching with fleet owners.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent className="p-8 space-y-10 text-left">
                        <Alert className="bg-primary/5 border-primary/20 text-left">
                            <Info className="h-5 w-5 text-primary" />
                            <AlertTitle className="font-bold text-left">Ecosystem Connectivity</AlertTitle>
                            <AlertDescription className="text-sm text-muted-foreground leading-relaxed mt-1 text-left">
                                By specifying your categories and supported brands, our intelligence engine can deliver your profile directly to members who have declared matching fleet equipment. This drives high-intent RFQs to your digital branch.
                            </AlertDescription>
                        </Alert>
                        
                        <div className="space-y-4 text-left">
                            <h3 className="font-bold flex items-center gap-2 text-lg text-foreground text-left"><Package className="h-5 w-5 text-primary" /> Industrial Categories</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
                                {supplierCategories.map(item => (
                                    <FormField key={item} control={form.control} name="categories" render={({ field }) => (
                                        <FormItem className="flex items-center space-x-3 space-y-0 p-3 border rounded-md hover:bg-muted/50 transition-colors text-left">
                                            <FormControl><Checkbox checked={field.value?.includes(item)} onCheckedChange={(checked) => checked ? field.onChange([...field.value, item]) : field.onChange(field.value?.filter((v: string) => v !== item))} /></FormControl>
                                            <FormLabel className="font-medium text-[11px] cursor-pointer leading-tight text-left">{item}</FormLabel>
                                        </FormItem>
                                    )} />
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4 text-left">
                            <h3 className="font-bold flex items-center gap-2 text-lg text-foreground text-left"><Sparkles className="h-5 w-5 text-primary" /> Supported Truck Brands</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
                                {brandOptions.map(item => (
                                    <FormField key={item} control={form.control} name="supportedBrands" render={({ field }) => (
                                        <FormItem className="flex items-center space-x-3 space-y-0 p-3 border rounded-md hover:bg-muted/50 transition-colors text-left">
                                            <FormControl><Checkbox checked={field.value?.includes(item)} onCheckedChange={(checked) => checked ? field.onChange([...field.value, item]) : field.onChange(field.value?.filter((v: string) => v !== item))} /></FormControl>
                                            <FormLabel className="font-medium text-sm cursor-pointer text-left">{item}</FormLabel>
                                        </FormItem>
                                    )} />
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4 text-left">
                            <h3 className="font-bold flex items-center gap-2 text-lg text-foreground text-left"><MapPin className="h-5 w-5 text-primary" /> Service Regions</h3>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-left">
                                {regionOptions.map(item => (
                                    <FormField key={item} control={form.control} name="serviceRegions" render={({ field }) => (
                                        <FormItem className="flex items-center space-x-3 space-y-0 p-3 border rounded-md hover:bg-muted/50 transition-colors text-left">
                                            <FormControl><Checkbox checked={field.value?.includes(item)} onCheckedChange={(checked) => checked ? field.onChange([...field.value, item]) : field.onChange(field.value?.filter((v: string) => v !== item))} /></FormControl>
                                            <FormLabel className="font-medium text-[11px] cursor-pointer text-left">{item}</FormLabel>
                                        </FormItem>
                                    )} />
                                ))}
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-slate-50 border-t p-6 flex justify-end text-left">
                        <Button type="submit" disabled={isSaving} size="lg" className="h-12 px-10 font-bold gap-2 text-left">
                            {isSaving ? <Loader2 className="h-5 w-5 animate-spin text-left"/> : <Save className="h-5 w-5 text-left" />}
                            Update Product Portfolio
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    );
}
    