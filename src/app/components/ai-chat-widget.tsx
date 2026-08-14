
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bot, Send, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supportQuery } from '@/ai/flows/support-flow';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

type Message = {
    role: 'user' | 'model';
    text: string;
};

export default function AIChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    // Effect to scroll to bottom when messages change
    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages]);


    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: Message = { role: 'user', text: input };
        
        // Immediately update the UI with the user's new message.
        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        setIsLoading(true);

        try {
            // Build history for the API call from the messages state *before* the new user message.
            const historyForApi = messages.map(msg => ({
                role: msg.role,
                content: [{ text: msg.text }],
            }));
            
            // Call the AI with the old history and the new query.
            const result = await supportQuery({ 
                history: historyForApi,
                query: currentInput, 
            });
            
            const modelMessage: Message = { role: 'model', text: result.response };
            setMessages(prev => [...prev, modelMessage]);

        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'AI Assistant Error',
                description: error.message || 'Could not get a response from the assistant.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg"
                    size="icon"
                >
                    <Bot className="h-8 w-8" />
                    <span className="sr-only">Open AI Assistant</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 md:w-96 mr-4 p-0" side="top" align="end">
                <div className="flex flex-col h-[60vh]">
                    <div className="flex items-center justify-between p-4 border-b bg-muted/50 rounded-t-lg">
                        <h3 className="font-semibold flex items-center gap-2">
                            <Bot className="h-5 w-5 text-primary" />
                            AI Assistant
                        </h3>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <ScrollArea className="flex-1 p-4" ref={scrollAreaRef as any}>
                        <div className="space-y-4">
                            {messages.map((message, index) => (
                                <div key={index} className={cn("flex items-end gap-2", message.role === 'user' ? 'justify-end' : 'justify-start')}>
                                    {message.role === 'model' && (
                                        <Avatar className="h-8 w-8">
                                            <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
                                        </Avatar>
                                    )}
                                    <div className={cn("rounded-lg px-3 py-2 max-w-[80%] text-sm", message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                                        <p className="whitespace-pre-wrap">{message.text}</p>
                                    </div>
                                </div>
                            ))}
                             {isLoading && (
                                <div className="flex items-start gap-3">
                                    <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback></Avatar>
                                    <div className="rounded-lg px-3 py-2 bg-muted"><Loader2 className="h-4 w-4 animate-spin"/></div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    <div className="p-4 border-t">
                        <div className="flex items-center gap-2">
                            <Input
                                placeholder="Ask a question..."
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSend()}
                                disabled={isLoading}
                            />
                            <Button size="icon" onClick={handleSend} disabled={isLoading}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
