'use client';

import * as React from 'react';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, Users, Star, Zap, TrendingUp, PieChart } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { Badge } from '@/components/ui/badge';
import { getClientSideAuthToken } from '@/firebase';
import { cn, formatDateSafe } from '@/lib/utils';
import MemberActionMenu from './member-action-menu';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Member {
    id: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
    membershipId?: string;
    status?: 'active' | 'suspended' | 'pending' | 'invited' | 'qualified';
    createdAt?: string;
    email?: string;
    leadId?: string;
    source?: string;
    provisional?: boolean;
    rewardPoints?: number;
}

const tierColors: { [key: string]: string } = {
  free: 'bg-slate-100 text-slate-700',
  basic: 'bg-blue-100 text-blue-700',
  standard: 'bg-green-100 text-green-700',
  premium: 'bg-purple-100 text-purple-700',
  enterprise: 'bg-amber-100 text-amber-700',
};

async function fetchFromAdminAPI(token: string, action: string, payload?: any) {
    const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, payload }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
        throw new Error(result.error || `API Error for action: ${action}`);
    }
    return result;
}

export default function MembersList() {
    const [members, setMembers] = useState<Member[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const forceRefresh = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");
            const result = await fetchFromAdminAPI(token, 'getMembers');
            setMembers(result.data || []);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { forceRefresh(); }, [forceRefresh]);

    const columns: ColumnDef<Member>[] = useMemo(() => [
        {
          accessorKey: 'companyName',
          header: 'Member / Entity',
          cell: ({ row }) => (
            <div className="flex flex-col text-left text-foreground">
              <p className="font-bold text-sm text-left">{row.original.companyName}</p>
              <p className="text-xs text-muted-foreground text-left">{row.original.firstName} {row.original.lastName}</p>
            </div>
          )
        },
        {
          accessorKey: 'membershipId',
          header: 'Current Plan',
          cell: ({ row }) => {
              const plan = row.original.membershipId?.toLowerCase() || 'free';
              const isPaid = plan !== 'free';
              return (
                <div className="flex items-center gap-2">
                    <Badge className={cn("capitalize text-[10px] font-bold border-none", tierColors[plan] || 'bg-slate-100')}>
                        {isPaid && <Star className="mr-1 h-3 w-3 fill-current" />}
                        {row.original.membershipId || 'Free'}
                    </Badge>
                </div>
              );
          },
        },
        {
            accessorKey: 'rewardPoints',
            header: 'Engagement',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Zap className={cn("h-4 w-4", (row.original.rewardPoints || 0) > 0 ? "text-amber-500 fill-amber-500" : "text-muted-foreground")} />
                    <span className="font-mono text-sm font-semibold">{row.original.rewardPoints || 0} pts</span>
                </div>
            )
        },
        {
          accessorKey: 'source',
          header: 'Origin',
          cell: ({ row }) => (
              <Badge variant="outline" className="text-[10px] uppercase font-bold text-muted-foreground">
                  {row.original.source?.includes('AI') ? 'AI Funnel' : 'Direct'}
              </Badge>
          )
        },
        {
          accessorKey: 'createdAt',
          header: 'Member Since',
          cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDateSafe(row.original.createdAt)}</span>
        },
        {
            id: 'actions',
            header: <div className="text-right">Manage Success</div>,
            cell: ({ row }) => (
                <div className="text-right">
                    <Button variant="ghost" size="sm" asChild className="mr-1">
                        <Link href={`/backend?view=wallet&memberId=${row.original.id}`}><TrendingUp className="mr-2 h-3.5 w-3.5 text-primary"/>Upsell</Link>
                    </Button>
                    <MemberActionMenu member={row.original} onUpdate={forceRefresh} />
                </div>
            )
        }
    ], [forceRefresh]);


    return (
        <Card className="text-left text-foreground">
            <CardHeader className="flex flex-row items-center justify-between text-left">
                <div>
                    <CardTitle className="flex items-center gap-2 text-left"><Users /> Member Registry</CardTitle>
                    <CardDescription className="text-left">
                        Managing lifecycle and success for {members.length} registered entities.
                    </CardDescription>
                </div>
                 <Button asChild variant="outline" size="sm">
                    <Link href="/backend?view=success-engine">
                        <PieChart className="mr-2 h-4 w-4" /> View Conversion Funnel
                    </Link>
                </Button>
            </CardHeader>
            <CardContent className="text-left text-foreground">
                 {isLoading ? <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div> : (
                    <DataTable columns={columns} data={members || []} />
                 )}
            </CardContent>
        </Card>
    );
}