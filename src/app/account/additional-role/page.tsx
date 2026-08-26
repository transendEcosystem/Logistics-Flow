'use client';

import { Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { ArrowRight, CheckCircle2, Loader2, ShieldCheck, Truck, Building2, Landmark } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/firebase';
import { formatCurrency } from '@/lib/utils';

const roleDetails: Record<string, { label: string; description: string; icon: typeof Truck; capabilities: string[] }> = {
  supplier: { label: 'Supplier', description: 'Add supplier operations, products, and storefront publishing to this company.', icon: Building2, capabilities: ['Supplier capability profile', 'Product and service publishing', 'Supplier storefront'] },
  transporter: { label: 'Transporter', description: 'Add fleet, route, and transport capacity operations to this company.', icon: Truck, capabilities: ['Fleet and route profile', 'Transport capacity publishing', 'Loads and transporter matching'] },
  finance: { label: 'Finance', description: 'Add finance-provider operations and lending product publishing to this company.', icon: Landmark, capabilities: ['Finance provider profile', 'Lending product publishing', 'Funding application matching'] },
};

function AdditionalRoleContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const role = (params.get('role') || 'transporter').toLowerCase();
  const details = roleDetails[role];
  const pricingRef = useMemoFirebase(() => firestore ? collection(firestore, 'configuration') : null, [firestore]);
  const { data: pricing, isLoading: pricingLoading } = useCollection(pricingRef);
  const configuredPrice = pricing?.find(item => item.id === 'roleMembershipPricing')?.additionalRoleMonthlyPrice;
  const price = Number(configuredPrice ?? 250);
  const RoleIcon = details?.icon;

  const checkoutHref = `/checkout/role-membership?purpose=role&role=${encodeURIComponent(role)}&cycle=monthly`;

  if (isUserLoading || pricingLoading) return <div className="flex justify-center py-24"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  if (!details) return <div className="mx-auto max-w-xl py-24 text-center"><h1 className="text-2xl font-black">Role not available</h1><Button className="mt-6" onClick={() => router.push('/account')}>Return to Account</Button></div>;

  return <main className="min-h-screen bg-background px-4 py-16 text-foreground"><div className="mx-auto max-w-3xl space-y-10">
    <div className="space-y-4 text-center"><Badge className="bg-primary/10 text-primary">Additional Role Membership</Badge><h1 className="text-4xl font-black uppercase tracking-tight">Activate Your {details.label} Portal</h1><p className="mx-auto max-w-2xl text-lg text-muted-foreground">{details.description} This is an additional role for your existing company account, not a new company registration.</p></div>
    <Card className="overflow-hidden border-none bg-white shadow-2xl"><CardHeader className="bg-slate-900 p-8 text-white"><div className="flex items-center gap-4"><div className="rounded-xl bg-primary/20 p-3">{RoleIcon && <RoleIcon className="h-8 w-8 text-primary" />}</div><div><CardTitle className="text-2xl text-white">{details.label} Portal</CardTitle><CardDescription className="text-slate-300">One company account, one additional commercial role.</CardDescription></div></div></CardHeader><CardContent className="space-y-8 p-8"><div className="flex items-baseline justify-between border-b pb-6"><span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Additional role fee</span><span className="text-4xl font-black text-primary">{formatCurrency(price)}<small className="ml-2 text-sm text-muted-foreground">/ month</small></span></div><div className="space-y-3"><h2 className="font-black uppercase tracking-widest">Included role access</h2>{details.capabilities.map(capability => <div key={capability} className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-primary" />{capability}</div>)}</div><div className="flex items-start gap-3 rounded-md bg-muted/50 p-4 text-sm text-muted-foreground"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><p>After payment, the role is added to your company and appears in the avatar portal switcher. You will then complete the role profile.</p></div></CardContent><CardFooter className="flex justify-between border-t bg-slate-50 p-8"><Button variant="outline" onClick={() => router.push('/account')}>Back to Account</Button><Button asChild className="font-bold text-white"><a href={checkoutHref}>Continue to Checkout <ArrowRight className="ml-2 h-4 w-4" /></a></Button></CardFooter></Card>
  </div></main>;
}

export default function AdditionalRolePage() {
  return <Suspense fallback={<div className="flex justify-center py-24"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}><AdditionalRoleContent /></Suspense>;
}
