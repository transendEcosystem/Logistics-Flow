'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getClientSideAuthToken, useUser } from '@/firebase';

function AgreementApplicationGate() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isUserLoading } = useUser();
  const [message, setMessage] = useState('Checking your client facility access...');

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      const query = searchParams.toString();
      router.replace(`/signin?redirect=/funding/agreement-application${query ? `?${query}` : ''}`);
      return;
    }

    const resolveContext = async () => {
      try {
        const token = await getClientSideAuthToken();
        if (!token) throw new Error('Authentication required.');
        const response = await fetch('/api/lending/agreement-context', { headers: { Authorization: `Bearer ${token}` } });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Unable to check your lending profile.');
        if (!result.hasClient) {
          router.replace('/funding/client-application?origination=direct');
          return;
        }
        if (!result.hasGlobalFacility) {
          setMessage('A client facility is required before an agreement application can be started.');
          router.replace('/account?view=my-facilities');
          return;
        }
          router.replace(`/account?view=agreement-application&type=${encodeURIComponent(searchParams.get('type') || '')}&amount=${encodeURIComponent(searchParams.get('amount') || '')}`);
      } catch (error: any) {
        setMessage(error.message || 'Unable to check your lending profile.');
      }
    };
    resolveContext();
  }, [isUserLoading, user, router, searchParams]);

  return <Card className="w-full max-w-lg shadow-xl"><CardHeader><CardTitle>Agreement Application</CardTitle></CardHeader><CardContent className="flex items-center gap-3 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" />{message}</CardContent></Card>;
}

export default function AgreementApplicationPage() {
  return <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4"><Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-primary" />}><AgreementApplicationGate /></Suspense></main>;
}
