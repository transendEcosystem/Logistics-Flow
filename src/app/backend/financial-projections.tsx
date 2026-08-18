'use client';

import React, { useMemo, useState, useEffect, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, Loader2, DollarSign, Users, Map, Target, Banknote, Save, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const formatCurrency = (value: number) => {
    if (typeof value !== 'number' || isNaN(value)) return 'R 0';
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(value);
};

const formatNumber = (value: number) => {
    if (typeof value !== 'number' || isNaN(value)) return '0';
    return value.toLocaleString();
};


const salesRoadmapSchema = z.object({
    powerPartners: z.object({ count: z.number(), oppsPerMonth: z.number(), conversionRate: z.number() }),
    isaAgents: z.object({ count: z.number(), referralsPerMonth: z.number(), conversionRate: z.number() }),
});
const targetsSchema = z.object({
    connectPlanAdoptionRate: z.number(),
});
const budgetSchema = z.object({
    avgMembershipFee: z.number(),
    avgMallSpend: z.number(),
    mallCommissionRate: z.number(),
    opexPerMonth: z.number(),
});

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formSchema = z.object({
    forecastMonths: z.number().int().min(12).max(60),
    startMonth: z.number().int().min(0).max(11),
    startYear: z.number().int(),
    salesRoadmap: salesRoadmapSchema,
    targets: targetsSchema,
    budget: budgetSchema,
});

type FormValues = z.infer<typeof formSchema>;

const PROJECTIONS_KEY = 'adminFinancialProjections_v1';


// --- Calculation Logic ---
function calculateProjections(inputs: FormValues | null) {
    if (!inputs || !inputs.startYear || !inputs.forecastMonths) return [];

    const { forecastMonths, salesRoadmap, targets, budget, startMonth, startYear } = inputs;
    
    let partnerMembers = 0;
    let totalMembers = 0;

    const projections = Array.from({ length: forecastMonths }, (_, i) => {
        const date = new Date(startYear, startMonth + i);
        const monthName = date.toLocaleString('default', { month: 'short' });
        const year = date.getFullYear();
        const monthLabel = `${monthName} ${year}`;
        
        // Partner & ISA Growth
        const partnerNewMembers = Math.round(salesRoadmap.powerPartners.count * salesRoadmap.powerPartners.oppsPerMonth * (salesRoadmap.powerPartners.conversionRate / 100));
        const isaNewMembers = Math.round(salesRoadmap.isaAgents.count * salesRoadmap.isaAgents.referralsPerMonth * (salesRoadmap.isaAgents.conversionRate / 100));
        const newPartnerDrivenMembers = partnerNewMembers + isaNewMembers;
        partnerMembers += newPartnerDrivenMembers;

        // For simplicity, let's assume total growth is partner driven for now
        totalMembers = partnerMembers;

        // Revenue (Turnover)
        const membershipRevenue = totalMembers * budget.avgMembershipFee;
        const connectPlanRevenue = totalMembers * (targets.connectPlanAdoptionRate / 100) * 50; // Assuming R50 avg fee
        const mallRevenue = totalMembers * budget.avgMallSpend * (budget.mallCommissionRate / 100);
        const totalRevenue = membershipRevenue + connectPlanRevenue + mallRevenue;

        // Income Statement
        const grossProfit = totalRevenue; // Simplified COGS for now
        const opex = budget.opexPerMonth;
        const netProfit = grossProfit - opex;

        return {
            month: monthLabel,
            year: year,
            // Partners Sheet
            partnerNewMembers,
            isaNewMembers,
            totalPartnerDriven: newPartnerDrivenMembers,
            cumulativePartnerMembers: partnerMembers,
            // Members Sheet
            cumulativeTotalMembers: totalMembers,
            // Turnover Sheet
            membershipRevenue,
            connectPlanRevenue,
            mallRevenue,
            totalRevenue,
            // Income Statement
            grossProfit,
            opex,
            netProfit
        };
    });

    return projections;
}


function FinancialProjectionsComponent() {
    const { toast } = useToast();
    const [isClient, setIsClient] = useState(false);
    const [initialFormValues, setInitialFormValues] = useState<FormValues | null>(null);
    
    const form = useForm<FormValues>();

    useEffect(() => {
        setIsClient(true);
        let defaults: FormValues = {
            forecastMonths: 36,
            startMonth: new Date().getMonth(),
            startYear: new Date().getFullYear(),
            salesRoadmap: {
                powerPartners: { count: 5, oppsPerMonth: 200, conversionRate: 5 },
                isaAgents: { count: 10, referralsPerMonth: 20, conversionRate: 10 },
            },
            targets: {
                connectPlanAdoptionRate: 15,
            },
            budget: {
                avgMembershipFee: 350,
                avgMallSpend: 1500,
                mallCommissionRate: 2.5,
                opexPerMonth: 250000,
            }
        };
        try {
            const saved = localStorage.getItem(PROJECTIONS_KEY);
            if (saved) {
                defaults = JSON.parse(saved);
            }
        } catch (error) {
            console.error("Could not parse saved projection data.");
        }
        setInitialFormValues(defaults);
        form.reset(defaults);
    }, [form]);

    const { control, handleSubmit, watch, reset } = form;
    const watchedValues = watch();

    const projections = useMemo(() => calculateProjections(watchedValues), [watchedValues]);

    const totals = useMemo(() => {
        if (!projections || projections.length === 0) return {};
        const result = projections.reduce((acc, curr) => {
            for (const key in curr) {
                if (key !== 'month' && key !== 'year' && !key.startsWith('cumulative')) {
                    acc[key] = (acc[key] || 0) + (curr[key as keyof typeof curr] as number);
                }
            }
            return acc;
        }, {} as Record<string, number>);

        if(projections.length > 0) {
            const lastMonth = projections[projections.length - 1];
            result.cumulativePartnerMembers = lastMonth.cumulativePartnerMembers;
            result.cumulativeTotalMembers = lastMonth.cumulativeTotalMembers;
        }

        return result;
    }, [projections]);
    
    const grandTotals = useMemo(() => {
        if (!projections || projections.length === 0) return null;
        const totals = {
            totalRevenue: 0,
            totalOpex: 0,
            netProfit: 0,
            finalMemberCount: 0,
        };
        projections.forEach((row) => {
            totals.totalRevenue += row.totalRevenue;
            totals.totalOpex += row.opex;
            totals.netProfit += row.netProfit;
        });
        if (projections.length > 0) {
            totals.finalMemberCount = projections[projections.length - 1].cumulativeTotalMembers;
        }
        return totals;
    }, [projections]);

    
    const onSubmit = (data: FormValues) => {
        localStorage.setItem(PROJECTIONS_KEY, JSON.stringify(data));
        toast({ title: 'Projections Saved!', description: 'Your financial assumptions have been saved locally.' });
    };
    
    const handleReset = () => {
        const defaults = {
            forecastMonths: 36,
            startMonth: new Date().getMonth(),
            startYear: new Date().getFullYear(),
            salesRoadmap: {
                powerPartners: { count: 5, oppsPerMonth: 200, conversionRate: 5 },
                isaAgents: { count: 10, referralsPerMonth: 20, conversionRate: 10 },
            },
            targets: {
                connectPlanAdoptionRate: 15,
            },
            budget: {
                avgMembershipFee: 350,
                avgMallSpend: 1500,
                mallCommissionRate: 2.5,
                opexPerMonth: 250000,
            }
        };
        localStorage.removeItem(PROJECTIONS_KEY);
        reset(defaults);
        toast({ title: 'Projections Reset', description: 'Assumptions have been reset to default values.' });
    };

    const renderInput = (name: keyof FormValues | any, label: string) => (
        <FormField control={control} name={name} render={({ field }) => (
            <FormItem>
                <FormLabel>{label}</FormLabel>
                <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)}/></FormControl>
            </FormItem>
        )} />
    );

    if (!isClient || !initialFormValues) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
    }

    return (
        <div className="space-y-8">
            <Form {...form}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
                        <AccordionItem value="item-1">
                            <AccordionTrigger><h2 className="text-xl font-semibold">Financial Assumptions</h2></AccordionTrigger>
                            <AccordionContent className="p-4 bg-background/50 rounded-b-lg">
                                 <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                     <Card><CardHeader><CardTitle className="flex items-center gap-2"><Map size={18}/>Sales Roadmap</CardTitle></CardHeader>
                                        <CardContent className="space-y-4">
                                            {renderInput('salesRoadmap.powerPartners.count', '# Power Partners')}
                                            {renderInput('salesRoadmap.powerPartners.oppsPerMonth', 'Opps/Partner/Mo')}
                                            {renderInput('salesRoadmap.powerPartners.conversionRate', 'Partner Conv. Rate (%)')}
                                            <Separator />
                                             {renderInput('salesRoadmap.isaAgents.count', '# ISA Agents')}
                                            {renderInput('salesRoadmap.isaAgents.referralsPerMonth', 'Refs/ISA/Mo')}
                                            {renderInput('salesRoadmap.isaAgents.conversionRate', 'ISA Conv. Rate (%)')}
                                        </CardContent>
                                    </Card>
                                     <Card><CardHeader><CardTitle className="flex items-center gap-2"><Target size={18}/>Targets</CardTitle></CardHeader>
                                        <CardContent className="space-y-4">
                                            {renderInput('targets.connectPlanAdoptionRate', 'Connect Plan Adopt. (%)')}
                                        </CardContent>
                                    </Card>
                                     <Card><CardHeader><CardTitle className="flex items-center gap-2"><Banknote size={18}/>Budget</CardTitle></CardHeader>
                                        <CardContent className="space-y-4">
                                            {renderInput('budget.avgMembershipFee', 'Avg. Membership Fee (R)')}
                                            {renderInput('budget.avgMallSpend', 'Avg. Mall Spend/Member (R)')}
                                            {renderInput('budget.mallCommissionRate', 'Mall Commission Rate (%)')}
                                            {renderInput('budget.opexPerMonth', 'Monthly OPEX (R)')}
                                        </CardContent>
                                    </Card>
                                     <Card><CardHeader><CardTitle>General</CardTitle></CardHeader>
                                        <CardContent className="space-y-4">
                                            {renderInput('forecastMonths', 'Forecast Months')}
                                             <div className="grid grid-cols-2 gap-4">
                                                <FormField control={control} name="startMonth" render={({field}) => <FormItem><Label>Start Month</Label><Select value={String(field.value)} onValueChange={v => field.onChange(Number(v))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{monthNames.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent></Select></FormItem>} />
                                                <FormField control={control} name="startYear" render={({field}) => <FormItem><Label>Start Year</Label><FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))}/></FormControl></FormItem>} />
                                            </div>
                                             <div className="pt-6 flex flex-col gap-2">
                                                <Button type="submit"><Save className="mr-2"/>Save Assumptions</Button>
                                                <Button type="button" variant="outline" onClick={handleReset}><RotateCcw className="mr-2"/>Reset</Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                 </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </form>
            </Form>

             <Tabs defaultValue="partners" className="w-full">
                {grandTotals && watchedValues.forecastMonths && (
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">Forecast Summary</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                             <Card>
                                <CardHeader className="flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <p className="text-2xl font-bold">{formatCurrency(grandTotals.totalRevenue)}</p>
                                    <p className="text-xs text-muted-foreground">over {watchedValues.forecastMonths} months</p>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader className="flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium">Total OPEX</CardTitle>
                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <p className="text-2xl font-bold">{formatCurrency(grandTotals.totalOpex)}</p>
                                    <p className="text-xs text-muted-foreground">over {watchedValues.forecastMonths} months</p>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader className="flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium">Total Net Profit</CardTitle>
                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <p className={`text-2xl font-bold ${grandTotals.netProfit < 0 ? 'text-destructive' : 'text-green-600'}`}>{formatCurrency(grandTotals.netProfit)}</p>
                                    <p className="text-xs text-muted-foreground">over {watchedValues.forecastMonths} months</p>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader className="flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium">Ending Member Count</CardTitle>
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <p className="text-2xl font-bold">{formatNumber(grandTotals.finalMemberCount)}</p>
                                     <p className="text-xs text-muted-foreground">at the end of the period</p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="partners">Partners</TabsTrigger>
                    <TabsTrigger value="members">Members</TabsTrigger>
                    <TabsTrigger value="turnover">Turnover</TabsTrigger>
                    <TabsTrigger value="income-statement">Income Statement</TabsTrigger>
                </TabsList>
                <TabsContent value="partners" className="mt-4">
                     <Card>
                        <CardHeader><CardTitle>Partner-Driven Member Growth</CardTitle></CardHeader>
                        <CardContent><Table>
                            <TableHeader><TableRow><TableHead>Month</TableHead><TableHead>New (Partners)</TableHead><TableHead>New (ISAs)</TableHead><TableHead>Total New</TableHead><TableHead>Cumulative</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {projections.map(p => (<TableRow key={p.month}><TableCell>{p.month}</TableCell><TableCell>{formatNumber(p.partnerNewMembers)}</TableCell><TableCell>{formatNumber(p.isaNewMembers)}</TableCell><TableCell>{formatNumber(p.totalPartnerDriven)}</TableCell><TableCell className="font-bold">{formatNumber(p.cumulativePartnerMembers)}</TableCell></TableRow>))}
                                {totals.partnerNewMembers !== undefined && <TableRow className="bg-muted font-bold"><TableCell>Total</TableCell><TableCell>{formatNumber(totals.partnerNewMembers)}</TableCell><TableCell>{formatNumber(totals.isaNewMembers)}</TableCell><TableCell>{formatNumber(totals.totalPartnerDriven)}</TableCell><TableCell>{formatNumber(totals.cumulativePartnerMembers)}</TableCell></TableRow>}
                            </TableBody>
                        </Table></CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="members" className="mt-4">
                     <Card>
                        <CardHeader><CardTitle>Total Member Growth</CardTitle></CardHeader>
                        <CardContent><Table>
                            <TableHeader><TableRow><TableHead>Month</TableHead><TableHead>New Members</TableHead><TableHead>Cumulative Members</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {projections.map(p => (<TableRow key={p.month}><TableCell>{p.month}</TableCell><TableCell>{formatNumber(p.totalPartnerDriven)}</TableCell><TableCell className="font-bold">{formatNumber(p.cumulativeTotalMembers)}</TableCell></TableRow>))}
                                {totals.totalPartnerDriven !== undefined && <TableRow className="bg-muted font-bold"><TableCell>Total</TableCell><TableCell>{formatNumber(totals.totalPartnerDriven)}</TableCell><TableCell>{formatNumber(totals.cumulativeTotalMembers)}</TableCell></TableRow>}
                            </TableBody>
                        </Table></CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="turnover" className="mt-4">
                     <Card>
                        <CardHeader><CardTitle>Turnover (Revenue) Projection</CardTitle></CardHeader>
                        <CardContent><Table>
                            <TableHeader><TableRow><TableHead>Month</TableHead><TableHead>Membership Rev.</TableHead><TableHead>Connect Plan Rev.</TableHead><TableHead>Mall Rev.</TableHead><TableHead>Total Revenue</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {projections.map(p => (<TableRow key={p.month}><TableCell>{p.month}</TableCell><TableCell>{formatCurrency(p.membershipRevenue)}</TableCell><TableCell>{formatCurrency(p.connectPlanRevenue)}</TableCell><TableCell>{formatCurrency(p.mallRevenue)}</TableCell><TableCell className="font-bold">{formatCurrency(p.totalRevenue)}</TableCell></TableRow>))}
                                {totals.membershipRevenue !== undefined && <TableRow className="bg-muted font-bold"><TableCell>Total</TableCell><TableCell>{formatCurrency(totals.membershipRevenue)}</TableCell><TableCell>{formatCurrency(totals.connectPlanRevenue)}</TableCell><TableCell>{formatCurrency(totals.mallRevenue)}</TableCell><TableCell>{formatCurrency(totals.totalRevenue)}</TableCell></TableRow>}
                            </TableBody>
                        </Table></CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="income-statement" className="mt-4">
                     <Card>
                        <CardHeader><CardTitle>Income Statement (P&L) Projection</CardTitle></CardHeader>
                        <CardContent><Table>
                            <TableHeader><TableRow><TableHead>Month</TableHead><TableHead>Total Revenue</TableHead><TableHead>OPEX</TableHead><TableHead>Net Profit</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {projections.map(p => (<TableRow key={p.month}><TableCell>{p.month}</TableCell><TableCell>{formatCurrency(p.totalRevenue)}</TableCell><TableCell>{formatCurrency(p.opex)}</TableCell><TableCell className={`font-bold ${p.netProfit < 0 ? 'text-destructive' : 'text-green-600'}`}>{formatCurrency(p.netProfit)}</TableCell></TableRow>))}
                                {totals.totalRevenue !== undefined && <TableRow className="bg-muted font-bold"><TableCell>Total</TableCell><TableCell>{formatCurrency(totals.totalRevenue)}</TableCell><TableCell>{formatCurrency(totals.opex)}</TableCell><TableCell className={`font-bold ${totals.netProfit < 0 ? 'text-destructive' : 'text-green-600'}`}>{formatCurrency(totals.netProfit)}</TableCell></TableRow>}
                            </TableBody>
                        </Table></CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}


export default function FinancialProjections() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <FinancialProjectionsComponent />
        </Suspense>
    );
}
