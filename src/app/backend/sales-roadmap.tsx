
'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Map, Users, Building, Handshake, Bot, TrendingUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import React from 'react';
import { useForm } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SALES_ROADMAP_KEY = 'backendSalesRoadmap_v1';

const defaultValues = {
    startMonth: new Date().getMonth(),
    startYear: new Date().getFullYear(),
    forecastMonths: 36,
    initialTransporters: 1000,
    initialSuppliers: 500,
    numberOfPowerPartners: 5,
    opportunitiesPerPartner: 2000,
    numberOfIsas: 10,
    referralsPerIsa: 50,
    isaConversionRate: 10,
    campaignConversionRate: 5,
    campaignDuration: 6,
    avgCustomersPerMember: 10,
    customerConversionRate: 2,
    customerConversionLag: 3,
};


export default function SalesRoadmap() {
    const router = useRouter();
    const { toast } = useToast();

    const form = useForm({
        defaultValues: useCallback(() => {
            if (typeof window === 'undefined') return defaultValues;
            try {
                const savedData = localStorage.getItem(SALES_ROADMAP_KEY);
                return savedData ? JSON.parse(savedData) : defaultValues;
            } catch (e) {
                console.error("Failed to parse saved sales roadmap data", e);
                return defaultValues;
            }
        }, [])()
    });

    const { control, register, handleSubmit, watch, reset } = form;

    const watchedValues = watch();

    const onSubmit = (data: any) => {
        localStorage.setItem(SALES_ROADMAP_KEY, JSON.stringify(data));
        toast({
            title: "Sales Assumptions Saved!",
            description: "Navigate to Member Projection to see the results.",
        });
        router.push('/backend?view=member-projection');
    };

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Map /> Sales Roadmap Assumptions</CardTitle>
                    <CardDescription>Model your membership growth over time based on campaigns and network effects. Your inputs are saved locally.</CardDescription>
                </CardHeader>
            </Card>
            <Form {...form}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* --- INPUTS COLUMN --- */}
                        <div className="lg:col-span-1 space-y-6">
                            <Card>
                                <CardHeader><CardTitle className="flex items-center gap-2"><Building /> 1. Initial Databases</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField control={control} name="initialTransporters" render={({field}) => <FormItem><Label># of Transport Companies</Label><FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))}/></FormControl></FormItem>} />
                                    <FormField control={control} name="initialSuppliers" render={({field}) => <FormItem><Label># of Suppliers</Label><FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))}/></FormControl></FormItem>} />
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle className="flex items-center gap-2"><Handshake /> 2. Power Partners</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField control={control} name="numberOfPowerPartners" render={({field}) => <FormItem><Label># of Power Partners</Label><FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))}/></FormControl></FormItem>} />
                                    <FormField control={control} name="opportunitiesPerPartner" render={({field}) => <FormItem><Label>Opportunities per Partner ({field.value.toLocaleString()})</Label><FormControl><Slider value={[field.value]} onValueChange={v => field.onChange(v[0])} max={10000} step={250} min={2000} /></FormControl></FormItem>} />
                                </CardContent>
                            </Card>
                        </div>
                        <div className="lg:col-span-1 space-y-6">
                             <Card>
                                <CardHeader><CardTitle className="flex items-center gap-2"><Bot /> 3. Independent Sales Agents (ISAs)</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField control={control} name="numberOfIsas" render={({field}) => <FormItem><Label># of ISA Agents</Label><FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))}/></FormControl></FormItem>} />
                                    <FormField control={control} name="referralsPerIsa" render={({field}) => <FormItem><Label>Referrals per ISA per Month ({field.value})</Label><FormControl><Slider value={[field.value]} onValueChange={v => field.onChange(v[0])} max={200} step={5} /></FormControl></FormItem>} />
                                    <FormField control={control} name="isaConversionRate" render={({field}) => <FormItem><Label>ISA Conversion Rate ({field.value}%)</Label><FormControl><Slider value={[field.value]} onValueChange={v => field.onChange(v[0])} max={50} step={1} /></FormControl></FormItem>} />
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle>4. Campaign Conversion</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField control={control} name="campaignConversionRate" render={({field}) => <FormItem><Label>Campaign Conversion Rate ({field.value}%)</Label><FormControl><Slider value={[field.value]} onValueChange={v => field.onChange(v[0])} max={50} step={0.5} /></FormControl></FormItem>} />
                                    <FormField control={control} name="campaignDuration" render={({field}) => <FormItem><Label>Campaign Duration ({field.value} months)</Label><FormControl><Slider value={[field.value]} onValueChange={v => field.onChange(v[0])} max={24} step={1} min={1} /></FormControl></FormItem>} />
                                </CardContent>
                            </Card>
                        </div>
                        <div className="lg:col-span-1 space-y-6">
                             <Card>
                                <CardHeader><CardTitle>5. Network Effect</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField control={control} name="avgCustomersPerMember" render={({field}) => <FormItem><Label>Avg. Customers per Member</Label><FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))}/></FormControl></FormItem>} />
                                    <FormField control={control} name="customerConversionRate" render={({field}) => <FormItem><Label>Customer Conversion Rate ({field.value}%)</Label><FormControl><Slider value={[field.value]} onValueChange={v => field.onChange(v[0])} max={20} step={0.1} /></FormControl></FormItem>} />
                                    <FormField control={control} name="customerConversionLag" render={({field}) => <FormItem><Label>Conversion Lag ({field.value} months)</Label><FormControl><Slider value={[field.value]} onValueChange={v => field.onChange(v[0])} max={12} step={1} min={1} /></FormControl></FormItem>} />
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle>6. Forecast Period</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={control} name="startMonth" render={({field}) => <FormItem><Label>Start Month</Label><Select value={String(field.value)} onValueChange={v => field.onChange(Number(v))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{monthNames.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent></Select></FormItem>} />
                                        <FormField control={control} name="startYear" render={({field}) => <FormItem><Label>Start Year</Label><FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))}/></FormControl></FormItem>} />
                                    </div>
                                    <FormField control={control} name="forecastMonths" render={({field}) => <FormItem><Label>Number of Months to Forecast ({field.value})</Label><FormControl><Slider value={[field.value]} onValueChange={v => field.onChange(v[0])} max={60} step={1} min={6} /></FormControl></FormItem>} />
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                     <div className="mt-8 flex justify-end">
                        <Button type="submit">
                            <TrendingUp className="mr-2 h-4 w-4"/>
                            Save & View Projection
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    )
}
