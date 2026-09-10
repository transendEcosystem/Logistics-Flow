'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, ClipboardCheck, Save, Mail, MessageSquare, CalendarDays, AlertTriangle, Target, ExternalLink, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getClientSideAuthToken } from '@/firebase';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

function displayValue(value: any, fallback = 'Not established') {
  if (value === null || value === undefined || value === '') return fallback;
  if (Array.isArray(value)) return value.filter(Boolean).join(', ') || fallback;
  if (typeof value === 'object') return Object.values(value).filter(Boolean).join(' | ') || fallback;
  return String(value);
}

function compactText(value: any, maxLength = 180) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function parseDeepDiveJson(text: string) {
  try {
    return parseAiJson(text);
  } catch (error) {
    const raw = String(text || '').trim();
    const start = raw.indexOf('{');
    if (start === -1) throw error;
    let candidate = raw.slice(start)
      .replace(/```[\s\S]*$/g, '')
      .replace(/,\s*$/g, '')
      .trim();

    if (/"sourcesUsed"\s*:\s*\[[\s\S]*$/m.test(candidate) && !/"couldNotVerify"\s*:/.test(candidate)) {
      candidate = candidate.replace(/"sourcesUsed"\s*:\s*\[[\s\S]*$/m, '"sourcesUsed": [], "couldNotVerify": ["Output was truncated after sourcesUsed; source list was not saved."]}');
    } else if (/"couldNotVerify"\s*:\s*\[[\s\S]*$/m.test(candidate)) {
      candidate = candidate.replace(/"couldNotVerify"\s*:\s*\[[\s\S]*$/m, '"couldNotVerify": ["Output was truncated after couldNotVerify."]}');
    }

    return parseAiJson(candidate);
  }
}

function messagePack(profile: any, companyName: string) {
  const strategy = profile?.engagementStrategy || {};
  const target = typeof strategy.targetContact === 'object' ? strategy.targetContact : {};
  const firstName = String(target.name || 'there').trim().split(/\s+/)[0];
  const opportunity = profile?.commercialOpportunity || {};
  const opening = strategy.openingMessage || `We identified ${companyName} as a relevant supplier for the Logistics Flow transport and fleet community.`;
  const offer = opportunity.bestFitOffering || 'a verified supplier profile, relevant category discovery and qualified enquiry tracking';
  return {
    email: `Subject: A practical growth opportunity for ${companyName}\n\nHello ${firstName},\n\n${opening}\n\nWe believe Logistics Flow can support ${companyName} through ${offer}.\n\nWould you be open to a short discussion on a measured pilot?\n\nKind regards,\nLogistics Flow`,
    whatsapp: `Hello ${firstName}, ${opening} Could we arrange a short call to discuss a practical supplier-profile and enquiry opportunity?`,
    meeting: `Meeting focus: ${companyName}'s products, customer segments, digital-presence gaps, enquiry paths and pilot success metrics.`,
  };
}

function buildNoPresenceProfile(companyName: string) {
  return {
    notFound: true,
    onlinePresence: {
      website: { status: 'not_found', url: null, evidence: 'No credible official website or public social profile was found during the research.' },
      socialProfiles: [],
      presenceSummary: 'No credible public online presence was identified. This is a research finding, not a claim that the business is inactive.',
    },
    contactability: {
      emailVerification: { email: null, domain: null, domainStatus: 'unverifiable', mxStatus: 'not_checked', bounceRisk: 'high', evidence: 'No current public email source was verified.' },
      phoneVerification: { phone: null, status: 'unverifiable', evidence: 'Manual verification required.' },
      recommendedChannel: 'manual_verification',
      reason: 'No verified public digital channel was found.',
    },
    presenceGaps: [{ gap: 'No verified website or active public social presence', evidence: 'not found after search', impact: 'Prospective transport and fleet customers have no clear searchable route to verify services, find product information, or make an enquiry.' }],
    businessModel: null,
    servicesOffered: [],
    commercialOpportunity: { bestFitOffering: 'A verified Logistics Flow supplier profile with searchable categories and direct enquiry capture.', valueHypothesis: 'INFERRED. A verified profile can create a discoverable industrial entry point.', buyingTriggers: ['Validate the company details directly before proposing the profile.'] },
    engagementStrategy: { targetContact: { name: null, role: null, email: null, mobile: null, reason: 'Confirm the correct decision maker directly.' }, channel: 'manual_verification', openingMessage: `We are mapping suppliers that serve transport and fleet operators. We could not verify a current public profile for ${companyName}, so we would like to confirm your services and current sales channels.`, objectionsToExpect: ['We do not need online marketing: position this as qualified industrial discovery and enquiry measurement.'] },
    partnershipStrategy: { recommendedModel: 'Start with an information-validation call, then propose a measured supplier-profile pilot.', platformPlacement: ['Verified supplier profile after company details are confirmed'], recommendedTags: [], directEnquiryActions: ['Request company information', 'Request a quote'], meetingAgenda: ['Confirm services, ideal customers and current sales channels'], discoveryQuestions: ['How do customers currently find and contact the business?'], nextActions: ['Verify a business contact and current trading status.', 'Use the validation message to request a short call.'] },
    engagementPack: { emailSubject: `Confirming ${companyName}'s industrial supplier profile`, emailBody: `Hello,\n\nWe are mapping suppliers that serve South African transport and fleet operators. We could not verify a current public profile for ${companyName}, so we would value a short conversation to confirm your services and existing sales channels.\n\nKind regards,\nLogistics Flow`, whatsAppMessage: `Hello, we are mapping suppliers serving the transport and fleet sector. We could not verify a current public profile for ${companyName} and would value a short call to confirm your services.`, meetingRequest: 'Request a brief validation call.', callToAction: 'Confirm the correct contact and availability for a short validation call.' },
    confidence: 'low',
    sourcesUsed: [],
    couldNotVerify: ['Official website', 'Public social profiles', 'Business positioning and services'],
  };
}

export function CommercialDeepDiveButton({ partner, onUpdate, onEngage }: { partner: any; onUpdate: () => void; onEngage?: (partner: any) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [findings, setFindings] = useState('');
  const { toast } = useToast();

  const companyName = partner.companyName || partner.name || partner.trading_name || 'Unnamed Entity';

  const hasProfile = Boolean(partner.commercialProfile);
  const parsedFindings = (() => {
    if (!findings.trim()) return null;
    try { return parseDeepDiveJson(findings); } catch { return null; }
  })();
  const profile = parsedFindings || partner.commercialProfile;
  const engagement = messagePack(profile, companyName);

  const engagementPartner = (() => {
    const target = profile?.engagementStrategy?.targetContact;
    const researchedTarget = target && typeof target === 'object' ? target : {};
    const verifiedEmail = researchedTarget.email || profile?.contactability?.emailVerification?.email || '';
    const verifiedPhone = researchedTarget.mobile || profile?.contactability?.phoneVerification?.phone || '';
    const researchedName = researchedTarget.name || partner.contactPerson || '';
    if (!researchedName && !verifiedEmail && !verifiedPhone) return partner;
    const role = String(researchedTarget.role || '').toLowerCase();
    const primaryContactRole = /market|sales|brand/.test(role) ? 'marketingManager' : /operat|logistics|fleet/.test(role) ? 'operationsManager' : /technical|workshop|maintenance|engineer/.test(role) ? 'technicalManager' : 'ceo';
    return {
      ...partner,
      email: verifiedEmail || partner.email,
      phone: verifiedPhone || partner.phone,
      ...(researchedName ? {
        primaryContactRole,
        [primaryContactRole]: { name: String(researchedName), role: String(researchedTarget.role || ''), email: String(verifiedEmail), mobile: String(verifiedPhone) },
      } : {}),
    };
  })();

  const copyText = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: `${label} copied`, description: 'Ready to review or paste into the engagement workflow.' });
  };

  const getPrompt = () => {
    const stakeholders = [
      contactLine('CEO/MD', partner.ceo),
      contactLine('Marketing', partner.marketingManager),
      contactLine('Operations', partner.operationsManager),
      contactLine('Technical', partner.technicalManager),
    ].filter(Boolean).join('\n');

    const harvested = partner.contentCorpus?.pages?.length
      ? `\n\nHARVESTED WEBSITE EVIDENCE (already retrieved, use as orientation only; open the pages yourself before making claims):\n${partner.contentCorpus.pages.slice(0, 8).map((page: any) => `--- ${page.url}\nTitle: ${page.title || 'Untitled'}\nWords: ${page.wordCount || 0}\nSnippet: ${compactText(page.text)}`).join('\n\n')}`
      : '';

    const profile = partner.serviceProfile
      ? `\nClassified services: ${(partner.serviceProfile.serviceTags || []).join(', ') || 'none'}. Coverage: ${(partner.serviceProfile.geographicCoverage || []).join(', ') || 'unknown'}.`
      : '';

    return `Research this South African supplier for Logistics Flow. Open public pages yourself. Return only verified facts; use null when unverified.

TARGET
Company: ${companyName}
Category: ${partner.industrial_category || partner.industry || 'Unclassified'}
Website / Social: ${partner.website || 'n/a'}
Address: ${partner.address || 'n/a'}
General email: ${partner.email || 'n/a'}
Phone: ${partner.phone || 'n/a'}
Contactability evidence: ${partner.contactability ? JSON.stringify(partner.contactability).slice(0, 500) : 'n/a'}
Email evidence: ${partner.emailVerification ? JSON.stringify(partner.emailVerification).slice(0, 500) : 'n/a'}
${stakeholders || 'Stakeholders: none captured'}${profile}${harvested}

TASKS
1. Verify official website and social profiles.
2. Verify email domain/MX before recommending email. If invalid/unverified, recommend phone/WhatsApp/manual verification.
3. Identify visible online-presence gaps and business impact.
4. Summarise services, customers, footprint and risks only from sources opened.
5. Identify the owner, CEO, MD or a named decision-maker for engagementStrategy.targetContact. If no name surfaces from the website, socials or press, search South Africa's CIPC company registry data via aggregator sites such as b2bhint.com or opencorporates.com (or a direct "[company name] CIPC directors" search) as a required fallback, and use any director name found there, noting it is a registry filing rather than a confirmed day-to-day title.
6. Create a proactive Logistics Flow engagement strategy and first-contact email/WhatsApp.

Rules: no memory claims, no private contact hunting, no fabricated revenue/headcount, every non-null fact needs evidence. Missing website/social is a gap, not notFound. Return {"notFound":true,"record_id":"${partner.id}"} only if no credible match exists.

OUTPUT SAFETY RULES:
- Return valid JSON only. No markdown, no code fences, no commentary, no citations outside JSON.
- Return one complete JSON object that starts with { and ends with }. Do not stop mid-field.
- Keep the response compact enough to fit in one answer. If necessary, shorten prose rather than truncating JSON.
- Always return compact minified single-line JSON to avoid output truncation.
- Use double quotes for all JSON keys and string values. Escape internal quotes and line breaks.
- Keep arrays short: maximum 4 items each unless a field says otherwise.
- Keep source URLs short and specific: maximum 6 full URLs in sourcesUsed.
- businessModel, operatingFootprint, customerProfile, valueHypothesis, openingMessage, emailBody, whatsAppMessage, meetingRequest and callToAction must each be under 450 characters.
- evidence, reason and risk/pain/gap items must each be under 250 characters.
- emailBody must be a concise complete email body, not a long campaign document.

RETURN RAW JSON ONLY:

{
  "record_id": "${partner.id}",
  "onlinePresence": { "website": { "status": "active|broken|not_found|unverifiable", "url": null, "evidence": "" }, "socialProfiles": [], "presenceSummary": "" },
  "contactability": { "emailVerification": { "email": null, "domain": null, "domainStatus": "registered|domain_not_found|unverifiable", "mxStatus": "mx_found|no_mx_found|not_checked", "bounceRisk": "low|medium|high", "evidence": "" }, "phoneVerification": { "phone": null, "status": "published|imported_only|not_found|unverifiable", "evidence": "" }, "recommendedChannel": "email|phone|whatsapp|social|manual_verification", "reason": "" },
  "presenceGaps": [],
  "businessModel": null,
  "servicesOffered": [],
  "operatingFootprint": null,
  "customerProfile": null,
  "riskSignals": [],
  "operationalPainPoints": [],
  "commercialOpportunity": { "bestFitOffering": "", "valueHypothesis": "", "buyingTriggers": [] },
  "engagementStrategy": { "targetContact": { "name": null, "role": null, "email": null, "mobile": null, "reason": "" }, "channel": "", "openingMessage": "", "objectionsToExpect": [] },
  "partnershipStrategy": { "recommendedModel": "", "platformPlacement": [], "recommendedTags": [], "directEnquiryActions": [], "meetingAgenda": [], "discoveryQuestions": [], "nextActions": [] },
  "engagementPack": { "emailSubject": "", "emailBody": "", "whatsAppMessage": "", "meetingRequest": "", "callToAction": "" },
  "confidence": "high | medium | low",
  "sourcesUsed": [],
  "couldNotVerify": []
}`;
  };

  const prompt = getPrompt();

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
      const parsed = parseDeepDiveJson(findings);
      const profileToSave = parsed?.notFound ? buildNoPresenceProfile(companyName) : parsed;

      const token = await getClientSideAuthToken();
      if (!token) throw new Error('Session expired.');

      await performAdminAction(token, 'saveCommercialDeepDive', {
        partnerId: partner.id,
        collection: partner.sourceCollection,
        commercialProfile: profileToSave,
      });

      toast({ title: 'Commercial profile saved', description: parsed?.notFound ? `${companyName} has been saved as a presence-gap opportunity.` : `${companyName} is now engagement-ready.` });
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
        title="Commercial Deep Dive and online-presence gap analysis"
      >
        <Sparkles className={`h-4 w-4 ${hasProfile ? 'text-emerald-600' : 'text-amber-500'}`} />
      </Button>

      <Dialog open={isOpen} onOpenChange={o => !isSaving && setIsOpen(o)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto text-left text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-black">
              <Sparkles className="h-5 w-5 text-primary" />
              Commercial Deep Dive
              {hasProfile && <Badge variant="secondary" className="ml-2">Profile on record</Badge>}
            </DialogTitle>
            <DialogDescription className="text-left text-foreground">
              Verifies website and social presence for <strong>{companyName}</strong>, identifies visible gaps, and turns the evidence into a supplier-specific engagement message.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue={hasProfile ? 'intelligence' : 'research'} className="py-2">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="research" className="gap-2 text-xs"><Sparkles className="h-3.5 w-3.5" />Research</TabsTrigger>
              <TabsTrigger value="intelligence" className="gap-2 text-xs" disabled={!profile}><Target className="h-3.5 w-3.5" />Intelligence</TabsTrigger>
              <TabsTrigger value="engagement" className="gap-2 text-xs" disabled={!profile}><Mail className="h-3.5 w-3.5" />Engagement</TabsTrigger>
            </TabsList>

            <TabsContent value="research" className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Step 1 &mdash; Deep-dive research command
                </label>
                <ScrollArea className="h-44 w-full border rounded-md p-3 bg-muted/30">
                  <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">{prompt}</pre>
                </ScrollArea>
                <p className="text-[11px] text-muted-foreground">Prompt size: {prompt.length.toLocaleString()} characters. It is compacted for Chrome AI mode to avoid malformed request errors.</p>
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
            </TabsContent>

            <TabsContent value="intelligence" className="space-y-4 pt-4">
              {!profile ? null : <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="border rounded-md p-3"><p className="text-[10px] uppercase font-black text-muted-foreground">Presence</p><p className="mt-1 text-sm font-semibold">{displayValue(profile.onlinePresence?.presenceSummary)}</p></div>
                  <div className="border rounded-md p-3"><p className="text-[10px] uppercase font-black text-muted-foreground">Best-fit offering</p><p className="mt-1 text-sm font-semibold">{displayValue(profile.commercialOpportunity?.bestFitOffering)}</p></div>
                  <div className="border rounded-md p-3"><p className="text-[10px] uppercase font-black text-muted-foreground">Research confidence</p><p className="mt-1 text-sm font-semibold capitalize">{displayValue(profile.confidence)}</p></div>
                </div>
                {profile.contactability && <div className="border rounded-md p-4 bg-amber-50/60 border-amber-200">
                  <h3 className="flex items-center gap-2 text-sm font-black"><AlertTriangle className="h-4 w-4 text-amber-600" />Contactability</h3>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3 text-sm">
                    <p><span className="font-bold">Recommended:</span> {displayValue(profile.contactability.recommendedChannel)}</p>
                    <p><span className="font-bold">Email risk:</span> {displayValue(profile.contactability.emailVerification?.bounceRisk || profile.emailVerification?.bounceRisk)}</p>
                    <p><span className="font-bold">Domain:</span> {displayValue(profile.contactability.emailVerification?.domainStatus || profile.emailVerification?.domainStatus)}</p>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{displayValue(profile.contactability.reason || profile.contactability.emailVerification?.evidence || profile.emailVerification?.evidence)}</p>
                </div>}
                <div className="border rounded-md p-4">
                  <h3 className="flex items-center gap-2 text-sm font-black"><AlertTriangle className="h-4 w-4 text-amber-500" />Priority Digital Gaps</h3>
                  <div className="mt-3 space-y-3">{(profile.presenceGaps || []).length ? profile.presenceGaps.map((gap: any, index: number) => <div key={`${gap.gap}-${index}`} className="border-l-2 border-amber-400 pl-3"><p className="text-sm font-semibold">{gap.gap}</p><p className="text-xs text-muted-foreground">{gap.impact}</p><p className="mt-1 text-[11px] text-muted-foreground break-all">Evidence: {gap.evidence}</p></div>) : <p className="text-sm text-muted-foreground">No online-presence gaps were returned.</p>}</div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="border rounded-md p-4"><p className="text-[10px] uppercase font-black text-muted-foreground">Business and services</p><p className="mt-2 text-sm">{displayValue(profile.businessModel)}</p><p className="mt-2 text-xs text-muted-foreground">{displayValue(profile.servicesOffered)}</p></div>
                  <div className="border rounded-md p-4"><p className="text-[10px] uppercase font-black text-muted-foreground">Partnership recommendation</p><p className="mt-2 text-sm">{displayValue(profile.partnershipStrategy?.recommendedModel)}</p><p className="mt-2 text-xs text-muted-foreground">{displayValue(profile.partnershipStrategy?.platformPlacement)}</p></div>
                </div>
                <div className="border rounded-md p-4"><p className="text-[10px] uppercase font-black text-muted-foreground">Verified Sources</p><div className="mt-2 space-y-1">{(profile.sourcesUsed || []).map((source: string) => <a key={source} href={source} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary break-all hover:underline"><ExternalLink className="h-3 w-3 shrink-0" />{source}</a>) || <p className="text-sm text-muted-foreground">No sources were returned.</p>}</div></div>
              </>}
            </TabsContent>

            <TabsContent value="engagement" className="space-y-3 pt-4">
              {!profile ? null : <>
                {(profile.contactability?.emailVerification?.bounceRisk === 'high' || profile.emailVerification?.bounceRisk === 'high') && <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  Email is marked high-risk for this record. Use phone, WhatsApp or manual verification before sending another email.
                </div>}
                <div className="border rounded-md p-4"><p className="text-[10px] uppercase font-black text-muted-foreground">Target and channel</p><p className="mt-1 text-sm font-semibold">{displayValue(profile.engagementStrategy?.targetContact)} · {displayValue(profile.engagementStrategy?.channel)}</p></div>
                {[
                  { label: 'First-contact email', icon: Mail, content: profile.engagementPack?.emailBody ? `Subject: ${profile.engagementPack?.emailSubject || `Opportunity for ${companyName}`}\n\n${profile.engagementPack.emailBody}` : engagement.email },
                  { label: 'WhatsApp message', icon: MessageSquare, content: profile.engagementPack?.whatsAppMessage || engagement.whatsapp },
                  { label: 'Meeting request and agenda', icon: CalendarDays, content: profile.engagementPack?.meetingRequest || engagement.meeting },
                ].map(({ label, icon: Icon, content }) => <div key={label} className="border rounded-md p-4"><div className="flex items-center justify-between gap-3"><p className="flex items-center gap-2 text-sm font-black"><Icon className="h-4 w-4 text-primary" />{label}</p><Button variant="outline" size="sm" onClick={() => copyText(content, label)}><ClipboardCheck className="mr-1.5 h-3.5 w-3.5" />Copy</Button></div><pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed">{content}</pre></div>)}
                {onEngage && <Button className="w-full" onClick={() => { setIsOpen(false); onEngage(engagementPartner); }}><Send className="mr-2 h-4 w-4" />Open Engagement Hub</Button>}
                <div className="border rounded-md p-4"><p className="text-[10px] uppercase font-black text-muted-foreground">Next actions</p><ul className="mt-2 list-disc space-y-1 pl-4 text-sm">{(profile.partnershipStrategy?.nextActions || profile.commercialOpportunity?.buyingTriggers || ['Review the findings, approve the first-contact message, then send through the engagement workflow.']).map((action: string, index: number) => <li key={`${action}-${index}`}>{action}</li>)}</ul></div>
              </>}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              onClick={handleSave}
              disabled={isSaving || !findings.trim()}
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
