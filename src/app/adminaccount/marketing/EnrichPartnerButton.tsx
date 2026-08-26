'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Info, Zap, Search, ClipboardCheck } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { parseAiJson } from '@/lib/ai-json';
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

function normalizeUrl(value: any): string {
    const cleaned = String(value || '').trim();
    if (!cleaned) return '';
    if (/^https?:\/\//i.test(cleaned)) return cleaned;
    return `https://${cleaned.replace(/^\/+/, '')}`;
}

// A bare domain like "facebook.com" is not a usable profile or citation, so it is discarded rather than stored.
function specificUrl(value: any): string {
    const url = normalizeUrl(value);
    if (!url) return '';
    try {
        const parsed = new URL(url);
        return parsed.pathname.replace(/\/+$/, '').length > 0 ? url : '';
    } catch {
        return '';
    }
}

function roleToField(role: string): string | null {
    const value = role.toLowerCase();
    if (/ceo|owner|managing director|\bmd\b|founder|proprietor/.test(value)) return 'ceo';
    if (/marketing|brand|sales/.test(value)) return 'marketingManager';
    if (/operation|logistics manager|fleet|depot|transport manager/.test(value)) return 'operationsManager';
    if (/technical|workshop|engineer|maintenance|it\b/.test(value)) return 'technicalManager';
    return null;
}

// The short and full prompts return different shapes, so both are folded into the record schema here.
function normalizeFindings(raw: any) {
    const findings: Record<string, any> = {};
    const otherStaff: any[] = [];

    for (const field of ['companyName', 'industrial_category', 'email', 'phone', 'address', 'primaryContactRole']) {
        if (raw[field]) findings[field] = String(raw[field]).trim();
    }

    if (raw.website) findings.website = normalizeUrl(raw.website);

    const wording = raw.minedServiceWording || raw.servicesDescription;
    if (wording) findings.minedServiceWording = String(wording).trim();

    if (raw.confidence) findings.researchConfidence = String(raw.confidence).trim();

    for (const field of ['marketingManager', 'operationsManager', 'technicalManager', 'ceo']) {
        const contact = raw[field];
        if (contact && typeof contact === 'object' && contact.name) {
            findings[field] = {
                name: String(contact.name).trim(),
                role: contact.role ? String(contact.role).trim() : '',
                email: contact.email ? String(contact.email).trim() : '',
                mobile: contact.mobile ? String(contact.mobile).trim() : '',
            };
        }
    }

    if (Array.isArray(raw.managementTeam)) {
        for (const person of raw.managementTeam) {
            if (!person?.name) continue;
            const role = String(person.role || '').trim();
            const field = roleToField(role);
            const entry = {
                name: String(person.name).trim(),
                role,
                email: person.email ? String(person.email).trim() : '',
                mobile: person.mobile ? String(person.mobile).trim() : '',
            };
            if (field && !findings[field]) findings[field] = entry;
            else otherStaff.push({ ...entry, source: person.source ? specificUrl(person.source) : '' });
        }
    }

    if (Array.isArray(raw.otherStaff)) {
        for (const person of raw.otherStaff) {
            if (person?.name) {
                otherStaff.push({
                    name: String(person.name).trim(),
                    role: person.role ? String(person.role).trim() : '',
                    source: person.source ? specificUrl(person.source) : '',
                });
            }
        }
    }
    if (otherStaff.length) findings.otherStaff = otherStaff;

    if (raw.socialProfiles && typeof raw.socialProfiles === 'object') {
        const social: Record<string, string> = {};
        for (const key of ['facebook', 'linkedin', 'instagram', 'twitter']) {
            const url = specificUrl(raw.socialProfiles[key]);
            if (url) social[key] = url;
        }
        if (Object.keys(social).length) findings.socialProfiles = social;
    }

    if (Array.isArray(raw.siteMap) && raw.siteMap.length) {
        findings.siteMap = raw.siteMap.map((entry: any) => String(entry).trim()).filter(Boolean);
    }

    if (Array.isArray(raw.sourceUrls)) {
        const urls = Array.from(new Set(raw.sourceUrls.map(specificUrl).filter(Boolean)));
        if (urls.length) findings.sourceUrls = urls;
    }

    return findings;
}

function parseFindings(text: string) {
    const parsed = parseAiJson(text);
    if (parsed?.notFound) throw new Error('The research returned "notFound" for this company. Nothing to apply.');
    return normalizeFindings(parsed);
}

export function EnrichPartnerButton({ partner, onUpdate }: { partner: any, onUpdate: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLogging, setIsLogging] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [mode, setMode] = useState<'search' | 'agent'>('search');
    const [findingsText, setFindingsText] = useState('');
    const [overwrite, setOverwrite] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const { toast } = useToast();

    const preview = (() => {
        if (!findingsText.trim()) return null;
        try {
            const findings = parseFindings(findingsText);
            return { findings, error: null as string | null };
        } catch (e: any) {
            return { findings: null, error: e.message as string };
        }
    })();

    const applyFindings = async () => {
        if (!preview?.findings) return;
        setIsApplying(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error('Session expired.');

            const result = await performAdminAction(token, 'applyForensicFindings', {
                partnerId: partner.id,
                collection: partner.sourceCollection,
                findings: preview.findings,
                overwrite,
            });

            const applied = result.applied?.length || 0;
            const skipped = result.skipped?.length || 0;
            toast({
                title: applied ? `${applied} field${applied === 1 ? '' : 's'} updated` : 'Nothing to apply',
                description: skipped ? `${skipped} field${skipped === 1 ? '' : 's'} already had a value and were kept.` : undefined,
            });

            setFindingsText('');
            setIsOpen(false);
            onUpdate();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Apply failed', description: e.message });
        } finally {
            setIsApplying(false);
        }
    };

    const companyName = partner.companyName || partner.name || partner.trading_name || `${partner.firstName} ${partner.lastName}` || 'Unnamed Entity';

    const getPrompt = () => {
        const hints = [
            partner.website ? `Known website: ${partner.website}` : '',
            partner.address ? `Known address: ${partner.address}` : '',
            partner.phone ? `Known phone: ${partner.phone}` : '',
        ].filter(Boolean).join('\n');

        if (mode === 'search') {
            return `Research the South African company "${companyName}".
${hints}

Work in this order:
1. Confirm its official website.
2. Read the Contact page for address, phone and email.
3. Read the Home and About pages for what services it offers.
4. Search for the owner, CEO or MD by name, and any other senior staff.
5. Check its Facebook, LinkedIn and Instagram pages for anything still missing.
6. Cross-check against Yellosa, Brabys, Infoisinfo, Hotfrog or Cylex.

Report only what is published on pages you open. Use null for anything you cannot find. Never guess an email or phone number. Do not use a different company with a similar name.

For servicesDescription, quote prose sentences from the About or Services page. Do not include menu items, page titles or truncated fragments. If the site has no real description, use null. Write every URL in full, starting with https:// and including the page path \u2014 a bare domain like "facebook.com" is not acceptable.

Return one complete JSON object in one response. Do not use citations, markdown links, code fences, "Use code with caution", or separate JSON fragments around URLs. Put every URL as ordinary text inside its JSON string value.

Reply with only this JSON and nothing else:
{"record_id":"${partner.id}","companyName":null,"website":null,"email":null,"phone":null,"address":null,"industrial_category":null,"servicesDescription":null,"managementTeam":[{"name":null,"role":null,"source":null}],"sourceUrls":[],"confidence":null}`;
        }

        return `You are a verification-first research assistant. Accuracy matters more than completeness. Work through the stages below IN ORDER and do not skip ahead.

TARGET: "${companyName}" (South Africa)
${hints}

STAGE 1 — IDENTIFY THE WEBSITE
Find the company's official website and confirm it belongs to THIS company, in South Africa. A similarly named or abbreviated company is not a match. If a website is listed above, verify it resolves and is the right entity. If there is genuinely no website, record website as null and continue to Stage 5.

STAGE 2 — MAP THE SITE
List the pages available on that website (check the nav, footer, and /sitemap.xml if present). Note which of these exist: Contact, About, Home, Team/Management, Services.

STAGE 3 — EXTRACT CONTACT DATA
Open the Contact page. Extract the physical address, landline, mobile/WhatsApp and general email exactly as published. Also check the footer, which often carries details the Contact page omits.

STAGE 4 — EXTRACT POSITIONING
Open the Home and About pages. Capture the company's own wording about what it does and who it serves. Use their words, not yours.

STAGE 5 — FIND THE PEOPLE
Search the web broadly for the owner, CEO or MD of this company by name, then for other senior staff (marketing, operations, technical). Useful sources: LinkedIn, news coverage, industry press, company registry mentions, tender awards. Record the person's name and published business role. Only record a person the source explicitly ties to THIS company.

STAGE 6 — SOCIAL MEDIA
Find its Facebook, LinkedIn and Instagram pages. The Facebook "About" tab is often the most current source of address and WhatsApp number for SA industrial firms. Use these to fill gaps still open after Stages 3 to 5.

STAGE 7 — CROSS-REFERENCE AND FINALISE
Corroborate against aggregators: yellosa.co.za, braby.com, infoisinfo.co.za, hotfrog.co.za, cylex.net.za, easyinfo.co.za, sayellow.com, snupit.co.za, yep.co.za, yelp.com, foursquare.com, kompass.com, dnb.com. These are frequently stale — treat them as corroboration only, never as the primary source. Where they conflict with the company's own site or an active social page, prefer the company's own source and record the disagreement in "conflicts".

RULES THROUGHOUT:
- Do not answer from memory. Open the actual pages.
- Report only what you have seen on a page you opened. Otherwise null.
- null is a correct and expected answer. Three verified fields beat twelve plausible ones.
- Never construct an email address or phone number from a pattern.
- Only fill a person's email or mobile if that exact detail is published as a business contact. Do not hunt private personal contact details.
- Do not expand an acronym unless a source states the expansion for this entity.
- If you cannot identify this company at all, return {"notFound": true, "record_id": "${partner.id}"} and nothing else.

OUTPUT HYGIENE:
- Return raw JSON only. No markdown, no code fences, no commentary before or after. Do not append citation markers.
- Return exactly one complete JSON object. Never split URL values into a separate code block or citation card.
- Do not use markdown links, footnotes, citation markers, or the words "Use code with caution". Store URLs as ordinary JSON strings only.
- Every URL must be the exact full page address you opened, starting with https:// and including the path.
- A bare domain such as "facebook.com" or "linkedin.com" is NOT acceptable and will be discarded. A social profile must be the complete profile URL, for example https://www.facebook.com/CompanyPageName/ or https://www.linkedin.com/company/company-name/. If you cannot produce the full profile URL, set that profile to null.
- Do not repeat the same URL twice in "sourceUrls".

SERVICE WORDING RULES ("minedServiceWording"):
- Capture the company's own descriptive wording about what it does, from the About, Services or Home page body text.
- Exclude navigation labels, menu items, buttons, cookie notices and breadcrumbs. "Home; About Us; Contact Us" is menu chrome, not service wording.
- Do not truncate mid-sentence and do not use ellipses.
- Capture as much genuine descriptive text as exists, up to about 300 words. If the site is thin, return the little that is there rather than nothing.
- Only return null if the site has no descriptive wording whatsoever.

SELF-AUDIT: for every non-null value, name the URL you read it on. If you cannot, set it to null.

{
  "record_id": "${partner.id}",
  "companyName": null,
  "industrial_category": null,
  "website": null,
  "email": null,
  "phone": null,
  "address": null,
  "siteMap": ["pages found on the company website"],
  "marketingManager": { "name": null, "role": null, "email": null, "mobile": null },
  "operationsManager": { "name": null, "role": null, "email": null, "mobile": null },
  "technicalManager": { "name": null, "role": null, "email": null, "mobile": null },
  "ceo": { "name": null, "role": null, "email": null, "mobile": null },
  "otherStaff": [{ "name": null, "role": null, "source": null }],
  "socialProfiles": { "facebook": null, "linkedin": null, "instagram": null },
  "primaryContactRole": null,
  "minedServiceWording": null,
  "sourceUrls": ["every URL you actually opened"],
  "unverifiedFields": ["fields left null and why, one line each"],
  "conflicts": ["any contradictions between sources"],
  "confidence": "high | medium | low"
}

"minedServiceWording" must use the company's own prose from its About or Services pages, following the service wording rules above.`;
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

            toast({ title: "Gap-analysis prompt ready", description: "Run it, then paste the JSON back below to save it to the record." });

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

            <Dialog open={isOpen} onOpenChange={(o) => !isLogging && !isApplying && setIsOpen(o)}>
                <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto text-left text-foreground">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-left text-foreground font-black">
                            <Search className="h-5 w-5 text-primary" />
                            Forensic Gap Analysis
                        </DialogTitle>
                        <DialogDescription className="text-left text-foreground">
                            Stage 1 research for <strong>{companyName}</strong>. Scrapes the missing identity, address and stakeholder contact fields.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4 text-left min-w-0">
                        <div className="space-y-2 min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Research mode</p>
                            <Button
                                type="button"
                                variant={mode === 'search' ? 'default' : 'outline'}
                                className="h-auto w-full min-w-0 justify-start whitespace-normal px-4 py-3 text-left"
                                onClick={() => { setMode('search'); setIsCopied(false); }}
                            >
                                <Search className="mr-3 h-4 w-4 shrink-0" />
                                <span className="min-w-0"><span className="block text-sm font-bold">Chrome AI Mode</span><span className="block text-xs font-normal opacity-75">Short, search-friendly prompt</span></span>
                            </Button>
                            <Button
                                type="button"
                                variant={mode === 'agent' ? 'default' : 'outline'}
                                className="h-auto w-full min-w-0 justify-start whitespace-normal px-4 py-3 text-left"
                                onClick={() => { setMode('agent'); setIsCopied(false); }}
                            >
                                <Zap className="mr-3 h-4 w-4 shrink-0" />
                                <span className="min-w-0"><span className="block text-sm font-bold">Gemini or ChatGPT</span><span className="block text-xs font-normal opacity-75">Full seven-stage research prompt</span></span>
                            </Button>
                        </div>

                        <Alert className="bg-primary/5 border-primary/20 text-left">
                            <Zap className="h-4 w-4 text-primary" />
                            <AlertTitle className="text-left font-bold">Verification-first protocol</AlertTitle>
                            <AlertDescription className="text-xs text-left leading-relaxed">
                                {mode === 'search'
                                    ? 'Chrome AI Mode is a search box and rejects long instruction blocks. This short version runs the same 6-step waterfall in a searchable form. If it still returns nothing, switch to the full version and use Gemini.'
                                    : 'Full 7-stage waterfall: identify the site, map it, pull contact data, pull Home/About wording, find the people, sweep social, then cross-reference the directories.'}
                                {' '}Check <strong>sourceUrls</strong> and <strong>confidence</strong> before capturing anything to the record.
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-2 text-left">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Step 1 &mdash; AI Research Command</label>
                            <ScrollArea className="h-40 w-full border rounded-md p-3 bg-muted/30 text-left">
                                <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">{getPrompt()}</pre>
                            </ScrollArea>
                        </div>

                        <div className="space-y-2 text-left">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Step 2 &mdash; Paste the returned JSON</label>
                            <Textarea
                                value={findingsText}
                                onChange={e => setFindingsText(e.target.value)}
                                placeholder='{ "companyName": "...", "website": "...", "managementTeam": [ ... ] }'
                                className="h-28 font-mono text-xs"
                            />

                            {preview?.error && (
                                <p className="text-xs text-destructive font-medium">{preview.error}</p>
                            )}

                            {preview?.findings && (
                                <div className="border rounded-md p-3 bg-muted/20 space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Will be applied</p>
                                    {Object.entries(preview.findings).map(([field, value]) => {
                                        const hasExisting = partner[field] !== undefined && partner[field] !== null && partner[field] !== '';
                                        return (
                                            <div key={field} className="flex items-start gap-2 text-xs">
                                                <span className="font-bold min-w-[130px] shrink-0">{field}</span>
                                                <span className="text-muted-foreground break-all">
                                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                                </span>
                                                {hasExisting && !overwrite && (
                                                    <span className="text-amber-600 font-medium shrink-0">kept existing</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                    <label className="flex items-center gap-2 pt-2 text-xs font-medium cursor-pointer">
                                        <input type="checkbox" checked={overwrite} onChange={e => setOverwrite(e.target.checked)} />
                                        Overwrite fields that already have a value
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="sticky bottom-0 flex-col gap-2 border-t bg-background pt-3 sm:flex-row">
                        <Button
                            onClick={handleCopyAndLog}
                            disabled={isLogging}
                            variant="outline"
                            className="w-full font-bold sm:flex-1"
                        >
                            {isLogging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                            {isCopied ? 'Copied' : 'Copy Prompt'}
                        </Button>
                        <Button
                            onClick={applyFindings}
                            disabled={!preview?.findings || isApplying}
                            className="w-full bg-primary hover:bg-primary/90 text-white font-bold sm:flex-1"
                        >
                            {isApplying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardCheck className="mr-2 h-4 w-4" />}
                            Apply to Record
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
