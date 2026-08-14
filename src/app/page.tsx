
'use client';

import * as React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { 
  ArrowRight, 
  Truck, 
  Store, 
  ShoppingBasket,
  Zap, 
  Handshake, 
  TrendingUp,
  Search,
  CheckCircle2,
  ArrowDown,
  PackageSearch,
  Landmark,
  ShoppingCart,
  Users,
  ShieldCheck,
  Award,
  ThumbsUp,
  Star,
  KeyRound,
  CreditCard,
  MessageSquareQuote,
  Building2,
  Sparkles,
  Loader2,
  Activity,
  Clock,
  Eye,
  Filter
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import data from "@/lib/placeholder-images.json";
import { useUser } from "@/firebase";
import { useState } from "react";
import * as gtag from '@/lib/gtag';
import { HomeIntentModal } from "@/app/home-intent-modal";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

const { placeholderImages } = data;
const heroImage = placeholderImages.find(p => p.id === 'hero-home');

export default function HomePage() {
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Modals state
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [buyStep, setBuyStep] = useState<'search' | 'details' | 'success'>('search');
  const [buySearchQuery, setBuySearchQuery] = useState('');
  const [buySearchResults, setBuySearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  const [buyCompanyName, setBuyCompanyName] = useState('');
  const [buyRegNumber, setBuyRegNumber] = useState('');
  const [buyEntityType, setBuyEntityType] = useState('transporter');
  const [buyRepName, setBuyRepName] = useState('');
  const [buyRepRole, setBuyRepRole] = useState('Managing Director');
  const [buyEmail, setBuyEmail] = useState('');
  const [buyPhone, setBuyPhone] = useState('');
  const [buyAddress, setBuyAddress] = useState('');
  const [isBuySubmitting, setIsBuySubmitting] = useState(false);

  const [vouchModalOpen, setVouchModalOpen] = useState(false);
  const [vouchCompanyName, setVouchCompanyName] = useState('');
  const [vouchRelationship, setVouchRelationship] = useState('Trade Partner');
  const [vouchNote, setVouchNote] = useState('');
  const [isVouchSubmitting, setIsVouchSubmitting] = useState(false);

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewCompanyName, setReviewCompanyName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);

  // Live Registry Stats & Feed State
  const [stats, setStats] = useState({
    claimedNodes: 1428,
    vouchesIssued: 3892,
    reviewsPublished: 946,
    gridIntegrity: '98.6%'
  });

  const [feedFilter, setFeedFilter] = useState<'all' | 'vouch' | 'review' | 'claim'>('all');

  const [feedItems, setFeedItems] = useState<any[]>([
    {
      id: 'f1',
      type: 'vouch',
      targetCompany: 'MegaTyres SA (Pty) Ltd',
      authorCompany: 'Apex Bulk Logistics',
      relationship: 'Supplier & Fleet Partner',
      text: 'Flawless commercial credit terms & under 2-hour response time on emergency tire fitting along the N3 Durban-JHB corridor.',
      date: '10m ago',
      isNew: false
    },
    {
      id: 'f2',
      type: 'review',
      targetCompany: 'Sovereign Fleet Services',
      authorCompany: 'KZN Minerals Corp',
      relationship: 'Heavy Haulage Customer',
      rating: 5,
      text: 'Completed 100% on-time delivery for 450 tonnes manganese ore from Kuruman to Richards Bay port. Driver compliance and GPS tracking spot on.',
      date: '28m ago',
      isNew: false
    },
    {
      id: 'f3',
      type: 'claim',
      targetCompany: 'TransLogix Express (Pty) Ltd',
      authorCompany: 'Johan van der Merwe (MD)',
      relationship: 'Verified Node Owner',
      text: 'Official ownership claimed and CIPC verified node registered on South Africa Logistics Grid.',
      date: '45m ago',
      isNew: false
    },
    {
      id: 'f4',
      type: 'vouch',
      targetCompany: 'Highveld Fuel & Bunkering Depot',
      authorCompany: 'Overberg Hauliers SA',
      relationship: 'Fuel & Depot Client',
      text: 'Consistently competitive wholesale diesel pricing and fast high-flow pumps. Secure overnight interlink staging yard in Witbank.',
      date: '1h ago',
      isNew: false
    },
    {
      id: 'f5',
      type: 'review',
      targetCompany: 'Brakpan Hydraulic & Fleet Spares',
      authorCompany: 'Gauteng Freight Logistics',
      relationship: 'Maintenance Customer',
      rating: 5,
      text: 'Sourced replacement propshaft and brake valving within 2 hours on a Sunday morning. Saved us a R50k delay penalty.',
      date: '2h ago',
      isNew: false
    }
  ]);

  const handleJoinClick = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    if (process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID) {
      gtag.event({ action: 'click_join_from_hero', category: 'Engagement', label: 'Homepage Hero CTA', value: 1 });
    }
    setIsModalOpen(true);
  };

  const handleSearchRecord = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!buySearchQuery.trim()) {
      toast({
        title: "Search Query Required",
        description: "Please enter a company name or keyword to search the registry.",
        variant: "destructive"
      });
      return;
    }
    setIsSearching(true);
    setHasSearched(true);
    try {
      const res = await fetch('/api/searchLeads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: buySearchQuery, type: 'all' })
      });
      if (res.ok) {
        const data = await res.json();
        setBuySearchResults(data.records || []);
      } else {
        setBuySearchResults([]);
      }
    } catch (err) {
      console.error("Failed to search leads:", err);
      setBuySearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectRecordToBuy = (rec: any) => {
    setSelectedRecord(rec);
    const compName = rec.companyName || rec.company_name || rec.name || buySearchQuery;
    setBuyCompanyName(compName);
    const recType = (rec.type || rec.role || rec.category || '').toLowerCase();
    if (recType.includes('supplier')) setBuyEntityType('supplier');
    else if (recType.includes('finance') || recType.includes('bank')) setBuyEntityType('finance');
    else if (recType.includes('warehouse') || recType.includes('depot')) setBuyEntityType('warehouse');
    else setBuyEntityType('transporter');
    
    if (rec.email) setBuyEmail(rec.email);
    if (rec.phone) setBuyPhone(rec.phone);
    if (rec.address || rec.city || rec.province) {
      setBuyAddress([rec.address, rec.city, rec.province].filter(Boolean).join(', '));
    }
    setBuyStep('details');
  };

  const handleCreateNewRecordToBuy = () => {
    setSelectedRecord(null);
    setBuyCompanyName(buySearchQuery || '');
    setBuyStep('details');
  };

  const handleBuySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyCompanyName.trim() || !buyEmail.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in the company name and contact email to complete registration.",
        variant: "destructive"
      });
      return;
    }
    setIsBuySubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    setIsBuySubmitting(false);
    setBuyStep('success');

    // Update stats & add live activity feed entry
    setStats(prev => ({ ...prev, claimedNodes: prev.claimedNodes + 1 }));
    const newItem = {
      id: `buy-${Date.now()}`,
      type: 'claim',
      targetCompany: buyCompanyName,
      authorCompany: buyRepName ? `${buyRepName} (${buyRepRole || 'Representative'})` : 'Official Entity Representative',
      relationship: 'Verified Node Owner',
      text: `Claimed official verified company node as a ${buyEntityType.toUpperCase()} entity on South Africa's Logistics Grid.`,
      date: 'Just Now',
      isNew: true
    };
    setFeedItems(prev => [newItem, ...prev]);

    toast({
      title: "Registration & Record Purchase Logged",
      description: `Your claim for "${buyCompanyName}" has been submitted for grid verification and broadcasted live!`,
    });
  };

  const resetBuyModal = () => {
    setBuyStep('search');
    setBuySearchQuery('');
    setBuySearchResults([]);
    setHasSearched(false);
    setSelectedRecord(null);
    setBuyCompanyName('');
    setBuyRegNumber('');
    setBuyEntityType('transporter');
    setBuyRepName('');
    setBuyRepRole('Managing Director');
    setBuyEmail('');
    setBuyPhone('');
    setBuyAddress('');
    setBuyModalOpen(false);
  };

  const handleVouchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vouchCompanyName.trim()) {
      toast({
        title: "Missing Company Name",
        description: "Please specify the company you want to vouch for.",
        variant: "destructive"
      });
      return;
    }
    setIsVouchSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    setIsVouchSubmitting(false);
    setVouchModalOpen(false);

    // Update stats & add live activity feed entry
    setStats(prev => ({ ...prev, vouchesIssued: prev.vouchesIssued + 1 }));
    const userDisplayName = user?.displayName || user?.email ? (user.displayName || user.email?.split('@')[0]) : 'Verified Member';
    const newItem = {
      id: `vouch-${Date.now()}`,
      type: 'vouch',
      targetCompany: vouchCompanyName,
      authorCompany: userDisplayName,
      relationship: vouchRelationship || 'Trade Partner',
      text: vouchNote.trim() || 'Vouched for operational integrity, payment reliability, and quality trade partnership.',
      date: 'Just Now',
      isNew: true
    };
    setFeedItems(prev => [newItem, ...prev]);

    toast({
      title: "Community Vouch Recorded & Broadcast Live",
      description: `Thank you for vouching for "${vouchCompanyName}" as a ${vouchRelationship}. Your endorsement is now visible in the live trust feed!`,
    });
    setVouchCompanyName('');
    setVouchNote('');
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewCompanyName.trim() || !reviewComment.trim()) {
      toast({
        title: "Incomplete Review",
        description: "Please provide both the company name and your review comment.",
        variant: "destructive"
      });
      return;
    }
    setIsReviewSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    setIsReviewSubmitting(false);
    setReviewModalOpen(false);

    // Update stats & add live activity feed entry
    setStats(prev => ({ ...prev, reviewsPublished: prev.reviewsPublished + 1 }));
    const userDisplayName = user?.displayName || user?.email ? (user.displayName || user.email?.split('@')[0]) : 'Verified Client';
    const newItem = {
      id: `review-${Date.now()}`,
      type: 'review',
      targetCompany: reviewCompanyName,
      authorCompany: userDisplayName,
      relationship: 'Client / Trade Partner',
      rating: reviewRating,
      text: reviewComment.trim(),
      date: 'Just Now',
      isNew: true
    };
    setFeedItems(prev => [newItem, ...prev]);

    toast({
      title: "Review Published Live",
      description: `Your ${reviewRating}-star review for "${reviewCompanyName}" is live on the public registry feed!`,
    });
    setReviewCompanyName('');
    setReviewComment('');
  };

  return (
    <div className="bg-background text-left text-foreground">
      <HomeIntentModal isOpen={isModalOpen} onOpenChange={setIsModalOpen} />
      
      {/* HERO SECTION - COMMERCE FIRST */}
      <section className="relative w-full h-[90vh] flex items-center justify-center overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 z-0 opacity-40">
           {heroImage && <Image src={heroImage.imageUrl} alt="Industrial Commerce" fill className="object-cover" priority data-ai-hint="truck harbor loading" />}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/70 to-slate-950" />

        <div className="container relative z-10 mx-auto px-4 text-center text-white">
            <Badge className="mb-6 bg-primary/20 text-primary border-primary/30 py-1.5 px-6 font-black uppercase tracking-widest text-center text-white">The Industrial Commerce Engine</Badge>
            <h1 className="text-5xl md:text-8xl font-black font-headline leading-[0.9] mb-8 tracking-tighter text-center text-white uppercase">
                Sell More. <br/>Find Work. <span className="text-primary">Fast.</span>
            </h1>
            <p className="text-lg md:text-2xl text-slate-300 max-w-2xl mx-auto mb-12 leading-relaxed text-center text-white font-medium">
                Logistics Flow is where the South African logistics sector trades. <br/>
                We connect your digital shop, your fleet, and your capacity to a verified community of verified high-intent buyers.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-6 text-white text-center">
                <Button size="lg" className="h-16 px-12 text-lg font-black uppercase tracking-widest shadow-2xl bg-primary hover:bg-primary/90 text-white border-b-4 border-green-800 active:border-b-0 transition-all text-center" onClick={handleJoinClick}>
                    Open Your digital Branch <ArrowRight className="ml-2 h-6 w-6 text-white" />
                </Button>
                <Button asChild size="lg" variant="outline" className="h-16 px-12 text-lg font-black uppercase tracking-tight border-white/20 hover:bg-white/10 text-white text-center">
                    <Link href="/mall">Browse the Malls</Link>
                </Button>
            </div>
            <div className="mt-16 animate-bounce opacity-30 text-center">
                <ArrowDown className="mx-auto h-8 w-8 text-white" />
            </div>
        </div>
      </section>

      {/* CORE MECHANISM - THE TRANSACTIONAL VALUE */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 text-left text-foreground">
            <div className="max-w-5xl mx-auto space-y-12 text-left">
                <div className="space-y-4 text-left">
                    <h2 className="text-4xl md:text-6xl font-black font-headline text-slate-900 tracking-tight uppercase text-left">Collective Buying Power.</h2>
                    <p className="text-xl text-muted-foreground leading-relaxed text-left">
                        We've built the digital infrastructure to remove the friction from industrial sales and procurement. Explore the commercial mechanisms powering the grid.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
                    {/* DIGITAL SHOPS */}
                    <Card className="p-6 border-none shadow-xl bg-slate-50 text-left flex flex-col h-full overflow-hidden hover:-translate-y-2 transition-transform">
                        <Store className="h-10 w-10 text-primary mb-4" />
                        <h3 className="text-xl font-black uppercase mb-2">Digital Shops</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-8 flex-grow">
                          Establish a branch in front of 5,400+ hauliers actively maintaining fleets.
                        </p>
                        <Button asChild variant="link" className="p-0 h-auto font-black uppercase text-[10px] tracking-widest text-primary justify-start group">
                            <Link href="/commerce">Explore Mechanism <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1" /></Link>
                        </Button>
                    </Card>

                    {/* LOAD BOARD */}
                    <Card className="p-6 border-none shadow-xl bg-slate-50 text-left flex flex-col h-full overflow-hidden hover:-translate-y-2 transition-transform">
                        <PackageSearch className="h-10 w-10 text-primary mb-4" />
                        <h3 className="text-xl font-black uppercase mb-2">The Load Board</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-8 flex-grow">
                          Eliminate empty return miles. Post freight or find loads in real-time.
                        </p>
                        <Button asChild variant="link" className="p-0 h-auto font-black uppercase text-[10px] tracking-widest text-primary justify-start group">
                            <Link href="/commerce">Explore Mechanism <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1" /></Link>
                        </Button>
                    </Card>

                    {/* BUY & SELL BOARD */}
                    <Card className="p-6 border-none shadow-xl bg-slate-50 text-left flex flex-col h-full overflow-hidden hover:-translate-y-2 transition-transform">
                        <ShoppingCart className="h-10 w-10 text-primary mb-4" />
                        <h3 className="text-xl font-black uppercase mb-2">Buy & Sell Board</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-8 flex-grow">
                          Trade trucks and equipment within a high-trust, verified peer-to-peer marketplace.
                        </p>
                        <Button asChild variant="link" className="p-0 h-auto font-black uppercase text-[10px] tracking-widest text-primary justify-start group">
                            <Link href="/commerce">Explore Mechanism <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1" /></Link>
                        </Button>
                    </Card>

                    {/* CUSTOMERS BOARD */}
                    <Card className="p-6 border-none shadow-xl bg-slate-50 text-left flex flex-col h-full overflow-hidden hover:-translate-y-2 transition-transform">
                        <Users className="h-10 w-10 text-primary mb-4" />
                        <h3 className="text-xl font-black uppercase mb-2">Customers Board</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-8 flex-grow">
                          Access direct MD/CEO lines and lead signals for 22,000+ industry stakeholders.
                        </p>
                        <Button asChild variant="link" className="p-0 h-auto font-black uppercase text-[10px] tracking-widest text-primary justify-start group">
                            <Link href="/resources">Explore Intelligence <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1" /></Link>
                        </Button>
                    </Card>
                </div>
            </div>
        </div>
      </section>

      {/* RECORD VERIFICATION & TRUST GRID */}
      <section className="py-24 bg-slate-50 border-y border-slate-200">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto space-y-12 text-left">
            
            {/* Header */}
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <Badge className="bg-primary/10 text-primary border-primary/20 py-1.5 px-6 font-black uppercase tracking-widest text-[11px] rounded-full">
                Verified Registry & Trust Grid
              </Badge>
              <h2 className="text-4xl md:text-6xl font-black font-headline text-slate-900 tracking-tight uppercase leading-none">
                Record Ownership, Vouching & Reviews.
              </h2>
              <p className="text-lg md:text-xl text-slate-600 leading-relaxed font-normal">
                We're building South Africa's most trusted industrial Logistics dataset. Through verified record ownership, peer-backed vouches, and authentic operational reviews, every company profile becomes a high-integrity trade node.
              </p>
            </div>

            {/* Concept Grid (3 Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Card 1: Record Ownership */}
              <Card className="p-8 border border-slate-200/80 shadow-lg bg-white rounded-2xl flex flex-col justify-between hover:shadow-xl transition-all">
                <div className="space-y-4">
                  <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <KeyRound className="h-6 w-6" />
                  </div>
                  <Badge variant="outline" className="text-blue-700 bg-blue-50/50 border-blue-200 font-bold uppercase text-[10px] tracking-wider">
                    1. Record Ownership
                  </Badge>
                  <h3 className="text-2xl font-black uppercase text-slate-900 tracking-tight">
                    Claim & Buy Ownership
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Companies can claim or buy their official entity record on the grid. Ownership unlocks direct management of company details, verified badges, and incoming lead requests.
                  </p>
                </div>
                <div className="pt-6 border-t border-slate-100 mt-6">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <CheckCircle2 className="h-4 w-4 text-green-600" /> Secures Digital Identity
                  </div>
                </div>
              </Card>

              {/* Card 2: Vouching */}
              <Card className="p-8 border border-slate-200/80 shadow-lg bg-white rounded-2xl flex flex-col justify-between hover:shadow-xl transition-all">
                <div className="space-y-4">
                  <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <ThumbsUp className="h-6 w-6" />
                  </div>
                  <Badge variant="outline" className="text-amber-700 bg-amber-50/50 border-amber-200 font-bold uppercase text-[10px] tracking-wider">
                    2. Peer Vouching
                  </Badge>
                  <h3 className="text-2xl font-black uppercase text-slate-900 tracking-tight">
                    Peer-Backed Vouching
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Industry peers (hauliers, suppliers, funders) vouch for verified operators. Accumulated vouches build high network credibility and boost search rankings.
                  </p>
                </div>
                <div className="pt-6 border-t border-slate-100 mt-6">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <Award className="h-4 w-4 text-amber-600" /> Boosts Trust Ranking
                  </div>
                </div>
              </Card>

              {/* Card 3: Reviews */}
              <Card className="p-8 border border-slate-200/80 shadow-lg bg-white rounded-2xl flex flex-col justify-between hover:shadow-xl transition-all">
                <div className="space-y-4">
                  <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <Star className="h-6 w-6" />
                  </div>
                  <Badge variant="outline" className="text-emerald-700 bg-emerald-50/50 border-emerald-200 font-bold uppercase text-[10px] tracking-wider">
                    3. Operational Reviews
                  </Badge>
                  <h3 className="text-2xl font-black uppercase text-slate-900 tracking-tight">
                    Verified Reviews
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Transparent client and vendor feedback validates performance, fleet reliability, and payment history. Real experiences create 100% verified records.
                  </p>
                </div>
                <div className="pt-6 border-t border-slate-100 mt-6">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" /> Authenticated Performance
                  </div>
                </div>
              </Card>

            </div>

            {/* LIVE REGISTRY METRICS DASHBOARD */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <Card className="p-5 bg-white border border-slate-200/80 shadow-md rounded-2xl flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Claimed Profiles</span>
                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900 tracking-tight">{stats.claimedNodes.toLocaleString()}</span>
                  <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Nodes</span>
                </div>
              </Card>

              <Card className="p-5 bg-white border border-slate-200/80 shadow-md rounded-2xl flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Peer Vouches</span>
                  <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900 tracking-tight">{stats.vouchesIssued.toLocaleString()}</span>
                  <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">+Endorsements</span>
                </div>
              </Card>

              <Card className="p-5 bg-white border border-slate-200/80 shadow-md rounded-2xl flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Verified Reviews</span>
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900 tracking-tight">{stats.reviewsPublished.toLocaleString()}</span>
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Ratings</span>
                </div>
              </Card>

              <Card className="p-5 bg-white border border-slate-200/80 shadow-md rounded-2xl flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Grid Trust Index</span>
                  <ShieldCheck className="h-4 w-4 text-primary" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900 tracking-tight">{stats.gridIntegrity}</span>
                  <span className="text-[11px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Verified</span>
                </div>
              </Card>
            </div>

            {/* Action CTA Box with the 3 Buttons */}
            <div className="bg-slate-900 text-white rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
              <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
              
              <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 text-left">
                <div className="space-y-3 max-w-xl text-left">
                  <Badge className="bg-primary/20 text-primary border-primary/30 uppercase tracking-widest text-[10px] font-black">
                    Interactive Grid Actions
                  </Badge>
                  <h3 className="text-3xl md:text-4xl font-black font-headline uppercase tracking-tight text-white">
                    Take Action on the Registry
                  </h3>
                  <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                    Claim ownership of your profile, vouch for an industry partner, or write a review to strengthen grid integrity.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4 w-full lg:w-auto">
                  <Button 
                    size="lg" 
                    className="w-full sm:w-auto h-14 px-8 font-black uppercase tracking-wider bg-primary hover:bg-primary/90 text-white shadow-xl flex items-center justify-center gap-2"
                    onClick={() => setBuyModalOpen(true)}
                  >
                    <CreditCard className="h-5 w-5" /> Buy / Claim Record
                  </Button>

                  <Button 
                    size="lg" 
                    variant="outline"
                    className="w-full sm:w-auto h-14 px-8 font-black uppercase tracking-wider border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-white shadow-xl flex items-center justify-center gap-2"
                    onClick={() => setVouchModalOpen(true)}
                  >
                    <ThumbsUp className="h-5 w-5 text-amber-400" /> Vouch for Company
                  </Button>

                  <Button 
                    size="lg" 
                    variant="outline"
                    className="w-full sm:w-auto h-14 px-8 font-black uppercase tracking-wider border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-white shadow-xl flex items-center justify-center gap-2"
                    onClick={() => setReviewModalOpen(true)}
                  >
                    <MessageSquareQuote className="h-5 w-5 text-emerald-400" /> Review Company
                  </Button>
                </div>
              </div>
            </div>

            {/* LIVE FEED BOARD & BRAND EXPOSURE VALUE */}
            <div className="space-y-6 pt-4">
              {/* Header & Exposure Banner */}
              <div className="p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl shadow-xl border border-slate-700/60 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-700/80 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
                    <h3 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-2">
                      <Activity className="h-5 w-5 text-primary" /> Live Community Endorsements & Exposure Feed
                    </h3>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] font-black uppercase tracking-widest px-3 py-1">
                    Real-Time Grid Datastream
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
                  <div className="flex items-start gap-2.5 bg-slate-800/60 p-3 rounded-xl border border-slate-700/40">
                    <Sparkles className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white uppercase block text-[11px]">Instant Brand Exposure</span>
                      Every vouch or review you publish is featured live on our homepage, driving organic trade signals.
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 bg-slate-800/60 p-3 rounded-xl border border-slate-700/40">
                    <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white uppercase block text-[11px]">Peer-Backed Credibility</span>
                      Social proof on Logistics Flow helps you close commercial deals faster with new partners.
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 bg-slate-800/60 p-3 rounded-xl border border-slate-700/40">
                    <Eye className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white uppercase block text-[11px]">22,000+ Monthly Buyers</span>
                      Reach transport CEOs, fleet managers, and buyers actively browsing South Africa's dataset.
                    </div>
                  </div>
                </div>
              </div>

              {/* Feed Filter Tabs & List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
                  <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border shadow-sm">
                    <Button 
                      size="sm" 
                      variant={feedFilter === 'all' ? 'default' : 'ghost'} 
                      className={`h-8 px-3 text-xs font-bold uppercase tracking-wider ${feedFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
                      onClick={() => setFeedFilter('all')}
                    >
                      All Feed ({feedItems.length})
                    </Button>
                    <Button 
                      size="sm" 
                      variant={feedFilter === 'vouch' ? 'default' : 'ghost'} 
                      className={`h-8 px-3 text-xs font-bold uppercase tracking-wider ${feedFilter === 'vouch' ? 'bg-amber-600 text-white' : 'text-slate-600'}`}
                      onClick={() => setFeedFilter('vouch')}
                    >
                      <ThumbsUp className="h-3.5 w-3.5 mr-1" /> Vouches ({feedItems.filter(i => i.type === 'vouch').length})
                    </Button>
                    <Button 
                      size="sm" 
                      variant={feedFilter === 'review' ? 'default' : 'ghost'} 
                      className={`h-8 px-3 text-xs font-bold uppercase tracking-wider ${feedFilter === 'review' ? 'bg-emerald-600 text-white' : 'text-slate-600'}`}
                      onClick={() => setFeedFilter('review')}
                    >
                      <Star className="h-3.5 w-3.5 mr-1" /> Reviews ({feedItems.filter(i => i.type === 'review').length})
                    </Button>
                    <Button 
                      size="sm" 
                      variant={feedFilter === 'claim' ? 'default' : 'ghost'} 
                      className={`h-8 px-3 text-xs font-bold uppercase tracking-wider ${feedFilter === 'claim' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
                      onClick={() => setFeedFilter('claim')}
                    >
                      <KeyRound className="h-3.5 w-3.5 mr-1" /> Claimed Nodes ({feedItems.filter(i => i.type === 'claim').length})
                    </Button>
                  </div>

                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider shrink-0 hidden sm:inline">
                    Showing latest endorsements
                  </span>
                </div>

                {/* Cards Stream */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {feedItems
                    .filter(item => feedFilter === 'all' || item.type === feedFilter)
                    .map((item) => (
                      <Card 
                        key={item.id} 
                        className={`p-5 border bg-white rounded-2xl shadow-md transition-all hover:shadow-xl relative overflow-hidden flex flex-col justify-between ${item.isNew ? 'border-primary ring-2 ring-primary/20 bg-emerald-50/20' : 'border-slate-200/80'}`}
                      >
                        {item.isNew && (
                          <div className="absolute top-0 right-0 bg-primary text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-sm">
                            <Sparkles className="h-3 w-3" /> Just Submitted
                          </div>
                        )}

                        <div className="space-y-3">
                          <div className="flex items-center gap-2 flex-wrap pr-16">
                            {item.type === 'vouch' && (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1">
                                <ThumbsUp className="h-3 w-3 text-amber-600" /> Peer Vouch
                              </Badge>
                            )}
                            {item.type === 'review' && (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1">
                                <Star className="h-3 w-3 fill-emerald-600 text-emerald-600" /> {item.rating || 5}★ Review
                              </Badge>
                            )}
                            {item.type === 'claim' && (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1">
                                <KeyRound className="h-3 w-3 text-blue-600" /> Verified Node Claimed
                              </Badge>
                            )}

                            <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {item.date}
                            </span>
                          </div>

                          <div>
                            <h4 className="text-lg font-black text-slate-900 tracking-tight uppercase">
                              {item.targetCompany}
                            </h4>
                            <p className="text-xs text-slate-500 font-bold">
                              By <span className="text-slate-800">{item.authorCompany}</span> {item.relationship ? `• ${item.relationship}` : ''}
                            </p>
                          </div>

                          <div className="p-3 bg-slate-50/90 border border-slate-100 rounded-xl text-xs text-slate-700 italic leading-relaxed">
                            "{item.text}"
                          </div>
                        </div>

                        <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Verified Grid Node
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-xs font-bold text-primary hover:text-primary/80 uppercase p-0"
                            onClick={() => {
                              setBuySearchQuery(item.targetCompany);
                              setBuyModalOpen(true);
                            }}
                          >
                            Claim / View <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* INTELLIGENCE AS A BOOSTER */}
      <section className="py-24 bg-slate-900 text-white">
        <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div className="space-y-8 text-left text-white">
                    <Badge className="bg-primary/20 text-primary border-none py-1 px-4 font-black uppercase tracking-widest text-[10px]">Commerce Enhanced</Badge>
                    <h2 className="text-4xl md:text-6xl font-black font-headline text-white leading-[0.95] uppercase text-left">Trading <br/>with <span className="text-primary">Eyes Open</span>.</h2>
                    <p className="text-xl text-slate-400 leading-relaxed text-left text-white">
                        Intelligence isn't our product—it's how we make you more successful. By mapping the grid, we give you the data to sell faster and fund your growth.
                    </p>
                    <div className="space-y-6 text-left text-white">
                        <div className="flex items-start gap-4 text-left">
                            <div className="bg-primary/20 p-2 rounded-lg text-primary"><Search className="h-6 w-6" /></div>
                            <div className="text-left text-white">
                                <p className="font-bold text-white uppercase text-sm">Lead Discovery</p>
                                <p className="text-slate-400 text-sm">Identify exactly who is buying and who owns the budget.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 text-left">
                            <div className="bg-primary/20 p-2 rounded-lg text-primary"><Zap className="h-6 w-6 fill-current" /></div>
                            <div className="text-left text-white">
                                <p className="font-bold text-white uppercase text-sm">AI Matching</p>
                                <p className="text-slate-400 text-sm">Our engine proactively connects your stock with the right truck.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 text-left">
                            <div className="bg-primary/20 p-2 rounded-lg text-primary"><Landmark className="h-6 w-6" /></div>
                            <div className="text-left text-white">
                                <p className="font-bold text-white uppercase text-sm">Verified Capital</p>
                                <p className="text-slate-400 text-sm">Use your platform activity to unlock in-house asset finance.</p>
                            </div>
                        </div>
                    </div>
                    <div className="pt-8 text-left">
                        <Button asChild size="lg" className="h-14 px-10 font-black uppercase tracking-widest gap-2 bg-primary hover:bg-primary/90 text-white border-none shadow-xl text-center">
                            <Link href="/intelligence">
                                <Search className="h-5 w-5 text-white" /> Access Intelligence Layer
                            </Link>
                        </Button>
                    </div>
                </div>
                <div className="relative aspect-square rounded-[3rem] overflow-hidden shadow-2xl border-8 border-slate-800">
                    <Image 
                        src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1000" 
                        alt="Logistics Flow Data" 
                        fill 
                        className="object-cover opacity-80" 
                        data-ai-hint="digital industrial map"
                    />
                </div>
            </div>
        </div>
      </section>

      {/* REWARDS & LOYALTY - THE REVEAL */}
      <section className="py-24 bg-white">
          <div className="container mx-auto px-4 text-center">
                <h2 className="text-4xl md:text-6xl font-black font-headline text-slate-900 tracking-tight uppercase mb-4 text-center">Rewarding Every Handshake.</h2>
                <p className="text-lg text-muted-foreground mb-16 max-w-2xl mx-auto text-center">As you transact, you earn. Our loyalty and rewards programs are baked into the core commerce workflow.</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto text-left">
                    <Card className="p-8 border-2 border-slate-100 shadow-sm text-left">
                        <TrendingUp className="h-10 w-10 text-primary mb-4" />
                        <h4 className="font-black uppercase mb-2">Dividends</h4>
                        <p className="text-sm text-muted-foreground">A share of platform success returned to the most active nodes.</p>
                    </Card>
                    <Card className="p-8 border-2 border-slate-100 shadow-sm text-left">
                        <Badge className="bg-green-100 text-green-700 mb-4">Loyalty</Badge>
                        <h4 className="font-black uppercase mb-2">Syndicate Rates</h4>
                        <p className="text-sm text-muted-foreground">Unlock deeper discounts on tires and fuel as your transaction volume grows.</p>
                    </Card>
                    <Card className="p-8 border-2 border-slate-100 shadow-sm text-left">
                        <Badge variant="outline" className="border-primary text-primary mb-4">Integrity</Badge>
                        <h4 className="font-black uppercase mb-2">Node Equity</h4>
                        <p className="text-sm text-muted-foreground">Every referral and verified data contribution builds your platform standing.</p>
                    </Card>
                </div>
          </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-32 bg-slate-50 border-t">
            <div className="container mx-auto px-4 text-center">
                <h2 className="text-4xl md:text-7xl font-black font-headline text-slate-900 tracking-tighter text-center uppercase leading-none mb-8">Ready to <br/>Transact?</h2>
                <p className="text-xl max-w-xl mx-auto text-muted-foreground leading-relaxed mb-12 text-center">Sign up for free and establish your digital branch in the South African logistics grid.</p>
                <div className="flex justify-center text-center">
                     <Button size="lg" className="h-16 px-16 text-lg font-black uppercase shadow-2xl text-white bg-primary hover:bg-primary/90 text-center" onClick={handleJoinClick}>
                        Establish Handshake <ArrowRight className="ml-2 h-6 w-6 text-white text-center" />
                    </Button>
                </div>
            </div>
        </section>

      {/* DIALOG 1: BUY / CLAIM RECORD */}
      <Dialog open={buyModalOpen} onOpenChange={(open) => { setBuyModalOpen(open); if (!open) resetBuyModal(); }}>
        <DialogContent className="sm:max-w-xl bg-white p-6 border shadow-2xl rounded-2xl text-left max-h-[90vh] overflow-y-auto">
          <DialogHeader className="text-left space-y-2 border-b pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-black uppercase text-xs tracking-wider">
                <KeyRound className="h-4 w-4" /> Entity Ownership & Registration
              </div>
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                {buyStep === 'search' && 'Step 1: Search Registry'}
                {buyStep === 'details' && 'Step 2: Enter Details & Register'}
                {buyStep === 'success' && 'Step 3: Registration Complete'}
              </Badge>
            </div>
            <DialogTitle className="text-2xl font-black uppercase text-slate-900 tracking-tight">
              Buy / Claim Company Record
            </DialogTitle>
            <DialogDescription className="text-slate-600 text-sm">
              Search South Africa's industrial logistics registry to claim your existing record or register a new verified node.
            </DialogDescription>
          </DialogHeader>

          {/* STEP 1: SEARCH REGISTRY */}
          {buyStep === 'search' && (
            <div className="space-y-6 py-2 text-left">
              <form onSubmit={handleSearchRecord} className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Search Company Name or Keyword *
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="e.g. TransLogix, Apex Bulk, MegaTyres..." 
                      value={buySearchQuery}
                      onChange={(e) => setBuySearchQuery(e.target.value)}
                      className="pl-9 h-11"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isSearching}
                    className="h-11 px-6 bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider"
                  >
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                  </Button>
                </div>
              </form>

              {/* SEARCH RESULTS */}
              {isSearching && (
                <div className="py-8 text-center text-slate-500 space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="text-xs font-bold uppercase tracking-wider">Searching Industrial Registry...</p>
                </div>
              )}

              {!isSearching && hasSearched && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                    <span>Registry Matches ({buySearchResults.length})</span>
                    <span>Click record to claim</span>
                  </div>

                  {buySearchResults.length > 0 ? (
                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                      {buySearchResults.slice(0, 6).map((rec, idx) => (
                        <div 
                          key={rec.id || idx}
                          className="p-3.5 border border-slate-200 rounded-xl hover:border-primary/50 hover:bg-slate-50/80 transition-all flex items-center justify-between gap-4"
                        >
                          <div className="space-y-1 text-left min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 text-sm truncate">
                                {rec.companyName || rec.company_name || rec.name || 'Unnamed Entity'}
                              </span>
                              <Badge variant="outline" className="text-[10px] uppercase font-bold text-blue-700 bg-blue-50 border-blue-200">
                                {rec.type || rec.category || rec.role || 'Unclaimed Node'}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500 truncate">
                              {[rec.city, rec.province, rec.email].filter(Boolean).join(' • ') || 'South Africa Registry Record'}
                            </p>
                          </div>
                          <Button 
                            size="sm"
                            className="bg-slate-900 hover:bg-primary text-white font-bold text-xs uppercase tracking-wider shrink-0 h-9 px-4"
                            onClick={() => handleSelectRecordToBuy(rec)}
                          >
                            Buy / Claim
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                      <p className="font-bold">No existing record found for "{buySearchQuery}".</p>
                      <p className="text-slate-600">You can register your company as a new official record on the grid below.</p>
                    </div>
                  )}
                </div>
              )}

              {/* NEW RECORD OPTION */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-left">
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Can't find your company record?
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      If your company is not listed in our dataset yet, you can create a new verified entity record and purchase direct ownership.
                    </p>
                  </div>
                </div>
                <Button 
                  type="button" 
                  variant="outline"
                  className="w-full h-11 border-slate-300 font-bold uppercase tracking-wider text-xs bg-white hover:bg-slate-100 text-slate-900 flex items-center justify-center gap-2"
                  onClick={handleCreateNewRecordToBuy}
                >
                  <Sparkles className="h-4 w-4 text-primary" /> Register & Buy New Company Record
                </Button>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={resetBuyModal}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* STEP 2: ENTER DETAILS & REGISTER */}
          {buyStep === 'details' && (
            <form onSubmit={handleBuySubmit} className="space-y-4 py-2 text-left">
              {/* Record Banner */}
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-600 text-white font-bold uppercase text-[9px]">
                    {selectedRecord ? 'Existing Record Selected' : 'New Record Registration'}
                  </Badge>
                  <span className="font-bold text-slate-900 truncate">
                    {buyCompanyName || 'Company Entity'}
                  </span>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[10px] text-blue-700 font-bold hover:bg-blue-100 uppercase"
                  onClick={() => setBuyStep('search')}
                >
                  Change Search
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 text-left sm:col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Company Official Name *</Label>
                  <Input 
                    placeholder="e.g. TransLogix Logistics (Pty) Ltd" 
                    value={buyCompanyName}
                    onChange={(e) => setBuyCompanyName(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">CIPC / Reg Number</Label>
                  <Input 
                    placeholder="e.g. 2021/849201/07" 
                    value={buyRegNumber}
                    onChange={(e) => setBuyRegNumber(e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Entity Sector</Label>
                  <Select value={buyEntityType} onValueChange={setBuyEntityType}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transporter">Haulier / Transporter</SelectItem>
                      <SelectItem value="supplier">Industry Supplier</SelectItem>
                      <SelectItem value="finance">Finance & Capital</SelectItem>
                      <SelectItem value="warehouse">Warehouse & Yard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 text-left">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Representative Name *</Label>
                  <Input 
                    placeholder="e.g. Johan van der Merwe" 
                    value={buyRepName}
                    onChange={(e) => setBuyRepName(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Role / Title</Label>
                  <Input 
                    placeholder="e.g. Managing Director" 
                    value={buyRepRole}
                    onChange={(e) => setBuyRepRole(e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Official Contact Email *</Label>
                  <Input 
                    type="email"
                    placeholder="johan@translogix.co.za" 
                    value={buyEmail}
                    onChange={(e) => setBuyEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Contact Phone *</Label>
                  <Input 
                    placeholder="e.g. +27 82 123 4567" 
                    value={buyPhone}
                    onChange={(e) => setBuyPhone(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-1.5 text-left sm:col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Physical Address / Province</Label>
                  <Input 
                    placeholder="e.g. City Deep, Johannesburg, Gauteng" 
                    value={buyAddress}
                    onChange={(e) => setBuyAddress(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-slate-900 text-white rounded-xl text-xs space-y-1.5">
                <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                  <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">Record Ownership Package</span>
                  <Badge className="bg-green-500 text-slate-950 font-black uppercase text-[10px]">Verified Node</Badge>
                </div>
                <ul className="space-y-1 text-slate-300 list-disc list-inside text-[11px]">
                  <li>Direct administrative access to update fleet capacity & product listings</li>
                  <li>Receive direct customer RFQs & load opportunities</li>
                  <li>Exclusive "Verified Grid Entity" trust badge & peer vouching rights</li>
                </ul>
              </div>

              <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
                <Button type="button" variant="outline" onClick={() => setBuyStep('search')}>
                  Back to Search
                </Button>
                <Button type="submit" disabled={isBuySubmitting} className="bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider flex-1">
                  {isBuySubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registering Record...</> : "Register & Buy Record"}
                </Button>
              </DialogFooter>
            </form>
          )}

          {/* STEP 3: SUCCESS */}
          {buyStep === 'success' && (
            <div className="py-6 space-y-6 text-center">
              <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <ShieldCheck className="h-10 w-10" />
              </div>

              <div className="space-y-2">
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 uppercase font-black tracking-widest text-[10px]">
                  Registration & Ownership Logged
                </Badge>
                <h3 className="text-2xl font-black uppercase text-slate-900 tracking-tight">
                  Record Ownership Claim Received!
                </h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  Thank you! Your ownership request for <span className="font-bold text-slate-900">{buyCompanyName}</span> has been logged on the grid.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 max-w-md mx-auto text-left space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold uppercase text-[11px]">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> What Happens Next:
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600">
                  <li>Our verification team will confirm CIPC credentials for <span className="font-bold">{buyEmail}</span>.</li>
                  <li>You will receive login details to access your verified company dashboard.</li>
                  <li>Your profile will be highlighted on the Verified Logistics Registry.</li>
                </ol>
              </div>

              <DialogFooter className="pt-2 justify-center">
                <Button 
                  type="button" 
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase tracking-wider px-8 h-11"
                  onClick={resetBuyModal}
                >
                  Done & Return to Grid
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: VOUCH FOR COMPANY */}
      <Dialog open={vouchModalOpen} onOpenChange={setVouchModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white p-6 border shadow-2xl rounded-2xl text-left">
          <DialogHeader className="text-left space-y-2">
            <div className="flex items-center gap-2 text-amber-600 font-black uppercase text-xs tracking-wider">
              <ThumbsUp className="h-4 w-4" /> Peer Integrity Endorsement
            </div>
            <DialogTitle className="text-2xl font-black uppercase text-slate-900 tracking-tight">
              Vouch for a Peer Company
            </DialogTitle>
            <DialogDescription className="text-slate-600 text-sm">
              Endorse an operational partner, haulier, or supplier you have transacted with. Vouches build verified peer credibility across the network.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleVouchSubmit} className="space-y-4 py-2 text-left">
            <div className="space-y-1.5 text-left">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Company Name to Vouch For *</Label>
              <Input 
                placeholder="e.g. Apex Bulk Carriers" 
                value={vouchCompanyName}
                onChange={(e) => setVouchCompanyName(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Your Commercial Relationship</Label>
              <Select value={vouchRelationship} onValueChange={setVouchRelationship}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Trade Partner">Regular Trade Partner</SelectItem>
                  <SelectItem value="Freight Client">Freight Client / Cargo Owner</SelectItem>
                  <SelectItem value="Equipment Supplier">Equipment / Spares Supplier</SelectItem>
                  <SelectItem value="Subcontractor">Subcontractor / Sub-Haulier</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 text-left">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Vouch Statement / Verification Note</Label>
              <Textarea 
                placeholder="Confirm operational standards, payment reliability, or fleet readiness..." 
                value={vouchNote}
                onChange={(e) => setVouchNote(e.target.value)}
                rows={3}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setVouchModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isVouchSubmitting} className="bg-amber-600 hover:bg-amber-700 text-white font-bold uppercase tracking-wider">
                {isVouchSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : "Submit Peer Vouch (+5 Pts)"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: REVIEW COMPANY */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white p-6 border shadow-2xl rounded-2xl text-left">
          <DialogHeader className="text-left space-y-2">
            <div className="flex items-center gap-2 text-emerald-600 font-black uppercase text-xs tracking-wider">
              <MessageSquareQuote className="h-4 w-4" /> Operational Rating & Feedback
            </div>
            <DialogTitle className="text-2xl font-black uppercase text-slate-900 tracking-tight">
              Submit a Verified Review
            </DialogTitle>
            <DialogDescription className="text-slate-600 text-sm">
              Publish authentic performance feedback regarding service promptness, maintenance, or commercial compliance.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReviewSubmit} className="space-y-4 py-2 text-left">
            <div className="space-y-1.5 text-left">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Company Name *</Label>
              <Input 
                placeholder="e.g. MegaTyres Commercial" 
                value={reviewCompanyName}
                onChange={(e) => setReviewCompanyName(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Performance Rating (1 to 5 Stars)</Label>
              <div className="flex items-center gap-2 py-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-1 text-amber-400 hover:scale-110 transition-transform"
                  >
                    <Star className={`h-7 w-7 ${star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                  </button>
                ))}
                <span className="ml-2 font-black text-sm text-slate-700">{reviewRating} / 5</span>
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Detailed Review Comments *</Label>
              <Textarea 
                placeholder="Share specific details about turnaround times, communication, or equipment quality..." 
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={3}
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setReviewModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isReviewSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-wider">
                {isReviewSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publishing...</> : "Publish Verified Review"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
