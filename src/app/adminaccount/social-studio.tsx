
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
    Facebook, Linkedin, Instagram, Music, Sparkles, Loader2, Copy, ExternalLink, 
    ShieldCheck, BarChart3, ImageIcon, Video, Rocket, Link as LinkIcon, Users, Info, Search, Save, MousePointer2, RefreshCcw,
    Calendar, Clock, Trash2, Send, CheckCircle2, UserPlus, Tv, Megaphone, UserCheck, SearchCode, Radio
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { generateSocialCopy } from '@/ai/flows/social-copy-flow';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { getClientSideAuthToken, useUser } from '@/firebase';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Media Generation Components
import ImageGeneratorCard from "@/app/backend/image-generator-card";
import VideoGeneratorCard from "@/app/backend/video-generator-card";

type Platform = 'facebook' | 'linkedin' | 'instagram' | 'tiktok';

const platformConfig: Record<string, { label: string, icon: any, color: string, targetLabel: string, targetDesc: string, defaultPage: string, defaultDest: string }> = {
    facebook: { 
        label: 'Facebook', 
        icon: Facebook, 
        color: 'text-blue-600', 
        targetLabel: 'Target Group URL', 
        targetDesc: 'The specific Facebook Group or Page where this post will be broadcasted.',
        defaultDest: 'https://facebook.com/groups/feed/', 
        defaultPage: 'https://facebook.com/LogisticsFlow' 
    },
    linkedin: { 
        label: 'LinkedIn', 
        icon: Linkedin, 
        color: 'text-blue-800', 
        targetLabel: 'Target Community/Thread URL', 
        targetDesc: 'The LinkedIn Page, Thread, or Personal Profile feed you are targeting for engagement.',
        defaultDest: 'https://linkedin.com/feed/', 
        defaultPage: 'https://www.linkedin.com/company/logistics-flow-sa' 
    },
    instagram: { 
        label: 'Instagram', 
        icon: Instagram, 
        color: 'text-pink-600', 
        targetLabel: 'Target Profile URL', 
        targetDesc: 'The Instagram handle or hashtag feed where this content will be pinned.',
        defaultDest: 'https://instagram.com/', 
        defaultPage: 'https://instagram.com/LogisticsFlow' 
    },
    tiktok: { 
        label: 'TikTok', 
        icon: Music, 
        color: 'text-black', 
        targetLabel: 'Target Trend URL', 
        targetDesc: 'The specific TikTok Trend or Creator account you are associating with.',
        defaultDest: 'https://tiktok.com/', 
        defaultPage: 'https://tiktok.com/@LogisticsFlow' 
    },
};

const socialTemplates = (platform: Platform) => {
    const isLinkedIn = platform === 'linkedin';
    
    return {
        'app-launch': {
            group: 'Foundation',
            label: isLinkedIn ? 'Executive Announcement' : 'Official App Launch',
            icon: Rocket,
            headline: isLinkedIn ? 'Strategic Launch: The Digitalization of SA Logistics' : '🚀 Revolutionary: The Launch of Logistics Flow',
            body: isLinkedIn 
                ? "We are pleased to announce the formal launch of Logistics Flow. This represents a strategic shift in the South African transport landscape—moving from fragmented systems to a unified, data-driven ecosystem. \n\nOur architecture is designed to optimize industrial capacity and provide verified transparency for hauliers and lenders alike. This is not just an app; it is the infrastructure for growth."
                : "It's finally here! A groundbreaking digital ecosystem built specifically for the South African transport industry. No more fragmented systems or information gaps. Be among the first to experience the future. It's new. It's groundbreaking. It's built for you.",
            imagePrompt: 'An ultra-professional cinematic overhead shot of a modern, clean logistics port at night with glowing blue data lines connecting hubs. High-contrast, executive aesthetic.',
            videoPrompt: 'A 5-second dynamic pull-back from a glowing digital map of South Africa into a clean, modern boardroom where the Logistics Flow dashboard is visible on a large screen.'
        },
        'value-costs': {
            group: 'Value',
            label: 'Efficiency Dividends',
            icon: BarChart3,
            headline: isLinkedIn ? 'Optimizing the Bottom Line: Collective Buying Power' : '📉 Slash Your Operating Costs',
            body: isLinkedIn 
                ? "Operating costs remain the primary constraint on transport profitability. Logistics Flow breaks this constraint by leveraging a community-wide 'Efficiency Syndicate.' By aggregating demand for parts, tires, and fuel, we secure institutional-grade pricing for independent hauliers. \n\nEfficiency is the new competitive advantage."
                : "High maintenance and fuel costs are a constant tax on your profit. By joining our community, you tap into collective buying power for tires, parts, and fuel. Why pay premium prices when we can negotiate as a syndicate?",
            imagePrompt: 'A macro-photography shot of high-end mechanical components arranged in a geometric pattern, representing order and precision. Minimalist lighting.',
            videoPrompt: 'A data-visualization animation showing various small cost nodes flowing together to form a large, solid pillar of capital, symbolizing collective buying power.'
        },
        'revenue-membership': {
            group: 'Revenue',
            label: 'Network Monetization',
            icon: Users,
            headline: isLinkedIn ? 'Monetizing Industrial Relationships' : '📈 Build a Recurring Annuity',
            body: isLinkedIn 
                ? "Industrial relationships are a tangible asset. Logistics Flow provides the framework to monetize your existing network through our ISA (Independent Sales Agent) program. By digitalizing your contacts into our ecosystem, you build a recurring annuity stream based on platform participation and transactional volume."
                : "Refer a member, earn a commission. Every single month. When your network signs up for a paid plan, you earn a percentage of their fee for as long as they remain active. Build your own monthly income engine today.",
            imagePrompt: 'A professional executive hand holding a digital tablet showing a growing green line graph of recurring revenue. Bokeh industrial background.',
            videoPrompt: 'A slow-motion cinematic shot of a professional handshake in front of a modern logistics facility, transitioning into a digital ledger showing commissions being credited.'
        }
    };
};

const influencerNiches = [
    "Trucking & Transport Creators",
    "Logistics & Supply Chain Thought Leaders",
    "Fleet Industry Reviewers",
    "B2B Tech & Industrial Marketers"
];

function generateInfluencerPrompt(niche: string) {
    return `ACT AS AN ELITE SOUTH AFRICAN INFLUENCER SCOUTING AGENT (V14 - NETWORK LEVERAGE).
RETURN ONLY A RAW JSON ARRAY. NO MARKDOWN. NO CODE BLOCKS. NO CONVERSATION.

STRICT REGIONAL LOCK: ONLY return South African influencers, content creators, media personalities, or industry advocates in SOUTH AFRICA.

TASK: Discover and harvest 20 UNIQUE South African influencers / creators for niche: "${niche}".

SCOUTING PROTOCOL:
1. IDENTIFY CREATORS: Search YouTube, TikTok, Instagram, Facebook, and LinkedIn for SA creators making content about trucking, fleet management, transport, logistics, vehicle maintenance, or SA business.
2. REACH ESTIMATION: Estimate follower count / subscriber base.
3. DIRECT CONTACT EXTRACT: Search channel bios, sitemaps, or LinkedIn to extract direct business email and mobile/WhatsApp.
4. PITCH ANGLE: Identify why this creator matches Logistics Flow (e.g. "Reviews truck parts & fleet tech for 25k followers").

REQUIRED JSON FORMAT (RAW ARRAY):
[
  {
    "record_id": "DISC_INFL_[RAND_ID]",
    "companyName": "CREATOR OR CHANNEL NAME",
    "social_handle": "@handle",
    "contact_person": "VERIFIED HUMAN NAME",
    "email": "VERIFIED BUSINESS EMAIL",
    "mobile": "VERIFIED MOBILE OR WHATSAPP",
    "primary_channel": "TikTok / YouTube / LinkedIn / Instagram",
    "follower_count": "e.g. 25,000",
    "industrial_category": "${niche}",
    "notes": "PITCH ANGLE: Why they match Logistics Flow",
    "proposedOffer": "Free 4K AI Studio Access + 30% Lifetime Recurring Annuity"
  }
]`;
}

export default function SocialStudio({ platform = 'facebook' }: { platform?: Platform }) {
    const { toast } = useToast();
    const { user } = useUser();
    const config = useMemo(() => platformConfig[platform] || platformConfig['facebook'], [platform]);
    const templates = useMemo(() => socialTemplates(platform), [platform]);
    
    const [studioMode, setStudioMode] = useState<'composer' | 'scheduler' | 'influencers'>('composer');
    const [activeTab, setActiveTab] = useState<string>('app-launch');
    const [campaignName, setCampaignName] = useState('');
    const [groupUrl, setGroupUrl] = useState('');
    const [publishedUrl, setPublishedUrl] = useState('');
    const [pageUrl, setPageUrl] = useState(config.defaultPage);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLogging, setIsLogging] = useState(false);

    const [editedContent, setEditedContent] = useState<Record<string, string>>({});
    const [creatorParams, setCreatorParams] = useState({ topic: '', criticalPoints: '' });
    const [aiResult, setAiResult] = useState<any>(null);

    // Automated Scheduler State
    const [scheduledPosts, setScheduledPosts] = useState<any[]>([]);
    const [isLoadingScheduled, setIsLoadingScheduled] = useState(false);
    const [scheduleForm, setScheduleForm] = useState({
        platform,
        headline: '',
        body: '',
        scheduledDate: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
        frequency: 'daily',
        campaignName: 'App Awareness Drive',
        targetUrl: '',
        imagePrompt: '',
        videoPrompt: ''
    });
    const [isScheduling, setIsScheduling] = useState(false);

    // Influencer Hub State
    const [selectedNiche, setSelectedNiche] = useState(influencerNiches[0]);
    const [isScouting, setIsScouting] = useState(false);
    const [discoveredInfluencers, setDiscoveredInfluencers] = useState<any[]>([]);
    const [dispatchingId, setDispatchingId] = useState<string | null>(null);

    const activePost = useMemo(() => {
        if (activeTab === 'creator') return aiResult;
        return (templates as any)[activeTab];
    }, [activeTab, aiResult, templates]);

    const derived = useMemo(() => {
        if (!activePost) return { trackingLink: '', fullPostBody: '' };
        
        const trackingId = user?.uid || 'ANONYMOUS';
        const campaignSeed = campaignName.replace(/\s/g, '_').toUpperCase() || 'GENERAL';
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://logisticsflow.co.za');
        
        const trackingLink = `${baseUrl}/api/trackEmailOpen/${trackingId}?source=associate_click&campaign=${campaignSeed}&platform=${platform.toUpperCase()}&dest=/join?ref=${trackingId}`;
        const currentBody = editedContent[activeTab] || activePost.body || activePost.text || '';
        
        const footer = platform === 'linkedin'
            ? `\n\nStrategic Hub: ${trackingLink}\n\nFollow the Journey: ${pageUrl}\n\n#LogisticsFlow #DigitalTransformation #SAIndustry`
            : `\n\n👉 Join the Community: ${trackingLink}\n\n🔗 Follow us for Updates: ${pageUrl}\n\n#LogisticsFlow #Efficiency #${config.label}`;
            
        return { trackingLink, fullPostBody: `${currentBody}${footer}` };
    }, [activePost, campaignName, pageUrl, editedContent, activeTab, platform, config.label, user]);

    // Load Scheduled Posts
    const loadScheduledPosts = useCallback(async () => {
        setIsLoadingScheduled(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;
            const res = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'getScheduledPosts' }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setScheduledPosts(data.data || []);
            }
        } catch (e) {
            console.warn("Load scheduled failed", e);
        } finally {
            setIsLoadingScheduled(false);
        }
    }, []);

    useEffect(() => {
        if (studioMode === 'scheduler') {
            loadScheduledPosts();
        }
    }, [studioMode, loadScheduledPosts]);

    const handleCreateScheduledPost = async () => {
        if (!scheduleForm.headline || !scheduleForm.body) {
            toast({ variant: 'destructive', title: "Fields Required", description: "Headline and Body are required." });
            return;
        }
        setIsScheduling(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Auth failed");
            const res = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'createScheduledPost', payload: scheduleForm }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || "Failed to schedule post.");
            toast({ title: "Post Scheduled", description: `Queued for ${scheduleForm.platform.toUpperCase()} launch.` });
            setScheduleForm({ ...scheduleForm, headline: '', body: '', imagePrompt: '', videoPrompt: '' });
            loadScheduledPosts();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Scheduling Error", description: e.message });
        } finally {
            setIsScheduling(false);
        }
    };

    const handleDeleteScheduledPost = async (id: string) => {
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;
            await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'deleteScheduledPost', payload: { id } }),
            });
            toast({ title: "Post Removed" });
            loadScheduledPosts();
        } catch (e) {
            toast({ variant: 'destructive', title: "Delete Failed" });
        }
    };

    // Live Influencer Scouting
    const handleScoutInfluencers = async () => {
        setIsScouting(true);
        setDiscoveredInfluencers([]);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Auth failed");
            const promptText = generateInfluencerPrompt(selectedNiche);
            const res = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'liveAIDiscovery', payload: { prompt: promptText, category: selectedNiche } }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || "Scouting failed.");
            setDiscoveredInfluencers(data.records || []);
            toast({ title: "Scouting Complete", description: `Discovered ${data.records?.length || 0} SA influencers for ${selectedNiche}.` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Scouting Error", description: e.message });
        } finally {
            setIsScouting(false);
        }
    };

    const handleDispatchInfluencerOffer = async (influencer: any) => {
        if (!influencer.email) {
            toast({ variant: 'destructive', title: "Email Missing", description: "This influencer record does not have a verified email." });
            return;
        }
        setDispatchingId(influencer.record_id);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Auth failed");
            
            const pitchSubject = `Partnership Invitation: Free 4K AI Studio & 30% Annuity - Logistics Flow`;
            const pitchHtml = `
                <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
                    <h2>Partner Invitation for ${influencer.contact_person || influencer.companyName}</h2>
                    <p>We've been following your work on ${influencer.primary_channel || 'social media'} and would love to partner with you.</p>
                    <p><strong>Logistics Flow</strong> is South Africa's premier digital transport ecosystem. We are offering exclusive creators and influencers:</p>
                    <ul>
                        <li><strong>Free Access to our 4K AI Marketing Studio</strong> (generate industrial video and copy instantly)</li>
                        <li><strong>30% Lifetime Recurring Annuity</strong> on all transaction & membership fees generated through your audience</li>
                    </ul>
                    <p><a href="https://logisticsflow.co.za/join?role=associate" style="background: #2563eb; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Activate Creator Account</a></p>
                </div>
            `;

            await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'dispatchEngagement', 
                    payload: { 
                        partnerId: influencer.record_id || `INF_${Date.now()}`,
                        email: influencer.email,
                        subject: pitchSubject,
                        html: pitchHtml,
                        collection: 'digital_associates'
                    } 
                }),
            });

            toast({ title: "Offer Dispatched!", description: `Sent Digital Partner invitation to ${influencer.email}` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Dispatch Failed", description: e.message });
        } finally {
            setDispatchingId(null);
        }
    };

    const handleLogAndLaunch = async () => {
        const textToCopy = derived.fullPostBody;
        try {
            await navigator.clipboard.writeText(textToCopy);
            toast({ title: "Content Copied!", description: `Opening ${config.label}... Paste your post there.` });
        } catch (err) {
            toast({ variant: 'destructive', title: "Copy Failed", description: "Please manually copy the text." });
        }

        const destination = groupUrl.trim() || config.defaultDest;
        window.open(destination, '_blank');

        setIsLogging(true);
        try {
            const token = await getClientSideAuthToken();
            if (token) {
                await fetch('/api/admin', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        action: 'logAudit', 
                        payload: { 
                            action: 'social_launch_initiated', 
                            details: `Associate launched ${platform} post "${activeTab}" for: ${campaignName}`,
                            metadata: { campaignName, groupUrl, tab: activeTab, platform, trackingLink: derived.trackingLink }
                        } 
                    }),
                });
            }
        } catch (e) {
            console.warn("Audit logging failed after launch.", e);
        } finally {
            setIsLogging(false);
        }
    };

    const handleLogPublishedPost = async () => {
        if (!publishedUrl.trim()) return;
        setIsLogging(true);
        try {
            const token = await getClientSideAuthToken();
            if (!token) return;
            await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'logAudit', 
                    payload: { 
                        action: 'social_post_confirmed', 
                        details: `Associate confirmed live post on ${platform}`,
                        metadata: { liveUrl: publishedUrl, platform, campaignName }
                    } 
                }),
            });
            toast({ title: "Post Recorded", description: "Your activity has been logged for commission verification." });
            setPublishedUrl('');
        } catch (e) {
            toast({ variant: 'destructive', title: "Logging Failed" });
        } finally {
            setIsLogging(false);
        }
    };

    const handleCopyPrompt = (promptType: 'image' | 'video') => {
        const prompt = promptType === 'image' ? activePost?.imagePrompt : activePost?.videoPrompt;
        if (!prompt) return;
        navigator.clipboard.writeText(prompt);
        toast({ title: `${promptType === 'image' ? 'Image' : 'Video'} Prompt Copied!`, description: "Paste it into the AI tools below." });
    };

    const handleGenerateCustom = async () => {
        if (!creatorParams.topic || !creatorParams.criticalPoints) {
            toast({ variant: 'destructive', title: "Details Required", description: "Please enter a topic and points." });
            return;
        }
        setIsGenerating(true);
        try {
            const result = await generateSocialCopy({
                topic: creatorParams.topic,
                criticalPoints: creatorParams.criticalPoints,
                audience: 'transporters',
                tone: 'community_casual'
            });
            if (result.posts && result.posts.length > 0) {
                setAiResult({
                    ...result.posts[0],
                    videoPrompt: `A professional cinematic interpretation of: ${creatorParams.topic}. Focus on industrial movement and precision.`
                });
                toast({ title: "AI Copy Ready" });
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Generation Failed", description: e.message });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-6 text-left">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left">
                <div className="flex items-center gap-4 text-left text-foreground">
                    <div className="bg-muted p-3 rounded-xl">
                        {React.createElement(config.icon, { className: cn("h-8 w-8", config.color) })}
                    </div>
                    <div className="text-left">
                        <h1 className="text-2xl font-black font-headline">{config.label} Social & Influencer Studio</h1>
                        <p className="text-muted-foreground text-sm">Automated post scheduling, AI copy generation & SA influencer networking.</p>
                    </div>
                </div>

                {/* Sub-Mode Tabs */}
                <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl border">
                    <Button
                        variant={studioMode === 'composer' ? 'default' : 'ghost'}
                        size="sm"
                        className="font-bold text-xs gap-1.5"
                        onClick={() => setStudioMode('composer')}
                    >
                        <Sparkles className="h-3.5 w-3.5" /> Campaign Composer
                    </Button>
                    <Button
                        variant={studioMode === 'scheduler' ? 'default' : 'ghost'}
                        size="sm"
                        className="font-bold text-xs gap-1.5"
                        onClick={() => setStudioMode('scheduler')}
                    >
                        <Calendar className="h-3.5 w-3.5" /> Automated Scheduler
                    </Button>
                    <Button
                        variant={studioMode === 'influencers' ? 'default' : 'ghost'}
                        size="sm"
                        className="font-bold text-xs gap-1.5"
                        onClick={() => setStudioMode('influencers')}
                    >
                        <Users className="h-3.5 w-3.5" /> Influencer Scouting
                    </Button>
                </div>
            </div>

            {/* MODE 1: COMPOSER */}
            {studioMode === 'composer' && (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-left text-foreground">
                        <div className="space-y-2 text-left text-foreground">
                            <Label className="text-[10px] font-black uppercase text-primary tracking-[0.2em] flex items-center gap-2">
                                <LinkIcon className="h-3 w-3"/> Campaign Tracking Label
                            </Label>
                            <Input 
                                placeholder="e.g. Q4 Growth Promo" 
                                value={campaignName} 
                                onChange={e => setCampaignName(e.target.value)} 
                                className="h-10 bg-white" 
                            />
                            <p className="text-[9px] text-muted-foreground italic">Identifies traffic from this specific post sequence.</p>
                        </div>
                        <div className="space-y-2 text-left text-foreground">
                            <Label className="text-[10px] font-black uppercase text-primary tracking-[0.2em] flex items-center gap-2">
                                <ExternalLink className="h-3 w-3"/> {config.targetLabel}
                            </Label>
                            <Input 
                                placeholder="Paste target group or feed URL..." 
                                value={groupUrl} 
                                onChange={e => setGroupUrl(e.target.value)} 
                                className="h-10 bg-white" 
                            />
                            <p className="text-[9px] text-muted-foreground italic">{config.targetDesc}</p>
                        </div>
                    </div>

                    <Card className="flex flex-col min-h-[70vh] overflow-hidden p-0 shadow-2xl border-none text-left">
                        <div className="flex-1 flex overflow-hidden text-left text-foreground">
                            <div className="w-64 border-r bg-muted/10 p-4 space-y-4 overflow-y-auto text-left">
                                <div className="space-y-1 text-left">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2 mb-2 block">Campaign Narrative</Label>
                                    {Object.entries(templates).map(([id, template]: [string, any]) => (
                                        <Button
                                            key={id}
                                            variant={activeTab === id ? "secondary" : "ghost"}
                                            className={cn("w-full justify-start gap-3 h-10 px-2", activeTab === id && "bg-white shadow-sm")}
                                            onClick={() => setActiveTab(id)}
                                        >
                                            {React.createElement(template.icon, { className: "h-4 w-4 text-primary" })}
                                            <span className="truncate text-xs font-medium">{template.label}</span>
                                        </Button>
                                    ))}
                                </div>
                                <Separator />
                                <Button
                                    variant={activeTab === 'creator' ? "secondary" : "ghost"}
                                    className={cn("w-full justify-start gap-3 h-11 px-2", activeTab === 'creator' && "bg-white shadow-sm")}
                                    onClick={() => setActiveTab('creator')}
                                >
                                    <Sparkles className="h-4 w-4 text-amber-500" />
                                    <span className="text-xs font-bold">AI Post Creator</span>
                                </Button>
                            </div>

                            <div className="flex-1 overflow-y-auto bg-slate-50 p-8 text-left text-foreground">
                                <div className="max-w-[800px] mx-auto space-y-8 text-left">
                                     <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col gap-2 text-left">
                                        <div className="flex items-center justify-between text-left">
                                            <Label className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                                                <Search className="h-3 w-3"/> Follow-Up URL
                                            </Label>
                                            <Input value={pageUrl} onChange={e => setPageUrl(e.target.value)} className="h-8 w-[400px] font-mono text-xs bg-slate-50" />
                                        </div>
                                        <p className="text-[9px] text-muted-foreground italic">Your official associate page or the brand profile.</p>
                                    </div>

                                    {activeTab === 'creator' && (
                                        <Card className="border-amber-200 bg-amber-50/20 text-left text-foreground">
                                            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Sparkles className="h-5 w-5 text-amber-500" /> AI Creative Assistant</CardTitle></CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="space-y-2 text-left"><Label>Topic</Label><Input placeholder="e.g. Scaling industrial capacity" value={creatorParams.topic} onChange={e => setCreatorParams({...creatorParams, topic: e.target.value})} /></div>
                                                <div className="space-y-2 text-left"><Label>Key Points</Label><Textarea placeholder="Point 1&#10;Point 2..." value={creatorParams.criticalPoints} onChange={e => setCreatorParams({...creatorParams, criticalPoints: e.target.value})} /></div>
                                                <Button className="w-full font-bold bg-amber-600" onClick={handleGenerateCustom} disabled={isGenerating}>
                                                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4" />} Generate Copy
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {activePost && (
                                        <>
                                            <Card className="border-none shadow-xl border-l-4 border-l-primary bg-white text-left text-foreground">
                                                <CardHeader>
                                                    <CardTitle className="text-xl font-black">{activePost.headline}</CardTitle>
                                                    <CardDescription>Review and finalize your {config.label} post.</CardDescription>
                                                </CardHeader>
                                                <CardContent className="p-0 border-t text-left">
                                                    <Textarea 
                                                        value={editedContent[activeTab] || activePost.body || activePost.text || ''}
                                                        onChange={e => setEditedContent({...editedContent, [activeTab]: e.target.value})}
                                                        className="min-h-[250px] border-none focus-visible:ring-0 p-8 italic font-sans leading-relaxed text-sm bg-transparent text-left"
                                                    />
                                                </CardContent>
                                                <CardFooter className="bg-muted/10 border-t flex flex-col md:flex-row justify-between items-center gap-4 p-6">
                                                    <div className="flex-1 w-full space-y-2 text-left">
                                                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Live Post URL (Paste after publishing)</Label>
                                                        <div className="flex gap-2 text-left">
                                                            <Input 
                                                                placeholder="e.g. https://linkedin.com/posts/..." 
                                                                value={publishedUrl} 
                                                                onChange={e => setPublishedUrl(e.target.value)}
                                                                className="h-10 bg-white"
                                                            />
                                                            <Button variant="outline" onClick={handleLogPublishedPost} disabled={!publishedUrl || isLogging}>
                                                                {isLogging ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4" />}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <Button size="lg" className="bg-blue-600 hover:bg-blue-700 font-black uppercase text-xs gap-3 shadow-lg h-14 px-8" onClick={handleLogAndLaunch}>
                                                        <MousePointer2 className="h-5 w-5" />
                                                        Log Yield & Launch {config.label}
                                                    </Button>
                                                </CardFooter>
                                            </Card>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                                                <div className="bg-slate-900 text-white p-6 rounded-xl border-l-4 border-l-primary shadow-xl text-left">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h4 className="font-bold uppercase text-[10px] tracking-widest text-primary flex items-center gap-2"><ImageIcon className="h-3 w-3"/> AI Image Prompt</h4>
                                                        <Button variant="outline" size="sm" className="h-7 text-[9px] uppercase bg-white/10 border-white/20" onClick={() => handleCopyPrompt('image')}><Copy className="mr-1 h-3 w-3" /> Copy</Button>
                                                    </div>
                                                    <p className="text-xs italic font-mono opacity-80 pl-4 border-l border-white/10 leading-relaxed text-left">{activePost.imagePrompt}</p>
                                                </div>
                                                <div className="bg-slate-900 text-white p-6 rounded-xl border-l-4 border-l-amber-500 shadow-xl text-left">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h4 className="font-bold uppercase text-[10px] tracking-widest text-amber-500 flex items-center gap-2"><Video className="h-3 w-3"/> AI Video Prompt</h4>
                                                        <Button variant="outline" size="sm" className="h-7 text-[9px] uppercase bg-white/10 border-white/20" onClick={() => handleCopyPrompt('video')}><Copy className="mr-1 h-3 w-3" /> Copy</Button>
                                                    </div>
                                                    <p className="text-xs italic font-mono opacity-80 pl-4 border-l border-white/10 leading-relaxed text-left">{activePost.videoPrompt}</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 text-left">
                                                <ImageGeneratorCard />
                                                <VideoGeneratorCard />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                </>
            )}

            {/* MODE 2: AUTOMATED SCHEDULER */}
            {studioMode === 'scheduler' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
                    <Card className="lg:col-span-1 shadow-xl border-2 text-left">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold font-headline flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-primary" /> Schedule Automated Post
                            </CardTitle>
                            <CardDescription>Queue automatic awareness posts to keep the platform driving traffic 24/7.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Platform</Label>
                                <Select value={scheduleForm.platform} onValueChange={val => setScheduleForm({...scheduleForm, platform: val as Platform})}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="facebook">Facebook</SelectItem>
                                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                                        <SelectItem value="instagram">Instagram</SelectItem>
                                        <SelectItem value="tiktok">TikTok</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Campaign Name</Label>
                                <Input value={scheduleForm.campaignName} onChange={e => setScheduleForm({...scheduleForm, campaignName: e.target.value})} placeholder="e.g. Daily Transport Awareness" />
                            </div>
                            <div className="space-y-2">
                                <Label>Post Headline</Label>
                                <Input value={scheduleForm.headline} onChange={e => setScheduleForm({...scheduleForm, headline: e.target.value})} placeholder="Catchy headline..." />
                            </div>
                            <div className="space-y-2">
                                <Label>Post Content / Body</Label>
                                <Textarea value={scheduleForm.body} onChange={e => setScheduleForm({...scheduleForm, body: e.target.value})} placeholder="Write post copy..." className="min-h-[120px]" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label>Launch Date & Time</Label>
                                    <Input type="datetime-local" value={scheduleForm.scheduledDate} onChange={e => setScheduleForm({...scheduleForm, scheduledDate: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Recurrence</Label>
                                    <Select value={scheduleForm.frequency} onValueChange={val => setScheduleForm({...scheduleForm, frequency: val})}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="once">Once</SelectItem>
                                            <SelectItem value="daily">Daily</SelectItem>
                                            <SelectItem value="3x_weekly">3x per Week</SelectItem>
                                            <SelectItem value="weekly">Weekly</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <Button onClick={handleCreateScheduledPost} disabled={isScheduling} className="w-full font-bold uppercase tracking-wider h-12">
                                {isScheduling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Calendar className="h-4 w-4 mr-2" />}
                                Schedule Post
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-2 shadow-xl border-2 text-left">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-bold font-headline flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-primary" /> Content Calendar & Queue ({scheduledPosts.length})
                                </CardTitle>
                                <CardDescription>All scheduled and automated posts queued for dispatch.</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={loadScheduledPosts} disabled={isLoadingScheduled}>
                                <RefreshCcw className={cn("h-4 w-4 mr-1", isLoadingScheduled && "animate-spin")} /> Refresh Queue
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {isLoadingScheduled ? (
                                <div className="py-16 text-center"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>
                            ) : scheduledPosts.length > 0 ? (
                                <Table className="border bg-white rounded-lg">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Platform</TableHead>
                                            <TableHead>Post Headline</TableHead>
                                            <TableHead>Launch Date</TableHead>
                                            <TableHead>Cadence</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {scheduledPosts.map(p => (
                                            <TableRow key={p.id}>
                                                <TableCell className="font-bold capitalize flex items-center gap-1.5">
                                                    <Badge variant="outline" className="uppercase text-[9px] font-black">{p.platform}</Badge>
                                                </TableCell>
                                                <TableCell className="font-bold max-w-[200px] truncate">{p.headline}</TableCell>
                                                <TableCell className="text-xs font-mono">{new Date(p.scheduledDate).toLocaleString()}</TableCell>
                                                <TableCell className="text-xs uppercase font-semibold">{p.frequency}</TableCell>
                                                <TableCell>
                                                    <Badge className="bg-emerald-100 text-emerald-800 uppercase text-[9px] border-none">{p.status || 'Scheduled'}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteScheduledPost(p.id)} className="h-8 w-8 text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-16 border-2 border-dashed rounded-xl bg-slate-50/50">
                                    <Calendar className="mx-auto h-10 w-10 text-muted-foreground opacity-30" />
                                    <p className="mt-2 font-bold text-sm">No Scheduled Posts Queued</p>
                                    <p className="text-xs text-muted-foreground">Fill out the form on the left to schedule automated awareness posts.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* MODE 3: INFLUENCER SCOUTING */}
            {studioMode === 'influencers' && (
                <div className="space-y-6 text-left">
                    <Card className="border-2 shadow-xl text-left bg-gradient-to-r from-purple-900 to-indigo-900 text-white">
                        <CardHeader>
                            <CardTitle className="text-2xl font-black font-headline flex items-center gap-3 text-white">
                                <Users className="h-8 w-8 text-amber-400" />
                                SA Industrial Influencer & Creator Scouting
                            </CardTitle>
                            <CardDescription className="text-purple-200">
                                Scout South African trucking, logistics, and fleet creators to leverage their networks. Offer them Free 4K AI Studio access & 30% lifetime recurring annuity.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-4 items-end">
                                <div className="flex-1 space-y-2 text-left">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-purple-200">Select Creator / Influencer Niche</Label>
                                    <Select value={selectedNiche} onValueChange={setSelectedNiche}>
                                        <SelectTrigger className="h-12 bg-white/10 border-white/20 text-white font-semibold">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {influencerNiches.map(n => (
                                                <SelectItem key={n} value={n}>{n}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button onClick={handleScoutInfluencers} disabled={isScouting} size="lg" className="h-12 px-8 font-black uppercase tracking-wider bg-amber-500 hover:bg-amber-600 text-slate-900">
                                    {isScouting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <SearchCode className="h-5 w-5 mr-2" />}
                                    {isScouting ? "Scouting..." : "Scout SA Influencers (Live AI)"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {discoveredInfluencers.length > 0 && (
                        <Card className="border-2 shadow-xl text-left bg-white">
                            <CardHeader>
                                <CardTitle className="text-xl font-bold font-headline flex items-center gap-2">
                                    <UserCheck className="h-5 w-5 text-emerald-600" /> Discovered Creators ({discoveredInfluencers.length})
                                </CardTitle>
                                <CardDescription>Review candidate creators and dispatch Digital Partner invitations directly.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table className="border rounded-lg">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Creator / Channel</TableHead>
                                            <TableHead>Channel & Reach</TableHead>
                                            <TableHead>Contact Email</TableHead>
                                            <TableHead>Mobile / WhatsApp</TableHead>
                                            <TableHead>Pitch Angle</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {discoveredInfluencers.map((inf, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="font-bold">
                                                    <div>{inf.companyName || inf.contact_person}</div>
                                                    <span className="text-xs text-muted-foreground font-mono">{inf.social_handle}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="font-bold text-xs">{inf.primary_channel}</Badge>
                                                    <p className="text-xs text-muted-foreground font-semibold mt-0.5">{inf.follower_count || 'Micro-creator'}</p>
                                                </TableCell>
                                                <TableCell className="text-xs font-mono">{inf.email || 'null'}</TableCell>
                                                <TableCell className="text-xs font-mono">{inf.mobile || 'null'}</TableCell>
                                                <TableCell className="text-xs text-slate-700 max-w-[250px]">{inf.notes || 'Transport Creator'}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button 
                                                        size="sm" 
                                                        onClick={() => handleDispatchInfluencerOffer(inf)} 
                                                        disabled={dispatchingId === inf.record_id || !inf.email}
                                                        className="font-bold uppercase text-[10px] tracking-wider gap-1"
                                                    >
                                                        {dispatchingId === inf.record_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                                        Dispatch Offer
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
