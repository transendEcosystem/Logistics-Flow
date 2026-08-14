'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { useUser, getClientSideAuthToken } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Users, Award, MapPin, Info, Briefcase, Banknote } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';

const humanCapitalSchema = z.object({
    jobCategories: z.array(z.string()).min(1, "Please select at least one job category."),
    certifications: z.array(z.string()).min(1, "Please select your primary certifications."),
    locations: z.array(z.string()).min(1, "Please select your availability regions."),
    desiredSalary: z.coerce.number().min(0).optional(),
});

const jobOptions = ["Code 14 Driver", "Code 10 Driver", "Diesel Mechanic", "Fleet Controller", "Operations Manager", "Warehouse Manager", "Logistics Coordinator", "Sales Representative", "Technical Support"];
const certOptions = ["Valid PrDP", "Hazmat / DG Certificate", "Forklift License", "Red Seal Mechanic", "NQF 5 Supply Chain", "First Aid Level 1", "Health & Safety Officer", "Cross-Border Permit"];
const regionOptions = ['Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Free State', 'Mpumalanga', 'Limpopo', 'North West', 'Northern Cape', 'Cross-Border (SADC)'];

export default function HumanCapitalContent() {
    const { user, isUserLoading, forceRefresh } = useUser();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<z.infer<typeof humanCapitalSchema>>({
        resolver: zodResolver(humanCapitalSchema),
        defaultValues: {
            jobCategories: user?.companyData?.professionalProfile?.jobCategories || [],
            certifications: user?.companyData?.professionalProfile?.certifications || [],
            locations: user?.companyData?.professionalProfile?.locations || [],
            desiredSalary: user?.companyData?.professionalProfile?.desiredSalary || 0,
        }
    });

    useEffect(() => {
        if (user?.companyData?.professionalProfile) {
            form.reset(user.companyData.professionalProfile);
        }
    }, [user, form]);

    const onSubmit = async (values: z.infer<typeof humanCapitalSchema>) => {
        if (!user?.companyId) return;
        setIsSaving(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Auth failed.");

            const response = await fetch('/api/updateUserDoc', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: `companies/${user.companyId}`,
                    data: { professionalProfile: values, updatedAt: { _methodName: 'serverTimestamp' } }
                })
            });

            if (!response.ok) throw new Error("Update failed.");
            toast({ title: "Professional Profile Saved", description: "Your talent intelligence record has been updated." });
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
            <CardHeader className="border-b bg-muted/20">
                <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-xl"><Users className="h-6 w-6 text-primary" /></div>
                    <div className="text-left">
                        <CardTitle className="text-2xl font-bold">Professional Profile</CardTitle>
                        <CardDescription>Declare your specific job role, certifications, and availability for accurate talent matching.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent className="p-8 space-y-10 text-left">
                        <Alert className="bg-primary/5 border-primary/20">
                            <Info className="h-5 w-5 text-primary" />
                            <AlertTitle className="font-bold">Career Intelligence</AlertTitle>
                            <AlertDescription className="text-sm text-muted-foreground leading-relaxed mt-1 text-left">
                                Our platform uses this data to match your skills with suitable vacancies across our member network. Declaring your certifications and regions is a strict requirement for verified visibility.
                            </AlertDescription>
                        </Alert>
                        
                        <div className="space-y-4 text-left">
                            <h3 className="font-bold flex items-center gap-2 text-lg text-foreground"><Briefcase className="h-5 w-5 text-primary" /> Industry Category (Role)</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {jobOptions.map(item => (
                                    <FormField key={item} control={form.control} name="jobCategories" render={({ field }) => (
                                        <FormItem className="flex items-center space-x-3 space-y-0 p-3 border rounded-md hover:bg-muted/50 transition-colors">
                                            <FormControl><Checkbox checked={field.value?.includes(item)} onCheckedChange={(checked) => checked ? field.onChange([...field.value, item]) : field.onChange(field.value?.filter((v: string) => v !== item))} /></FormControl>
                                            <FormLabel className="font-medium text-xs cursor-pointer">{item}</FormLabel>
                                        </FormItem>
                                    )} />
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4 text-left">
                            <h3 className="font-bold flex items-center gap-2 text-lg text-foreground"><Award className="h-5 w-5 text-primary" /> Certifications & Licenses</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {certOptions.map(item => (
                                    <FormField key={item} control={form.control} name="certifications" render={({ field }) => (
                                        <FormItem className="flex items-center space-x-3 space-y-0 p-3 border rounded-md hover:bg-muted/50 transition-colors">
                                            <FormControl><Checkbox checked={field.value?.includes(item)} onCheckedChange={(checked) => checked ? field.onChange([...field.value, item]) : field.onChange(field.value?.filter((v: string) => v !== item))} /></FormControl>
                                            <FormLabel className="font-medium text-xs cursor-pointer">{item}</FormLabel>
                                        </FormItem>
                                    )} />
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4 text-left">
                            <h3 className="font-bold flex items-center gap-2 text-lg text-foreground"><MapPin className="h-5 w-5 text-primary" /> Work Availability (Location)</h3>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                {regionOptions.map(item => (
                                    <FormField key={item} control={form.control} name="locations" render={({ field }) => (
                                        <FormItem className="flex items-center space-x-3 space-y-0 p-3 border rounded-md hover:bg-muted/50 transition-colors">
                                            <FormControl><Checkbox checked={field.value?.includes(item)} onCheckedChange={(checked) => checked ? field.onChange([...field.value, item]) : field.onChange(field.value?.filter((v: string) => v !== item))} /></FormControl>
                                            <FormLabel className="font-medium text-[10px] cursor-pointer">{item}</FormLabel>
                                        </FormItem>
                                    )} />
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4 text-left">
                            <h3 className="font-bold flex items-center gap-2 text-lg text-foreground"><Banknote className="h-5 w-5 text-primary" /> Desired Salary / Rate</h3>
                            <FormField control={form.control} name="desiredSalary" render={({ field }) => (
                                <FormItem className="max-w-xs">
                                    <FormLabel>Expected Monthly Income (ZAR)</FormLabel>
                                    <FormControl><Input type="number" placeholder="e.g. 15000" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>

                    </CardContent>
                    <CardFooter className="bg-slate-50 border-t p-6 flex justify-end">
                        <Button type="submit" disabled={isSaving} size="lg" className="h-12 px-10 font-bold gap-2">
                            {isSaving ? <Loader2 className="h-5 w-5 animate-spin"/> : <Save className="h-5 w-5" />}
                            Update Professional Profile
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    );
}
