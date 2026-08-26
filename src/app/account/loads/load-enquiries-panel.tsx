'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2, MessageSquareText, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getClientSideAuthToken, useUser } from '@/firebase';
import { formatCurrency, formatDateSafe } from '@/lib/utils';

export function LoadEnquiriesPanel() {
  const { user } = useUser();
  const { toast } = useToast();
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState('');
  const [error, setError] = useState('');

  const loadEnquiries = useCallback(async () => {
    if (!user?.companyId) return;
    setLoading(true);
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error('Your session has expired.');
      const response = await fetch('/api/getUserSubcollection', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ path: `companies/${user.companyId}/enquiries`, type: 'collection' }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not load enquiries.');
      setEnquiries((result.data || []).filter((enquiry: any) => enquiry.type === 'load_response').sort((left: any, right: any) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()));
    } catch (loadError: any) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [user?.companyId]);

  useEffect(() => { loadEnquiries(); }, [loadEnquiries]);

  const acceptResponse = async (enquiryId: string) => {
    setAcceptingId(enquiryId);
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error('Your session has expired.');
      const response = await fetch('/api/acceptLoadResponse', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ enquiryId }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not assign the load.');
      toast({ title: 'Load assigned', description: 'The carrier has been assigned and a formal instruction has been issued.' });
      loadEnquiries();
    } catch (acceptError: any) {
      toast({ variant: 'destructive', title: 'Assignment failed', description: acceptError.message });
    } finally {
      setAcceptingId('');
    }
  };

  return <Card className="border-none shadow-xl"><CardHeader className="border-b bg-muted/20"><CardTitle className="flex items-center gap-2"><MessageSquareText className="h-5 w-5 text-primary" />Load Enquiries</CardTitle><CardDescription>Carrier responses to your published loads. Review the commercial response before assigning work.</CardDescription></CardHeader><CardContent className="space-y-4 p-6">
    {loading && <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
    {error && <p className="py-6 text-sm text-destructive">{error}</p>}
    {!loading && !error && enquiries.length === 0 && <div className="py-12 text-center text-muted-foreground"><Truck className="mx-auto h-10 w-10 opacity-20" /><p className="mt-3 text-sm">No carrier responses yet. Publish a load to receive commercial enquiries here.</p></div>}
    {!loading && !error && enquiries.map(enquiry => <div key={enquiry.id} className="rounded-md border p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row"><div><div className="flex items-center gap-2 font-bold">{enquiry.route?.origin} <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" /> {enquiry.route?.destination}<Badge variant="secondary" className="capitalize">{enquiry.status}</Badge></div><p className="mt-1 text-sm font-medium">{enquiry.responderName}</p><p className="mt-1 text-sm text-muted-foreground">{enquiry.message}</p></div><div className="text-left sm:text-right"><p className="font-black text-primary">{formatCurrency(enquiry.proposedRate || enquiry.offeredPayout)}</p><p className="text-xs text-muted-foreground">Available {enquiry.availableFrom ? formatDateSafe(enquiry.availableFrom, 'dd MMM yyyy, HH:mm') : 'on request'}</p>{enquiry.status === 'pending' && <Button size="sm" className="mt-3" disabled={acceptingId === enquiry.id} onClick={() => acceptResponse(enquiry.id)}>{acceptingId === enquiry.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}Assign carrier</Button>}</div></div><p className="mt-3 text-xs text-muted-foreground">Received {formatDateSafe(enquiry.createdAt, 'dd MMM yyyy, HH:mm')}</p></div>)}
  </CardContent></Card>;
}