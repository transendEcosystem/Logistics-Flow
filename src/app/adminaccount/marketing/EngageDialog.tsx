'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
    Loader2, Mail, Zap, Send, ShieldCheck, MessageSquare, Smartphone, Info, 
    ChevronRight, ChevronLeft, Target, Ban, Filter, MousePointer2, Gift, 
    Handshake, ExternalLink, AtSign, Building, DollarSign, FileText, Presentation, Sparkles, UserCheck, Layers 
} from 'lucide-react';
import { getClientSideAuthToken, useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { copyHtmlToClipboard, cn } from '@/lib/utils';
import { APP_BASE_URL } from '@/lib/app-url';
import { engagementContentLabel } from '@/lib/engagement-content';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { collection, query, where, limit } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

// Import content components
import CompanyProfile from './content/CompanyProfile';
import TechArchitecture from './content/TechArchitecture';
import RevenueModel from './content/RevenueModel';
import PitchDeck from './content/PitchDeck';
import Framework from './content/Framework';
import SalesIntelligence from './content/SalesIntelligence';
import DigitalHandshake from './content/DigitalHandshake';
import IncentiveHandshake from './content/IncentiveHandshake';
import SupplierValueProposition from './content/SupplierValueProposition';
import TransporterValueProposition from './content/TransporterValueProposition';
import TheWedge from './content/TheWedge';
import TheSignal from './content/TheSignal';
import TheEliteFilter from './content/TheEliteFilter';
import TheBreakUp from './content/TheBreakUp';

// The Offer is audience-specific. This mirrors the AUDIENCE_CONFIG mapping used by
// the Marketing & Pitch Library so the engagement hub sends the identical document.
import PartnerOffer from './offers/PartnerOffer';
import InvestorOffer from './offers/InvestorOffer';
import DeveloperOffer from './offers/DeveloperOffer';
import SupplierOffer from './offers/SupplierOffer';
import TransporterOffer from './offers/TransporterOffer';
import AssociateOffer from './offers/AssociateOffer';

const OFFER_BY_AUDIENCE: Record<string, React.ComponentType<any>> = {
    partner: PartnerOffer,
    isa: PartnerOffer,
    associate: AssociateOffer,
    supplier: SupplierOffer,
    transporter: TransporterOffer,
    haulier: TransporterOffer,
    finance: InvestorOffer,
    investor: InvestorOffer,
    developer: DeveloperOffer,
    warehouse: PartnerOffer,
    distribution: PartnerOffer,
    load: PartnerOffer,
    'buy-sell': PartnerOffer,
};

interface EngageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partners: any[]; 
  initialIndex?: number;
  audience: string;
  onEngageSuccess?: () => void;
}

async function performAdminAction(token: string, action: string, payload: any) {
    const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
        cache: 'no-store'
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || `API Error for action: ${action}`);
    return result;
}

const ALL_ENGAGEMENT_TABS = [
    { id: 'deep-dive-strategy', label: 'Deep-Dive Strategy', icon: Target, requiresProfile: true },
    { id: 'transporter-value-prop', label: 'Transporter 24k Engine', icon: Sparkles },
    { id: 'supplier-value-prop', label: 'Supplier 5,400 Engine', icon: Sparkles },
    { id: 'digital-handshake', label: 'Digital Handshake', icon: ShieldCheck, hideFor: ['associate'] },
    { id: 'strategic-intro', label: 'Strategic Intro', icon: Handshake },
    { id: 'platform-dm', label: 'Platform DM Script', icon: MessageSquare, hideFor: ['supplier', 'transporter', 'investor'] },
    { id: 'company-profile', label: 'Company Profile', icon: Building },
    { id: 'incentive-handshake', label: 'Welcome Incentive', icon: Gift },
    { id: 'tech-architecture', label: 'Tech Architecture', icon: Zap },
    { id: 'revenue-model', label: 'Revenue Model', icon: DollarSign },
    { id: 'offer', label: 'The Offer', icon: FileText },
    { id: 'pitch', label: 'The Pitch', icon: Presentation },
    { id: 'framework', label: 'The Framework', icon: Layers },
    { id: 'sales-intelligence', label: 'Sales Intelligence', icon: Sparkles },
    { id: 'the-wedge', label: 'The Wedge', icon: Target, tactical: true },
    { id: 'the-signal', label: 'The Signal', icon: MousePointer2, tactical: true },
    { id: 'the-elite-filter', label: 'The Elite Filter', icon: Filter, tactical: true },
    { id: 'the-break-up', label: 'The Break-Up', icon: Ban, tactical: true },
];

const NARRATIVE_TABS = ALL_ENGAGEMENT_TABS.filter(t => !t.tactical);
const TACTICAL_TABS = ALL_ENGAGEMENT_TABS.filter(t => t.tactical);

function resolveContact(partner: any) {
    if (!partner) return { name: 'Partner', email: '', mobile: '', whatsapp: '' };

    const clean = (val: any) => {
        if (!val) return false;
        const v = String(val).trim();
        const low = v.toLowerCase();
        const forbidden = ['n/a', 'null', 'none', 'locked', 'undefined', '[locked]', 'no email', 'no phone', 'pending', 'h', 'x'];
        if (!v || forbidden.some(f => low === f) || low.includes('locked@')) return false;
        return v;
    };

    const searchObj = (obj: any, keys: string[]): string => {
        if (!obj || typeof obj !== 'object') return '';
        for (const k of keys) {
            const val = obj[k];
            const c = clean(val);
            if (c) return c;
        }
        return '';
    };

    const emailKeys = ['email', 'email_address', 'contact_email', 'mail'];
    const phoneKeys = ['mobile', 'whatsapp', 'phone', 'cell'];

    const primaryRole = partner.primaryContactRole;
    const primaryContact = primaryRole ? partner[primaryRole] : null;
    const researchedTarget = partner.commercialProfile?.engagementStrategy?.targetContact;
    const researchedContact = researchedTarget && typeof researchedTarget === 'object' ? researchedTarget : null;
    const verifiedEmail = partner.commercialProfile?.contactability?.emailVerification?.bounceRisk === 'high'
        ? ''
        : clean(partner.commercialProfile?.contactability?.emailVerification?.email);
    const verifiedPhone = clean(partner.commercialProfile?.contactability?.phoneVerification?.phone);

    const name = clean(primaryContact?.name) || 
                 clean(researchedContact?.name) ||
                 clean(partner.firstName) || 
                 clean(partner.marketingManager?.name) || 
                 clean(partner.ceo?.name) || 
                 clean(partner.operationsManager?.name) ||
                 clean(partner.technicalManager?.name) ||
                 clean(partner.contactPerson) || 
                 clean(partner.contact_person) || 
                 clean(partner.companyName) || 
                 'Partner';
    
    const email = clean(primaryContact?.email) || clean(researchedContact?.email) || verifiedEmail || searchObj(partner.marketingManager, emailKeys) || searchObj(partner.ceo, emailKeys) || searchObj(partner, emailKeys) || (clean(partner.email) || '');
    const mobile = clean(primaryContact?.mobile) || clean(researchedContact?.mobile) || verifiedPhone || searchObj(partner.marketingManager, phoneKeys) || searchObj(partner.ceo, phoneKeys) || searchObj(partner, phoneKeys) || (clean(partner.mobile || partner.phone) || '');
    const whatsapp = (clean(partner.whatsapp) || mobile).toString();

    return { name: name.toString(), email: email.toString(), mobile: mobile.toString(), whatsapp: whatsapp.toString() };
}

function deepDiveContent(partner: any, channel: 'outlook' | 'whatsapp' | 'social-dm') {
    const pack = partner?.commercialProfile?.engagementPack || {};
    const strategy = partner?.commercialProfile?.engagementStrategy || {};
    const contact = typeof strategy.targetContact === 'object' ? strategy.targetContact : {};
    const firstName = String(contact.name || partner?.marketingManager?.name || partner?.ceo?.name || 'there').trim().split(/\s+/)[0];
    const company = partner?.companyName || 'your business';
    if (channel === 'whatsapp') {
        return pack.whatsAppMessage || `Hi ${firstName}, Logistics Flow has completed a digital-presence review for ${company}. Could we arrange a short call to discuss a practical supplier-profile and enquiry opportunity?`;
    }
    if (channel === 'social-dm') {
        return pack.whatsAppMessage || `Hi ${firstName}, Logistics Flow has completed a digital-presence review for ${company}. Could we arrange a short call to discuss a practical supplier-profile and enquiry opportunity?`;
    }
    return pack.emailBody || `Dear ${firstName},\n\nLogistics Flow has completed a digital-presence review for ${company}. We would value a short discussion on a practical supplier-profile and qualified-enquiry opportunity.\n\nKind regards,\nLogistics Flow`;
}

function escapeHtml(value: string) {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function deepDiveEmailHtml(partner: any) {
    const text = deepDiveContent(partner, 'outlook');
    const baseUrl = APP_BASE_URL;
    const partnerId = partner?.id || 'PROSPECT';
    const optInPath = `/opt-in/${partnerId}`;
    const contentType = 'deep-dive-strategy';
    const optInLink = `${baseUrl}/api/trackEmailOpen/${partnerId}?source=app&contentType=${contentType}&dest=${encodeURIComponent(optInPath)}`;
    const displayOptInLink = `${baseUrl}${optInPath}`;
    const pixelUrl = `${baseUrl}/api/trackEmailOpen/${partnerId}?contentType=${contentType}`;
    const paragraphs = text
        .split(/\n{2,}/)
        .map(paragraph => `<p style="margin: 0 0 12pt 0;">${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
        .join('');

    return `<div style="font-family: Calibri, sans-serif; font-size: 12pt; color: #000000; line-height: 1.45;">${paragraphs}<p style="margin: 16pt 0; padding: 12pt; border: 2px dashed #228B22; border-radius: 8pt; background-color: #f9fff9; text-align: center;"><strong>Review your free supplier profile here:</strong><br /><a href="${optInLink}" target="_blank" style="color: #228B22; font-weight: bold; text-decoration: underline;">${displayOptInLink}</a></p><img src="${pixelUrl}" width="1" height="1" style="display:none" alt="" /></div>`;
}

function addContentTypeToTrackingUrls(html: string, contentType: string, partnerId: string): string {
    const withContentType = html.replace(
        /(\/api\/trackEmailOpen\/[^"'?\s<]+)(\?[^"'<\s]*)?/g,
        (url, path, query = '') => {
            if (String(query).includes('contentType=')) return url;
            return `${path}${query ? `${query}&` : '?'}contentType=${encodeURIComponent(contentType)}`;
        }
    );
    const withTrackedLinks = withContentType.replace(
        /href=(["'])(https?:\/\/[^/"']+)?(\/(?:join|opt-in)\/?[^"']*)\1/gi,
        (_match, quote, _origin, destination) => {
            const trackingUrl = `${APP_BASE_URL}/api/trackEmailOpen/${partnerId}?source=app&contentType=${encodeURIComponent(contentType)}&dest=${encodeURIComponent(destination)}`;
            return `href=${quote}${trackingUrl}${quote}`;
        }
    );
    if (/<img[^>]+\/api\/trackEmailOpen\//i.test(withTrackedLinks)) return withTrackedLinks;
    const pixelUrl = `${APP_BASE_URL}/api/trackEmailOpen/${partnerId}?contentType=${encodeURIComponent(contentType)}`;
    return `${withTrackedLinks}<img src="${pixelUrl}" width="1" height="1" style="display:none" alt="" />`;
}

export function EngageDialog({ open, onOpenChange, partners, initialIndex = 0, audience, onEngageSuccess }: EngageDialogProps) {
  const { user: adminUser } = useUser();
  const { toast } = useToast();
  const firestore = useFirestore();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [activeTab, setActiveTab] = useState(
      audience === 'associates' ? 'strategic-intro' : 
      (audience === 'transporters' || audience === 'transporter' || audience === 'haulier' ? 'transporter-value-prop' :
      (audience === 'suppliers' || audience === 'supplier' ? 'supplier-value-prop' : 'digital-handshake'))
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);

  const incentivesQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      return query(collection(firestore, 'configuration/communityIncentives/active'), limit(1));
  }, [firestore]);
  const { data: incentives } = useCollection(incentivesQuery);
  const activeIncentive = incentives?.[0];

  useEffect(() => {
    if (open) {
        setCurrentIndex(initialIndex);
        setActiveTab(
            audience === 'associates' ? 'strategic-intro' : 
            (audience === 'transporters' || audience === 'transporter' || audience === 'haulier' ? 'transporter-value-prop' :
            (audience === 'suppliers' || audience === 'supplier' ? 'supplier-value-prop' : 'digital-handshake'))
        );
    }
  }, [open, initialIndex, audience]);

  const currentPartner = useMemo(() => {
    if (!partners || partners.length === 0) return null;
    return partners[currentIndex] || partners[0];
  }, [partners, currentIndex]);

  const contact = useMemo(() => resolveContact(currentPartner), [currentPartner]);
  const hasEmail = contact.email.length > 3; 
  const hasPhone = contact.whatsapp.length > 5;

  const normalizedAudience = useMemo(() => {
      let aud = (audience || 'partner').toLowerCase();
      if (aud.endsWith('s')) aud = aud.slice(0, -1);
      return aud;
  }, [audience]);

  const OfferForAudience = OFFER_BY_AUDIENCE[normalizedAudience] || PartnerOffer;

  const targetCollection = useMemo(() => {
      if (!currentPartner) return 'partners';
      if (currentPartner.sourceCollection) return currentPartner.sourceCollection;
      return (currentPartner.source === 'Lead' || !currentPartner.type || currentPartner.type === 'lead') ? 'leads' : 'partners';
  }, [currentPartner]);

  const getSubject = (tabId: string) => {
      if (tabId === 'deep-dive-strategy') {
          return currentPartner?.commercialProfile?.engagementPack?.emailSubject || `Logistics Flow: supplier opportunity for ${currentPartner?.companyName || 'your business'}`;
      }
      const company = currentPartner?.companyName || 'your business';
      const tab = ALL_ENGAGEMENT_TABS.find(t => t.id === tabId);
      const label = tab ? tab.label : tabId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      return `Logistics Flow: ${label} for ${company}`;
  }

  const handleLogAndLaunch = async (channel: 'outlook' | 'whatsapp' | 'social-dm') => {
    if (!currentPartner) return;
    const contentId = `engage-content-wrapper-${activeTab}`;
    const contentElement = document.getElementById(contentId);
    if (!contentElement) return;

    const subjectToLog = getSubject(activeTab);
    const rawText = activeTab === 'deep-dive-strategy'
        ? deepDiveContent(currentPartner, channel)
        : contentElement.innerText || contentElement.textContent || '';

    setIsProcessing(true);
    try {
        const token = (await getClientSideAuthToken()) || '';
        if (!token) throw new Error("Authentication failed.");

        await performAdminAction(token, 'logCommunication', {
            partnerId: currentPartner.id,
            type: channel === 'whatsapp' ? 'WhatsApp' : (channel === 'social-dm' ? 'Social DM' : 'Email'),
            subject: subjectToLog,
            notes: `Manual engagement launched via ${channel}.`,
            contentType: activeTab,
            contentLabel: engagementContentLabel(activeTab),
            collection: targetCollection
        });

        if (channel === 'whatsapp') {
            const cleanNumber = contact.whatsapp.replace(/\s/g, '').replace(/^\+/, '').replace(/^0/, '27');
            window.open(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(rawText)}`, '_blank');
        } else if (channel === 'social-dm') {
            await navigator.clipboard.writeText(rawText);
            const profileUrl = currentPartner.website || currentPartner.url || '';
            if (profileUrl) window.open(profileUrl.startsWith('http') ? profileUrl : `https://${profileUrl}`, '_blank');
            toast({ title: "DM Script Copied!", description: "Follow the user, then paste script into platform DM." });
        } else {
            const wrappedHtml = activeTab === 'deep-dive-strategy'
                    ? deepDiveEmailHtml(currentPartner)
                : addContentTypeToTrackingUrls(
                    `<div style="font-family: Calibri, sans-serif; font-size: 12pt;">${contentElement.innerHTML}</div>`,
                    activeTab,
                    currentPartner.id
                );
            await copyHtmlToClipboard(wrappedHtml);
            window.location.href = `mailto:${contact.email}?subject=${encodeURIComponent(subjectToLog)}`;
        }
        
        if (onEngageSuccess) onEngageSuccess();
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Action Failed', description: e.message });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleAutomatedDispatch = async () => {
    if (!currentPartner) return;
    setIsDispatching(true);
    try {
        const token = (await getClientSideAuthToken()) || '';
        if (!token) throw new Error("Session expired.");
        
        const contentId = `engage-content-wrapper-${activeTab}`;
        const contentElement = document.getElementById(contentId);
        if (!contentElement) throw new Error("Content not found.");

        const subject = getSubject(activeTab);

        const deepDiveHtml = activeTab === 'deep-dive-strategy'
                ? deepDiveEmailHtml(currentPartner)
            : addContentTypeToTrackingUrls(contentElement.innerHTML, activeTab, currentPartner.id);

        await performAdminAction(token, 'dispatchEngagement', {
            partnerId: currentPartner.id,
            email: contact.email,
            subject,
            html: deepDiveHtml,
            contentType: activeTab,
            contentLabel: engagementContentLabel(activeTab),
            collection: targetCollection
        });

        toast({ title: "Dispatch Successful" });
        if (onEngageSuccess) onEngageSuccess();
        
        if (partners.length > 1 && currentIndex < partners.length - 1) {
            setTimeout(() => setCurrentIndex(prev => prev + 1), 800);
        } else {
            setTimeout(() => onOpenChange(false), 1500);
        }
    } catch (e: any) {
        toast({ variant: 'destructive', title: "Dispatch Failed", description: e.message });
    } finally {
        setIsDispatching(false);
    }
  };

  if (!currentPartner) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 text-left overflow-hidden text-foreground">
            <DialogHeader className="p-6 border-b bg-muted/50">
                <div className="flex justify-between items-center">
                    <div className="text-left space-y-1">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-left">
                            <Send className="h-6 w-6 text-primary" />
                            Engagement Hub: {contact.name}
                        </DialogTitle>
                        <div className="flex items-center gap-3 text-sm">
                           <Badge variant="secondary" className="uppercase font-black text-[10px] tracking-widest">{normalizedAudience}</Badge>
                           {currentPartner.social_handle && (
                               <div className="flex items-center gap-1.5 font-bold text-primary text-xs">
                                   <AtSign className="h-3 w-3" /> {currentPartner.social_handle}
                               </div>
                           )}
                           <div className="flex items-center gap-2 text-muted-foreground border-l pl-3">
                               <Mail className={cn("h-3.5 w-3.5", hasEmail && "text-blue-600")} />
                               <span className={cn("font-medium", !hasEmail && "text-destructive italic")}>{contact.email || 'No Email'}</span>
                           </div>
                           <div className="flex items-center gap-2 text-muted-foreground border-l pl-3">
                               <Smartphone className={cn("h-3.5 w-3.5", hasPhone && "text-green-600")} />
                               <span className={cn("font-bold", hasPhone && "text-green-600")}>{contact.whatsapp || 'No Phone'}</span>
                           </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" className="font-bold border-primary/20 text-primary" onClick={() => handleLogAndLaunch('social-dm')} disabled={isProcessing}>
                            <AtSign className="mr-2 h-4 w-4" /> Platform DM
                        </Button>
                        <Button variant="outline" className="font-bold border-green-200 text-green-600 hover:bg-green-50" onClick={() => handleLogAndLaunch('whatsapp')} disabled={isProcessing || !hasPhone}>
                            <Smartphone className="mr-2 h-4 w-4" /> WhatsApp
                        </Button>
                        <Button variant="outline" className="font-bold border-blue-200 text-blue-600 hover:bg-green-50" onClick={() => handleLogAndLaunch('outlook')} disabled={isProcessing || !hasEmail}>
                            <Mail className="mr-2 h-4 w-4" /> {hasEmail ? 'Outlook' : 'No verified email'}
                        </Button>
                    </div>
                </div>
            </DialogHeader>

            <div className="flex-1 flex overflow-hidden">
                <div className="w-64 border-r bg-muted/10 p-4 space-y-4 overflow-y-auto text-left">
                    <div className="space-y-1 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2 mb-2 block">Standard Narrative</Label>
                        {NARRATIVE_TABS.filter(t => (!t.hideFor || !t.hideFor.includes(normalizedAudience)) && (!t.requiresProfile || Boolean(currentPartner.commercialProfile?.engagementPack))).map((tab) => (
                            <Button
                                key={tab.id}
                                variant={activeTab === tab.id ? "secondary" : "ghost"}
                                className={cn("w-full justify-start text-xs h-10 px-3", activeTab === tab.id && "bg-white shadow-sm")}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {tab.icon && <tab.icon className="h-3.5 w-3.5 mr-2 text-primary" />}
                                {tab.label}
                            </Button>
                        ))}
                    </div>

                    <Separator />

                    <div className="space-y-1 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary px-2 mb-2 block flex items-center gap-2 text-left">
                            <Zap className="h-3 w-3" /> Tactical Sequences
                        </Label>
                        {TACTICAL_TABS.map((tab) => (
                            <Button
                                key={tab.id}
                                variant={activeTab === tab.id ? "secondary" : "ghost"}
                                className={cn("w-full justify-start text-xs h-10 px-3 transition-all", activeTab === tab.id && "bg-white shadow-sm ring-1 ring-primary/20")}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <tab.icon className="h-3.5 w-3.5 mr-2 text-primary" />
                                {tab.label}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50 p-8 text-left">
                    <div id={`engage-content-wrapper-${activeTab}`} className="bg-white p-10 rounded-lg shadow-sm border min-h-full text-left">
                        <Suspense fallback={<div className="flex justify-center items-center py-20"><Loader2 className="animate-spin h-10 w-10 text-primary mx-auto" /></div>}>
                            {activeTab === 'deep-dive-strategy' && (
                                <div style={{ fontFamily: 'Calibri, sans-serif', fontSize: '12pt', color: '#000000', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
                                    <p style={{ fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '2px solid #000000', paddingBottom: '4pt', marginBottom: '15pt' }}>
                                        SUPPLIER INTELLIGENCE: {currentPartner?.companyName?.toUpperCase() || 'INDUSTRIAL NODE'} X LOGISTICS FLOW
                                    </p>
                                    <p><strong>Research contact:</strong> {contact.name}</p>
                                    <p><strong>Research finding:</strong> {currentPartner.commercialProfile?.onlinePresence?.presenceSummary || 'Supplier intelligence is on record.'}</p>
                                    <br />
                                    {deepDiveContent(currentPartner, 'outlook')}
                                    <p style={{ marginTop: '16pt' }}>
                                        <a href={`${APP_BASE_URL}/opt-in/${currentPartner.id}`} style={{ color: '#228B22', fontWeight: 'bold', textDecoration: 'underline' }}>
                                            {APP_BASE_URL}/opt-in/{currentPartner.id}
                                        </a>
                                    </p>
                                </div>
                            )}
                            {activeTab === 'strategic-intro' && (
                                <div style={{ fontFamily: 'Calibri, sans-serif', fontSize: '12pt', color: '#000000', lineHeight: '1.4' }}>
                                    <p style={{ fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '2px solid #000000', paddingBottom: '4pt', marginBottom: '15pt' }}>
                                        STRATEGIC INTRO: {currentPartner?.companyName?.toUpperCase() || 'INDUSTRIAL NODE'} X LOGISTICS FLOW
                                    </p>
                                    <p>Good day {contact.name.split(' ')[0]},</p>
                                    <p>My name is Michael Koton, owner of Logistics Flow. We have established your operational node in our industrial grid and identified a data gap that is currently preventing matched deal-flow from reaching your desk.</p>
                                    <p style={{ margin: '15pt 0' }}>We are a South African Data-as-a-Service ecosystem that maps over 22,000 suppliers and hauliers to automate sourcing and finance. We have identified a strategic fit for <strong>{currentPartner?.companyName || 'your business'}</strong> within our current expansion cycle.</p>
                                    <p style={{ marginTop: '15pt', fontWeight: 'bold' }}>Establish your digital standing for free to unlock:</p>
                                    <ul style={{ paddingLeft: '20pt' }}>
                                        <li><strong>Forensic Registry Access:</strong> Map your competitors and suppliers directly.</li>
                                        <li><strong>Matching Engine:</strong> Receive proactive alerts for capacity and cargo.</li>
                                        <li><strong>Capital division:</strong> Access in-house finance where traditional banks fail.</li>
                                    </ul>
                                    <p style={{ margin: '15pt 0' }}><strong>Are you ready to establish the handshake?</strong></p>
                                    <p><a href={`${APP_BASE_URL}/opt-in/${currentPartner.id}`} style={{ color: '#228B22', fontWeight: 'bold' }}>{APP_BASE_URL}/opt-in/{currentPartner.id}</a></p>
                                </div>
                            )}
                            {activeTab === 'platform-dm' && (
                                <div style={{ fontFamily: 'Calibri, sans-serif', fontSize: '12pt', color: '#000000', lineHeight: '1.4' }}>
                                    <p>Hi {contact.name.split(' ')[0]}, I'm Michael, owner of **Logistics Flow**. </p>
                                    <p style={{ margin: '10pt 0' }}>I've been following your content here and think your creative influence is a perfect match for a strategic partnership we're launching for the South African transport industry.</p>
                                    <p>We're offering influencers **Free 4K AI Studio access** and a **30% recurring annuity** on all referrals. We've already cataloged your business in our industrial registry.</p>
                                    <p style={{ marginTop: '10pt' }}>Are you interested in the details? Let's establish the handshake here:</p>
                                    <p><a href={`${APP_BASE_URL}/opt-in/${currentPartner.id}?role=associate`} style={{ color: '#228B22', fontWeight: 'bold' }}>{APP_BASE_URL}/opt-in/{currentPartner.id}</a></p>
                                </div>
                            )}
                            {activeTab === 'transporter-value-prop' && <TransporterValueProposition partner={currentPartner} />}
                            {activeTab === 'supplier-value-prop' && <SupplierValueProposition partner={currentPartner} />}
                            {activeTab === 'digital-handshake' && <DigitalHandshake partner={currentPartner} audience={normalizedAudience} />}
                            {activeTab === 'company-profile' && <CompanyProfile audience={normalizedAudience} partner={currentPartner} />}
                            {activeTab === 'incentive-handshake' && <IncentiveHandshake partner={currentPartner} incentive={activeIncentive} />}
                            {activeTab === 'tech-architecture' && <TechArchitecture partner={currentPartner} />}
                            {activeTab === 'revenue-model' && <RevenueModel partner={currentPartner} />}
                            {activeTab === 'sales-intelligence' && <SalesIntelligence partner={currentPartner} />}
                            {activeTab === 'offer' && <OfferForAudience partner={currentPartner} />}
                            {activeTab === 'pitch' && <PitchDeck partner={currentPartner} />}
                            {activeTab === 'framework' && <Framework partner={currentPartner} />}

                            {activeTab === 'the-wedge' && <TheWedge partner={currentPartner} audience={normalizedAudience} />}
                            {activeTab === 'the-signal' && <TheSignal partner={currentPartner} />}
                            {activeTab === 'the-elite-filter' && <TheEliteFilter partner={currentPartner} />}
                            {activeTab === 'the-break-up' && <TheBreakUp partner={currentPartner} />}
                        </Suspense>
                    </div>
                </div>
            </div>
        </DialogContent>
    </Dialog>
  );
}
