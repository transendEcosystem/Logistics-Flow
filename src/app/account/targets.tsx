
'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Target, Loader2, Save, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Form } from '@/components/ui/form';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SETUP_KEY = 'accountFinancialSetup_v1';
const TARGETS_KEY = 'accountFinancialTargets_v1';

const targetAssumptions = [
    { id: 'membersVendors', label: '# of Members (Vendors)', defaultValue: 10 },
    { id: 'membersBuyers', label: '# of Members (Buyers)', defaultValue: 10 },
    { id: 'membersPartners', label: '# of Members (Partners)', defaultValue: 1 },
    { id: 'membersAssociates', label: '# of Members (Associates)', defaultValue: 10 },
    { id: 'membersIsaAgents', label: '# of Members (ISA Agents)', defaultValue: 5 },
    { id: 'membersDrivers', label: '# of Members (Drivers)', defaultValue: 10 },
    { id: 'membersDevelopers', label: '# of Members (Developers)', defaultValue: 10 },
    { id: 'rewardsPlans', label: '# of Rewards Plans', defaultValue: 15 },
    { id: 'loyaltyPlans', label: '# of Loyalty Plans', defaultValue: 20 },
    { id: 'actionPlans', label: '# of Action Plans', defaultValue: 30 },
];

const generateDefaultValues = (months: number) => {
    const defaults: { [key: string]: (number | string)[] } = {};
    targetAssumptions.forEach(assumption => {
        defaults[assumption.id] = Array(months).fill(assumption.defaultValue);
    });
    return { monthlyTargets: defaults };
};

function TargetsComponent() {
    const router = useRouter();
    const { toast } = useToast();
    const [isClient, setIsClient] = useState(false);
    const [settings, setSettings] = useState<{ forecastMonths: number, startMonth: number, startYear: number } | null>(null);

    const form = useForm();

    useEffect(() => {
        setIsClient(true);
        let localSettings = {
            forecastMonths: 36,
            startMonth: new Date().getMonth(),
            startYear: new Date().getFullYear(),
        };
        try {
            const savedSettings = localStorage.getItem(SETUP_KEY);
            if (savedSettings) {
                localSettings = { ...localSettings, ...JSON.parse(savedSettings) };
            }
        } catch (e) {
            console.error("Could not parse financial setup settings for targets page.");
        }
        setSettings(localSettings);
        
        try {
            const savedData = localStorage.getItem(TARGETS_KEY);
            const savedMonths = savedData ? JSON.parse(savedData).monthlyTargets[targetAssumptions[0].id]?.length : 0;
            const initialData = (savedData && savedMonths === localSettings.forecastMonths) 
                ? JSON.parse(savedData) 
                : generateDefaultValues(localSettings.forecastMonths);
            form.reset(initialData);
        } catch (e) {
            console.error("Failed to parse saved targets data, using defaults.", e);
            form.reset(generateDefaultValues(localSettings.forecastMonths));
        }

    }, [form]);

    const { control, handleSubmit, reset } = form;

    const onSubmit = (data: any) => {
        localStorage.setItem(TARGETS_KEY, JSON.stringify(data));
        toast({
            title: "Monthly Targets Saved!",
            description: "Your target assumptions have been saved locally.",
        });
    };

    const handleReset = () => {
        if (!settings) return;
        const defaults = generateDefaultValues(settings.forecastMonths);
        reset(defaults);
        toast({
            title: 'Targets Reset',
            description: 'Assumptions have been reset to their default values.',
        });
    };
    
    if (!isClient || !settings) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    }

    const { forecastMonths, startMonth, startYear } = settings;
    const monthHeaders = Array.from({ length: forecastMonths }, (_, i) => {
        const date = new Date(startYear, startMonth + i);
        return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    });

    return (
        <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader className="flex flex-row justify-between items-start">
                        <div>
                            <CardTitle className="flex items-center gap-2"><Target /> Monthly Business Targets</CardTitle>
                            <CardDescription>Set your monthly targets for member counts and plan adoption. This data is saved locally and used in forecasts.</CardDescription>
                        </div>
                        <Button type="button" variant="outline" onClick={handleReset}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Reset to Defaults
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b-0">
                                        <TableHead className="w-[250px] sticky left-0 bg-background z-10">Target Metric</TableHead>
                                        {monthHeaders.map(header => (
                                            <TableHead key={header} className="w-[120px] text-center">{header}</TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {targetAssumptions.map((assumption) => (
                                        <TableRow key={assumption.id} className="border-b-0">
                                            <TableCell className="font-medium sticky left-0 bg-background z-10">{assumption.label}</TableCell>
                                            {monthHeaders.map((_, monthIndex) => (
                                                <TableCell key={`${assumption.id}-${monthIndex}`}>
                                                    <Controller
                                                        name={`monthlyTargets.${assumption.id}.${monthIndex}`}
                                                        control={control}
                                                        render={({ field }) => (
                                                            <Input
                                                                type="number"
                                                                className="h-8 w-24 text-center"
                                                                {...field}
                                                                onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                                            />
                                                        )}
                                                    />
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </CardContent>
                </Card>

                <div className="mt-8 flex justify-end">
                    <Button type="submit">
                        <Save className="mr-2 h-4 w-4" />
                        Save Targets
                    </Button>
                </div>
            </form>
        </Form>
    );
}


export default function TargetsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-[calc(100vh-8rem)]"><Loader2 className="h-16 w-16 animate-spin" /></div>}>
            <TargetsComponent />
        </Suspense>
    );
}
