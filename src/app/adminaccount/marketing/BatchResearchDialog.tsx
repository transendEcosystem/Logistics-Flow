
'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getClientSideAuthToken } from '@/firebase';
import { Loader2, Zap, Globe, ShieldCheck, AlertTriangle, SearchCode } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { transporterCategories } from './transporter-discovery';

interface BatchResearchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedLeads: any[];
    onComplete: () => void;
}

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

export function BatchResearchDialog({ open, onOpenChange, selectedLeads, onComplete }: BatchResearchDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const { toast } = useToast();

    const companyList = selectedLeads.map(l => `[KEY: ${l.id}] ${l.companyName || `${l.firstName} ${l.lastName}`}`).join('\n');
    const validCategories = transporterCategories.join(', ');

    const aiPrompt = `You are a verification-first research assistant working through a list of South African companies. Accuracy matters more than completeness.

For EACH company below, work through these stages in order:
1. IDENTIFY: find its official website and confirm it is this exact company in South Africa.
2. MAP: note which pages exist (Contact, About, Home, Team, Services).
3. CONTACT: read the Contact page and footer for address, landline, mobile/WhatsApp and general email.
4. POSITIONING: read Home and About for the company's own wording about its services.
5. PEOPLE: search broadly for the owner, CEO or MD and other senior staff. Record name and published business role.
6. SOCIAL: find its Facebook, LinkedIn and Instagram. The Facebook "About" tab is often the most current address source for SA industrial firms.
7. CROSS-REFERENCE: corroborate against yellosa.co.za, braby.com, infoisinfo.co.za, hotfrog.co.za, cylex.net.za, easyinfo.co.za, sayellow.com, yep.co.za, snupit.co.za, kompass.com. These are frequently stale — corroboration only. Prefer the company's own site on any conflict.

RULES:
- Do not answer from memory. Open the actual pages.
- Report only what you have seen on a page you opened. Otherwise null.
- null is a correct and expected answer. Do not fill gaps to make a record look complete.
- Never construct an email address or phone number from a pattern.
- Only record a person the source explicitly ties to THAT company. Do not hunt private personal contact details.
- A similarly named company is NOT a match. Do not substitute it.
- If you cannot identify a company, return that object with "notFound": true and all other fields null. Never drop a record and never merge two records.
- Return exactly one object per [KEY], with record_id set to that exact key.

OUTPUT HYGIENE: raw JSON array only. No markdown, no code fences, no commentary, no citation markers. Every URL must be the exact full page address you opened, starting with https:// and including the path. A bare domain such as "facebook.com" is not acceptable and will be discarded \u2014 give the complete profile URL or null. Do not repeat a URL within one record.

SERVICE WORDING RULES ("minedServiceWording"): use complete prose sentences from the About or Services page body. Never include navigation labels, menu items, page titles, buttons or footer text. Never include truncated fragments or ellipses. If the site has only generic filler with no substantive service description, return null.

SELF-AUDIT: for every non-null value, name the URL you read it on. If you cannot, set it to null.

LIST TO INVESTIGATE (RSA ENTITIES ONLY):
${companyList}

Each object:
- "record_id": exactly the [KEY] provided
- "companyName": official registered name, or null
- "industrial_category": one of [${validCategories}], or null
- "website": official URL, or null
- "email": general email actually published, or null
- "phone": RSA landline, or null
- "address": full RSA address, or null
- "marketingManager" / "operationsManager" / "technicalManager" / "ceo": { "name": null, "role": null, "email": null, "mobile": null }
- "socialProfiles": { "facebook": null, "linkedin": null, "instagram": null }
- "minedServiceWording": the company's own description of its services, or null
- "sourceUrls": every URL you actually opened
- "confidence": "high" | "medium" | "low"`;

    const handleCopyAndLogBatch = async () => {
        setIsLoading(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Auth failed");

            await navigator.clipboard.writeText(aiPrompt);
            setIsCopied(true);

            const leadIds = selectedLeads.map(l => l.id);
            const isLeadBatch = selectedLeads.length > 0 && (!selectedLeads[0].type || selectedLeads[0].type === 'lead');
            
            await performAdminAction(token, 'bulkLogForensicInitiated', { 
                leadIds,
                type: isLeadBatch ? 'lead' : 'partner'
            });

            toast({ title: "Batch prompt ready", description: "Verification-first: expect nulls where evidence is missing." });
            
            setTimeout(() => {
                onOpenChange(false);
                onComplete();
            }, 1000);

        } catch (e: any) {
            toast({ variant: 'destructive', title: "Log Failed", description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !isLoading && onOpenChange(o)}>
            <DialogContent className="sm:max-w-2xl text-left text-foreground">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-left font-black">
                        <SearchCode className="h-5 w-5 text-primary" />
                        Batch Research
                    </DialogTitle>
                    <DialogDescription className="text-left text-foreground">
                        Verification-first batch research across the selected records.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4 text-left text-foreground">
                    <Alert className="bg-primary/5 border-primary/20 text-left">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        <AlertTitle className="font-bold text-foreground text-left">Verification-first protocol</AlertTitle>
                        <AlertDescription className="text-xs text-left text-foreground">
                            The AI must return null for anything it cannot read on a live page, and may never guess email patterns. Check sourceUrls and confidence per record before capturing.
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-2 text-left">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">AI Research Command</label>
                        <ScrollArea className="h-64 w-full border rounded-md p-3 bg-muted/30 text-left text-foreground">
                            <pre className="text-[11px] whitespace-pre-wrap font-mono leading-relaxed text-foreground">{aiPrompt}</pre>
                        </ScrollArea>
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={handleCopyAndLogBatch} disabled={isLoading} className="w-full h-12 text-lg font-bold text-white">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Zap className="mr-2 h-4 w-4" />}
                        {isCopied ? 'Batch Prompt Ready!' : 'Copy Batch Research Prompt'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
