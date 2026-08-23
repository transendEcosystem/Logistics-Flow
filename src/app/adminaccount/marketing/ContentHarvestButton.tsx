'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, FileText, Sparkles, Save, AlertTriangle } from 'lucide-react';
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
  if (!response.ok || !result.success) throw new Error(result.error || `API Error for action: ${action}`);
  return result;
}

export function ContentHarvestButton({ partner, onUpdate }: { partner: any; onUpdate: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHarvesting, setIsHarvesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [structureText, setStructureText] = useState('');
  const { toast } = useToast();

  const corpus = partner.contentCorpus;
  const companyName = partner.companyName || partner.name || 'this company';

  const harvest = async () => {
    setIsHarvesting(true);
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error('Session expired.');

      const response = await fetch('/api/research/harvest', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId: partner.id, collection: partner.sourceCollection }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Harvest failed.');

      toast({ title: 'Content harvested', description: `${result.pageCount} pages, ${result.totalWords.toLocaleString()} words captured.` });
      onUpdate();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Harvest failed', description: e.message });
    } finally {
      setIsHarvesting(false);
    }
  };

  const getStructurePrompt = () => {
    const text = (corpus?.pages || [])
      .map((page: any) => `--- PAGE: ${page.url}\n${page.text}`)
      .join('\n\n')
      .slice(0, 40_000);

    return `Classify the following website content for "${companyName}", a South African business.

Use ONLY the text below. Do not search the web. Do not add anything the text does not support. Use null or an empty array where the text is silent.

Return raw JSON only, no markdown or commentary:

{
  "serviceTags": ["short canonical service labels, lowercase, e.g. road freight, cold chain, container haulage"],
  "capabilities": ["specific things they can do, in their own terms"],
  "industriesServed": ["sectors they name"],
  "geographicCoverage": ["provinces, corridors, countries or cities they name"],
  "equipmentAssets": ["vehicles, trailers, warehouses, plant they mention"],
  "certifications": ["accreditations, ISO, memberships, licences"],
  "valueProps": ["claims they make about why to choose them"],
  "shopProfile": {
    "headline": "under 12 words, drawn from their own positioning",
    "shortDescription": "40 to 60 words for a listing card",
    "longDescription": "150 to 250 words for a shop page, written from their content",
    "keywords": ["search terms a buyer would use to find them"]
  },
  "campaignAngles": [
    { "angle": "an engagement hook", "evidence": "the wording in their content that supports it", "targetRole": "who to aim it at" }
  ],
  "contentQuality": "rich | thin | placeholder"
}

WEBSITE CONTENT:
${text}`;
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

  const hasWebsite = Boolean(partner.website);
  const hasProfile = Boolean(partner.serviceProfile);

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
                <Button onClick={harvest} disabled={isHarvesting} variant="outline" className="w-full font-bold">
                  {isHarvesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  {corpus ? 'Re-harvest Website Content' : 'Harvest Website Content'}
                </Button>
                {corpus && (
                  <ScrollArea className="h-28 w-full border rounded-md p-3 bg-muted/20">
                    {(corpus.pages || []).map((page: any) => (
                      <div key={page.url} className="text-xs mb-1">
                        <span className="font-medium">{page.wordCount}w</span>{' '}
                        <span className="text-muted-foreground break-all">{page.url}</span>
                      </div>
                    ))}
                  </ScrollArea>
                )}
              </div>

              {corpus && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                      Step 2 &mdash; Classify the harvested text
                    </label>
                    <Button
                      variant="outline"
                      className="w-full font-bold"
                      onClick={async () => {
                        await navigator.clipboard.writeText(getStructurePrompt());
                        toast({ title: 'Classification prompt copied', description: 'It contains the harvested text, so the AI cannot invent.' });
                      }}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Copy Classification Prompt
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                      Step 3 &mdash; Paste the returned JSON
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
