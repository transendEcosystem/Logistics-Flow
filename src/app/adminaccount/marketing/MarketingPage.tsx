'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import dynamic from 'next/dynamic';
import { Loader2, ClipboardCopy, Search, Users, Database } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getClientSideAuthToken } from '@/firebase';

/**
 * MARKETING PAGE TERMINAL
 * Build Identifier: 2026-03-17T11:00:00Z (Cache Refresh Fix)
 */

// Content components
const CompanyProfile = dynamic(() => import('@/app/adminaccount/marketing/content/CompanyProfile'), { loading: () => <Loader2 className="animate-spin" /> });
const TechArchitecture = dynamic(() => import('@/app/adminaccount/marketing/content/TechArchitecture'), { loading: () => <Loader2 className="animate-spin" /> });
const RevenueModel = dynamic(() => import('@/app/adminaccount/marketing/content/RevenueModel'), { loading: () => <Loader2 className="animate-spin" /> });
const PitchDeck = dynamic(() => import('@/app/adminaccount/marketing/content/PitchDeck'), { loading: () => <Loader2 className="animate-spin" /> });
const Framework = dynamic(() => import('@/app/adminaccount/marketing/content/Framework'), { loading: () => <Loader2 className="animate-spin" /> });

// Audience-specific offers
const PartnerOffer = dynamic(() => import('@/app/adminaccount/marketing/offers/PartnerOffer'), { loading: () => <Loader2 className="animate-spin" /> });
const InvestorOffer = dynamic(() => import('@/app/adminaccount/marketing/offers/InvestorOffer'), { loading: () => <Loader2 className="animate-spin" /> });
const DeveloperOffer = dynamic(() => import('@/app/adminaccount/marketing/offers/DeveloperOffer'), { loading: () => <Loader2 className="animate-spin" /> });
const SupplierOffer = dynamic(() => import('@/app/adminaccount/marketing/offers/SupplierOffer'), { loading: () => <Loader2 className="animate-spin" /> });
const TransporterOffer = dynamic(() => import('@/app/adminaccount/marketing/offers/TransporterOffer'), { loading: () => <Loader2 className="animate-spin" /> });
const AssociateOffer = dynamic(() => import('@/app/adminaccount/marketing/offers/AssociateOffer'), { loading: () => <Loader2 className="animate-spin" /> });

// Emails
const PartnerEmails = dynamic(() => import('@/app/adminaccount/marketing/emails/PartnerEmails'), { loading: () => <Loader2 className="animate-spin" /> });
const SupplierEmails = dynamic(() => import('@/app/adminaccount/marketing/emails/SupplierEmails'), { loading: () => <Loader2 className="animate-spin" /> });
const TransporterEmails = dynamic(() => import('@/app/adminaccount/marketing/emails/TransporterEmails'), { loading: () => <Loader2 className="animate-spin" /> });
const InvestorEmails = dynamic(() => import('@/app/adminaccount/marketing/emails/InvestorEmails'), { loading: () => <Loader2 className="animate-spin" /> });
const DeveloperEmails = dynamic(() => import('@/app/adminaccount/marketing/emails/DeveloperEmails'), { loading: () => <Loader2 className="animate-spin" /> });
const AssociateEmails = dynamic(() => import('@/app/adminaccount/marketing/emails/AssociateEmails'), { loading: () => <Loader2 className="animate-spin" /> });

// Management (static imports to prevent ChunkLoadError in dynamic loader)
import PartnerManagement from '@/app/adminaccount/marketing/partner-management';
import ISAManagement from '@/app/adminaccount/marketing/isa-management';
import InvestorManagement from '@/app/adminaccount/marketing/investor-management';
import DeveloperManagement from '@/app/adminaccount/marketing/developer-management';
import SupplierManagement from '@/app/adminaccount/marketing/supplier-management';
import TransporterManagement from '@/app/adminaccount/marketing/transporter-management';
import AssociateManagement from '@/app/adminaccount/marketing/associate-management';
import FinanceManagement from '@/app/adminaccount/marketing/finance-management';

// Discovery
const AssociateDiscoveryEngine = dynamic(() => import('@/app/adminaccount/marketing/associate-discovery'), { loading: () => <Loader2 className="animate-spin" /> });
const SupplierDiscoveryEngine = dynamic(() => import('@/app/adminaccount/marketing/discovery-engine'), { loading: () => <Loader2 className="animate-spin" /> });
const TransporterDiscoveryEngine = dynamic(() => import('@/app/adminaccount/marketing/transporter-discovery'), { loading: () => <Loader2 className="animate-spin" /> });
const InvestorDiscoveryEngine = dynamic(() => import('@/app/adminaccount/marketing/investor-discovery'), { loading: () => <Loader2 className="animate-spin" /> });
const FinanceDiscoveryEngine = dynamic(() => import('@/app/adminaccount/marketing/finance-discovery'), { loading: () => <Loader2 className="animate-spin" /> });
const WarehouseDiscovery = dynamic(() => import('@/app/adminaccount/marketing/warehouse-discovery'), { loading: () => <Loader2 className="animate-spin" /> });
const DistributionDiscovery = dynamic(() => import('@/app/adminaccount/marketing/distribution-discovery'), { loading: () => <Loader2 className="animate-spin" /> });
const LoadsDiscovery = dynamic(() => import('@/app/adminaccount/marketing/loads-discovery'), { loading: () => <Loader2 className="animate-spin" /> });
const BuySellDiscovery = dynamic(() => import('@/app/adminaccount/marketing/buy-sell-discovery'), { loading: () => <Loader2 className="animate-spin" /> });

const audienceConfig = {
    partners: { title: 'Strategic Partners', Offer: PartnerOffer, Emails: PartnerEmails, CRM: PartnerManagement, Discovery: undefined },
    isa: { title: 'ISA Agents', Offer: PartnerOffer, Emails: PartnerEmails, CRM: ISAManagement, Discovery: undefined },
    associates: { title: 'Digital Associates', Offer: AssociateOffer, Emails: AssociateEmails, CRM: AssociateManagement, Discovery: AssociateDiscoveryEngine },
    suppliers: { title: 'Suppliers', Offer: SupplierOffer, Emails: SupplierEmails, CRM: SupplierManagement, Discovery: SupplierDiscoveryEngine },
    transporters: { title: 'Transporters', Offer: TransporterOffer, Emails: TransporterEmails, CRM: TransporterManagement, Discovery: TransporterDiscoveryEngine },
    finance: { title: 'Finance Partners', Offer: InvestorOffer, Emails: InvestorEmails, CRM: FinanceManagement, Discovery: FinanceDiscoveryEngine },
    investors: { title: 'Investors', Offer: InvestorOffer, Emails: InvestorEmails, CRM: InvestorManagement, Discovery: InvestorDiscoveryEngine },
    developers: { title: 'Developers', Offer: DeveloperOffer, Emails: DeveloperEmails, CRM: DeveloperManagement, Discovery: undefined },
    warehouse: { title: 'Warehouse Mall', Offer: PartnerOffer, Emails: PartnerEmails, CRM: undefined, Discovery: WarehouseDiscovery },
    distribution: { title: 'Distribution Mall', Offer: PartnerOffer, Emails: PartnerEmails, CRM: undefined, Discovery: DistributionDiscovery },
    loads: { title: 'Loads Mall', Offer: PartnerOffer, Emails: PartnerEmails, CRM: undefined, Discovery: LoadsDiscovery },
    'buy-sell': { title: 'Buy & Sell Mall', Offer: PartnerOffer, Emails: PartnerEmails, CRM: undefined, Discovery: BuySellDiscovery },
};

interface MarketingPageProps {
  audience: keyof typeof audienceConfig;
}

type ApiPartnerType = 'partner' | 'isa' | 'investor' | 'developer' | 'supplier' | 'transporter' | 'associate' | 'finance' | 'lead';

async function performAdminAction(token: string, action: string, payload: any) {
    const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(text.startsWith('{') ? JSON.parse(text).error : `Server Error: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
        throw new Error(result.error || `API Error for action: ${action}`);
    }
    return result;
}

const logSchema = z.object({
  partnerId: z.string().min(1, "Please select a partner."),
  communicationType: z.string().min(1, "Please select a type."),
  notes: z.string().optional(),
});

type LogFormValues = z.infer<typeof logSchema>;

function LogAndCopyDialog({ open, onOpenChange, partners, isLoadingPartners, activeTabLabel, onLogAndCopy, audienceTitle }: any) {
    const form = useForm<LogFormValues>({
        resolver: zodResolver(logSchema),
    });

    const [isLogging, setIsLogging] = useState(false);

    const singularAudience = useMemo(() => {
        if (!audienceTitle) return 'Partner';
        if (audienceTitle === 'Suppliers') return 'Supplier';
        if (audienceTitle === 'Transporters') return 'Transporter';
        if (audienceTitle.endsWith('s')) {
            return audienceTitle.slice(0, -1);
        }
        return audienceTitle;
    }, [audienceTitle]);

    const handleSubmit = async (values: LogFormValues) => {
        setIsLogging(true);
        try {
            await onLogAndCopy({
                ...values,
                subject: activeTabLabel,
            });
        } catch (e) {
            // Error is handled by parent
        } finally {
            setIsLogging(false);
        }
    };
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Log and Copy Content</DialogTitle>
                    <DialogDescription>
                        Select a partner to log this communication against before copying the content.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4 text-left text-foreground">
                        <FormField control={form.control} name="partnerId" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Log against {singularAudience}</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger disabled={isLoadingPartners}>
                                        <SelectValue placeholder={isLoadingPartners ? "Loading..." : `Select a ${singularAudience.toLowerCase()}...`} />
                                    </SelectTrigger></FormControl>
                                    <SelectContent>
                                        {partners.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.companyName || `${p.firstName} ${p.lastName}`}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="communicationType" render={({ field }) => (
                             <FormItem>
                                <FormLabel>Communication Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a type..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Email">Email</SelectItem>
                                        <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                                        <SelectItem value="Call">Call</SelectItem>
                                        <SelectItem value="Meeting">Meeting</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notes (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Add notes about the call or meeting..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <DialogFooter>
                            <Button type="submit" disabled={isLogging}>
                                {isLogging && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Log & Copy
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

export default function MarketingPage({ audience }: MarketingPageProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('company-profile');
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [partners, setPartners] = useState<any[]>([]);
  const [isLoadingPartners, setIsLoadingPartners] = useState(true);

  const config = audienceConfig[audience];
  
  const fetchPartnersForLogging = useCallback(async () => {
    if (!config) {
      setIsLoadingPartners(false);
      setPartners([]);
      return;
    }
    
    setIsLoadingPartners(true);
    try {
        const token = await getClientSideAuthToken();
        if (!token) {
          setIsLoadingPartners(false);
          return;
        }

        try {
          const response = await fetch(`/api/admin?view=marketing-${audience}`);
          const result = await response.json();
          setPartners(result.data || result.leads || []);
        } catch (adminErr: any) {
          setPartners([]);
        }
        
    } catch (e: any) {
        if (!e.message?.includes('PERMISSION_DENIED')) {
            toast({ variant: 'destructive', title: `Could not load partners for logging`, description: e.message });
        }
    } finally {
        setIsLoadingPartners(false);
    }
  }, [audience, config, toast]);

  useEffect(() => {
    fetchPartnersForLogging();
  }, [fetchPartnersForLogging]);

  if (!config) return null;

  const { Offer, Emails, CRM, Discovery } = config;

  const handleCopyContent = async () => {
    const contentId = `tab-content-${activeTab}`;
    const contentElement = document.getElementById(contentId);

    if (contentElement) {
      try {
        const contentClone = contentElement.cloneNode(true) as HTMLElement;
        const images = contentClone.querySelectorAll('img');
        images.forEach(img => {
            if (img.src.startsWith('/')) {
                img.src = `${window.location.origin}${img.src}`;
            }
        });
        
        const blob = new Blob([contentClone.innerHTML], { type: 'text/html' });
        const clipboardItem = new ClipboardItem({ 'text/html': blob });
        await navigator.clipboard.write([clipboardItem]);
        
      } catch (err) {
        console.error('Failed to copy content: ', err);
        throw new Error('Your browser may not support this feature.');
      }
    } else {
      throw new Error(`Could not find content.`);
    }
  };

  const handleLogAndCopy = async (logData: {partnerId: string, communicationType: string, subject: string, notes?: string}) => {
    try {
        const token = await getClientSideAuthToken();
        if (!token) throw new Error("Authentication failed.");
        
        await performAdminAction(token, 'logCommunication', {
            partnerId: logData.partnerId,
            type: logData.communicationType,
            subject: logData.subject,
            notes: logData.notes,
        });

        await handleCopyContent();

        toast({ title: 'Logged and Copied!', description: 'Communication has been logged.' });
        setIsLogDialogOpen(false);
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Action Failed', description: e.message });
    }
  };

  return (
    <>
        <LogAndCopyDialog 
            open={isLogDialogOpen}
            onOpenChange={setIsLogDialogOpen}
            partners={partners}
            isLoadingPartners={isLoadingPartners}
            activeTabLabel={activeTab}
            onLogAndCopy={handleLogAndCopy}
            audienceTitle={config.title}
        />
        <div className="space-y-6 text-left text-foreground">
            <div className="text-left text-foreground">
                <h1 className="text-2xl font-bold">Marketing & Pitch Library: {config.title}</h1>
                <p className="text-muted-foreground">Tailored content and engagement tools for {config.title.toLowerCase()}.</p>
            </div>
            <Tabs defaultValue="company-profile" className="w-full text-left" onValueChange={setActiveTab}>
                <TabsList className="h-auto flex-wrap justify-start bg-muted/50 p-1">
                    <TabsTrigger value="company-profile" className="text-xs">Company Profile</TabsTrigger>
                    <TabsTrigger value="tech-architecture" className="text-xs">Tech Architecture</TabsTrigger>
                    <TabsTrigger value="revenue-model" className="text-xs">Revenue Model</TabsTrigger>
                    <TabsTrigger value="offer" className="text-xs">The Offer</TabsTrigger>
                    <TabsTrigger value="pitch" className="text-xs">The Pitch</TabsTrigger>
                    <TabsTrigger value="framework" className="text-xs">The Framework</TabsTrigger>
                    <TabsTrigger value="emails" className="text-xs">Emails</TabsTrigger>
                    {Discovery && <TabsTrigger value="discovery" className="gap-2 text-xs font-bold"><Search className="h-3.5 w-3.5 text-primary" /> Discover AI</TabsTrigger>}
                    {CRM && <TabsTrigger value="crm" className="gap-2 text-xs font-bold"><Users className="h-3.5 w-3.5 text-primary" /> CRM</TabsTrigger>}
                </TabsList>

                <Card className="mt-4 text-left border-none shadow-xl bg-white overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-end border-b bg-slate-50 p-4">
                        <Button variant="outline" className="font-bold h-10 gap-2 border-primary/20 text-primary" onClick={() => setIsLogDialogOpen(true)} disabled={isLoadingPartners || (partners.length === 0 && !!CRM)}>
                            {isLoadingPartners ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <ClipboardCopy className="mr-2 h-4 w-4" />
                            )}
                            Log & Copy Content
                        </Button>
                    </CardHeader>
                    <CardContent className="p-8 text-left text-foreground">
                        <TabsContent value="company-profile"><div id="tab-content-company-profile"><CompanyProfile audience={audience} /></div></TabsContent>
                        <TabsContent value="tech-architecture"><div id="tab-content-tech-architecture"><TechArchitecture /></div></TabsContent>
                        <TabsContent value="revenue-model"><div id="tab-content-revenue-model"><RevenueModel /></div></TabsContent>
                        <TabsContent value="offer"><div id="tab-content-offer"><Offer /></div></TabsContent>
                        <TabsContent value="pitch"><div id="tab-content-pitch"><PitchDeck /></div></TabsContent>
                        <TabsContent value="framework"><div id="tab-content-framework"><Framework /></div></TabsContent>
                        <TabsContent value="emails"><div id="tab-content-emails"><Emails /></div></TabsContent>
                        {Discovery && <TabsContent value="discovery"> <div id="tab-content-discovery"><Discovery /></div> </TabsContent>}
                        {CRM && <TabsContent value="crm"><div id="tab-content-crm"><CRM /></div></TabsContent>}
                    </CardContent>
                </Card>
            </Tabs>
        </div>
    </>
  );
}