'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Landmark, Loader2, Lock, ArrowRight, ShieldCheck, Banknote, Calendar, BadgeInfo } from 'lucide-react';
import { getClientSideAuthToken, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDateSafe, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PremiumFeaturePrompt } from '@/components/PremiumFeaturePrompt';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

async function performAdminAction(token: string, action: string, payload: any) {
    const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
        cache: 'no-store'
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || `API Error: ${action}`);
    return result;
}

export default function MyFacilitiesContent() {
    const { user, isUserLoading } = useUser();
    const { toast } = useToast();
    const [facilities, setFacilities] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const isPaid = user?.companyData?.membershipId && user.companyData.membershipId !== 'free';
    const isAdmin = user && (
        user.email === 'beyondtransport@gmail.com' || 
        user.email === 'mkoton100@gmail.com' || 
        user.email === 'michael@logisticsflow.co.za'
    );

    const loadFacilities = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token || !user?.companyId) return;

            const result = await performAdminAction(token, 'getMemberFacilities', { 
                companyId: user.companyId 
            });
            setFacilities(result || []);
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Load Error", description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        if (!isUserLoading && user?.companyId) loadFacilities();
    }, [isUserLoading, user, loadFacilities]);

    if (isUserLoading || isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-left">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground text-left">Retrieving Issued Facilities...</p>
            </div>
        );
    }

    if (!isPaid && !isAdmin && facilities.length > 0) {
        return (
            <div className="space-y-8 animate-in fade-in duration-500 text-left text-foreground">
                <CardHeader className="px-0 text-left text-foreground">
                    <div className="flex items-center gap-4 text-left text-foreground">
                        <div className="bg-primary/10 p-3 rounded-xl"><Landmark className="h-6 w-6 text-primary" /></div>
                        <div className="text-left text-foreground">
                            <CardTitle className="text-2xl font-black font-headline text-left text-foreground">My Credit Facilities</CardTitle>
                            <CardDescription className="text-left text-foreground">Review issued funding offers and manage active agreements.</CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <PremiumFeaturePrompt 
                    icon={Lock}
                    title="Issued Facility Restricted"
                    description={`We have identified ${facilities.length} issued funding facility matching your business profile. To view the interest rates, term lengths, and drawdown conditions, you must upgrade your account to Intelligence Access.`}
                />

                <Card className="opacity-50 grayscale pointer-events-none text-left text-foreground">
                    <CardHeader className="text-left text-foreground">
                        <CardTitle className="text-sm uppercase font-black tracking-widest text-muted-foreground text-left">Locked Registry Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="text-left text-foreground">
                        <Table>
                            <TableHeader className="text-left text-foreground">
                                <TableRow className="text-left text-foreground"><TableHead className="text-left">Type</TableHead><TableHead className="text-left text-foreground">Limit</TableHead><TableHead className="text-left text-foreground">Status</TableHead></TableRow>
                            </TableHeader>
                            <TableBody className="text-left text-foreground">
                                {facilities.map((f: any) => (
                                    <TableRow key={f.id} className="text-left text-foreground">
                                        <TableCell><Badge variant="outline" className="blur-sm">XXXXXXX</Badge></TableCell>
                                        <TableCell><span className="blur-sm font-mono text-left">R XX,XXX,XXX</span></TableCell>
                                        <TableCell><Badge className="bg-amber-100 text-amber-700 border-none">Awaiting Upgrade</Badge></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-8 text-left text-foreground">
            <CardHeader className="px-0 text-left text-foreground">
                <div className="flex items-center gap-4 text-left text-foreground">
                    <div className="bg-primary/10 p-3 rounded-xl"><Landmark className="h-6 w-6 text-primary" /></div>
                    <div className="text-left text-foreground">
                        <CardTitle className="text-2xl font-black font-headline text-left text-foreground">My Credit Facilities</CardTitle>
                        <CardDescription className="text-left text-foreground">Manage and draw down from your authorized industrial funding lines.</CardDescription>
                    </div>
                </div>
            </CardHeader>

            {facilities.length > 0 ? (
                <div className="grid gap-6 text-left text-foreground">
                    {facilities.map((f: any) => (
                        <Card key={f.id} className="shadow-lg hover:shadow-xl transition-shadow border-primary/10 overflow-hidden text-left bg-white text-foreground">
                            <CardHeader className="bg-slate-50 border-b text-left text-foreground">
                                <div className="flex justify-between items-center text-left text-foreground">
                                    <div className="flex items-center gap-3 text-left text-foreground">
                                        <div className="bg-primary p-2 rounded-lg text-white shadow-md"><Banknote className="h-5 w-5" /></div>
                                        <div className="text-left text-foreground">
                                            <CardTitle className="text-lg font-bold capitalize text-left">{f.type?.replace(/_/g, ' ')} Facility</CardTitle>
                                            <CardDescription className="text-[10px] font-mono uppercase font-bold text-muted-foreground text-left">ID: {f.id}</CardDescription>
                                        </div>
                                    </div>
                                    <Badge className={cn(
                                        "uppercase font-black text-[10px] tracking-widest",
                                        f.status === 'active' ? "bg-green-600" : "bg-muted text-muted-foreground"
                                    )}>
                                        {f.status}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-8 text-left text-foreground">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left text-foreground">
                                    <div className="space-y-1 text-left text-foreground">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-left">Facility Limit</Label>
                                        <p className="text-3xl font-black text-primary text-left">{formatCurrency(f.limit)}</p>
                                    </div>
                                    <div className="space-y-1 text-left">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-left">Active Drawdown</Label>
                                        <p className="text-2xl font-bold text-left">{formatCurrency(f.currentDrawdown || 0)}</p>
                                    </div>
                                    <div className="space-y-1 text-left">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-left">Available Credit</Label>
                                        <p className="text-2xl font-bold text-green-600 text-left">{formatCurrency(f.limit - (f.currentDrawdown || 0))}</p>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-slate-50 border-t p-4 flex justify-between text-left text-foreground">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground font-bold text-left text-foreground">
                                    <Calendar className="h-3.5 w-3.5" /> Issued: {formatDateSafe(f.createdAt)}
                                </div>
                                <Button size="sm" className="gap-2 font-bold" disabled={f.status !== 'active'}>
                                    Draw Down Capital <ArrowRight className="h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="border-dashed border-2 bg-muted/20 text-left text-foreground">
                    <CardContent className="py-20 text-center space-y-4 text-foreground">
                        <div className="bg-background p-6 rounded-full w-fit mx-auto shadow-sm text-foreground">
                            <Landmark className="h-12 w-12 text-muted-foreground/30" />
                        </div>
                        <h3 className="text-xl font-bold text-center">No Active Facilities Found</h3>
                        <p className="text-muted-foreground max-sm mx-auto text-center">You haven't been issued any funding facilities yet. Start by submitting a forensic application.</p>
                        <Button asChild className="mt-4 font-bold" size="lg">
                            <Link href="/funding">
                                Apply for Funding <ArrowRight className="ml-2 h-4 w-4"/>
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}