
'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Map, Loader2, Save, RotateCcw, Trash2, Check, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Form } from '@/components/ui/form';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SETUP_KEY = 'accountFinancialSetup_v1';
const SALES_ROADMAP_KEY = 'accountSalesRoadmapScenarios_v1'; // New key for scenarios

const salesRoleGroups = [
    {
        role: 'Power Partners',
        description: 'Businesses with significant relationship bases (e.g., associations, brokers, depots).',
        assumptions: [
            { id: 'numberOfPowerPartners', label: 'Initial # of Members', defaultValue: 5 },
            { id: 'opportunitiesPerPartner', label: 'Opps per Partner / Month', defaultValue: 50 },
            { id: 'powerPartnerConversion', label: '% Conversion to Member', defaultValue: 25 },
        ]
    },
    {
        role: 'Vendors',
        assumptions: [
            { id: 'initialMembersVendors', label: 'Initial # of Members', defaultValue: 5 },
            { id: 'referralsPerMemberVendors', label: '# of Referrals / Member / Month', defaultValue: 10 },
            { id: 'conversionToMemberVendors', label: '% Conversion to Member', defaultValue: 5 }
        ]
    },
    {
        role: 'Buyers',
        assumptions: [
            { id: 'initialMembersBuyers', label: 'Initial # of Members', defaultValue: 5 },
            { id: 'referralsPerMemberBuyers', label: '# of Referrals / Member / Month', defaultValue: 10 },
            { id: 'conversionToMemberBuyers', label: '% Conversion to Member', defaultValue: 5 }
        ]
    },
    {
        role: 'Associates',
        assumptions: [
            { id: 'initialMembersAssociates', label: 'Initial # of Members', defaultValue: 10 },
            { id: 'referralsPerMemberAssociates', label: '# of Referrals / Member / Month', defaultValue: 10 },
            { id: 'conversionToMemberAssociates', label: '% Conversion to Member', defaultValue: 10 }
        ]
    },
    {
        role: 'ISA Agents',
        assumptions: [
            { id: 'initialMembersIsaAgents', label: 'Initial # of Members', defaultValue: 5 },
            { id: 'referralsPerMemberIsaAgents', label: '# of Referrals / Member / Month', defaultValue: 20 },
            { id: 'conversionToMemberIsaAgents', label: '% Conversion to Member', defaultValue: 25 }
        ]
    },
    {
        role: 'Drivers',
        assumptions: [
            { id: 'initialMembersDrivers', label: 'Initial # of Members', defaultValue: 0 },
            { id: 'referralsPerMemberDrivers', label: '# of Referrals / Member / Month', defaultValue: 0 },
            { id: 'conversionToMemberDrivers', label: '% Conversion to Member', defaultValue: 0 }
        ]
    },
    {
        role: 'Developers',
        assumptions: [
            { id: 'initialMembersDevelopers', label: 'Initial # of Members', defaultValue: 0 },
            { id: 'referralsPerMemberDevelopers', label: '# of Referrals / Member / Month', defaultValue: 0 },
            { id: 'conversionToMemberDevelopers', label: '% Conversion to Member', defaultValue: 0 }
        ]
    },
];

const generateDefaultValues = (months: number) => {
    const monthlyAssumptions: { [key: string]: any } = {};
    salesRoleGroups.forEach(group => {
        group.assumptions.forEach(assumption => {
            monthlyAssumptions[assumption.id] = Array(months).fill(assumption.defaultValue);
        });
    });
    return { monthlyAssumptions };
};


function SalesRoadmapComponent() {
    const router = useRouter();
    const { toast } = useToast();
    const [forecastMonths, setForecastMonths] = useState(36);
    const [startMonth, setStartMonth] = useState(new Date().getMonth());
    const [startYear, setStartYear] = useState(new Date().getFullYear());
    const [isLoading, setIsLoading] = useState(true);

    // Scenario State
    const [scenarios, setScenarios] = useState<{[key: string]: any}>({});
    const [activeScenarioName, setActiveScenarioName] = useState<string>('Default');
    const [newScenarioName, setNewScenarioName] = useState<string>('');

    const form = useForm({
        defaultValues: generateDefaultValues(forecastMonths)
    });

    const { control, handleSubmit, reset } = form;

    // Load settings and scenarios from local storage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            let months = 36;
            try {
                const savedSettings = localStorage.getItem(SETUP_KEY);
                if (savedSettings) {
                    const parsed = JSON.parse(savedSettings);
                    months = parsed.forecastMonths || 36;
                    setForecastMonths(months);
                    setStartMonth(parsed.startMonth || new Date().getMonth());
                    setStartYear(parsed.startYear || new Date().getFullYear());
                }
                
                const savedScenarios = localStorage.getItem(SALES_ROADMAP_KEY);
                const parsedScenarios = savedScenarios ? JSON.parse(savedScenarios) : { scenarios: { 'Default': generateDefaultValues(months) }, activeScenario: 'Default' };
                setScenarios(parsedScenarios.scenarios);
                setActiveScenarioName(parsedScenarios.activeScenario);
                reset(parsedScenarios.scenarios[parsedScenarios.activeScenario] || generateDefaultValues(months));

            } catch (e) {
                console.error("Could not parse saved data.");
                const defaults = generateDefaultValues(months);
                setScenarios({ 'Default': defaults });
                reset(defaults);
            } finally {
                setIsLoading(false);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reset]);
    
    const saveScenariosToLocalStorage = (newScenarios: any, activeName: string) => {
        const dataToSave = { scenarios: newScenarios, activeScenario: activeName };
        localStorage.setItem(SALES_ROADMAP_KEY, JSON.stringify(dataToSave));
        setScenarios(newScenarios);
        setActiveScenarioName(activeName);
    };

    const handleSaveNewScenario = () => {
        if (!newScenarioName) {
            toast({ variant: 'destructive', title: 'Scenario name is required.' });
            return;
        }
        if (scenarios[newScenarioName]) {
            toast({ variant: 'destructive', title: 'Scenario name already exists.' });
            return;
        }
        const currentValues = form.getValues();
        const newScenarios = { ...scenarios, [newScenarioName]: currentValues };
        saveScenariosToLocalStorage(newScenarios, newScenarioName);
        setNewScenarioName('');
        toast({ title: 'Scenario Saved', description: `Scenario "${newScenarioName}" has been created.` });
    };

    const handleUpdateScenario = () => {
        const currentValues = form.getValues();
        const updatedScenarios = { ...scenarios, [activeScenarioName]: currentValues };
        saveScenariosToLocalStorage(updatedScenarios, activeScenarioName);
        toast({ title: 'Scenario Updated', description: `Scenario "${activeScenarioName}" has been saved.` });
    };
    
    const handleLoadScenario = (scenarioName: string) => {
        if (scenarios[scenarioName]) {
            reset(scenarios[scenarioName]);
            setActiveScenarioName(scenarioName);
            const dataToSave = { scenarios, activeScenario: scenarioName };
            localStorage.setItem(SALES_ROADMAP_KEY, JSON.stringify(dataToSave));
            toast({ title: 'Scenario Loaded', description: `You are now editing "${scenarioName}".` });
        }
    };
    
    const handleDeleteScenario = () => {
        if (activeScenarioName === 'Default') {
            toast({ variant: 'destructive', title: 'Cannot delete default scenario.' });
            return;
        }
        const { [activeScenarioName]: _, ...remainingScenarios } = scenarios;
        saveScenariosToLocalStorage(remainingScenarios, 'Default');
        reset(remainingScenarios['Default']);
        toast({ title: 'Scenario Deleted' });
    };

    const onSubmit = (data: any) => {
        const updatedScenarios = { ...scenarios, [activeScenarioName]: data };
        saveScenariosToLocalStorage(updatedScenarios, activeScenarioName);
        toast({
            title: "Referral Targets Saved!",
            description: `Your assumptions for "${activeScenarioName}" have been saved.`,
        });
        router.push('/account?view=member-projection');
    };

    const handleReset = () => {
        const defaults = generateDefaultValues(forecastMonths);
        reset(defaults);
        toast({
            title: 'Form Reset',
            description: 'Assumptions have been reset to their default values. Save to update scenario.',
        });
    };
    
    const monthHeaders = Array.from({ length: forecastMonths }, (_, i) => {
        const date = new Date(startYear, startMonth + i);
        return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    });
    
    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    }

    return (
        <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Map /> Sales Conversion Funnel</CardTitle>
                        <CardDescription>Set your monthly referral targets and conversion rates for each member role. Your scenarios are saved locally.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Label>Scenario Management</Label>
                        <div className="p-4 border rounded-lg space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                     <Label htmlFor="load-scenario">Load Scenario</Label>
                                     <Select onValueChange={handleLoadScenario} value={activeScenarioName}>
                                        <SelectTrigger id="load-scenario"><SelectValue /></SelectTrigger>
                                        <SelectContent>{Object.keys(scenarios).map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-end gap-2">
                                    <div className="space-y-2 flex-grow">
                                        <Label htmlFor="new-scenario-name">New Scenario Name</Label>
                                        <Input id="new-scenario-name" placeholder="e.g., Aggressive Growth" value={newScenarioName} onChange={e => setNewScenarioName(e.target.value)} />
                                    </div>
                                    <Button type="button" onClick={handleSaveNewScenario} variant="outline" disabled={!newScenarioName}><Copy className="mr-2"/> Save As New</Button>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button type="button" onClick={handleUpdateScenario}><Save className="mr-2"/> Update "{activeScenarioName}"</Button>
                                <Button type="button" onClick={handleDeleteScenario} variant="destructive" disabled={activeScenarioName === 'Default' || Object.keys(scenarios).length <= 1}><Trash2 className="mr-2"/> Delete</Button>
                                <Button type="button" variant="outline" onClick={handleReset}><RotateCcw className="mr-2"/> Reset Form</Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    {salesRoleGroups.map(group => (
                        <Card key={group.role}>
                            <CardHeader>
                                <CardTitle className="text-xl">{group.role}</CardTitle>
                                {group.description && <CardDescription>{group.description}</CardDescription>}
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[250px] sticky left-0 bg-background z-10">Target Metric</TableHead>
                                                {monthHeaders.map(header => (
                                                    <TableHead key={header} className="w-[120px] text-center">{header}</TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {group.assumptions.map((assumption) => (
                                                <TableRow key={assumption.id} className="border-b-0">
                                                    <TableCell className="font-medium sticky left-0 bg-background z-10">{assumption.label}</TableCell>
                                                    {monthHeaders.map((_, monthIndex) => (
                                                        <TableCell key={`${assumption.id}-${monthIndex}`}>
                                                           {assumption.label === 'Initial # of Members' && monthIndex > 0 ? null : (
                                                                <Controller
                                                                    name={`monthlyAssumptions.${assumption.id}.${monthIndex}`}
                                                                    control={control}
                                                                    render={({ field }) => (
                                                                        <Input
                                                                            type="number"
                                                                            className="h-8 w-24 text-center"
                                                                            value={field.value ?? ''}
                                                                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                                                        />
                                                                    )}
                                                                />
                                                           )}
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
                    ))}
                </div>

                <div className="mt-8 flex justify-end">
                    <Button type="submit">
                        <Save className="mr-2 h-4 w-4" />
                        Save & View Projection
                    </Button>
                </div>
            </form>
        </Form>
    );
}


export default function SalesRoadmap() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-[calc(100vh-8rem)]"><Loader2 className="h-16 w-16 animate-spin" /></div>}>
            <SalesRoadmapComponent />
        </Suspense>
    );
}

    