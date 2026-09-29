'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getClientSideAuthToken } from '@/firebase';
import { formatCurrency } from '@/lib/utils';
import { CheckCircle2, FileSignature, Loader2 } from 'lucide-react';

export default function MyFacilityLettersContent() {
  const { toast } = useToast();
  const [letters, setLetters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [signatureName, setSignatureName] = useState('');
  const [busyCaseId, setBusyCaseId] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error('Authentication required.');
      const response = await fetch('/api/lending/facility-letter', { headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load your facility letters.');
      setLetters(result.letters || []);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Load failed', description: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const respond = async (caseId: string, decision: 'accept' | 'decline') => {
    if (decision === 'accept' && !signatureName.trim()) {
      toast({ variant: 'destructive', title: 'Signature required', description: 'Type your full name to sign the facility letter.' });
      return;
    }
    setBusyCaseId(caseId);
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error('Authentication required.');
      const response = await fetch('/api/lending/facility-letter', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, decision, signatureName }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to record your decision.');
      toast({ title: decision === 'accept' ? 'Facility letter accepted' : 'Facility letter declined' });
      setSignatureName('');
      await load();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Action failed', description: error.message });
    } finally {
      setBusyCaseId('');
    }
  };

  if (isLoading) return <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin text-primary" /> Loading your facility letters...</div>;

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3"><FileSignature className="h-8 w-8 text-primary" /> My Facility Letters</h1>
        <p className="text-muted-foreground mt-1">Review and accept approved facility offers. Funds are only released once all booking conditions are met.</p>
      </div>

      {letters.length === 0 ? (
        <Card className="border-dashed border-2"><CardContent className="py-16 text-center text-muted-foreground">No facility letters have been issued to you yet.</CardContent></Card>
      ) : letters.map((letter) => (
        <Card key={letter.caseId} className="border-none shadow-lg">
          <CardHeader className="border-b bg-muted/10">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg capitalize">{String(letter.terms?.agreementType || 'Facility').replace(/-/g, ' ')}</CardTitle>
                <CardDescription>Approved amount {formatCurrency(letter.terms?.approvedAmount)} over {letter.terms?.termMonths} months</CardDescription>
              </div>
              <Badge className="capitalize">{letter.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <pre className="max-h-72 overflow-y-auto rounded-xl border bg-slate-50 p-4 text-[11px] leading-relaxed whitespace-pre-wrap">{letter.body}</pre>
            {letter.status === 'issued' ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Type your full name to sign</Label>
                  <Input value={signatureName} onChange={(event) => setSignatureName(event.target.value)} placeholder="Full name of authorised signatory" />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => respond(letter.caseId, 'accept')} disabled={busyCaseId === letter.caseId} className="font-bold text-white gap-2"><CheckCircle2 className="h-4 w-4" /> Accept and sign</Button>
                  <Button variant="outline" onClick={() => respond(letter.caseId, 'decline')} disabled={busyCaseId === letter.caseId} className="font-bold">Decline</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {letter.status === 'accepted' ? `Accepted on ${new Date(letter.acceptedAt).toLocaleString()}. Your agreement is now in booking.` : 'This facility letter is no longer open for acceptance.'}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
