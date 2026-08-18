'use client';

import { useUser, useFirestore, useDoc, getClientSideAuthToken } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Gem, Loader2, HeartHandshake, ArrowRight, Sparkles, Wallet, ShieldAlert, Star, CheckCircle, ShieldCheck, Landmark, Globe, Zap, Link as LinkIcon, Copy, Lock, Truck, ImageIcon, ExternalLink, Clock, CheckCircle2 } from "lucide-react";
import { doc, collection, query, limit, where } from 'firebase/firestore';
import Link from 'next/link';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { cn, formatCurrency } from '@/lib/utils';
import { useMemoFirebase, useCollection } from '@/firebase';
import { useConfig } from '@/hooks/use-config';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

async function fetchFromAdminAPI(token: string, action: string, payload?: any) {
    const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
        cache: 'no-store'
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
        throw new Error(result.error || `API Error for action: ${action}`);
    }
    return result;
}

export default function AdminDashboardContent() {
    const { user, isUserLoading } = useUser();
    const [leads, setLeads] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Stabilize UID for dependency array to prevent loop
    const uid = user?.uid;

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const token = await getClientSideAuthToken();
            if (!token) {
                setIsLoading(false);
                return;
            }
            
            // Capped read for dashboard stats
            const [leadsRes, membersRes] = await Promise.all([
                fetchFromAdminAPI(token, 'searchRegistry', { type: 'all' }).catch(() => ({ data: [] })),
                fetchFromAdminAPI(token, 'getMembers').catch(() => ({ data: [] }))
            ]);
            
            setLeads(leadsRes.data || []);
            setCompanies(membersRes.data || []);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isUserLoading && uid) {
            loadData();
        }
    }, [isUserLoading, uid, loadData]);

    const funnelData = useMemo(() => {
        const total = leads.length;
        const reached = leads.filter(l => ['contacted', 'invited', 'active', 'qualified'].includes(l.status)).length;
        const converted = companies.filter(c => c.leadId).length;
        const paying = companies.filter(c => c.leadId && c.membershipId && c.membershipId !== 'free').length;

        return [
            { stage: 'Leads Discovered', count: total, color: 'hsl(var(--muted))' },
            { stage: 'Qualified/Outreached', count: reached, color: 'hsl(var(--primary))', opacity: 0.6 },
            { stage: 'Registered Members', count: converted, color: 'hsl(var(--primary))', opacity: 0.8 },
            { stage: 'Paying Intelligence', count: paying, color: 'hsl(var(--primary))', opacity: 1 },
        ];
    }, [leads, companies]);

    if (isLoading) return <div className="flex justify-center p-20 text-center text-foreground"><Loader2 className="animate-spin h-10 w-10 text-primary mx-auto" /><p className="mt-4 font-bold uppercase text-[10px] tracking-widest text-muted-foreground text-center">Mapping Stats...</p></div>;

    return (
        <div className="space-y-8 text-left text-foreground">
            <div className="flex justify-between items-end text-left">
                <div className="text-left">
                    <h1 className="text-2xl font-bold font-headline text-left">Platform Intelligence</h1>
                    <p className="text-muted-foreground text-left">Flow analysis from Discovery to Paying Membership.</p>
                </div>
                <Button variant="outline" onClick={loadData} size="sm"><Clock className="mr-2 h-4 w-4"/> Refresh</Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 text-left">
                {funnelData.map((stage, idx) => (
                    <Card key={stage.stage} className="relative overflow-hidden text-left bg-white">
                        <CardHeader className="pb-2 text-left text-foreground">
                            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-left">{stage.stage}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-left">
                            <div className="text-3xl font-black text-left">{stage.count}</div>
                            {idx > 0 && funnelData[idx-1].count > 0 && (
                                <p className="text-[10px] font-bold text-green-600 mt-1 uppercase text-left">
                                    {((stage.count / funnelData[idx-1].count) * 100).toFixed(1)}% Yield
                                </p>
                            )}
                        </CardContent>
                        <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: stage.color, opacity: stage.opacity }} />
                    </Card>
                ))}
            </div>
        </div>
    );
}
