'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ShieldCheck, Zap, AlertTriangle, CheckCircle2, Info, Server, Terminal, Send, Mail, Globe, Check } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * ADMIN TECHNICAL GUIDES
 * Provides strategic advice on email deliverability, SendGrid vs AWS, and forensic outreach.
 */
export default function AdminGuides() {
    return (
        <div className="space-y-8 text-left text-foreground">
            <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-xl">
                    <ShieldCheck className="h-8 w-8 text-primary" />
                </div>
                <div className="text-left">
                    <h1 className="text-3xl font-black font-headline">Platform Oversight & Guides</h1>
                    <p className="text-muted-foreground">Technical blueprints for bypassing blocks and maintaining high-velocity flow.</p>
                </div>
            </div>

            <Tabs defaultValue="dispatch" className="w-full">
                <TabsList className="bg-muted/50 p-1 h-auto flex-wrap justify-start">
                    <TabsTrigger value="dispatch" className="gap-2 px-6 py-2.5 font-bold uppercase tracking-widest text-[10px]">
                        <Zap className="h-3.5 w-3.5" /> Outbound Dispatch
                    </TabsTrigger>
                    <TabsTrigger value="sendgrid" className="gap-2 px-6 py-2.5 font-bold uppercase tracking-widest text-[10px]">
                        <Mail className="h-3.5 w-3.5" /> SendGrid vs AWS
                    </TabsTrigger>
                    <TabsTrigger value="trust" className="gap-2 px-6 py-2.5 font-bold uppercase tracking-widest text-[10px]">
                        <ShieldCheck className="h-3.5 w-3.5" /> Trust Signals
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="dispatch" className="mt-8">
                    <Card className="shadow-xl border-none">
                        <CardHeader className="bg-slate-900 text-white rounded-t-xl">
                            <div className="flex items-center gap-3">
                                <Server className="h-6 w-6 text-primary" />
                                <CardTitle className="text-xl font-headline">Solving Outbound Account Blocks</CardTitle>
                            </div>
                            <CardDescription className="text-slate-400">Moving from Personal Inboxes to Transactional APIs.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <div className="space-y-4">
                                <h3 className="font-bold text-lg border-l-4 border-primary pl-4 text-foreground text-left">The "Account Lock" Issue</h3>
                                <p className="text-sm leading-relaxed text-muted-foreground text-left">
                                    If you are using **Outlook Desktop** or a standard **Microsoft 365** business account to send blasts, you will eventually be hit by "Outbound Spam Restrictions." This isn't the recipient blocking you—it's Microsoft stopping you from sending.
                                </p>
                                
                                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-3">
                                    <p className="text-xs font-bold text-amber-900 flex items-center gap-2 text-left">
                                        <AlertTriangle className="h-4 w-4" /> 
                                        The Way Forward: Transactional Dispatch
                                    </p>
                                    <p className="text-[11px] text-amber-800 leading-relaxed text-left">
                                        Instead of clicking "Open Outlook," you must use the **Automated Dispatch** tool. This tool is designed to route emails through a dedicated Transactional API (like SendGrid). These services have a "High Trust Score" and do not have the same sending locks as personal business accounts.
                                    </p>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-4 text-left">
                                <h3 className="font-bold text-lg flex items-center gap-2 text-foreground"><Zap className="h-5 w-5 text-amber-500" /> Deliverability Protocol</h3>
                                <ul className="space-y-4">
                                    <li className="flex items-start gap-3">
                                        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                                        <div className="text-sm">
                                            <p className="font-bold text-foreground">Zero-Step Sending</p>
                                            <p className="text-muted-foreground leading-tight">The "Automated Dispatch" button removes the human from the loop. It sends the mail directly from the server, bypassing your local Defender and desktop software.</p>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                                        <div className="text-sm">
                                            <p className="font-bold text-foreground">Content Variance</p>
                                            <p className="text-muted-foreground leading-tight">Always use the **Version Selector (V1-V5)**. Sending identical text in bulk is the fastest way to get your domain flagged as spam.</p>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="sendgrid" className="mt-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <Card className="border-primary/20 bg-primary/5">
                            <CardHeader>
                                <CardTitle className="text-lg">Option A: SendGrid (Recommended)</CardTitle>
                                <CardDescription>Fastest and easiest setup for small to medium scale.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm leading-relaxed">
                                <ul className="space-y-2">
                                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600"/> Setup takes 15 minutes.</li>
                                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600"/> No "Sandbox" restrictions.</li>
                                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600"/> Excellent dashboard for tracking "Opens".</li>
                                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600"/> Free tier (100 emails/day) or paid plans.</li>
                                </ul>
                                <Separator />
                                <p className="font-bold">Setup Steps:</p>
                                <ol className="list-decimal list-inside space-y-1 text-xs">
                                    <li>Create account at sendgrid.com.</li>
                                    <li>Verify your sender domain (Add DNS records).</li>
                                    <li>Generate an **API Key**.</li>
                                    <li>Paste key into your `.env` as `SENDGRID_API_KEY`.</li>
                                </ol>
                            </CardContent>
                        </Card>

                        <Card className="opacity-70 grayscale">
                            <CardHeader>
                                <CardTitle className="text-lg">Option B: AWS SES</CardTitle>
                                <CardDescription>Most cost-effective for millions of emails.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm leading-relaxed">
                                <ul className="space-y-2">
                                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-muted-foreground"/> Lowest cost per 1,000 emails.</li>
                                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-muted-foreground"/> Integrated with AWS ecosystem.</li>
                                    <li className="flex items-center gap-2 text-destructive font-bold">(!) Setup is complex (IAM, SMTP credentials).</li>
                                    <li className="flex items-center gap-2 text-destructive font-bold">(!) Starts in "Sandbox" mode (can't send to strangers).</li>
                                </ul>
                                <Separator />
                                <p className="font-bold">Setup Steps:</p>
                                <p className="text-[10px] italic">Requires AWS Management Console, IAM policy creation, and a formal request to move out of the sandbox (24-48 hours).</p>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="trust" className="mt-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>DNS Trust Signals</CardTitle>
                            <CardDescription>Records required to bypass a recipient's Microsoft Defender filters.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <p>Once you choose a provider, you **MUST** add these records to your domain (e.g., SimplyfiFlow.co.za) to stop being flagged as spam.</p>
                            <div className="grid gap-4">
                                <div className="p-4 border rounded-lg">
                                    <p className="font-bold">1. SPF (Sender Policy Framework)</p>
                                    <p className="text-xs text-muted-foreground">Tells the world which servers are allowed to send mail for you.</p>
                                </div>
                                <div className="p-4 border rounded-lg">
                                    <p className="font-bold">2. DKIM (DomainKeys Identified Mail)</p>
                                    <p className="text-xs text-muted-foreground">Adds a digital signature to every email to prove it wasn't tampered with.</p>
                                </div>
                                <div className="p-4 border rounded-lg">
                                    <p className="font-bold">3. DMARC</p>
                                    <p className="text-xs text-muted-foreground">The master policy that tells recipients what to do if SPF or DKIM fail.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
