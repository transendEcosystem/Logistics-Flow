'use client';

import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getClientSideAuthToken } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

export function LoadResponseDialog({ load }: { load: any }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [proposedRate, setProposedRate] = useState(load.haulierPayout?.toString() || '');
  const [availableFrom, setAvailableFrom] = useState('');
  const [message, setMessage] = useState('');

  const submit = async () => {
    if (!availableFrom || !message.trim()) {
      toast({ variant: 'destructive', title: 'Complete your response', description: 'Availability and a commercial response are required.' });
      return;
    }
    setSubmitting(true);
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error('Your session has expired.');
      const response = await fetch('/api/respondToLoad', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ loadId: load.id, brokerId: load.brokerId, proposedRate, availableFrom, message }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not submit your load response.');
      toast({ title: 'Response sent', description: 'The load provider received your enquiry in their Load Shop Back Office.' });
      setOpen(false);
      setAvailableFrom('');
      setMessage('');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Response not sent', description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button size="sm" className="h-9 gap-2 px-4 text-[10px] font-black uppercase tracking-widest"><Send className="h-3.5 w-3.5" />Respond</Button></DialogTrigger>
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Respond to Load</DialogTitle><DialogDescription>Send a commercial response for {load.origin} to {load.destination}. The provider will receive it in their Load Shop Back Office.</DialogDescription></DialogHeader>
      <div className="space-y-4 py-2">
        <div className="grid gap-2"><Label htmlFor="availability">Fleet available from</Label><Input id="availability" type="datetime-local" value={availableFrom} onChange={event => setAvailableFrom(event.target.value)} /></div>
        <div className="grid gap-2"><Label htmlFor="rate">Proposed carrier rate (ZAR)</Label><Input id="rate" type="number" min="0" value={proposedRate} onChange={event => setProposedRate(event.target.value)} /></div>
        <div className="grid gap-2"><Label htmlFor="response">Commercial response</Label><Textarea id="response" value={message} onChange={event => setMessage(event.target.value)} placeholder="Confirm equipment, availability, compliance or any commercial condition." className="min-h-28" /></div>
      </div>
      <DialogFooter><Button onClick={submit} disabled={submitting}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Send response</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}