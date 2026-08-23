'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, MessageSquare, Send, Bot, AlertTriangle, RefreshCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser, getClientSideAuthToken } from '@/firebase';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { format as formatDateFns } from 'date-fns';

const formatDate = (dateValue: any) => {
    if (!dateValue) return 'Sending...';
    const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
    if (isNaN(date.getTime())) return 'Just now';
    return formatDateFns(date, "dd MMM yyyy, HH:mm");
};

interface SupportMessage {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    timestamp: any;
    deliveryState?: 'sending' | 'sent' | 'failed';
}

export default function SupportChatContent() {
    const { user, isUserLoading } = useUser();
    const { toast } = useToast();
    const [inputFieldText, setInputFieldText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);
    const [sendStatus, setSendStatus] = useState('');
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const companyId = useMemo(() => user?.companyId || null, [user]);

    const [messages, setMessages] = useState<SupportMessage[] | null>(null);
    const [areMessagesLoading, setAreMessagesLoading] = useState(true);
    const [permissionError, setPermissionError] = useState<Error | null>(null);

    const loadMessages = async () => {
        const token = await getClientSideAuthToken();
        if (!token || !companyId) {
            setAreMessagesLoading(false);
            return;
        }
        setAreMessagesLoading(true);
        try {
            const response = await fetch('/api/support/messages', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || 'Support messages unavailable.');
            setMessages(result.messages || []);
            setPermissionError(null);
        } catch (error: any) {
            setPermissionError(error);
        } finally {
            setAreMessagesLoading(false);
        }
    };

    useEffect(() => { loadMessages(); }, [companyId, user?.uid]);

    const isLoading = isUserLoading || areMessagesLoading || isRetrying;
    
    useEffect(() => {
        if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
            }
        }
    }, [messages]);

    const handleRetry = () => {
        setIsRetrying(true);
        loadMessages();
        setTimeout(() => setIsRetrying(false), 1000);
    };

    const handleSend = async () => {
        if (!inputFieldText.trim() || !user || !companyId) return;

        setIsSending(true);
        const userMessageText = inputFieldText;
        setInputFieldText('');
        const pendingMessageId = `pending-${Date.now()}`;
        setMessages((current) => [...(current || []), {
            id: pendingMessageId,
            text: userMessageText,
            senderId: user.uid,
            senderName: user.displayName || 'Member',
            timestamp: new Date().toISOString(),
            deliveryState: 'sending',
        }]);

        try {
            setSendStatus('Saving your message...');
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");

            const path = `companies/${companyId}/supportMessages`;
            const userMessageData = {
                text: userMessageText,
                senderId: user.uid,
                senderName: user.displayName || 'Member',
                timestamp: { _methodName: 'serverTimestamp' },
                readByAdmin: false,
                companyId: companyId,
            };
            
            const userResponse = await fetch('/api/addUserDoc', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ collectionPath: path, data: userMessageData }),
            });
            const userResult = await userResponse.json();
            if (!userResponse.ok || !userResult.success) throw new Error(userResult.error || 'Could not save your support message.');
            setMessages((current) => (current || []).map((message) => message.id === pendingMessageId ? { ...message, id: userResult.id || pendingMessageId, deliveryState: 'sent' } : message));
            setSendStatus('Message sent. The AI assistant is preparing a response...');

            const historyForApi: { role: 'user' | 'model'; content: { text: string; }[] }[] = (messages || [])
                .filter(m => !!m && typeof m === 'object' && m.senderId && m.text)
                .map(msg => {
                    const role: 'user' | 'model' = msg.senderId === user.uid ? 'user' : 'model';
                    return { role, content: [{ text: msg.text }] };
                });

            const aiController = new AbortController();
            const aiTimeout = window.setTimeout(() => aiController.abort(), 45000);
            const aiResponse = await fetch('/api/support', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: userMessageText, history: historyForApi }),
                signal: aiController.signal,
            });
            window.clearTimeout(aiTimeout);
            const aiResult = await aiResponse.json();
            if (!aiResponse.ok || !aiResult.success) throw new Error(aiResult.error || 'The support assistant is unavailable.');

            const aiMessageData = {
                text: aiResult.response,
                senderId: 'ai-assistant',
                senderName: 'AI Assistant',
                timestamp: { _methodName: 'serverTimestamp' },
                readByAdmin: false,
                companyId: companyId,
            };

            const aiMessageResponse = await fetch('/api/addUserDoc', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ collectionPath: path, data: aiMessageData }),
            });
            const aiMessageResult = await aiMessageResponse.json();
            if (!aiMessageResponse.ok || !aiMessageResult.success) throw new Error(aiMessageResult.error || 'Could not save the assistant response.');
            setSendStatus('Response received.');
            await loadMessages();

        } catch (error: any) {
            setMessages((current) => (current || []).map((message) => message.id === pendingMessageId ? { ...message, deliveryState: 'failed' } : message));
            setSendStatus(`Message status: ${error.message}`);
            toast({ variant: 'destructive', title: 'Send Failed', description: error.message });
            setInputFieldText(userMessageText);
        } finally {
            setIsSending(false);
        }
    };

    if (permissionError) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] p-4 text-center">
                <Card className="border-destructive bg-destructive/5 max-w-md w-full shadow-lg text-left">
                    <CardHeader>
                        <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-4" />
                            <CardTitle className="text-destructive font-black text-center uppercase tracking-tight">Support Chat Unavailable</CardTitle>
                            <CardDescription className="text-center">We could not load your secure support channel.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {permissionError.message || 'Please retry the secure support channel.'}
                        </p>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2">
                        <Button onClick={handleRetry} className="w-full font-bold" disabled={isRetrying}>
                            {isRetrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
                            Retry Handshake
                        </Button>
                        <Button variant="ghost" asChild className="text-xs font-bold uppercase tracking-widest"><Link href="/account">Return to Dashboard</Link></Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <Card className="h-[calc(100vh-10rem)] flex flex-col border-none shadow-none text-left">
            <CardHeader className="px-0 text-left">
                <CardTitle className="flex items-center gap-2 text-foreground font-black font-headline text-left"><MessageSquare /> Support Chat</CardTitle>
                <CardDescription className="text-muted-foreground text-left">Direct line to our AI assistant and human support division.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-[0px] p-0 text-left">
                <ScrollArea className="flex-1 pr-4 -mr-4 mb-4" ref={scrollAreaRef as any}>
                    <div className="space-y-4 pt-2 text-left">
                        {isLoading && !messages ? (
                             <div className="flex justify-center items-center py-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
                        ) : !companyId && !isUserLoading ? (
                            <Alert variant="destructive" className="border-none bg-destructive/10 text-left">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle className="font-bold text-left">Node Uninitialized</AlertTitle>
                                <AlertDescription className="text-left">
                                    Please complete your profile to authorize this channel.
                                    <Button asChild variant="link" className="p-0 h-auto ml-1">
                                        <Link href="/account?view=profile">Edit Profile</Link>
                                    </Button>
                                </AlertDescription>
                            </Alert>
                        ) : (
                            messages?.map((msg: any) => {
                                const isMember = msg.senderId === user?.uid;
                                const isAI = msg.senderId === 'ai-assistant';
                                const alignment = isMember ? "justify-end" : "justify-start";

                                return (
                                    <div key={msg.id} className={cn("flex items-end gap-2", alignment)}>
                                        {!isMember && (
                                            <Avatar className="h-8 w-8">
                                                <AvatarFallback className={isAI ? 'bg-secondary' : 'bg-muted'}>{isAI ? <Bot className="h-5 w-5" /> : 'AD'}</AvatarFallback>
                                            </Avatar>
                                        )}
                                        <div className={cn(
                                            "rounded-2xl px-4 py-2 max-w-[85%] text-sm shadow-sm", 
                                            isMember ? "bg-primary text-primary-foreground rounded-br-none" : 
                                            isAI ? "bg-blue-100 text-blue-900 rounded-bl-none" :
                                            "bg-white border rounded-bl-none"
                                        )}>
                                            <p className="font-black text-[10px] mb-1 opacity-70 uppercase tracking-widest leading-none">{msg.senderName}</p>
                                            <p className="leading-relaxed">{msg.text}</p>
                                            <p className="text-[9px] opacity-40 mt-1 text-right">{formatDate(msg.timestamp)}</p>
                                        </div>
                                        {isMember && (
                                            <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">{user?.displayName?.charAt(0) || 'U'}</AvatarFallback></Avatar>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </ScrollArea>
                <div className="mt-auto flex items-center gap-2 pt-4 border-t text-left">
                    <input 
                        placeholder={companyId ? "Ask a question..." : "Waiting for identity synchronization..."}
                        value={inputFieldText}
                        onChange={e => setInputFieldText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !isSending && handleSend()}
                        disabled={isSending || !companyId}
                        className="flex h-12 w-full rounded-full border border-input bg-slate-100 px-6 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-inner"
                    />
                    <Button onClick={handleSend} disabled={isSending || !companyId || !inputFieldText.trim()} size="icon" className="rounded-full h-12 w-12 shrink-0 shadow-lg">
                        {isSending ? <Loader2 className="h-5 w-5 animate-spin"/> : <Send className="h-5 w-5" />}
                    </Button>
                </div>
                {sendStatus && <p className={cn("text-xs mt-2", sendStatus.startsWith('Message status:') ? 'text-destructive' : 'text-muted-foreground')}>{sendStatus}</p>}
            </CardContent>
        </Card>
    );
}
