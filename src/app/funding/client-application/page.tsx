'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { EditClientWizard } from '@/app/lending/edit-client';
import { useUser } from '@/firebase';

function MemberClientApplication() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  if (isUserLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) {
    router.replace('/signin?redirect=/funding/client-application');
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  return <div className="min-h-screen bg-slate-50 px-4 py-10"><EditClientWizard targetCollection="lendingClients" isMemberFacing onSave={() => router.push('/account?view=my-facilities')} onBack={() => router.push('/account')} /></div>;
}

export default function ClientApplicationPage() {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}><MemberClientApplication /></Suspense>;
}
