'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Lock, ClipboardCheck, Save, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getClientSideAuthToken } from '@/firebase';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { parseAiJson } from '@/lib/ai-json';

async function performAdminAction(token: string, action: string, payload: any) {
  const response = await fetch('/api/admin', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload }),
  });
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error || `API Error for action: ${action}`);
  }
  return result;
}

function contactLine(label: string, contact: any) {
  if (!contact || typeof contact !== 'object') return null;
  const parts = [contact.name, contact.email, contact.mobile].filter(Boolean);
  return parts.length ? `${label}: ${parts.join(' | ')}` : null;
}

export function CommercialDeepDiveButton({ partner, onUpdate }: { partner: any; onUpdate: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [findings, setFindings] = useState('');
  const { toast } = useToast();

  const companyName = partner.companyName || partner.name || partner.trading_name || 'Unnamed Entity';

  // Stage 2 depends on the forensic scrape, so gate on the fields Stage 1 produces.
  const missingForensics = useMemo(() => {
    const gaps: string[] = [];
    if (!partner.website) gaps.push('Website / social hub');
    if (!partner.address) gaps.push('Physical address');
    if (!partner.email && !partner.phone) gaps.push('General contact (email or phone)');
    const hasStakeholder = ['ceo', 'marketingManager', 'operationsManager', 'technicalManager']
      .some(key => partner[key]?.name);
    if (!hasStakeholder) gaps.push('At least one named stakeholder');
    return gaps;
  }, [partner]);

  const isUnlocked = missingForensics.length === 0;
  const hasProfile = Boolean(partner.commercialProfile);

  const getPrompt = () => {
    const stakeholders = [
      contactLine('CEO/MD', partner.ceo),
      contactLine('Marketing', partner.marketingManager),
      contactLine('Operations', partner.operationsManager),
      contactLine('Technical', partner.technicalManager),
    ].filter(Boolean).join('\n');

    const harvested = partner.contentCorpus?.pages?.length
      ? `\n\nHARVESTED WEBSITE CONTENT (already retrieved, treat as verified):\n${partner.contentCorpus.pages.map((page: any) => `--- ${page.url}\n${page.text}`).join('\n\n').slice(0, 20000)}`
      : '';

    const profile = partner.serviceProfile
      ? `\nClassified services: ${(partner.serviceProfile.serviceTags || []).join(', ') || 'none'}. Coverage: ${(partner.serviceProfile.geographicCoverage || []).join(', ') || 'unknown'}.`
      : '';

    return `ACT AS A SENIOR COMMERCIAL INTELLIGENCE ANALYST FOR LOGISTICS FLOW (SOUTH AFRICA).

CONTEXT: A forensic gap-analysis has already been completed on this company. The facts below are VERIFIED. Do not re-verify them. Use them as your entry points for a deep commercial investigation.

VERIFIED RECORD
Company: ${companyName}
Category: ${partner.industrial_category || partner.industry || 'Unclassified'}
Website / Social: ${partner.website || 'n/a'}
Address: ${partner.address || 'n/a'}
General email: ${partner.email || 'n/a'}
Phone: ${partner.phone || 'n/a'}
${stakeholders || 'Stakeholders: none captured'}${profile}${harvested}

TASK: Perform a full-depth commercial read of this business. Open and read every page of the verified website, plus its social feeds, news mentions, tender awards, job adverts, industry association listings and customer references. Job adverts and tender records are high-signal: they reveal growth, fleet size, systems in use and operational pain.

ABSOLUTE RULES:
1. Do NOT answer from memory. Open the actual pages.
2. Every factual claim must trace to a page you opened. If it does not, the value is null.
3. null is a CORRECT answer. Do not pad the profile.
4. Separate fact from judgement. Anything in "scaleIndicators", "keyCustomersOrContracts", "systemsAndTech", "growthSignals" and "riskSignals" must be observed, with its source named. Anything in "operationalPainPoints" and "commercialOpportunity" is your inference — mark it as such and state what observed fact it rests on.
5. Do NOT state revenue, fleet size, headcount or deal size as fact unless a source states it. If you are reasoning to a range, label it clearly as an estimate and give the basis.
6. The "openingMessage" may only reference facts that appear in your verified findings. Do not flatter the company with details you did not confirm.
7. If the website does not resolve or the company cannot be researched, return {"notFound": true} and nothing else.

SELF-AUDIT BEFORE YOU ANSWER: for every observed claim, name the URL. If you cannot, null it.

RETURN ONLY A RAW JSON OBJECT. NO MARKDOWN. NO CODE BLOCKS. NO PREAMBLE.

{
  "record_id": "${partner.id}",
  "businessModel": "How they actually make money, per their own published wording. null if unclear.",
  "servicesOffered": ["Discrete service lines, as published"],
  "operatingFootprint": "Depots, corridors, provinces, cross-border routes, as published.",
  "scaleIndicators": { "fleetOrAssets": null, "headcountEstimate": null, "yearsTrading": null, "basis": "Which source stated each, or 'estimate: <reasoning>'." },
  "customerProfile": "Who they serve, per published evidence.",
  "keyCustomersOrContracts": ["Only named clients, tenders or contracts you actually found"],
  "systemsAndTech": ["Software, tracking, ERP or portals they reference publicly"],
  "growthSignals": ["Observed: expansion, hiring, new depots, equipment, funding — with source"],
  "riskSignals": ["Observed: litigation, negative press, dormant socials, closures — with source"],
  "operationalPainPoints": ["INFERRED. Each entry must cite the observed fact it rests on."],
  "commercialOpportunity": {
    "bestFitOffering": "Which Logistics Flow capability to lead with.",
    "valueHypothesis": "INFERRED. The specific commercial gain for them.",
    "estimatedDealSize": "Label as estimate and give the basis, or null.",
    "buyingTriggers": ["Events that make them buy now, tied to observed evidence"]
  },
  "engagementStrategy": {
    "targetContact": "Which named stakeholder from the verified record, and why.",
    "channel": "Email, WhatsApp, LinkedIn or phone, with reasoning.",
    "openingMessage": "Under 120 words. May only reference confirmed facts.",
    "objectionsToExpect": ["Likely objections and the counter for each"]
  },
  "confidence": "high | medium | low",
  "sourcesUsed": ["Every URL you actually opened"],
  "couldNotVerify": ["What you looked for but could not confirm"]
}`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getPrompt());
      setIsCopied(true);
      const token = await getClientSideAuthToken();
      if (token) {
        await performAdminAction(token, 'logDeepDiveInitiated', { partnerId: partner.id, collection: partner.sourceCollection });
      }
      toast({ title: 'Deep-dive command copied', description: 'Paste into Chrome AI mode, then return the JSON below.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Copy failed', description: e.message });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const parsed = parseAiJson(findings);
      if (parsed?.notFound) throw new Error('The research returned "notFound" for this company. Nothing to save.');

      const token = await getClientSideAuthToken();
      if (!token) throw new Error('Session expired.');

      await performAdminAction(token, 'saveCommercialDeepDive', {
        partnerId: partner.id,
        collection: partner.sourceCollection,
        commercialProfile: parsed,
      });

      toast({ title: 'Commercial profile saved', description: `${companyName} is now engagement-ready.` });
      setFindings('');
      setIsOpen(false);
      onUpdate();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Save failed', description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => { setIsCopied(false); setIsOpen(true); }}
        title={isUnlocked ? 'Commercial Deep Dive' : 'Commercial Deep Dive (run Forensic Gap Analysis first)'}
      >
        <Sparkles className={`h-4 w-4 ${isUnlocked ? (hasProfile ? 'text-emerald-600' : 'text-amber-500') : 'text-muted-foreground/40'}`} />
      </Button>

      <Dialog open={isOpen} onOpenChange={o => !isSaving && setIsOpen(o)}>
        <DialogContent className="sm:max-w-2xl text-left text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-black">
              <Sparkles className="h-5 w-5 text-primary" />
              Commercial Deep Dive
              {hasProfile && <Badge variant="secondary" className="ml-2">Profile on record</Badge>}
            </DialogTitle>
            <DialogDescription className="text-left text-foreground">
              Stage 2 research for <strong>{companyName}</strong>. Turns the forensic record into a commercial reality we can sell against.
            </DialogDescription>
          </DialogHeader>

          {!isUnlocked ? (
            <Alert variant="destructive" className="text-left">
              <Lock className="h-4 w-4" />
              <AlertTitle className="font-bold">Forensic Gap Analysis required first</AlertTitle>
              <AlertDescription className="text-xs leading-relaxed">
                The deep dive is seeded by the scraped record. Run the <Search className="inline h-3 w-3" /> Forensic Gap Analysis and capture the results before continuing. Still missing:
                <ul className="list-disc ml-4 mt-2 space-y-0.5">
                  {missingForensics.map(gap => <li key={gap}>{gap}</li>)}
                </ul>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Step 1 &mdash; Deep-dive research command
                </label>
                <ScrollArea className="h-44 w-full border rounded-md p-3 bg-muted/30">
                  <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">{getPrompt()}</pre>
                </ScrollArea>
                <Button onClick={handleCopy} variant="outline" className="w-full font-bold">
                  {isCopied ? <ClipboardCheck className="mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  {isCopied ? 'Copied — run it in Chrome AI mode' : 'Copy Deep-Dive Command'}
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Step 2 &mdash; Paste the returned JSON
                </label>
                <Textarea
                  value={findings}
                  onChange={e => setFindings(e.target.value)}
                  placeholder='{ "businessModel": "...", "commercialOpportunity": { ... } }'
                  className="h-36 font-mono text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={handleSave}
              disabled={!isUnlocked || isSaving || !findings.trim()}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold"
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Commercial Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
