'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Search, Loader2, Calendar, MapPin, Tag, ArrowRight, Lock, Zap } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { formatDateSafe } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function IntelligenceHistory() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const isAdmin = user && (
        user.email === 'beyondtransport@gmail.com' || 
        user.email === 'mkoton100@gmail.com' || 
        user.email === 'michael@logisticsflow.co.za'
    );

    const searchLogsQuery = useMemoFirebase(() => {
        if (!firestore || !user?.companyId) return null;
        return query(
            collection(firestore, `companies/${user.companyId}/searchLogs`),
            orderBy('timestamp', 'desc'),
            limit(50)
        );
    }, [firestore, user?.companyId]);

    const { data: logs, isLoading: isLogsLoading } = useCollection(searchLogsQuery);

    const isPaid = user?.companyData?.membershipId && user.companyData.membershipId !== 'free';

    if (isUserLoading || isLogsLoading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8 text-left">
            <CardHeader className="px-0">
                <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-xl"><Search className="h-6 w-6 text-primary" /></div>
                    <div className="text-left">
                        <CardTitle className="text-2xl font-black font-headline">Intelligence Search History</CardTitle>
                        <CardDescription>Review your past forensic registry scans and matched results.</CardDescription>
                    </div>
                </div>
            </CardHeader>

            {!isPaid && !isAdmin && (
                <Card className="bg-slate-900 text-white border-none shadow-2xl overflow-hidden">
                    <CardContent className="p-8">
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="flex-1 space-y-4 text-left">
                                <Badge className="bg-primary text-white border-none uppercase tracking-[0.2em] font-black text-[10px]">Registry Limitation</Badge>
                                <h2 className="text-3xl font-black font-headline">Unlock Direct Contacts</h2>
                                <p className="text-slate-300 text-lg">
                                    Your current tier restricts access to direct CEO/MD names, emails, and mobile numbers. Upgrade to Intelligence Access to view all 22,000+ industrial records in full detail.
                                </p>
                                <div className="flex flex-wrap gap-3 pt-2">
                                    <Button asChild size="lg" className="h-12 font-black uppercase text-xs tracking-widest shadow-lg">
                                        <Link href="/checkout/intelligence">Upgrade to Paid Intelligence</Link>
                                    </Button>
                                    <Button asChild variant="outline" size="lg" className="h-12 font-black uppercase text-xs tracking-widest border-white/20 hover:bg-white/10 text-white">
                                        <Link href="/pricing">View All Memberships</Link>
                                    </Button>
                                </div>
                            </div>
                            <div className="hidden lg:block">
                                <div className="bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-sm">
                                    <Lock className="h-16 w-16 text-primary animate-pulse" />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {logs && logs.length > 0 ? (
                <div className="grid gap-6">
                    {logs.map((log: any) => (
                        <Card key={log.id} className="hover:shadow-md transition-shadow group">
                            <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                    <div className="space-y-3 flex-1 text-left">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="capitalize text-[10px] font-black tracking-widest border-primary text-primary">
                                                {log.type} Registry
                                            </Badge>
                                            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                                                <Calendar className="h-3 w-3" /> {formatDateSafe(log.timestamp, "dd MMM yyyy, HH:mm")}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold">
                                            {log.searchTerm ? `Search: "${log.searchTerm}"` : `Scanned Category: ${log.variables?.category || log.variables?.service || 'General'}`}
                                        </h3>
                                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {log.variables?.city || 'National'}, {log.variables?.province || 'South Africa'}</span>
                                            <span className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> {log.variables?.category || log.variables?.service || 'All Classes'}</span>
                                        </div>
                                    </div>
                                    <div className="text-left md:text-right min-w-[150px]">
                                        <p className="text-2xl font-black text-foreground">{log.resultCount}</p>
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">Verified Matches</p>
                                        <Button variant="ghost" size="sm" className="mt-2 text-primary font-bold gap-1 p-0 h-auto" asChild>
                                            <Link href={`/intelligence/${log.type}`}>
                                                Run Again <ArrowRight className="h-3 w-3" />
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="border-dashed border-2 bg-muted/20">
                    <CardContent className="py-20 text-center">
                        <div className="bg-background p-4 rounded-full w-fit mx-auto mb-4 shadow-sm">
                            <Search className="h-10 w-10 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-bold">No searches recorded yet</h3>
                        <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                            Start exploring our forensic registries to find capacity, suppliers, and funding partners.
                        </p>
                        <Button asChild className="mt-8" size="lg">
                            <Link href="/mall">Explore intelligence registries</Link>
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
