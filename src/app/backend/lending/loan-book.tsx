'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Database, AlertTriangle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { generateAmortizationSchedule, type MonthlyPayment } from '@/app/lending/loan-calculations';
import { formatCurrency } from '@/lib/utils';

const LENDING_ASSUMPTIONS_KEY = 'adminLendingAssumptions_v1';

export default function LendingLoanBook() {
    const [assumptions, setAssumptions] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // This effect runs only on the client side after the component mounts
        try {
            const savedData = localStorage.getItem(LENDING_ASSUMPTIONS_KEY);
            if (savedData) {
                setAssumptions(JSON.parse(savedData));
            }
        } catch (e) {
            console.error("Failed to parse lending assumptions:", e);
        }
        setIsLoading(false);
    }, []);

    const loanBookData = useMemo(() => {
        if (!assumptions) return [];

        const { loan, installmentSale, lease, factoring } = assumptions;
        const agreementTypes = [
            { type: 'loan', ...loan },
            { type: 'installmentSale', ...installmentSale },
            { type: 'lease', ...lease },
            { type: 'factoring', ...factoring },
        ];
        
        const allSchedules: { startMonth: number, schedule: MonthlyPayment[] }[] = [];
        const forecastPeriod = 36; // This will now correctly come from assumptions if available

        // 1. Originate all loans and generate their schedules upfront
        for (let i = 0; i < forecastPeriod; i++) { // For each month in the forecast
            for (const agreement of agreementTypes) {
                const dealsToOriginate = agreement.dealsPerMonth || 0;
                
                // If recurring is false, only originate deals in the first month (i=0)
                if (agreement.enabled && dealsToOriginate > 0 && (agreement.recurring || i === 0)) {
                    for (let j = 0; j < dealsToOriginate; j++) {
                        const schedule = generateAmortizationSchedule(
                            agreement.amount || 0,
                            agreement.rate || 0,
                            agreement.term || 0,
                            agreement.firstInstallmentDate,
                            agreement.paymentsInAdvance
                        );
                        if (schedule.length > 0) {
                            allSchedules.push({ startMonth: i, schedule });
                        }
                    }
                }
            }
        }
        
        const projection = [];
        let cumulativePayouts = 0;
        let cumulativeReceiptsCapital = 0;
        let cumulativeReceiptsInterest = 0;
        let outstandingBalance = 0;

        for (let currentMonth = 0; currentMonth < forecastPeriod; currentMonth++) {
            let monthlyPayouts = 0;
            let monthlyReceiptsCapital = 0;
            let monthlyReceiptsInterest = 0;

            for (const scheduledLoan of allSchedules) {
                // If the loan starts this month, its full amount is a payout.
                if (scheduledLoan.startMonth === currentMonth) {
                    monthlyPayouts += scheduledLoan.schedule[0]?.principal + scheduledLoan.schedule[0]?.remainingBalance;
                }
                
                // If the loan is active this month, add its repayments to the monthly totals.
                const monthInLoanLife = currentMonth - scheduledLoan.startMonth;
                if (monthInLoanLife >= 0 && monthInLoanLife < scheduledLoan.schedule.length) {
                    const payment = scheduledLoan.schedule[monthInLoanLife];
                    monthlyReceiptsCapital += payment.principal;
                    monthlyReceiptsInterest += payment.interest;
                }
            }
            
            cumulativePayouts += monthlyPayouts;
            cumulativeReceiptsCapital += monthlyReceiptsCapital;
            cumulativeReceiptsInterest += monthlyReceiptsInterest;
            outstandingBalance += monthlyPayouts - monthlyReceiptsCapital;

            projection.push({
                month: `Month ${currentMonth + 1}`,
                payouts: monthlyPayouts,
                cumulativePayouts,
                receiptsCapital: monthlyReceiptsCapital,
                cumulativeReceiptsCapital,
                receiptsInterest: monthlyReceiptsInterest,
                cumulativeReceiptsInterest,
                outstanding: outstandingBalance,
            });
        }

        return projection;
    }, [assumptions]);
    
     if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!assumptions) {
        return (
             <Card className="w-full max-w-2xl mx-auto">
                <CardHeader className="text-center">
                    <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
                    <CardTitle>Assumption Data Missing</CardTitle>
                    <CardDescription>
                        Please set up and save your assumptions for the lending model before viewing this projection.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                     <Button asChild variant="outline">
                        <Link href="/lending?view=assumptions">Go to Lending Assumptions</Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Database /> Loan Book Projection
                </CardTitle>
                <CardDescription>
                    This projection shows the growth of the loan book based on your saved assumptions.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="border rounded-lg overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Month</TableHead>
                                <TableHead className="text-right">Payouts</TableHead>
                                <TableHead className="text-right">Cum. Payouts</TableHead>
                                <TableHead className="text-right">Receipts (Capital)</TableHead>
                                <TableHead className="text-right">Cum. Receipts (Capital)</TableHead>
                                <TableHead className="text-right">Receipts (Interest)</TableHead>
                                <TableHead className="text-right">Cum. Receipts (Interest)</TableHead>
                                <TableHead className="text-right font-bold text-primary">Outstanding Balance</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loanBookData.map((row, index) => (
                                <TableRow key={index}>
                                    <TableCell>{row.month}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(row.payouts)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(row.cumulativePayouts)}</TableCell>
                                    <TableCell className="text-right text-green-600">{formatCurrency(row.receiptsCapital)}</TableCell>
                                    <TableCell className="text-right text-green-600">{formatCurrency(row.cumulativeReceiptsCapital)}</TableCell>
                                    <TableCell className="text-right text-green-600">{formatCurrency(row.receiptsInterest)}</TableCell>
                                    <TableCell className="text-right text-green-600">{formatCurrency(row.cumulativeReceiptsInterest)}</TableCell>
                                    <TableCell className="text-right font-bold text-primary">{formatCurrency(row.outstanding)}</TableCell>
                                </TableRow>
                            ))}
                             {loanBookData.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                                        No active lending products found in your assumptions.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
