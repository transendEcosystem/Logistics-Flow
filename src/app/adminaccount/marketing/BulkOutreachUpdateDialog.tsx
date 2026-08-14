'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getClientSideAuthToken } from '@/firebase';
import { Loader2, Send, ClipboardPaste, CheckCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export function BulkOutreachUpdateDialog({ onComplete, children }: { onComplete: () => void, children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [pasteData, setPasteData] = useState('');
    const [subject, setSubject] = useState('Company Profile');
    const { toast } = useToast();

    const handleUpdate = async () => {
        if (!pasteData.trim()) return;

        setIsProcessing(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");

            // Split by lines and filter empty entries
            const entries = pasteData.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);

            const response = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'bulkUpdateOutreach',
                    payload: { entries, subject }
                }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Update failed on server.");

            toast({ title: "Update Successful", description: `Updated ${result.count} records.` });
            setIsOpen(false);
            setPasteData('');
            onComplete();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Update Error", description: e.message });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Bulk Outreach Status Update</DialogTitle>
                    <DialogDescription>Paste a list of company names or email addresses to mark them as "Contacted" and set the outreach subject.</DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="outreach-subject">Outreach Subject</Label>
                        <Input id="outreach-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g., Company Profile" />
                    </div>
                    <div className="space-y-2">
                        <Label>Paste Names/Emails (One per line)</Label>
                        <Textarea 
                            placeholder="Company One Ltd&#10;company.two@example.com&#10;..." 
                            className="min-h-[250px] font-mono text-xs" 
                            value={pasteData}
                            onChange={(e) => setPasteData(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleUpdate} disabled={isProcessing || !pasteData.trim()}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4" />}
                        Update Records
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
