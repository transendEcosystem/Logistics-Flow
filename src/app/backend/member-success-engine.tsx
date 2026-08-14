
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, Zap, ArrowRight, MessageSquare } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@/hooks/use-data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getClientSideAuthToken } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';

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
    return result.data;
}

function Progress({ value, className }: { value: number; className?: string }) {
    return (
        <div className={cn("w-full bg-muted rounded-full overflow-hidden", className)}>
            <div className="bg-primary h-full transition-all" style={{ width: `${value}%` }} />
        </div>
    );
}

export default function MemberSuccessEngine() {
    const { toast } = useToast();
    const [members, setMembers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;
            const data = await fetchFromAdminAPI(token, 'getMembers');
            setMembers(data || []);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Fetch Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => { loadData(); }, [loadData]);

    const candidates = useMemo(() => {
        return members.filter(m => m.membershipId === 'free' || !m.membershipId)
            .map(m => {
                let score = 0;
                if (m.rewardPoints > 50) score += 20;
                if (m.rewardPoints > 200) score += 30;
                if (m.shopId) score += 25;
                if (m.loadBoardId) score += 25;
                
                return { ...m, engagementScore: score };
            })
            .sort((a, b) => b.engagementScore - a.engagementScore);
    }, [members]);

    const columns: ColumnDef<any>[] = [
        {
            header: 'Member Entity',
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-bold">{row.original.companyName}</span>
                    <span className="text-xs text-muted-foreground">{row.original.firstName} {row.original.lastName}</span>
                </div>
            )
        },
        {
            accessorKey: 'rewardPoints',
            header: 'Points',
            cell: ({ row }) => <div className="font-mono font-bold text-primary">{row.original.rewardPoints || 0}</div>
        },
        {
            accessorKey: 'engagementScore',
            header: 'Engagement Score',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Progress value={row.original.engagementScore} className="h-2 w-16" />
                    <span className="text-xs font-bold">{row.original.engagementScore}%</span>
                </div>
            )
        },
        {
            header: 'Milestones',
            cell: ({ row }) => (
                <div className="flex gap-1">
                    {row.original.shopId && <Badge variant="outline" className="bg-green-50 text-green-700">Shop</Badge>}
                    {row.original.loadBoardId && <Badge variant="outline" className="bg-blue-50 text-blue-700">Loads</Badge>}
                    {row.original.rewardPoints > 0 && <Badge variant="outline" className="bg-amber-50 text-amber-700">Contributor</Badge>}
                </div>
            )
        },
        {
            id: 'actions',
            header: <div className="text-right">Manage Engagement</div>,
            cell: ({ row }) => (
                <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" asChild title="Chat with Member">
                        <Link href={`/backend?view=support-inbox&search=${row.original.id}`}><MessageSquare className="mr-2 h-3.5 w-3.5" /> Support</Link>
                    </Button>
                    <Button size="sm" asChild variant="secondary">
                        <Link href={`/backend?view=wallet&memberId=${row.original.id}`}><ArrowRight className="mr-2 h-3.5 w-3.5" /> View Member</Link>
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-8">
            <CardHeader className="px-0">
                <div className="flex items-center gap-4">
                    <Zap className="h-8 w-8 text-primary" />
                    <div>
                        <CardTitle>Member Success & Growth Engine</CardTitle>
                        <CardDescription>Identifying high-engagement Free members. Use the support chat to invite them to a paid plan.</CardDescription>
                    </div>
                </div>
            </CardHeader>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">High Intent Members</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-black">{candidates.filter(c => c.engagementScore >= 50).length}</div></CardContent>
                </Card>
                <Card className="bg-amber-50 border-amber-200">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Avg. Engagement</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-black text-amber-700">{candidates.length > 0 ? (candidates.reduce((s, c) => s + c.engagementScore, 0) / candidates.length).toFixed(0) : 0}%</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Expansion Upside</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-black text-primary">R {(candidates.length * 250).toLocaleString()}</div><p className="text-[10px] text-muted-foreground">Est. MRR @ R250/mo base</p></CardContent>
                </Card>
            </div>

            <Card>
                <CardContent className="pt-6">
                    {isLoading ? <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div> : <DataTable columns={columns} data={candidates} />}
                </CardContent>
            </Card>
        </div>
    );
}
