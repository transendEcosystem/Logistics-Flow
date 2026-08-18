
'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TrendingUp, DollarSign, Users, Percent, Loader2, Save, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SETUP_KEY = 'accountFinancialSetup_v1';
const BUDGET_KEY = 'accountBudgetAssumptions_v2';

const assumptionGroups = {
    revenue: [
        { id: 'membershipFees', label: 'Avg. Membership Fee', defaultValue: 250 },
        { id: 'connectPlanAdoptionRate', label: 'Connect Plan Adoption (%)', defaultValue: 15 },
        { id: 'avgConnectPlanFee', label: 'Avg. Connect Plan Fee', defaultValue: 50 },
        { id: 'mallCommissionRate', label: 'Mall Commission (%)', defaultValue: 2.5 },
        { id: 'avgMallSpendPerMember', label: 'Avg. Mall Spend / Member', defaultValue: 1000 },
        { id: 'techServicesAdoptionRate', label: 'Tech Services Adoption (%)', defaultValue: 10 },
        { id: 'avgTechSpendPerMember', label: 'Avg. Tech Spend / Member', defaultValue: 150 },
        { id: 'avgWalletFeesPerMember', label: 'Avg. Wallet Fees / transaction', defaultValue: 25 },
    ],
    cogs: [
        { id: 'isaCommissionRate', label: 'ISA Commission Rate (%)', defaultValue: 20 },
    ],
    opexOther: [
        { id: 'digitalAdvertising', label: 'Digital Advertising', defaultValue: 3000 },
        { id: 'contentCreation', label: 'Content & SEO', defaultValue: 2000 },
        { id: 'eventsAndSponsorships', label: 'Events & Sponsorships', defaultValue: 1000 },
        { id: 'officeRental', label: 'Office Rental', defaultValue: 15000 },
        { id: 'utilities', label: 'Utilities', defaultValue: 1500 },
        { id: 'insurance', label: 'Insurance', defaultValue: 1500 },
        { id: 'legalAndProfessional', label: 'Legal & Professional Fees', defaultValue: 0 },
        { id: 'bankCharges', label: 'Bank Charges', defaultValue: 1500 },
        { id: 'telephone', label: 'Telephone & Comms', defaultValue: 5000 },
        { id: 'travelAndEntertainment', label: 'Travel & Entertainment', defaultValue: 2500 },
        { id: 'platformCosts', label: 'Platform Hosting', defaultValue: 5000 },
        { id: 'softwareLicenses', label: 'Software Licenses', defaultValue: 0 },
    ]
};

const generateDefaultValues = (months: number) => {
    const defaults: any = { budgetInputs: {}, opexSalaries: [] };
    Object.keys(assumptionGroups).forEach(groupKey => {
        const key = groupKey as keyof typeof assumptionGroups;
        defaults.budgetInputs[key] = {};
        assumptionGroups[key].forEach(assumption => {
            defaults.budgetInputs[key][assumption.id] = Array(months).fill(assumption.defaultValue);
        });
    });
     const roles = [
        { role: 'Executive Director', count: 1, salary: 50000 },
        { role: 'Non-Executive Director', count: 0, salary: 25000 },
        { role: 'Manager', count: 0, salary: 75000 },
        { role: 'Admin', count: 0, salary: 35000 }, // Initial count is 0
    ];
    defaults.opexSalaries = roles.map(roleData => {
        let monthlyHeadcount = Array(months).fill(roleData.count);
        // Special case for Admin
        if (roleData.role === 'Admin') {
            monthlyHeadcount = Array(months).fill(0).map((_, i) => (i >= 5 ? 1 : 0)); // 0 for months 1-5, 1 from month 6
        }
        return {
            ...roleData,
            monthlyHeadcount,
            monthlySalary: Array(months).fill(roleData.salary)
        }
    });
    return defaults;
};

type FormValues = {
    budgetInputs: {
        revenue: { [key: string]: number[] };
        cogs: { [key: string]: number[] };
        opexOther: { [key: string]: number[] };
    };
    opexSalaries: {
        role: string;
        count: number;
        salary: number;
        monthlyHeadcount: number[];
        monthlySalary: number[];
    }[];
};


function BudgetPageComponent() {
    const router = useRouter();
    const { toast } = useToast();
    const [forecastMonths, setForecastMonths] = useState<number>(36);
    const [startMonth, setStartMonth] = useState<number>(new Date().getMonth());
    const [startYear, setStartYear] = useState<number>(new Date().getFullYear());
    const [isClient, setIsClient] = useState(false);

    const form = useForm<FormValues>({
        defaultValues: generateDefaultValues(36), // Static defaults for SSR
    });

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
            console.error("Could not parse financial setup settings for budget page.");
        }
        setForecastMonths(localSettings.forecastMonths);
        setStartMonth(localSettings.startMonth);
        setStartYear(localSettings.startYear);
        
        let initialData = generateDefaultValues(localSettings.forecastMonths);
        try {
            const savedData = localStorage.getItem(BUDGET_KEY);
            if (savedData) {
                const parsed = JSON.parse(savedData);
                const firstAssumption = assumptionGroups.revenue[0].id;
                const savedMonths = parsed.budgetInputs?.revenue?.[firstAssumption]?.length || 0;
                if (savedMonths === localSettings.forecastMonths) {
                    initialData = parsed;
                }
            }
        } catch (e) {
            console.error("Failed to parse saved budget data, using defaults.", e);
        }
        form.reset(initialData);
    }, [form]);

    const { control, handleSubmit, reset } = form;

    const { fields: staffFields } = useFieldArray({
        control,
        name: "opexSalaries"
    });
    
    const onSubmit = (data: any) => {
        localStorage.setItem(BUDGET_KEY, JSON.stringify(data));
        
        toast({
            title: "Budget Saved!",
            description: "Your monthly assumptions have been saved. Redirecting to the forecast.",
        });

        router.push(`/account?view=forecast`);
    };

     const handleReset = () => {
        if (forecastMonths === null) return;
        const defaults = generateDefaultValues(forecastMonths);
        reset(defaults);
        toast({
            title: 'Budget Reset',
            description: 'Assumptions have been reset to their default values.',
        });
    };

    if (!isClient) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    }

    const monthHeaders = Array.from({ length: forecastMonths }, (_, i) => {
        const date = new Date(startYear, startMonth + i);
        return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    });

    const renderAssumptionRows = (groupKey: keyof typeof assumptionGroups) => (
        assumptionGroups[groupKey].map((assumption) => (
            <TableRow key={assumption.id}>
                <TableCell className="font-medium sticky left-0 bg-background z-10">{assumption.label}</TableCell>
                {monthHeaders.map((_, monthIndex) => (
                    <TableCell key={`${assumption.id}-${monthIndex}`}>
                        <Controller
                            name={`budgetInputs.${groupKey}.${assumption.id}.${monthIndex}`}
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
        ))
    );

    return (
        <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader className="flex flex-row justify-between items-start">
                        <div>
                            <CardTitle>Budget Assumptions</CardTitle>
                            <CardDescription>Enter your assumptions for each month individually.</CardDescription>
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
                                    <TableRow>
                                        <TableHead className="w-[250px] sticky left-0 bg-background z-10">Assumption</TableHead>
                                        {monthHeaders.map(header => <TableHead key={header} className="w-[120px] text-center">{header}</TableHead>)}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow className="bg-muted/50 font-semibold"><TableCell colSpan={forecastMonths + 1}><DollarSign className="inline h-4 w-4 mr-2"/>Revenue</TableCell></TableRow>
                                    {renderAssumptionRows('revenue')}
                                    <TableRow className="bg-muted/50 font-semibold"><TableCell colSpan={forecastMonths + 1}><Percent className="inline h-4 w-4 mr-2"/>COGS</TableCell></TableRow>
                                    {renderAssumptionRows('cogs')}
                                    <TableRow className="bg-muted/50 font-semibold"><TableCell colSpan={forecastMonths + 1}><Users className="inline h-4 w-4 mr-2"/>Other Operating Expenses</TableCell></TableRow>
                                    {renderAssumptionRows('opexOther')}
                                </TableBody>
                            </Table>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Users />Salaries (Monthly Forecast)</CardTitle><CardDescription>Enter the planned headcount and average monthly salary for each role per month.</CardDescription></CardHeader>
                    <CardContent>
                         <ScrollArea className="w-full whitespace-nowrap rounded-md border mt-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[200px] sticky left-0 bg-background z-10">Role</TableHead>
                                    {monthHeaders.map(header => <TableHead key={header} className="text-center w-40">{header}</TableHead>)}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {staffFields.map((item, index) => (
                                    <React.Fragment key={item.id}>
                                        <TableRow className="border-b-0">
                                            <TableCell className="font-medium sticky left-0 bg-background z-10 align-top pt-5">
                                                {item.role}<br/><span className="text-xs text-muted-foreground font-normal">Headcount</span>
                                            </TableCell>
                                            {monthHeaders.map((_, monthIndex) => (
                                                <TableCell key={`${item.id}-headcount-${monthIndex}`}>
                                                    <Controller
                                                        name={`opexSalaries.${index}.monthlyHeadcount.${monthIndex}`}
                                                        control={control}
                                                        render={({ field }) => (
                                                            <Input type="number" className="h-8 w-24 text-center" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />
                                                        )}
                                                    />
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                         <TableRow>
                                            <TableCell className="font-medium sticky left-0 bg-background z-10 align-top pt-5">
                                                <span className="text-xs text-muted-foreground font-normal">Monthly Salary (ZAR)</span>
                                            </TableCell>
                                            {monthHeaders.map((_, monthIndex) => (
                                                <TableCell key={`${item.id}-salary-${monthIndex}`}>
                                                    <Controller
                                                        name={`opexSalaries.${index}.monthlySalary.${monthIndex}`}
                                                        control={control}
                                                        render={({ field }) => (
                                                            <Input type="number" className="h-8 w-24 text-center" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />
                                                        )}
                                                    />
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </React.Fragment>
                                ))}
                            </TableBody>
                        </Table>
                        <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </CardContent>
                </Card>
                
                <div className="mt-8 flex justify-end">
                    <Button type="submit">
                        <Save className="mr-2 h-4 w-4"/>
                        Save Budget & View Forecast
                    </Button>
                </div>
            </form>
        </Form>
    );
}

export default function BudgetPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-[calc(100vh-8rem)]"><Loader2 className="h-16 w-16 animate-spin" /></div>}>
            <BudgetPageComponent />
        </Suspense>
    );
}
