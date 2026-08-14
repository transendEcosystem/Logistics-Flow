
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Bot, Sparkles, UserPlus } from 'lucide-react';
import { leadGenerationFlow, type LeadGenerationInput } from '@/ai/flows/lead-generation-flow';
import Link from 'next/link';
import React from 'react';

// Define the schema locally to avoid importing from a shared server/client file.
const LeadGenerationInputSchema = z.object({
  prompt: z.string().min(20, 'Please provide a detailed prompt.').describe('A detailed prompt for the AI agent, instructing it what to research.'),
});


const defaultPrompt = `You are an AI research assistant. Your goal is to find 5 potential leads for transport companies in South Africa that would be good candidates for our logistics platform. For each lead, find the company name, their likely role (e.g., "Vendor", "Buyer", "Transporter"), a physical address, a website, a phone number, and an email address if possible. Format the output as a list of leads.`;

export default function LeadsAgent() {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const form = useForm<LeadGenerationInput>({
        resolver: zodResolver(LeadGenerationInputSchema),
        defaultValues: {
            prompt: defaultPrompt,
        },
    });
    
    const onSubmit = useCallback(async (values: LeadGenerationInput) => {
        setIsLoading(true);
        try {
            const result = await leadGenerationFlow(values);
            
            if (result.leads && result.leads.length > 0) {
                 toast({
                    title: "Leads Found!",
                    description: `${result.leads.length} potential leads have been discovered.`,
                });
                const queryParams = new URLSearchParams({
                    view: 'leads-database',
                    action: 'add-member',
                });
                
                // For simplicity, we'll just pass the first lead's data. 
                // A real implementation might pass all leads or save them first.
                const firstLead = result.leads[0];
                if(firstLead.companyName) queryParams.set('newCompanyName', firstLead.companyName);
                if(firstLead.role) queryParams.set('newRole', firstLead.role);
                if(firstLead.address) queryParams.set('newAddress', firstLead.address);
                if(firstLead.website) queryParams.set('newWebsite', firstLead.website);
                if(firstLead.phone) queryParams.set('newPhone', firstLead.phone);
                if(firstLead.email) queryParams.set('newEmail', firstLead.email);
                if(firstLead.contactPerson) queryParams.set('newContactPerson', firstLead.contactPerson);

                router.push(`/backend?${queryParams.toString()}`);

            } else {
                 toast({
                    variant: "destructive",
                    title: "No Leads Found",
                    description: "The agent could not find any leads matching your criteria.",
                });
            }

        } catch (e: any) {
            let description: React.ReactNode = e.message;
            if (e.message?.includes('403 Forbidden') || e.message?.includes('API is not enabled')) {
                description = (
                    <>
                        The AI API is not enabled for your project, or billing is not set up.
                        <Button asChild variant="link" className="p-0 h-auto ml-1 text-xs -translate-y-px">
                            <Link href="/docs/enable-gemini-api.md" target="_blank">View Setup Guide</Link>
                        </Button>
                    </>
                );
            }
            toast({ variant: 'destructive', title: 'Lead Generation Failed', description });
        } finally {
            setIsLoading(false);
        }
    }, [toast, router]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bot className="h-6 w-6" />
                    AI Lead Generation Agent
                </CardTitle>
                <CardDescription>
                    Instruct the AI agent to research and generate potential sales leads. The results will be automatically added to the lead database.
                </CardDescription>
            </CardHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent>
                        <FormField
                            control={form.control}
                            name="prompt"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Agent Prompt</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Enter your detailed prompt here..."
                                        className="min-h-[250px] font-mono text-sm"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={isLoading}>
                             {isLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Sparkles className="mr-2 h-4 w-4" />
                            )}
                            Generate Leads
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    );
}
