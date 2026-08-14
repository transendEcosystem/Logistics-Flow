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
import { Loader2, Bot, Sparkles, AlertTriangle, Settings, Info } from 'lucide-react';
import { leadGenerationFlow, type LeadGenerationInput } from '@/ai/flows/lead-generation-flow';
import Link from 'next/link';
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const LeadGenerationInputSchema = z.object({
  prompt: z.string().min(20, 'Please provide a detailed prompt.').describe('A detailed prompt for the AI agent, instructing it what to research.'),
});


const defaultPrompt = `You are an AI research assistant. Your goal is to find 5 potential leads for transport companies in South Africa that would be good candidates for our logistics platform. For each lead, find the company name, their likely role (e.g., "Vendor", "Buyer", "Transporter"), a physical address, a website, a phone number, and an email address if possible. Format the output as a list of leads.`;

export default function LeadsAgent() {
    const [isLoading, setIsLoading] = useState(false);
    const [configError, setConfigError] = useState<string | null>(null);
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
        setConfigError(null);
        try {
            const result = await leadGenerationFlow(values);
            
            if (result.error) {
                setConfigError(result.error);
                return;
            }

            if (result.leads && result.leads.length > 0) {
                 toast({
                    title: "Leads Found!",
                    description: `${result.leads.length} potential leads have been discovered.`,
                });
                
                const queryParams = new URLSearchParams({
                    view: 'leads-database',
                    action: 'add-member',
                });
                
                const firstLead = result.leads[0];
                if(firstLead.companyName) queryParams.set('newCompanyName', firstLead.companyName);
                if(firstLead.role) queryParams.set('newRole', firstLead.role);
                if(firstLead.address) queryParams.set('newAddress', firstLead.address);
                if(firstLead.website) queryParams.set('newWebsite', firstLead.website);
                if(firstLead.phone) queryParams.set('newPhone', firstLead.phone);
                if(firstLead.email) queryParams.set('newEmail', firstLead.email);
                if(firstLead.contactPerson) queryParams.set('newContactPerson', firstLead.contactPerson);

                router.push(`/adminaccount?${queryParams.toString()}`);

            } else {
                 toast({
                    variant: "destructive",
                    title: "No Leads Found",
                    description: "The agent could not find any leads matching your criteria. Try making your search prompt more general.",
                });
            }

        } catch (e: any) {
            console.error("Lead generation failed:", e);
            const errorMessage = e.message || "An unexpected error occurred.";
            setConfigError(errorMessage);
            toast({
                variant: 'destructive',
                title: 'Lead Generation Failed',
                description: errorMessage,
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast, router]);

    return (
        <div className="space-y-6">
            {configError && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Configuration Issue Detected</AlertTitle>
                    <AlertDescription>
                        <p className="font-mono text-xs whitespace-pre-wrap">{configError}</p>
                        <div className="mt-4 flex gap-2">
                             <Button asChild variant="outline" size="sm" className="text-destructive-foreground border-destructive">
                                <Link href="/docs/enable-gemini-api.md" target="_blank">View Setup Guide</Link>
                            </Button>
                            <Button asChild variant="link" size="sm" className="text-destructive-foreground">
                                <Link href="/docs/quota-increase-guide.md" target="_blank">About Rate Limits (429)</Link>
                            </Button>
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bot className="h-6 w-6" />
                        AI Lead Generation Agent
                    </CardTitle>
                    <CardDescription>
                        Instruct the AI agent to research and generate potential sales leads. Results are sourced from real-time Google search data.
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
                                    <FormLabel>Agent Instructions</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Describe the type of companies, locations, and details you need..."
                                            className="min-h-[250px] font-mono text-sm"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="mt-4 flex items-start gap-2 p-3 bg-muted rounded-md text-xs text-muted-foreground">
                                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                                <p>To ensure accuracy, the agent will perform live web searches. If no results are found, try making your prompt more general or specifying a larger city.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="justify-between">
                             <Button type="button" variant="outline" onClick={() => form.reset({ prompt: defaultPrompt })}>
                                <Settings className="mr-2 h-4 w-4" />
                                Reset Prompt
                            </Button>
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
        </div>
    );
}
