'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageSquare, ClipboardList, CheckCircle, Circle, Clock, Activity, AlertTriangle, Eye, Globe, BookOpen, Smartphone, User, Mail, Phone, ShieldCheck, MapPin, Users, Sparkles } from 'lucide-react';
import { getClientSideAuthToken, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, query, orderBy, serverTimestamp, limit, doc } from 'firebase/firestore';
import { formatDateSafe } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

async function performAdminAction(token: string, action: string, payload: any) {
    const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
        throw new Error(result.error || `API Error for action: ${action}`);
    }
    return result;
}

function ContactCard({ title, contact }: { title: string, contact: any }) {
    if (!contact || (!contact.name && !contact.email)) {
        return (
            <div className="p-4 border rounded-xl bg-slate-50/50 flex flex-col items-center justify-center gap-2 opacity-40 grayscale text-center">
                <User className="h-5 w-5 text-muted-foreground" />
                <p className="text-[10px] font-black uppercase tracking-widest">{title} Not Mapped</p>
            </div>
        );
    }
    return (
        <Card className="shadow-none border-primary/10 bg-white">
            <CardHeader className="p-4 pb-2 border-b bg-muted/20">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <User className="h-3 w-3" /> {title}
                </p>
            </CardHeader>
            <CardContent className="p-4 space-y-2 text-left">
                <p className="text-sm font-bold text-foreground truncate">{contact.name || 'Anonymous Contact'}</p>
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground hover:text-primary transition-colors">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{contact.email || 'No email'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{contact.mobile || 'No mobile'}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function PartnerOversightDialog({ partner, onUpdate }: { partner: any, onUpdate: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoadingStaff, setIsLoadingStaff] = useState(false);
    const [staff, setStaff] = useState<any[]>([]);
    const { toast } = useToast();
    const firestore = useFirestore();

    const isLead = partner.source === 'Lead' || !partner.type || partner.type === 'lead';
    const isLending = partner.source === 'Debtor' || partner.entryType === 'Debtor';
    const parentCollection = isLending ? 'lendingClients' : (isLead ? 'leads' : 'partners');

    const logsQuery = useMemoFirebase(() => {
        if (!firestore || !partner?.id || !isOpen || !parentCollection) return null;
        return query(
            collection(firestore, parentCollection, partner.id, 'communications'), 
            orderBy('timestamp', 'desc'),
            limit(50)
        );
    }, [firestore, partner?.id, isOpen, parentCollection]);
    const { data: logs, isLoading: isLoadingLogs } = useCollection(logsQuery);

    const tasksQuery = useMemoFirebase(() => {
        if (!firestore || !partner?.id || !isOpen || !parentCollection) return null;
        return query(
            collection(firestore, parentCollection, partner.id, 'tasks'), 
            orderBy('createdAt', 'desc'),
            limit(50)
        );
    }, [firestore, partner?.id, isOpen, parentCollection]);
    const { data: tasks, isLoading: isLoadingTasks, forceRefresh: refreshTasks } = useCollection(tasksQuery);

    const timeline = useMemo(() => {
        const events: any[] = [];
        if (isOpen && !isLoadingLogs && !isLoadingTasks) {
            (logs || []).forEach(log => {
                if (log && (log.timestamp || log.date)) {
                    events.push({ ...log, type: 'log', date: log.timestamp || log.date });
                }
            });
            (tasks || []).forEach(task => {
                if (task && (task.createdAt || task.date)) {
                    events.push({ ...task, type: 'task', date: task.createdAt || task.date });
                }
            });
        }
        
        return events.sort((a, b) => {
            const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date || 0);
            const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date || 0);
            return dateB.getTime() - dateA.getTime();
        });
    }, [logs, tasks, isOpen, isLoadingLogs, isLoadingTasks]);

    const fetchStaff = useCallback(async () => {
        if (!isOpen) return;
        setIsLoadingStaff(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;
            const res = await performAdminAction(token, 'getPlatformStaff', {});
            setStaff(res.data || []);
        } catch (e) {
            console.error("Staff fetch failed", e);
        } finally {
            setIsLoadingStaff(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) fetchStaff();
    }, [isOpen, fetchStaff]);

    const handleAssign = async (staffId: string) => {
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Auth failed");
            
            await fetch('/api/updateUserDoc', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: `${parentCollection}/${partner.id}`,
                    data: { assigneeId: staffId === 'none' ? null : staffId, updatedAt: serverTimestamp() }
                })
            });
            
            toast({ title: "Record Allocated", description: "Successfully updated assignee." });
            onUpdate();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Assignment Failed", description: e.message });
        }
    };

    const toggleTask = async (task: any) => {
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;
            await fetch('/api/updateUserDoc', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: `${parentCollection}/${partner.id}/tasks/${task.id}`,
                    data: { status: task.status === 'pending' ? 'completed' : 'pending', updatedAt: serverTimestamp() }
                })
            });
            refreshTasks();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Update Failed", description: e.message });
        }
    };

    const name = partner.companyName || partner.name || `${partner.firstName || ''} ${partner.lastName || ''}`.trim() || 'Record';

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                 <Button variant="ghost" size="icon" title="Oversight & Activity">
                    <Clock className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 text-left text-foreground">
                <DialogHeader className="p-6 border-b bg-muted/30">
                    <div className="flex justify-between items-start text-left">
                        <div className="text-left text-foreground">
                            <DialogTitle className="text-2xl font-black flex items-center gap-2 text-left">
                                <Clock className="h-6 w-6 text-primary" />
                                Oversight: {name}
                            </DialogTitle>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-[10px] font-black uppercase border-primary/30 text-primary">{parentCollection.replace('lendingClients', 'debtor').replace('leads', 'lead').replace('partners', 'partner')} Registry</Badge>
                                <span className="text-xs text-muted-foreground text-left">• {partner.industrial_category || partner.category || 'Industrial'}</span>
                            </div>
                        </div>
                        <div className="space-y-2 text-right">
                             <Label className="text-[10px] font-black uppercase text-muted-foreground">Allocated Staff</Label>
                             <Select value={partner.assigneeId || 'none'} onValueChange={handleAssign}>
                                <SelectTrigger className="w-[200px] h-9 bg-white border-primary/20">
                                    <SelectValue placeholder="Unallocated" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Unallocated</SelectItem>
                                    {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}
                                </SelectContent>
                             </Select>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-8 space-y-10 bg-slate-50/50 text-left">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left text-foreground">
                        <div className="space-y-4 text-left text-foreground">
                            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 text-left">
                                <Users className="h-4 w-4 text-primary"/>
                                Key Decision Makers
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                                <ContactCard title="Marketing Lead" contact={partner.marketingManager} />
                                <ContactCard title="CEO / Principal" contact={partner.ceo} />
                            </div>
                        </div>

                        <div className="space-y-4 text-left text-foreground">
                            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 text-left">
                                <Globe className="h-4 w-4 text-primary"/>
                                Core Logistics
                            </h3>
                            <Card className="shadow-none bg-white min-h-[142px] overflow-hidden text-left">
                                <CardContent className="p-4 space-y-4 text-left">
                                    <div className="space-y-1 text-left">
                                        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter">Official Domain</p>
                                        {partner.website ? (
                                            <a href={partner.website} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5 truncate">
                                                <Globe className="h-3 w-3" /> {partner.website}
                                            </a>
                                        ) : <p className="text-xs text-muted-foreground italic text-left">No website URL recorded.</p>}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                                        <div className="space-y-1 text-left">
                                            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter">Company Landline</p>
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground text-left">
                                                <Phone className="h-3 w-3" />
                                                <span>{partner.phone || "N/A"}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1 text-left text-foreground">
                                            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter">Company Email</p>
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground text-left">
                                                <Mail className="h-3 w-3" />
                                                <span className="truncate">{partner.email || partner.marketingManager?.email || "N/A"}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1 text-left text-foreground">
                                        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter">Physical Operational Node</p>
                                        <div className="flex items-start gap-1.5 text-xs text-foreground leading-tight text-left">
                                            <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                                            <span>{partner.address || partner.physicalAddress || "No verified address recorded."}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <div className="space-y-4 text-left text-foreground">
                        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 text-left">
                            <BookOpen className="h-4 w-4 text-primary"/>
                            Technical Intelligence Extraction
                        </h3>
                        <Card className="shadow-none border-primary/20 bg-white text-left">
                            <CardHeader className="p-4 border-b bg-primary/5 text-left">
                                <p className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 text-left">
                                    <Sparkles className="h-3 w-3" /> Mined Site Content (First 300 Words)
                                </p>
                            </CardHeader>
                            <CardContent className="p-6 text-left text-foreground">
                                <ScrollArea className="h-40 w-full text-left text-foreground">
                                    <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-wrap italic text-left">
                                        {partner.minedServiceWording || partner.notes || "No technical service wording has been mined for this record yet."}
                                    </p>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>

                    <Separator />

                    <div className="space-y-6 text-left text-foreground">
                        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 text-left">
                            <Activity className="h-4 w-4 text-primary"/>
                            Relationship Timeline & Engagement
                        </h3>
                        
                        {(isLoadingLogs || isLoadingTasks) ? (
                            <div className="flex justify-center p-12 text-foreground"><Loader2 className="animate-spin text-primary" /></div>
                        ) : timeline.length > 0 ? (
                            <div className="relative space-y-4 before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-muted text-left text-foreground">
                                {timeline.map((event, idx) => (
                                    <div key={event.id || idx} className="relative pl-10 text-left">
                                        <div className={cn(
                                            "absolute left-2 top-1.5 h-4 w-4 rounded-full border-2 border-background z-10",
                                            event.type === 'task' ? (event.status === 'completed' ? "bg-green-500" : "bg-amber-500") : "bg-primary"
                                        )} />
                                        <Card className="shadow-none text-left border-none bg-white text-left">
                                            <CardContent className="p-4 text-left text-foreground">
                                                <div className="flex justify-between items-start text-left text-foreground">
                                                    <div className="space-y-1 text-left text-foreground">
                                                        <div className="flex items-center gap-2 text-left">
                                                            {event.type === 'task' ? <ClipboardList className="h-3.5 w-3.5 text-amber-600" /> : <MessageSquare className="h-3.5 w-3.5 text-primary" />}
                                                            <span className="font-bold text-sm text-foreground text-left">{event.subject || event.title}</span>
                                                            <Badge variant="outline" className="text-[10px] h-4 uppercase border-muted text-muted-foreground">{event.type}</Badge>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground leading-relaxed text-left">{event.notes || event.description || 'Action recorded.'}</p>
                                                    </div>
                                                    <div className="text-right space-y-1 text-foreground">
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{formatDateSafe(event.date, "dd MMM, HH:mm")}</p>
                                                        {event.type === 'task' && (
                                                            <Button 
                                                                size="sm" 
                                                                variant="ghost" 
                                                                className={cn("h-7 px-2 text-xs", event.status === 'completed' ? "text-green-600" : "text-amber-600")}
                                                                onClick={() => toggleTask(event)}
                                                            >
                                                                {event.status === 'completed' ? <CheckCircle className="mr-1 h-3 w-3"/> : <Circle className="mr-1 h-3 w-3"/>}
                                                                {event.status === 'completed' ? 'Done' : 'Mark Done'}
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 border-2 border-dashed rounded-3xl text-foreground bg-white/50 text-center">
                                <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-20 text-center" />
                                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest text-center">Relationship Cold</p>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
