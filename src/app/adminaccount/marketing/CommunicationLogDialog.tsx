'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageSquare, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getClientSideAuthToken, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { formatDateSafe } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { collection, query, where, orderBy } from 'firebase/firestore';

export function CommunicationLogDialog({ partnerId, partnerName }: { partnerId: string, partnerName: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const firestore = useFirestore();
    const { toast } = useToast();

    // Query sub-collection for a specific partner
    const logsQuery = useMemoFirebase(() => {
        if (!firestore || !partnerId || !isOpen) return null;
        return query(
            collection(firestore, 'partners', partnerId, 'communications'), 
            orderBy('timestamp', 'desc')
        );
    }, [firestore, partnerId, isOpen]);

    const { data: logs, isLoading, error } = useCollection(logsQuery);
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title="View Communication Log">
                    <MessageSquare className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Communication Log for {partnerName}</DialogTitle>
                    <DialogDescription>A record of all outreach sent to this partner.</DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto space-y-4 py-4 pr-2">
                    {!isOpen ? null : isLoading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
                    ) : error ? (
                         <Card className="border-destructive bg-destructive/10">
                            <CardContent className="p-6 flex items-center gap-3 text-destructive">
                                <AlertTriangle className="h-6 w-6" />
                                <div>
                                    <p className="font-bold">Access Denied</p>
                                    <p className="text-sm">Could not load logs for this partner.</p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : logs && logs.length > 0 ? (
                        logs.map(log => (
                            <Card key={log.id} className="bg-muted/50">
                                <CardContent className="p-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold">{log.subject}</p>
                                            <p className="text-sm text-muted-foreground">Type: <span className="font-medium">{log.type}</span></p>
                                        </div>
                                        <p className="text-xs text-muted-foreground whitespace-nowrap">{formatDateSafe(log.timestamp, "dd MMM yyyy, HH:mm")}</p>
                                    </div>
                                     {log.notes && <p className="text-xs text-muted-foreground mt-2 border-t pt-2">Notes: {log.notes}</p>}
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <p className="text-center text-sm text-muted-foreground py-8">No communication logs found.</p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}