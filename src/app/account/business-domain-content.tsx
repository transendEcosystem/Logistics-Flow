'use client';

import { useState } from 'react';
import { Building2, CheckCircle2, Landmark, Loader2, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getClientSideAuthToken, useUser } from '@/firebase';
import { getPrimaryBusinessDomain, type PrimaryBusinessDomain } from '@/lib/business-domain';

const domains: Array<{ id: PrimaryBusinessDomain; title: string; description: string; icon: any }> = [
  { id: 'supplier', title: 'Supplier', description: 'I provide goods, parts, equipment or business services to the logistics market.', icon: Building2 },
  { id: 'transporter', title: 'Transporter', description: 'I operate fleet capacity and provide transport services across one or more routes.', icon: Truck },
  { id: 'lender', title: 'Lender', description: 'I provide finance products and evaluate borrower applications and commercial risk.', icon: Landmark },
];

export default function BusinessDomainContent() {
  const { user, forceRefresh } = useUser();
  const { toast } = useToast();
  const existingDomain = getPrimaryBusinessDomain(user);
  const [selected, setSelected] = useState<PrimaryBusinessDomain | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!selected || !user?.companyId) return;
    if (existingDomain) return;
    setSaving(true);
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error('Session expired.');
      const companyResponse = await fetch('/api/updateUserDoc', {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: `companies/${user.companyId}`, data: { primaryBusinessDomain: selected, declaredRole: selected, updatedAt: { _methodName: 'serverTimestamp' } } }),
      });
      if (!companyResponse.ok) throw new Error('Could not save the business domain.');
      const userResponse = await fetch('/api/updateUserDoc', {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: `users/${user.uid}`, data: { declaredPosition: selected, updatedAt: { _methodName: 'serverTimestamp' } } }),
      });
      if (!userResponse.ok) throw new Error('Could not synchronize the member role.');
      toast({ title: 'Primary business domain saved', description: 'Your account environment now reflects your commercial role.' });
      forceRefresh?.();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Could not save role', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (existingDomain) {
    return <div className="max-w-2xl mx-auto py-16 text-center"><CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-4" /><h1 className="text-2xl font-black">Primary Business Domain Confirmed</h1><p className="text-muted-foreground mt-2">This company account is registered as a {existingDomain}. A separate commercial business requires a separate member account.</p></div>;
  }

  return <div className="max-w-4xl mx-auto space-y-6 text-left">
    <div><h1 className="text-3xl font-black font-headline">Set Your Primary Business Domain</h1><p className="text-muted-foreground mt-2">Choose the one commercial role this company account represents. This sets its default account environment, capability profile and matching workflow. A separate business requires a separate account.</p></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">{domains.map(domain => <Card key={domain.id} className={`cursor-pointer border-2 transition-colors ${selected === domain.id ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`} onClick={() => setSelected(domain.id)}><CardHeader><domain.icon className="h-8 w-8 text-primary mb-3" /><CardTitle>{domain.title}</CardTitle><CardDescription>{domain.description}</CardDescription></CardHeader></Card>)}</div>
    <Button onClick={save} disabled={!selected || saving} className="font-bold"><CheckCircle2 className="mr-2 h-4 w-4" />{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Primary Business Domain'}</Button>
  </div>;
}
