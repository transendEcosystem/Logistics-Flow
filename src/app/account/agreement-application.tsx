'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileSignature, Loader2, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { getClientSideAuthToken, useUser } from '@/firebase';
import { fetchFromAdminAPI, formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function AgreementApplicationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [context, setContext] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [application, setApplication] = useState({ type: searchParams.get('type') || '', amountRequested: searchParams.get('amount') || '', termMonths: '60', description: '', fundingNeed: 'agreement-specific' });

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      router.replace(`/signin?redirect=/account?view=agreement-application`);
      return;
    }
    const loadContext = async () => {
      try {
        const token = await getClientSideAuthToken();
        if (!token) throw new Error('Authentication required.');
        const response = await fetch('/api/lending/agreement-context', { headers: { Authorization: `Bearer ${token}` } });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load lending context.');
        if (!result.hasClient) { router.replace('/funding/client-application?origination=direct'); return; }
        if (!result.hasGlobalFacility) { router.replace('/account?view=my-facilities'); return; }
        setContext(result);
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Application unavailable', description: error.message });
      } finally {
        setIsLoading(false);
      }
    };
    loadContext();
  }, [isUserLoading, user, router, toast]);

  const submit = async () => {
    if (!context?.clientId || !context.globalFacility?.id || !application.type || !application.amountRequested || !application.description.trim()) return;
    try {
      setIsSubmitting(true);
      const token = await getClientSideAuthToken();
      if (!token) throw new Error('Authentication required.');
      const result = await fetchFromAdminAPI(token, 'createAgreementFacilityApplication', {
        application: {
          clientId: context.clientId,
          masterFacilityId: context.globalFacility.id,
          ...application,
          amountRequested: Number(application.amountRequested),
          termMonths: Number(application.termMonths),
        },
      });
      toast({ title: 'Agreement application submitted', description: 'Your request has been sent for product-specific credit review.' });
      router.push(`/account?view=my-facilities&applicationId=${encodeURIComponent(result.creditCaseId)}`);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Submission failed', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !context) return <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin text-primary" /> Checking your approved client facility...</div>;

  return <div className="max-w-4xl mx-auto space-y-6 text-left"><div><h1 className="text-3xl font-black tracking-tight flex items-center gap-3"><FileSignature className="h-8 w-8 text-primary" /> Agreement Application</h1><p className="text-muted-foreground mt-1">Apply for a specific funding transaction against your approved client facility. Final terms remain subject to credit and board approval.</p></div><Card className="border-primary/20 shadow-lg"><CardHeader className="bg-primary/5 border-b"><div className="flex items-center justify-between gap-4"><div><CardTitle className="text-lg">Client facility context</CardTitle><CardDescription>This information comes from your completed client application and cannot be edited here.</CardDescription></div><Badge variant="outline" className="text-primary border-primary/30">Approved facility: {formatCurrency(context.globalFacility.limit)}</Badge></div></CardHeader><CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 text-sm"><div><span className="block text-[10px] font-black uppercase text-muted-foreground">Client</span><strong>{context.client?.name || 'Your business'}</strong></div><div><span className="block text-[10px] font-black uppercase text-muted-foreground">Facility status</span><strong>{context.globalFacility.status}</strong></div><div><span className="block text-[10px] font-black uppercase text-muted-foreground">Declared vehicles</span><strong>{context.client?.vehicleAssets?.length || 0}</strong></div><div><span className="block text-[10px] font-black uppercase text-muted-foreground">Bank accounts</span><strong>{context.client?.bankAccounts?.length || 0}</strong></div></CardContent></Card><Card><CardHeader><CardTitle>Transaction details</CardTitle><CardDescription>Tell us what you want to finance. We will evaluate the request under the relevant product rules.</CardDescription></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5"><div className="space-y-2"><Label>Agreement type</Label><Select value={application.type} onValueChange={(value) => setApplication((current) => ({ ...current, type: value }))}><SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger><SelectContent><SelectItem value="loan-pv-term">Working capital loan</SelectItem><SelectItem value="installment-sale-term">Installment sale</SelectItem><SelectItem value="rental-term">Rental / lease</SelectItem><SelectItem value="discounting">Factoring / discounting</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Amount requested</Label><Input type="number" min="1" value={application.amountRequested} onChange={(event) => setApplication((current) => ({ ...current, amountRequested: event.target.value }))} /></div><div className="space-y-2"><Label>Requested term (months)</Label><Input type="number" min="1" value={application.termMonths} onChange={(event) => setApplication((current) => ({ ...current, termMonths: event.target.value }))} /></div><div className="space-y-2 md:col-span-2"><Label>What do you want to finance?</Label><Textarea rows={6} value={application.description} onChange={(event) => setApplication((current) => ({ ...current, description: event.target.value }))} placeholder="Describe the vehicle, equipment, receivable, working-capital need, or transaction." /></div></CardContent></Card><div className="flex justify-end"><Button onClick={submit} disabled={isSubmitting || !application.type || !application.amountRequested || !application.description.trim()} className="font-bold text-white gap-2"><PlusCircle className="h-4 w-4" />{isSubmitting ? 'Submitting...' : 'Submit Agreement Application'}</Button></div></div>;
}
