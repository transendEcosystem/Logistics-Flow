'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Info, Zap, Search, ClipboardCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getClientSideAuthToken } from '@/firebase';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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

export function EnrichPartnerButton({ partner, onUpdate }: { partner: any, onUpdate: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLogging, setIsLogging] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const { toast } = useToast();

    const companyName = partner.companyName || partner.name || partner.trading_name || `${partner.firstName} ${partner.lastName}` || 'Unnamed Entity';

    const getPrompt = () => {
        return `ACT AS AN ELITE SOUTH AFRICAN INDUSTRIAL RESEARCH AGENT (V13.1 - INDUCTIVE SCAVENGER).
        
TASK: Complete a forensic gap-analysis for: "${companyName}". Use an aggressive, inductive reconstruction approach to eliminate all null fields.

INVESTIGATION MANDATE (V13.1 PROTOCOL):
1. IDENTITY EXPANSION: Resolve acronyms into full legal identities.
2. SOCIAL HUB RESILIENCY: For South African transport and industrial firms, the FACEBOOK PAGE "About" section is the PRIMARY source of truth for the physical address and WhatsApp. Prioritize this over outdated directories.
3. FRAGMENT STITCHING: Combine data fragments from Facebook, Yellosa, Brabys, and Infoisinfo.
4. IDENTITY RESOLUTION: You MUST find the NAMES AND DIRECT CONTACTS (Email/Mobile) for: CEO/MD, Marketing Lead, Operations Manager, and Technical Manager. If you find a name, perform a secondary search to resolve their contact details.
5. EVIDENCE ONLY: If multiple sources conflict, prioritize the most recent (usually the Facebook Bio).

RETURN ONLY A RAW JSON OBJECT. NO MARKDOWN. NO CODE BLOCKS. NO PREAMBLE.

{
  "record_id": "${partner.id}",
  "companyName": "FULL REGISTERED NAME",
  "industrial_category": "Refined Category",
  "website": "VERIFIED URL (WEBSITE OR FACEBOOK)",
  "email": "VERIFIED GENERAL EMAIL",
  "phone": "RSA LANDLINE",
  "address": "VERIFIED PHYSICAL ADDRESS (EXTRACTED FROM FACEBOOK BIO)",
  "marketingManager": { "name": "VERIFIED NAME", "email": "RESOLVED EMAIL", "mobile": "RESOLVED MOBILE" },
  "operationsManager": { "name": "VERIFIED NAME", "email": "RESOLVED EMAIL", "mobile": "RESOLVED MOBILE" },
  "technicalManager": { "name": "VERIFIED NAME", "email": "RESOLVED EMAIL", "mobile": "RESOLVED MOBILE" },
  "ceo": { "name": "VERIFIED NAME", "email": "RESOLVED EMAIL", "mobile": "RESOLVED MOBILE" },
  "primaryContactRole": "marketingManager",
  "minedServiceWording": "TECHNICAL SUMMARY MINED FROM SITE OR SOCIAL SECTIONS (300 WORDS)."
}`;
    };

    const handleCopyAndLog = async () => {
        setIsLogging(true);
        try {
            await navigator.clipboard.writeText(getPrompt());
            setIsCopied(true);

            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Session expired.");

            const isLead = partner.source === 'Lead' || !partner.type || partner.type === 'lead';
            const isLending = partner.source === 'Debtor' || partner.entryType === 'Debtor';

            await performAdminAction(token, 'logForensicInitiated', { 
                partnerId: partner.id,
                isLead,
                isLending
            });

            toast({ title: "V13.1 Scavenger Prompt Ready", description: "Prioritizing Facebook Bio and aggressive stakeholder resolution." });
            
            setTimeout(() => {
                setIsOpen(false);
                onUpdate();
            }, 1000);

        } catch (e: any) {
            toast({ variant: 'destructive', title: "Automation Error", description: e.message });
        } finally {
            setIsLogging(false);
        }
    };

    return (
        <>
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => { setIsCopied(false); setIsOpen(true); }} 
                title="Forensic Gap Analysis"
            >
                <Search className="h-4 w-4 text-primary" />
            </Button>

            <Dialog open={isOpen} onOpenChange={(o) => !isLogging && setIsOpen(o)}>
                <DialogContent className="sm:max-w-xl text-left text-foreground">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-left text-foreground font-black">
                            <Sparkles className="h-5 w-5 text-primary" />
                            Industrial Gap-Analysis V13.1
                        </DialogTitle>
                        <DialogDescription className="text-left text-foreground">
                            Generate an aggressive V13.1 scavenger command for <strong>{companyName}</strong>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4 text-left">
                        <Alert className="bg-primary/5 border-primary/20 text-left">
                            <Zap className="h-4 w-4 text-primary" />
                            <AlertTitle className="text-left font-bold">V13.1 Social-First Scavenger</AlertTitle>
                            <AlertDescription className="text-xs text-left leading-relaxed">
                                This protocol mandates the use of Facebook Bios for physical addresses and includes an aggressive "Double-Pivot" strategy to resolve stakeholder emails and mobile numbers.
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-2 text-left">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">AI Research Command</label>
                            <ScrollArea className="h-48 w-full border rounded-md p-3 bg-muted/30 text-left">
                                <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">{getPrompt()}</pre>
                            </ScrollArea>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button 
                            onClick={handleCopyAndLog} 
                            disabled={isLogging} 
                            className="w-full bg-primary hover:bg-primary/90 text-white font-bold"
                        >
                            {isLogging ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Search className="mr-2 h-4 w-4" />}
                            {isCopied ? 'V13.1 Command Ready!' : 'Copy V13.1 Scavenger Prompt'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
