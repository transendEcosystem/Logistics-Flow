
'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Users, RotateCcw, Save } from 'lucide-react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Form } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SALARY_ASSUMPTIONS_KEY = 'backendSalaryAssumptions_v1';
const BUDGET_ASSUMPTIONS_KEY = 'backendBudgetAssumptions_v3';

const generateDefaultSalaries = (forecastMonths: number) => {
    const roles = [
        { role: 'Executive Director', count: 1, salary: 150000 },
        { role: 'Non-Executive Director', count: 2, salary: 25000 },
        { role: 'Manager', count: 3, salary: 75000 },
        { role: 'Admin', count: 4, salary: 35000 },
    ];
    return roles.map(roleData => ({
        ...roleData,
        monthlyHeadcount: Array(forecastMonths).fill(roleData.count),
        monthlySalary: Array(forecastMonths).fill(roleData.salary)
    }));
};


function SalaryForecastContent() {
    const router = useRouter();
    const { toast } = useToast();
    const [forecastMonths, setForecastMonths] = useState(36);
    const [startMonth, setStartMonth] = useState(new Date().getMonth());
    const [startYear, setStartYear] = useState(new Date().getFullYear());


    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedBudgetData = localStorage.getItem(BUDGET_ASSUMPTIONS_KEY);
            if (savedBudgetData) {
                const parsed = JSON.parse(savedBudgetData);
                setForecastMonths(parsed.forecastMonths || 36);
                setStartMonth(parsed.startMonth || new Date().getMonth());
                setStartYear(parsed.startYear || new Date().getFullYear());
            }
        }
    }, []);

    const defaultValues = { opexSalaries: generateDefaultSalaries(forecastMonths) };

    const form = useForm({
        defaultValues: useCallback(() => {
            if (typeof window === 'undefined') {
                return defaultValues;
            }
            try {
                const savedData = localStorage.getItem(SALARY_ASSUMPTIONS_KEY);
                if (savedData) {
                    const parsed = JSON.parse(savedData);
                    const savedMonths = parsed.opexSalaries[0]?.monthlyHeadcount?.length || forecastMonths;
                    if (savedMonths !== forecastMonths) {
                         // If months differ, regenerate defaults with new length but keep other data if possible
                        return { opexSalaries: generateDefaultSalaries(forecastMonths) };
                    }
                    return parsed;
                }
            } catch (e) {
                console.error("Failed to parse saved salary data, using defaults.", e);
            }
            return defaultValues;
        }, [forecastMonths, defaultValues])()
    });
    
    const { control, handleSubmit, reset } = form;

    const { fields: staffFields } = useFieldArray({
        control,
        name: "opexSalaries"
    });

    const monthHeaders = Array.from({ length: forecastMonths }, (_, i) => {
        const date = new Date(startYear, startMonth + i);
        return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    });
    
    const onSubmit = (data: any) => {
        localStorage.setItem(SALARY_ASSUMPTIONS_KEY, JSON.stringify(data));
        toast({
            title: "Salary Forecast Saved!",
            description: "Your monthly headcount and salary assumptions have been saved locally.",
        });
        router.push(`/backend?view=forecast`);
    };
    
    const handleReset = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(SALARY_ASSUMPTIONS_KEY);
        }
        reset(defaultValues);
        toast({
            title: 'Salary Forecast Reset',
            description: 'Assumptions have been reset to their default values.',
        });
    }

    return (
        <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader className="flex flex-row justify-between items-start">
                        <div>
                            <CardTitle className="flex items-center gap-2"><Users /> Monthly Headcount & Salary Forecast</CardTitle>
                            <CardDescription>Enter the planned number of staff and their average monthly salary for each month of the forecast. This data is saved locally.</CardDescription>
                        </div>
                        <Button type="button" variant="outline" onClick={handleReset}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Reset to Defaults
                        </Button>
                    </CardHeader>
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
                                {staffFields.map((item: any, index: number) => (
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
                        Save Salary Forecast
                    </Button>
                </div>
            </form>
        </Form>
    );
}

export default function SalaryForecastPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-[calc(100vh-8rem)]"><Loader2 className="h-16 w-16 animate-spin" /></div>}>
            <SalaryForecastContent />
        </Suspense>
    );
}
