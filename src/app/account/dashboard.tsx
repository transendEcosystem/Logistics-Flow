'use client';

import { useUser, getClientSideAuthToken } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Gem, Loader2, Wallet, Star, Search, Lock, UserPlus, Gift, CheckCircle2, ShoppingBasket, PackageSearch, Store, Network } from "lucide-react";
import Link from 'next/link';
import { useMemo, useState, useEffect, useCallback } from 'react';
import EnquiriesCard from './enquiries-card';
import QuotesCard from './quotes-card';
import { cn, formatCurrency, formatDateSafe } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { usePermissions } from '@/hooks/use-permissions';
import { getPrimaryBusinessDomain } from '@/lib/business-domain';
import { useSearchParams } from 'next/navigation';

/**
 * ENGAGEMENT YIELD MODULE
 * Optimized to fetch signals via Admin API to bypass flaky security rules.
 */
function EngagementYieldModule({ companyId, isPaid }: { companyId: string, isPaid: boolean }) {
    const [pings, setPings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadSignals = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token || !companyId) return;

            const response = await fetch('/api/getEngagementPings', {
                headers: { 'Authorization': `Bearer ${token}` },
                cache: 'no-store',
            });
            const result = await response.json();
            if (result.success) {
                setPings(result.data || []);
            }
        } catch (e) {
            console.warn("Signal load failed", e);
        } finally {
            setIsLoading(false);
        }
    }, [companyId]);

    useEffect(() => { loadSignals(); }, [loadSignals]);

    if (isLoading && pings.length === 0) return null;
    if (!isLoading && pings.length === 0) return null;

    return (
        <Card className={cn(
            "border-none shadow-2xl overflow-hidden text-left bg-white",
            !isPaid && "ring-2 ring-amber-500/20"
        )}>
            <CardHeader className="bg-slate-900 text-white p-6 text-left">
                <div className="flex justify-between items-center text-left">
                    <div className="text-left text-white">
                        <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2 text-white text-left">
                            <Search className="h-5 w-5 text-primary" />
                            Sales intelligence Ledger
                        </CardTitle>
                        <CardDescription className="text-slate-400 text-left">High-intent traffic recorded on your digital node.</CardDescription>
                    </div>
                    <Badge className="bg-primary text-white border-none">{pings.length}</Badge>
                </div>
            </CardHeader>
            <CardContent className="p-0 text-left">
                <div className={cn("relative text-left", !isPaid && "max-h-[250px] overflow-hidden")}>
                    <div className="divide-y text-left">
                        {pings.map((ping) => (
                            <div key={ping.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left text-foreground">
                                <div className="flex items-center gap-3 text-left">
                                    <div className="bg-primary/10 p-2 rounded-full"><UserPlus className="h-4 w-4 text-primary" /></div>
                                    <div className="text-left text-foreground">
                                        <p className={cn("text-sm font-bold text-foreground text-left", !isPaid && "blur-sm select-none")}>
                                            {isPaid ? ping.engagerName : "Forensic Lead Hidden"}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold text-left">{formatDateSafe(ping.timestamp, "dd MMM, HH:mm")}</p>
                                    </div>
                                </div>
                                <Badge variant="outline" className="text-[9px] uppercase font-black text-left">Engagement</Badge>
                            </div>
                        ))}
                    </div>

                    {!isPaid && (
                        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent flex flex-col items-center justify-center p-8 text-center pt-20">
                             <div className="bg-amber-500/10 p-3 rounded-full mb-2 text-center text-foreground">
                                <Lock className="h-6 w-6 text-amber-600" />
                            </div>
                            <h4 className="text-xl font-black text-foreground">Lead Details Restricted</h4>
                            <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1 leading-relaxed text-center">
                                <strong>{pings.length} companies</strong> have selected your profile to engage. Upgrade to an intelligence plan to reveal their identities.
                            </p>
                            <Button asChild size="sm" className="mt-4 font-black uppercase text-[10px] tracking-widest h-10 px-8 shadow-xl text-white">
                                <Link href="/checkout/intelligence">Unlock Discovery Leads</Link>
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
            {isPaid && (
                <CardFooter className="bg-slate-50 border-t p-4 text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mx-auto text-center">Lead recording is live and verified.</p>
                </CardFooter>
            )}
        </Card>
    );
}

export default function AccountDashboard() {
    const { user, isUserLoading } = useUser();
    const { can: canAccess } = usePermissions();
    const searchParams = useSearchParams();
    
    const companyData = user?.companyData;
    const companyId = companyData?.id;

    const intelligencePlanId = companyData?.intelligenceMembershipId || companyData?.membershipId || '';
    const transactionPlanId = companyData?.transactionMembershipId || '';
    const isPaidIntelligence = intelligencePlanId !== '' && intelligencePlanId !== 'free';
    const hasTransactionMembership = Boolean(transactionPlanId);
    const roleMemberships = companyData?.roleMemberships || {};
    const registeredRole = getPrimaryBusinessDomain({
        ...user,
        companyData,
        primaryBusinessDomain: companyData?.primaryBusinessDomain || user?.primaryBusinessDomain,
        declaredRole: companyData?.declaredRole || user?.declaredRole,
        declaredPosition: user?.declaredPosition,
        shopType: companyData?.shopType,
    });
    const activeBusinessRoles = Array.from(new Set([
        ...(companyData?.activeBusinessRoles || []),
        registeredRole,
    ].filter(Boolean)));
    
    const loyaltyTier = companyData?.loyaltyTier || 'bronze';
    const tierColors: {[key: string]: string} = {
        bronze: 'bg-orange-200 text-orange-800',
        silver: 'bg-slate-200 text-slate-800',
        gold: 'bg-yellow-200 text-yellow-800',
    };

    const isAssociate = user?.declaredPosition === 'associate' || user?.role === 'associate';
    const viewingRole = searchParams.get('role') || registeredRole || 'supplier';

    if (isUserLoading) {
        return <div className="flex justify-center items-center py-40 w-full"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }
    
    if (!user) return null;

    return (
        <div className="w-full space-y-8 text-left text-foreground">
            <div className="flex justify-between items-end text-left text-foreground">
                <div className="text-left">
                    <h1 className="text-3xl md:text-4xl font-black font-headline uppercase tracking-tight text-left">Commerce Command</h1>
                    <p className="text-lg text-muted-foreground font-medium text-left">Welcome back, {user?.firstName || 'Member'}! You are viewing the {viewingRole} portal.</p>
                </div>
                <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm" className="font-bold">
                        <Link href="/mall"><ShoppingBasket className="mr-2 h-4 w-4 text-primary" /> Malls</Link>
                    </Button>
                    <Button asChild size="sm" className="font-bold shadow-md text-white">
                        <Link href="/account?view=shop"><Store className="mr-2 h-4 w-4" /> My digital Branch</Link>
                    </Button>
                </div>
            </div>

            {/* REVEAL: SALES INTELLIGENCE via API */}
            {companyId && (
                <EngagementYieldModule companyId={companyId} isPaid={isPaidIntelligence} />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-left text-foreground">
                <Card className="text-left border-none shadow-lg bg-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 text-left">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Available Wallet</CardTitle>
                         <Wallet className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent className="text-left">
                        <div className="text-2xl font-black">{formatCurrency(companyData?.availableBalance)}</div>
                         <Button asChild variant="link" size="sm" className="p-0 h-auto font-bold text-primary">
                            <Link href="/account?view=wallet">Manage Wallet</Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="text-left border-none shadow-lg bg-white text-foreground">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Loyalty Standing</CardTitle>
                        <Award className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent className="text-left">
                        <div className="text-2xl font-black flex items-center gap-2">
                            <Badge className={cn("capitalize border-none", tierColors[loyaltyTier])}>{loyaltyTier}</Badge>
                            <span>{companyData?.rewardPoints || 0} pts</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="text-left border-none shadow-lg bg-white text-foreground">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Intelligence Membership</CardTitle>
                        <Gem className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent className="text-left">
                        <div className={`text-2xl font-black capitalize ${isPaidIntelligence ? 'text-primary' : 'text-muted-foreground'}`}>{isPaidIntelligence ? intelligencePlanId : 'Free'}</div>
                        <p className="mt-1 text-xs text-muted-foreground">{isPaidIntelligence ? 'Discovery, intelligence and paid referral selling are active.' : 'Upgrade to unlock intelligence and referral selling.'}</p>
                        <Button asChild variant="link" size="sm" className="p-0 h-auto font-bold text-primary">
                            <Link href={isPaidIntelligence ? '/pricing' : '/checkout/intelligence'}>{isPaidIntelligence ? 'Manage Intelligence Plan' : 'Activate Intelligence'}</Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="text-left border-none shadow-lg bg-white text-foreground">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Transaction Membership</CardTitle>
                        <Network className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent className="text-left">
                        <div className={`text-2xl font-black capitalize ${hasTransactionMembership ? 'text-primary' : 'text-muted-foreground'}`}>{hasTransactionMembership ? transactionPlanId : 'Not Active'}</div>
                        <p className="mt-1 text-xs text-muted-foreground">{hasTransactionMembership ? 'Provider profiles, listings and commercial node tools are active.' : 'Upgrade to publish a storefront and transact in the markets.'}</p>
                        <Button asChild variant="link" size="sm" className="p-0 h-auto font-bold text-primary">
                            <Link href="/pricing?purpose=transaction">{hasTransactionMembership ? 'Manage Transaction Plan' : 'Activate Transaction'}</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-lg bg-white text-foreground">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <div>
                        <CardTitle className="text-sm font-black uppercase tracking-widest">Business Roles &amp; Memberships</CardTitle>
                        <CardDescription className="mt-1">Roles purchased for this company and the portals available to your team.</CardDescription>
                    </div>
                    <Network className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent className="space-y-3">
                    {activeBusinessRoles.length > 0 ? activeBusinessRoles.map((role: string) => {
                        const membership = roleMemberships[role];
                        const isActive = membership?.status === 'active' || Boolean(membership);
                        return (
                            <div key={role} className="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-black capitalize">{role} Portal</p>
                                        <Badge variant={isActive ? 'default' : 'secondary'} className="capitalize">{isActive ? 'Active' : 'Primary role'}</Badge>
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {membership?.planId ? `${membership.planId} plan` : 'Included primary business role'}
                                        {membership?.billingCycle ? ` · ${membership.billingCycle} billing` : ''}
                                    </p>
                                </div>
                                <Button asChild variant="outline" size="sm" className="font-bold">
                                    <Link href={`/account?view=dashboard&role=${encodeURIComponent(role)}`}>Open Portal</Link>
                                </Button>
                            </div>
                        );
                    }) : (
                        <div className="flex items-center justify-between rounded-md border border-dashed p-4">
                            <p className="text-sm text-muted-foreground">No business role has been selected yet.</p>
                            <Button asChild variant="outline" size="sm"><Link href="/account?view=business-domain">Set Role</Link></Button>
                        </div>
                    )}
                    <Button asChild variant="link" className="px-0 font-bold text-primary">
                        <Link href="/account/additional-role?role=transporter">Add Another Role</Link>
                    </Button>
                </CardContent>
            </Card>

            {!isAssociate && (
                <div className="space-y-8 text-left text-foreground">
                    <div className="flex items-center gap-4 text-left">
                        <h2 className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
                            <PackageSearch className="h-5 w-5 text-primary" /> Active Handshakes
                        </h2>
                        <Separator className="flex-1" />
                    </div>
                    {canAccess('view', 'quotes') && <QuotesCard />}
                    {canAccess('view', 'enquiries') && <EnquiriesCard />}
                </div>
            )}
        </div>
    );
}
