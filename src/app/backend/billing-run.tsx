
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Loader2, PlayCircle, Calendar as CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getClientSideAuthToken } from '@/firebase';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';
import { Label } from '@/components/ui/label';

interface BillingResult {
    createdCount: number;
    checkedCount: number;
    errors: string[];
}

export default function BillingRun() {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<BillingResult | null>(null);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: new Date(),
        to: addDays(new Date(), 30),
    });
    const { toast } = useToast();

    const handleRunBilling = async () => {
        if (!dateRange?.from || !dateRange?.to) {
            toast({
                variant: 'destructive',
                title: 'Date Range Required',
                description: 'Please select a start and end date for the billing run.',
            });
            return;
        }

        setIsLoading(true);
        setResult(null);

        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication token not found.");
            
            const response = await fetch('/api/run-billing', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    startDate: dateRange.from.toISOString(),
                    endDate: dateRange.to.toISOString(),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to run billing job.');
            }
            
            const finalResult = {
                ...data,
                errors: data.errors || [],
            };

            setResult(finalResult);
            toast({
                title: 'Billing Run Complete',
                description: data.message,
            });

        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Billing Run Failed',
                description: error.message,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Recurring Membership Billing</CardTitle>
                <CardDescription>Manually trigger the process to create payable invoices for all members whose subscription is due within a specific date range.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="grid gap-2">
                        <Label>Billing Period</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                "w-[300px] justify-start text-left font-normal",
                                !dateRange && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (
                                dateRange.to ? (
                                    <>
                                    {format(dateRange.from, "LLL dd, y")} -{" "}
                                    {format(dateRange.to, "LLL dd, y")}
                                    </>
                                ) : (
                                    format(dateRange.from, "LLL dd, y")
                                )
                                ) : (
                                <span>Pick a date range</span>
                                )}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={setDateRange}
                                numberOfMonths={2}
                            />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <Button onClick={handleRunBilling} disabled={isLoading || !dateRange?.from || !dateRange?.to} className="w-full sm:w-auto">
                        {isLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <PlayCircle className="mr-2 h-4 w-4" />
                        )}
                        Generate Invoices
                    </Button>
                </div>
            </CardContent>
            {result && (
                <CardFooter className="flex-col items-start gap-4 text-sm">
                    <h3 className="font-semibold text-base">Billing Run Summary</h3>
                    <div className="p-4 bg-muted/50 rounded-lg w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="font-medium">Members Checked</p>
                            <p className="text-xl font-bold">{result.checkedCount}</p>
                        </div>
                        <div>
                            <p className="font-medium text-green-600">Invoices Created</p>
                            <p className="text-xl font-bold text-green-600">{result.createdCount}</p>
                        </div>
                    </div>
                    {result.errors && result.errors.length > 0 && (
                        <div className="w-full">
                            <h4 className="font-semibold text-destructive">Errors Encountered ({result.errors.length}):</h4>
                             <ul className="list-disc list-inside mt-2 text-xs text-destructive bg-destructive/10 p-3 rounded-md">
                                {result.errors.map((err, i) => (
                                    <li key={i} className="font-mono">{err}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </CardFooter>
            )}
        </Card>
    );
}
