
'use client';

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Gift, Trash2, PlusCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useConfig } from '@/hooks/use-config';
import { getClientSideAuthToken } from '@/firebase';

const benefitSchema = z.object({
  name: z.string().min(1, "Benefit name is required"),
  bronzeValue: z.string().optional(),
  silverValue: z.string().optional(),
  goldValue: z.string().optional(),
});

const formSchema = z.object({
  benefits: z.array(benefitSchema),
});

type FormValues = z.infer<typeof formSchema>;

export default function RewardsManagement() {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    
    const { data: configData, isLoading: isConfigLoading, forceRefresh } = useConfig<any>('loyaltySettings');

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            benefits: [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "benefits"
    });

    useEffect(() => {
        if (configData) {
            // This handles the new, simplified `benefits` array structure
            if (configData.benefits && Array.isArray(configData.benefits)) {
                form.reset({ benefits: configData.benefits });
            } else {
                // This is for backward compatibility with an older, more complex data structure.
                const transformedBenefits = (configData.benefitNames || []).map((name: string) => ({
                    name,
                    bronzeValue: String((configData.bronzeBenefits && configData.bronzeBenefits[name]) || ''),
                    silverValue: String((configData.silverBenefits && configData.silverBenefits[name]) || ''),
                    goldValue: String((configData.goldBenefits && configData.goldBenefits[name]) || ''),
                }));
                form.reset({ benefits: transformedBenefits });
            }
        }
    }, [configData, form]);

    const onSubmit = async (values: FormValues) => {
        setIsSaving(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");

            const updatedConfig = {
                ...configData, // Preserve other loyalty settings
                benefits: values.benefits, // Set the new benefits array
                updatedAt: { _methodName: 'serverTimestamp' }
            };

            // Remove legacy properties to clean up the document
            delete updatedConfig.benefitNames;
            delete updatedConfig.bronzeBenefits;
            delete updatedConfig.silverBenefits;
            delete updatedConfig.goldBenefits;

            const response = await fetch('/api/updateConfigDoc', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: 'configuration/loyaltySettings',
                    data: updatedConfig
                }),
            });

            if (!response.ok) throw new Error((await response.json()).error || 'Failed to save settings.');

            toast({ title: 'Rewards Plan Benefits Saved!', description: 'The benefits for each tier have been updated.' });
            forceRefresh();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
        } finally {
            setIsSaving(false);
        }
    };

    if (isConfigLoading) {
        return <div className="flex justify-center items-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Gift className="h-6 w-6" />
                    Rewards Plan (Tier Benefits)
                </CardTitle>
                <CardDescription>
                    Define the specific benefits each loyalty tier receives. These are displayed on the member's dashboard.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-4">
                            {fields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-12 gap-4 items-end p-4 border rounded-lg">
                                    <div className="col-span-12 md:col-span-3">
                                        <FormField
                                            control={form.control}
                                            name={`benefits.${index}.name`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Benefit Name</FormLabel>
                                                    <FormControl><Input placeholder="e.g., Mall Discount" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-8 grid grid-cols-3 gap-4">
                                         <FormField control={form.control} name={`benefits.${index}.bronzeValue`} render={({ field }) => (<FormItem><FormLabel>Bronze Value</FormLabel><FormControl><Input placeholder="e.g., 2.5%" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                         <FormField control={form.control} name={`benefits.${index}.silverValue`} render={({ field }) => (<FormItem><FormLabel>Silver Value</FormLabel><FormControl><Input placeholder="e.g., 5%" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                         <FormField control={form.control} name={`benefits.${index}.goldValue`} render={({ field }) => (<FormItem><FormLabel>Gold Value</FormLabel><FormControl><Input placeholder="e.g., 10%" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                    <div className="col-span-12 md:col-span-1 flex justify-end">
                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                             <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => append({ name: "", bronzeValue: "", silverValue: "", goldValue: "" })}
                                >
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Benefit
                            </Button>
                        </div>
                        <CardFooter className="px-0 pt-6">
                             <Button type="submit" disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save Tier Benefits
                            </Button>
                        </CardFooter>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
