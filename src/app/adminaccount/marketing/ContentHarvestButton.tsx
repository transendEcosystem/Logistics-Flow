'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, FileText, Sparkles, Save, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getClientSideAuthToken } from '@/firebase';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { parseAiJson } from '@/lib/ai-json';

async function performAdminAction(token: string, action: string, payload: any) {
  const response = await fetch('/api/admin', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload }),
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.error || `API Error for action: ${action}`);
  return result;
}

export function ContentHarvestButton({ partner, onUpdate }: { partner: any; onUpdate: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHarvesting, setIsHarvesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [structureText, setStructureText] = useState('');
  const [websiteToHarvest, setWebsiteToHarvest] = useState(partner.website || '');
  const [manualText, setManualText] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [lastError, setLastError] = useState('');
  const [isClassifying, setIsClassifying] = useState(false);
  const [fullPartner, setFullPartner] = useState<any>(null);
  const { toast } = useToast();

  // The bulk registry list strips large content/service blobs to keep that response small; when
  // this dialog opens for a record that has one, fetch the full record so it can be displayed.
  useEffect(() => {
    if (!isOpen || fullPartner) return;
    const needsFetch = (partner.has_contentCorpus && !partner.contentCorpus) || (partner.has_serviceProfile && !partner.serviceProfile);
    if (!needsFetch) return;
    (async () => {
      try {
        const token = await getClientSideAuthToken();
        if (!token) return;
        const res = await performAdminAction(token, 'getRecordDetail', { id: partner.id, collection: partner.sourceCollection });
        if (res?.data) setFullPartner(res.data);
      } catch (e) {
        // Non-fatal — dialog still works for starting a fresh harvest.
      }
    })();
  }, [isOpen, fullPartner, partner]);

  const activePartner = fullPartner || partner;
  const corpus = activePartner.contentCorpus;
  const companyName = activePartner.companyName || activePartner.name || 'this company';

  useEffect(() => {
    setWebsiteToHarvest(partner.website || '');
  }, [partner.website]);

  const harvest = async () => {
    setIsHarvesting(true);
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error('Session expired.');

      const response = await fetch('/api/research/harvest', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId: partner.id, collection: partner.sourceCollection, website: websiteToHarvest }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Harvest failed.');

      toast({ title: 'Content harvested', description: `${result.pageCount} pages, ${result.totalWords.toLocaleString()} words captured.` });
      setLastError('');
      onUpdate();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Harvest failed', description: e.message });
      setLastError(e.message || '');
      setShowManual(true);
    } finally {
      setIsHarvesting(false);
    }
  };

  const harvestManual = async () => {
    setIsHarvesting(true);
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error('Session expired.');

      const response = await fetch('/api/research/harvest', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: partner.id,
          collection: partner.sourceCollection,
          website: websiteToHarvest,
          manualText,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Harvest failed.');

      toast({ title: 'Content saved', description: `${result.totalWords.toLocaleString()} words captured from your paste.` });
      setManualText('');
      setShowManual(false);
      onUpdate();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Manual harvest failed', description: e.message });
    } finally {
      setIsHarvesting(false);
    }
  };

  const getStructurePrompt = () => {
    // Nav, cookie banners and contact strips repeat on every page. Dropping lines
    // already seen keeps the paste small enough for chat tools that cap input
    // length, and removes noise that skews the classification.
    const seen = new Set<string>();
    const text = (corpus?.pages || [])
      .map((page: any) => {
        const body = String(page.text || '')
          .split('\n')
          .map((line: string) => line.trim())
          .filter((line: string) => {
            if (line.length < 3) return false;
            const key = line.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .join('\n')
          .slice(0, 2_000);
        return body ? `--- ${page.url}\n${body}` : '';
      })
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 9_000);

    return `Classify this South African business, "${companyName}", using only the website text at the end of this message.

Rules: use only what the text supports, never guess or search the web, and use null or an empty array wherever the text is silent.

Reply with one compact JSON object and nothing else. No markdown, no code fences, no commentary. Keep every array to 8 items or fewer.

{"serviceTags":["lowercase canonical service labels"],"capabilities":["specific things they can do"],"industriesServed":["sectors they name"],"geographicCoverage":["provinces, corridors, countries or cities they name"],"equipmentAssets":["vehicles, trailers, warehouses, plant they mention"],"certifications":["accreditations, memberships, licences"],"valueProps":["claims about why to choose them"],"shopProfile":{"headline":"under 12 words","shortDescription":"40 to 60 words","longDescription":"150 to 250 words","keywords":["buyer search terms"]},"campaignAngles":[{"angle":"an engagement hook","evidence":"supporting wording from their content","targetRole":"who to aim it at"}],"contentQuality":"rich or thin or placeholder"}

WEBSITE TEXT:
${text}`;
  };

  const classifyAutomatically = async () => {
    setIsClassifying(true);
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error('Session expired.');

      const response = await fetch('/api/research/classify', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId: partner.id, collection: partner.sourceCollection }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Classification failed.');

      await performAdminAction(token, 'saveServiceProfile', {
        partnerId: partner.id,
        collection: partner.sourceCollection,
        profile: result.profile,
      });

      toast({ title: 'Service profile saved', description: `${companyName} is now indexed and shop-ready.` });
      setStructureText('');
      setIsOpen(false);
      onUpdate();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Classification failed', description: e.message });
    } finally {
      setIsClassifying(false);
    }
  };

  const saveStructure = async () => {
    setIsSaving(true);
    try {
      const parsed = parseAiJson(structureText);

      const token = await getClientSideAuthToken();
      if (!token) throw new Error('Session expired.');

      await performAdminAction(token, 'saveServiceProfile', {
        partnerId: partner.id,
        collection: partner.sourceCollection,
        profile: parsed,
      });

      toast({ title: 'Service profile saved', description: `${companyName} is now indexed and shop-ready.` });
      setStructureText('');
      setIsOpen(false);
      onUpdate();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Save failed', description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const hasWebsite = Boolean(websiteToHarvest.trim());
  const hasProfile = Boolean(activePartner.serviceProfile || activePartner.has_serviceProfile);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        title={hasWebsite ? 'Harvest website content' : 'Harvest website content (no website on record)'}
      >
        <FileText className={`h-4 w-4 ${hasProfile ? 'text-emerald-600' : corpus ? 'text-amber-500' : hasWebsite ? 'text-primary' : 'text-muted-foreground/40'}`} />
      </Button>

      <Dialog open={isOpen} onOpenChange={o => !isHarvesting && !isSaving && setIsOpen(o)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto text-left text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-black">
              <FileText className="h-5 w-5 text-primary" />
              Content Harvest
              {corpus && <Badge variant="secondary">{corpus.pageCount} pages · {corpus.totalWords?.toLocaleString()} words</Badge>}
            </DialogTitle>
            <DialogDescription className="text-left text-foreground">
              Reads <strong>{companyName}</strong>&apos;s own website directly and stores the wording verbatim for search indexing, shop pre-population and campaign targeting.
            </DialogDescription>
          </DialogHeader>

          {!hasWebsite ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="font-bold">No website on record</AlertTitle>
              <AlertDescription className="text-xs">
                Run the Forensic Gap Analysis first to establish the website address.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Step 1 &mdash; Fetch the site
                </label>
                <Input
                  value={websiteToHarvest}
                  onChange={e => setWebsiteToHarvest(e.target.value)}
                  placeholder="https://www.company.co.za"
                  className="bg-white font-mono text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Use the company homepage only. Do not paste a Google search page, Google Maps result, LinkedIn, Facebook or Instagram URL here.
                </p>
                <Button onClick={harvest} disabled={isHarvesting} variant="outline" className="w-full font-bold">
                  {isHarvesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  {corpus ? 'Re-harvest Website Content' : 'Harvest Website Content'}
                </Button>
                {!showManual && (
                  <button
                    type="button"
                    onClick={() => setShowManual(true)}
                    className="text-[11px] underline text-muted-foreground hover:text-foreground"
                  >
                    Site won&rsquo;t harvest? Paste the website text manually
                  </button>
                )}
                {lastError && (
                  <div className="space-y-1 rounded-md border border-destructive/40 bg-destructive/5 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-destructive">
                      Last failure &mdash; what the server saw
                    </p>
                    <p className="text-[11px] text-foreground break-all whitespace-pre-wrap">{lastError}</p>
                  </div>
                )}
                {showManual && (
                  <div className="space-y-2 rounded-md border border-dashed p-3 bg-muted/20">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Manual fallback &mdash; paste website text
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Open the company site in your browser, select the About / Services copy, and paste it here.
                      Use this when the site builds its pages with JavaScript or blocks automated visitors.
                    </p>
                    <Textarea
                      value={manualText}
                      onChange={e => setManualText(e.target.value)}
                      placeholder="Paste the company's About, Services and Contact page text here..."
                      className="bg-white text-xs min-h-[140px]"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={harvestManual}
                        disabled={isHarvesting || manualText.trim().split(/\s+/).filter(Boolean).length < 20}
                        className="flex-1 font-bold"
                      >
                        {isHarvesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save Pasted Content
                      </Button>
                      <Button variant="ghost" onClick={() => setShowManual(false)} disabled={isHarvesting}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
                {corpus && (
                  <>
                    <div className="flex items-center justify-between rounded-md border bg-emerald-50 px-3 py-2">
                      <span className="text-xs font-bold text-emerald-900">
                        {(corpus.totalWords || 0).toLocaleString()} words captured across {corpus.pageCount || 0} pages
                      </span>
                      {!hasProfile && (
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">
                          Step 2 still required
                        </span>
                      )}
                    </div>
                    <ScrollArea className="h-28 w-full border rounded-md p-3 bg-muted/20">
                      {(corpus.pages || []).map((page: any) => (
                        <div key={page.url} className="text-xs mb-1">
                          <span className="font-medium">{page.wordCount}w</span>{' '}
                          <span className="text-muted-foreground break-all">{page.url}</span>
                        </div>
                      ))}
                    </ScrollArea>
                    {!hasProfile && (
                      <p className="text-[11px] text-amber-700">
                        Harvested text is stored but not yet classified. Run Step 2 below to turn it into the
                        Technical Profile, service tags and shop listing.
                      </p>
                    )}
                  </>
                )}
              </div>

              {corpus && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                      Step 2 &mdash; Classify the harvested text
                    </label>                    <Button
                      onClick={classifyAutomatically}
                      disabled={isClassifying || isSaving}
                      className="w-full font-bold"
                    >
                      {isClassifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                      Classify Automatically
                    </Button>
                    <p className="text-[11px] text-muted-foreground">
                      Runs on the server and saves the profile in one step. No copying required.
                    </p>
                    <Button
                      variant="outline"
                      className="w-full font-bold"
                      onClick={async () => {
                        const prompt = getStructurePrompt();
                        await navigator.clipboard.writeText(prompt);
                        toast({
                          title: 'Classification prompt copied',
                          description: `${prompt.length.toLocaleString()} characters. Paste it into Gemini or ChatGPT.`,
                        });
                      }}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Copy Prompt Instead
                    </Button>
                    <p className="text-[11px] text-muted-foreground">
                      Manual fallback. Paste into a full chat assistant such as Gemini or ChatGPT &mdash;
                      Google&rsquo;s <span className="font-semibold">AI Mode</span> in Search rejects prompts like this
                      and replies &ldquo;no response available for this search&rdquo;.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                      Step 3 &mdash; Paste the returned JSON (only if you copied the prompt)
                    </label>
                    <Textarea
                      value={structureText}
                      onChange={e => setStructureText(e.target.value)}
                      placeholder='{ "serviceTags": [...], "shopProfile": { ... } }'
                      className="h-32 font-mono text-xs"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={saveStructure}
              disabled={!structureText.trim() || isSaving}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold"
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Service Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
