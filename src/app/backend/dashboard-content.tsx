'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Store, Handshake, TrendingUp, Zap, CheckCircle2, Clock, Users, ArrowRight, PackageCheck, Star, PieChart } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getClientSideAuthToken, useUser } from '@/firebase';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, Cell, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Separator } from '@/components/ui/separator';

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

const StatCard = ({ title, value, icon, link, linkText, trend }: { title: string, value: string | number, icon: React.ReactNode, link: string, linkText: string, trend?: string }) => (
    <Card className="text-left">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 text-left">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent className="text-left">
            <div className="text-2xl font-bold">{value}</div>
            {trend && <p className="text-xs text-green-600 mt-1">{trend}</p>}
        </CardContent>
        <CardFooter className="text-left">
             <Button asChild variant="outline" size="sm" className="w-full text-left">
                <Link href={link}>{linkText} <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
        </CardFooter>
    </Card>
);

export default function AdminDashboardContent() {
    const [members, setMembers] = useState<any[]>([]);
    const [contributions, setContributions] = useState<any[]>([]);
    const [shops, setShops] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();
    const { user } = useUser();
    
    // QUOTA GUARD: Prevent redundant sync during prototype sessions
    const hasFetched = useRef(false);

    const loadDashboardData = useCallback(async () => {
        if (hasFetched.current) return;
        setIsLoading(true);
        setError(null);
        try {
            const token = await getClientSideAuthToken();
            if (!token) {
                setIsLoading(false);
                return;
            }

            const [mData, cData, sData] = await Promise.all([
                fetchFromAdminAPI(token, 'getMembers').then(r => r.data || []).catch(() => []),
                fetchFromAdminAPI(token, 'getContributions').then(r => r.data || []).catch(() => []),
                fetchFromAdminAPI(token, 'getShops').then(r => r.data || []).catch(() => [])
            ]);
            
            setMembers(mData);
            setContributions(cData);
            setShops(sData);
            hasFetched.current = true;

        } catch (e: any) {
            setError(e.message);
            if (!e.message?.includes('PERMISSION_DENIED')) {
                toast({ variant: "destructive", title: "Dashboard Notice", description: e.message });
            }
        } finally {
            setIsLoading(false);
        }
    }, [toast]); 

    useEffect(() => {
        if (user) loadDashboardData();
    }, [user, loadDashboardData]);

    const stats = useMemo(() => {
        const total = members.length;
        const paid = members.filter(m => m.membershipId && m.membershipId !== 'free').length;
        const contributors = new Set(contributions.map(c => c.companyId)).size;
        const shopOwners = new Set(shops.filter(s => s.status === 'approved').map(s => s.companyId)).size;

        return {
            total,
            paid,
            paidPercent: total > 0 ? ((paid / total) * 100).toFixed(1) : 0,
            contributors,
            contributorPercent: total > 0 ? ((contributors / total) * 100).toFixed(1) : 0,
            shopOwners,
            shopOwnerPercent: total > 0 ? ((shopOwners / total) * 100).toFixed(1) : 0
        };
    }, [members, contributions, shops]);

    const successFunnel = [
        { stage: 'Total Members', count: stats.total, color: 'hsl(var(--muted))' },
        { stage: 'Contributors', count: stats.contributors, color: 'hsl(var(--primary))', opacity: 0.6 },
        { stage: 'Paid Members', count: stats.paid, color: 'hsl(var(--primary))', opacity: 0.8 },
        { stage: 'Shop Owners', count: stats.shopOwners, color: 'hsl(var(--primary))', opacity: 1 },
    ];

    if (isLoading) return <div className="flex justify-center p-20 text-center"><Loader2 className="animate-spin h-10 w-10 text-primary mx-auto" /><p className="mt-2 text-xs font-bold uppercase tracking-widest text-muted-foreground text-center">Syncing Registry...</p></div>;

    return (
        <div className="space-y-8 text-left text-foreground">
            <div className="flex justify-between items-end text-left text-foreground">
                <div className="text-left text-foreground">
                    <h1 className="text-2xl font-bold font-headline text-left">Platform Intelligence Dashboard</h1>
                    <p className="text-muted-foreground text-left">Monitoring member engagement and forensic yield distribution.</p>
                </div>
                <Button variant="outline" onClick={() => { hasFetched.current = false; loadDashboardData(); }} size="sm" className="text-foreground"><Clock className="mr-2 h-4 w-4"/> Sync Metrics</Button>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 text-left text-foreground">
                <StatCard 
                    title="Active Members"
                    value={stats.total}
                    icon={<Users className="h-4 w-4 text-muted-foreground" />}
                    link="/backend?view=members"
                    linkText="View Roster"
               />
               <StatCard 
                    title="Paid Conversion"
                    value={`${stats.paidPercent}%`}
                    trend={`${stats.paid} active plans`}
                    icon={<Star className="h-4 w-4 text-amber-500" />}
                    link="/backend?view=success-engine"
                    linkText="Drive Upgrades"
               />
                <StatCard 
                    title="Data Contributors"
                    value={`${stats.contributorPercent}%`}
                    trend={`${stats.contributors} entities`}
                    icon={<PackageCheck className="h-4 w-4 text-muted-foreground" />}
                    link="/backend?view=contributions"
                    linkText="Review Data"
               />
                <StatCard 
                    title="Verified Nodes"
                    value={stats.shopOwners}
                    icon={<Store className="h-4 w-4 text-muted-foreground" />}
                    link="/backend?view=supplier-mall"
                    linkText="Review Shops"
               />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left text-foreground">
                <Card className="lg:col-span-2 shadow-sm border-primary/10 text-left text-foreground">
                    <CardHeader className="text-left text-foreground">
                        <CardTitle className="flex items-center gap-2 text-xl text-left text-foreground"><TrendingUp className="h-5 w-5 text-primary"/> Member Success Funnel</CardTitle>
                        <CardDescription className="text-left text-foreground">Tracking progression from free entry to ecosystem participation.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-80 text-left text-foreground">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={successFunnel} layout="vertical" margin={{ left: 40, right: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="stage" type="category" width={150} tick={{ fontSize: 11, fontWeight: 'bold' }} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                    {successFunnel.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={entry.opacity || 1} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-primary/10 text-left text-foreground">
                    <CardHeader className="text-left text-foreground">
                        <CardTitle className="flex items-center gap-2 text-left text-foreground"><Zap className="h-5 w-5 text-amber-500"/> Growth Insights</CardTitle>
                        <CardDescription className="text-left text-foreground">Candidates ready for intelligence upgrades.</CardDescription>
                    </CardHeader>
                    <CardContent className="text-left text-foreground">
                        <div className="space-y-6 text-left text-foreground">
                            <div className="space-y-4 text-left text-foreground">
                                <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest text-left">High Engagement (Free)</h4>
                                {members.filter(m => m.membershipId === 'free' && (m.rewardPoints || 0) > 100).slice(0, 3).map(m => (
                                    <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 text-left">
                                        <div className="bg-amber-100 p-1.5 rounded-full"><TrendingUp className="h-4 w-4 text-amber-600" /></div>
                                        <div className="flex-1 min-w-0 text-left">
                                            <p className="text-sm font-bold truncate text-left">{m.companyName}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase text-left">{m.rewardPoints || 0} pts • Potential Lead</p>
                                        </div>
                                    </div>
                                ))}
                                {members.filter(m => m.membershipId === 'free' && (m.rewardPoints || 0) > 100).length === 0 && (
                                    <p className="text-xs text-center text-muted-foreground py-4 italic">No high-engagement leads detected.</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="text-left text-foreground">
                        <Button variant="ghost" className="w-full text-[10px] uppercase font-bold tracking-widest text-left" asChild>
                            <Link href="/backend?view=success-engine">Launch Success Engine <ArrowRight className="ml-2 h-3 w-3"/></Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
