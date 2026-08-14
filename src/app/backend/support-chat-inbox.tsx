'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, MessageSquare, Send, Bot, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection, getClientSideAuthToken, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, serverTimestamp, collectionGroup } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { format as formatDateFns } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useSearchParams } from 'next/navigation';

interface SupportMessage {
  id: string;
  path: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: any;
  companyId: string;
}

interface Company {
    id: string;
    companyName: string;
    ownerId: string;
}

const formatDate = (dateValue: any) => {
    if (!dateValue) return 'N/A';
    const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return formatDateFns(date, "dd MMM yyyy, HH:mm");
};

export default function SupportChatInbox() {
    const firestore = useFirestore();
    const { user: adminUser } = useUser();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const externalSearch = searchParams.get('search');
    
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (externalSearch) setSearchTerm(externalSearch);
    }, [externalSearch]);

    // Fetch all support messages and companies
    const messagesQuery = useMemoFirebase(() => firestore ? query(collectionGroup(firestore, 'supportMessages')) : null, [firestore]);
    const { data: messages, isLoading: areMessagesLoading, forceRefresh } = useCollection<SupportMessage>(messagesQuery);

    const companiesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'companies')) : null, [firestore]);
    const { data: companies, isLoading: areCompaniesLoading } = useCollection<Company>(companiesQuery);

    const isLoading = areMessagesLoading || areCompaniesLoading;

    const conversations = useMemo(() => {
        if (!messages || !companies) return [];

        const companyMap = new Map(companies.map(c => [c.id, c]));

        const grouped = messages.reduce((acc, message) => {
            const companyId = message.companyId;
            if (!companyId) return acc;
            
            if (!acc[companyId]) {
                acc[companyId] = {
                    company: companyMap.get(companyId),
                    messages: [],
                };
            }
            acc[companyId].messages.push(message);
            return acc;
        }, {} as Record<string, { company?: Company; messages: SupportMessage[] }>);
        
        Object.values(grouped).forEach(convo => {
            if (convo.messages) {
                 convo.messages.sort((a, b) => {
                    const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(0);
                    const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(0);
                    return dateA.getTime() - dateB.getTime();
                });
            }
        });
        
        return Object.values(grouped)
            .filter(convo => {
                if (!searchTerm) return true;
                const name = convo.company?.companyName?.toLowerCase() || '';
                const id = convo.company?.id?.toLowerCase() || '';
                const lowerSearch = searchTerm.toLowerCase();
                return name.includes(lowerSearch) || id.includes(lowerSearch);
            })
            .sort((a,b) => {
                if (!a.messages.length || !b.messages.length) return 0;
                const lastMsgA = a.messages[a.messages.length - 1];
                const lastMsgB = b.messages[b.messages.length - 1];
                const dateA = lastMsgA?.timestamp?.toDate ? lastMsgA.timestamp.toDate() : new Date(0);
                const dateB = lastMsgB?.timestamp?.toDate ? lastMsgB.timestamp.toDate() : new Date(0);
                return dateB.getTime() - dateA.getTime();
            });
    }, [messages, companies, searchTerm]);

    const Conversation = ({ convo }: { convo: any }) => {
        const [adminInput, setAdminInput] = useState('');
        const [isSending, setIsSending] = useState(false);
        const chatEndRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            if (chatEndRef.current) {
                chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        }, [convo.messages]);
        
        const handleAdminSend = async () => {
            if (!adminUser || !adminInput.trim() || !convo.company?.id) return;
            setIsSending(true);

            try {
                const token = await getClientSideAuthToken();
                if (!token) throw new Error("Authentication failed.");
                
                const path = `companies/${convo.company.id}/supportMessages`;
                const messageData = {
                    text: adminInput,
                    senderId: adminUser.uid,
                    senderName: 'Support Team',
                    timestamp: serverTimestamp(),
                    companyId: convo.company.id,
                };
                
                const response = await fetch('/api/addUserDoc', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ collectionPath: path, data: messageData }),
                });

                if (!response.ok) {
                    const result = await response.json();
                    throw new Error(result.error || 'Failed to send message.');
                }
                
                setAdminInput('');
                forceRefresh();
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Send Failed',
                    description: error.message,
                });
            } finally {
                setIsSending(false);
            }
        };

        return (
            <AccordionItem value={convo.company.id} key={convo.company.id} className="border rounded-lg mb-4 overflow-hidden shadow-sm">
                <AccordionTrigger className="px-4 py-4 hover:bg-muted/30 hover:no-underline">
                    <div className="flex items-center gap-4 text-left">
                        <div className="bg-primary/10 p-2 rounded-full"><MessageSquare className="h-5 w-5 text-primary"/></div>
                        <div className="text-left">
                            <p className="font-bold text-base text-foreground">{convo.company?.companyName || 'Unknown Company'}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                                {convo.messages.length} message(s) • Last activity: {formatDate(convo.messages[convo.messages.length - 1].timestamp)}
                            </p>
                        </div>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="p-4 bg-muted/20 h-[50vh] flex flex-col">
                        <ScrollArea className="flex-1 w-full pr-4 mb-4">
                             <div className="space-y-4 pt-2">
                                {convo.messages.map((message: SupportMessage) => {
                                    const isMember = message.senderId === convo.company?.ownerId;
                                    const isAdmin = message.senderId === adminUser?.uid;
                                    const isAI = message.senderId === 'ai-assistant';
                                    const alignment = isMember ? "justify-start" : "justify-end";

                                    return (
                                        <div key={message.id} className={cn("flex items-end gap-2", alignment)}>
                                            {isMember && (
                                                <Avatar className="h-8 w-8">
                                                    <AvatarFallback className="bg-slate-200 text-slate-700 text-[10px] font-black">
                                                        {convo.company?.companyName?.charAt(0) || 'M'}
                                                    </AvatarFallback>
                                                </Avatar>
                                            )}
                                            <div className={cn(
                                                "rounded-2xl px-4 py-2 max-w-[80%] text-sm shadow-sm", 
                                                isAdmin ? "bg-slate-900 text-white rounded-br-none" :
                                                isAI ? "bg-blue-100 text-blue-900 rounded-br-none" :
                                                "bg-white border rounded-bl-none"
                                            )}>
                                                <p className="font-black text-[9px] uppercase tracking-widest mb-1 opacity-70">{message.senderName}</p>
                                                <p className="leading-relaxed">{message.text}</p>
                                                <p className="text-[9px] opacity-50 mt-1 text-right">{formatDate(message.timestamp)}</p>
                                            </div>
                                             {(isAdmin || isAI) && (
                                                <Avatar className="h-8 w-8">
                                                    <AvatarFallback className={isAdmin ? 'bg-slate-900 text-white font-bold text-[10px]' : 'bg-blue-500 text-white'}>
                                                        {isAdmin ? 'AD' : <Bot className="h-5 w-5" />}
                                                    </AvatarFallback>
                                                </Avatar>
                                            )}
                                        </div>
                                    );
                                })}
                                <div ref={chatEndRef} />
                             </div>
                        </ScrollArea>
                        <div className="mt-auto flex items-center gap-2 pt-4 border-t bg-white p-2 rounded-xl shadow-inner">
                            <Input 
                                placeholder="Type as Support to reply..." 
                                value={adminInput}
                                onChange={e => setAdminInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !isSending && handleAdminSend()}
                                disabled={isSending}
                                className="border-none focus-visible:ring-0"
                            />
                            <Button onClick={handleAdminSend} disabled={isSending || !adminInput.trim()} size="icon" className="rounded-full h-10 w-10">
                                {isSending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                </AccordionContent>
            </AccordionItem>
        )
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Aggregating Support Channels...</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-6 text-left">
            <CardHeader className="px-0 pt-0 text-left">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left">
                    <div className="text-left">
                        <CardTitle className="flex items-center gap-2 text-2xl font-black font-headline text-left"><MessageSquare className="text-primary" /> Member Support Inbox</CardTitle>
                        <CardDescription className="text-left">Central oversight for all community and AI assistant interactions.</CardDescription>
                    </div>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Filter by company name or ID..." 
                            className="pl-9 h-10 bg-white" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-0 text-left">
                {conversations.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full text-left">
                        {conversations
                            .filter(convo => convo.company)
                            .map((convo) => (
                           <Conversation key={convo.company!.id} convo={convo} />
                        ))}
                    </Accordion>
                ) : (
                    <div className="text-center py-32 border-dashed border-2 rounded-3xl bg-muted/10">
                        <div className="bg-white p-6 rounded-full w-fit mx-auto mb-6 shadow-sm">
                            <MessageSquare className="h-12 w-12 text-muted-foreground/30" />
                        </div>
                        <h3 className="text-2xl font-black font-headline text-foreground">Inbox Zero</h3>
                        <p className="text-muted-foreground mt-2 max-w-xs mx-auto">No active support conversations found matching your criteria.</p>
                    </div>
                )}
            </CardContent>
        </div>
    );
}