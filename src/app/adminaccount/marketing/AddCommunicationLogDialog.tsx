
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getClientSideAuthToken } from '@/firebase';
import { Loader2, MessageSquarePlus } from 'lucide-react';
import { Input } from '@/components/ui/input';

const logSchema = z.object({
  type: z.string().min(1, "Please select a type."),
  subject: z.string().min(1, "Subject is required."),
  notes: z.string().optional(),
});
type LogFormValues = z.infer<typeof logSchema>;

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

export function AddCommunicationLogDialog({ partnerId, collection, onLogAdded }: { partnerId: string, collection?: string, onLogAdded: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLogging, setIsLogging] = useState(false);
    const { toast } = useToast();
    const form = useForm<LogFormValues>({ resolver: zodResolver(logSchema) });

    const handleSubmit = async (values: LogFormValues) => {
        setIsLogging(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");
            
            await performAdminAction(token, 'logCommunication', { 
                partnerId, 
                collection, // Pass the explicit collection if known
                ...values 
            });
            
            toast({ title: 'Communication Logged' });
            onLogAdded();
            setIsOpen(false);
            form.reset();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Failed to log communication', description: e.message });
        } finally {
            setIsLogging(false);
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title="Add Communication Log">
                    <MessageSquarePlus className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="text-left text-foreground">
                <DialogHeader>
                    <DialogTitle>Add Communication Log</DialogTitle>
                    <DialogDescription>Record a new interaction for this partner.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4 text-left">
                        <FormField control={form.control} name="type" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Communication Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder="Select a type..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Email">Email</SelectItem>
                                        <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                                        <SelectItem value="Call">Call</SelectItem>
                                        <SelectItem value="Meeting">Meeting</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="subject" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Subject</FormLabel>
                                <FormControl><Input {...field} placeholder="e.g., Follow-up Call" className="bg-white" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="notes" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Notes</FormLabel>
                                <FormControl><Textarea placeholder="Details of the conversation..." {...field} className="bg-white" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <DialogFooter>
                            <Button type="submit" disabled={isLogging}>
                                {isLogging && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Save Log
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
