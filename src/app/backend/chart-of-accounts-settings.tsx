'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Book } from 'lucide-react';

type Account = { series: string; code: string; name: string };

const finalizedAccounts: Account[] = [
    // 4000 Series: Core Membership & Subscription Revenue
    { series: '4000: Core Membership & Subscription Revenue', code: '4010', name: 'Basic Membership Fees' },
    { series: '4000: Core Membership & Subscription Revenue', code: '4020', name: 'Standard Membership Fees' },
    { series: '4000: Core Membership & Subscription Revenue', code: '4030', name: 'Premium Membership Fees' },
    { series: '4000: Core Membership & Subscription Revenue', code: '4110', name: 'Loyalty Plan Subscription Fees' },
    { series: '4000: Core Membership & Subscription Revenue', code: '4120', name: 'Actions Plan Subscription Fees' },
    { series: '4000: Core Membership & Subscription Revenue', code: '4130', name: 'Rewards Plan Subscription Fees' },

    // 4200 Series: Mall Commission Revenue
    { series: '4200: Mall Commission Revenue', code: '4210', name: 'Finance Mall (Successful Match Commission)' },
    { series: '4200: Mall Commission Revenue', code: '4220', name: 'Supplier Mall (Transaction Commission)' },
    { series: '4200: Mall Commission Revenue', code: '4230', name: 'Transporter Mall (Subcontracting Commission)' },
    { series: '4200: Mall Commission Revenue', code: '4240', name: 'Buy & Sell Mall (Sales Commission)' },
    { series: '4200: Mall Commission Revenue', code: '4250', name: 'Distribution Mall (Partnership Commission)' },
    { series: '4200: Mall Commission Revenue', code: '4260', name: 'Warehouse Mall (Booking Commission)' },
    { series: '4200: Mall Commission Revenue', code: '4270', name: 'Repurpose Mall (Sales Commission)' },

    // 4300 Series: Marketplace Product Revenue
    { series: '4300: Marketplace Product Revenue', code: '4310', name: 'Resold Partner Services (Gross Revenue)' },

    // 4400 Series: Tech & SaaS Revenue
    { series: '4400: Tech & SaaS Revenue', code: '4410', name: 'Wallet Transaction Fees (SaaS)' },
    
    // 7000 Series: Operating Expenses
    { series: '7000: Operating Expenses', code: '7010', name: 'Bank Charges' },
    { series: '7000: Operating Expenses', code: '7020', name: 'Software & Subscriptions' },
    { series: '7000: Operating Expenses', code: '7030', name: 'Consulting & Professional Fees' },
    { series: '7000: Operating Expenses', code: '7040', name: 'Marketing & Advertising' },
    { series: '7000: Operating Expenses', code: '7050', name: 'General & Administrative' },

    // 8000 Series: Adjustments & Reversals
    { series: '8000: Adjustments & Reversals', code: '8010', name: 'Wallet Adjustment (Manual)' },
    { series: '8000: Adjustments & Reversals', code: '8020', name: 'Transaction Reversal' },
];


export default function ChartOfAccountsSettings() {
  
  const groupedAccounts = finalizedAccounts.reduce((acc, account) => {
    (acc[account.series] = acc[account.series] || []).push(account);
    return acc;
  }, {} as Record<string, Account[]>);


  return (
    <Card className="w-full max-w-4xl">
        <CardHeader>
            <div className="flex items-center gap-4">
                <Book className="h-8 w-8 text-primary"/>
                <div>
                    <CardTitle>Finalized Chart of Accounts</CardTitle>
                    <CardDescription>
                        Below are the defined income and expense streams for transaction reconciliation.
                    </CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[150px]">Account Code</TableHead>
                            <TableHead>Account Name</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Object.entries(groupedAccounts).map(([series, accounts]) => (
                            <React.Fragment key={series}>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={2} className="font-bold text-primary">{series}</TableCell>
                                </TableRow>
                                {accounts.map((acc) => (
                                     <TableRow key={acc.code}>
                                        <TableCell className="font-mono pl-8">{acc.code}</TableCell>
                                        <TableCell className="font-medium">{acc.name}</TableCell>
                                    </TableRow>
                                ))}
                            </React.Fragment>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
    </Card>
  );
}
