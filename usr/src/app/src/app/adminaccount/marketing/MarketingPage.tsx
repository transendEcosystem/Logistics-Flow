'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import dynamic from 'next/dynamic';
import { Loader2, ClipboardCopy } from 'lucide-react';
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

// Content components using absolute paths
const CompanyProfile = dynamic(() => import('@/app/adminaccount/marketing/content/CompanyProfile'), { loading: () => <Loader2 className="animate-spin" /> });
const TechArchitecture = dynamic(() => import('@/app/adminaccount/marketing/content/TechArchitecture'), { loading: () => <Loader2 className="animate-spin" /> });
const RevenueModel = dynamic(() => import('@/app/adminaccount/marketing/content/RevenueModel'), { loading: () => <Loader2 className="animate-spin" /> });
const PitchDeck = dynamic(() => import('@/app/adminaccount/marketing/content/PitchDeck'), { loading: () => <Loader2 className="animate-spin" /> });
const Framework = dynamic(() => import('@/app/adminaccount/marketing/content/Framework'), { loading: () => <Loader2 className="animate-spin" /> });

// Audience-specific components using absolute paths
const PartnerOffer = dynamic(() => import('@/app/adminaccount/marketing/offers/PartnerOffer'), { loading: () => <Loader2 className="animate-spin" /> });
const InvestorOffer = dynamic(() => import('@/app/adminaccount/marketing/offers/InvestorOffer'), { loading: () => <Loader2 className="animate-spin" /> });
const DeveloperOffer = dynamic(() => import('@/app/adminaccount/marketing/offers/DeveloperOffer'), { loading: () => <Loader2 className="animate-spin" /> });
const SupplierOffer = dynamic(() => import('@/app/adminaccount/marketing/offers/SupplierOffer'), { loading: () => <Loader2 className="animate-spin" /> });
const TransporterOffer = dynamic(() => import('@/app/adminaccount/marketing/offers/TransporterOffer'), { loading: () => <Loader2 className="animate-spin" /> });

const PartnerEmails = dynamic(() => import('@/app/adminaccount/marketing/emails/PartnerEmails'), { loading: () => <Loader2 className="animate-spin" /> });
const SupplierEmails = dynamic(() => import('@/app/adminaccount/marketing/emails/SupplierEmails'), { loading: () => <Loader2 className="animate-spin" /> });
const TransporterEmails = dynamic(() => import('@/app/adminaccount/marketing/emails/TransporterEmails'), { loading: () => <Loader2 className="animate-spin" /> });
const InvestorEmails = dynamic(() => import('@/app/adminaccount/marketing/emails/InvestorEmails'), { loading: () => <Loader2 className="animate-spin" /> });
const DeveloperEmails = dynamic(() => import('@/app/adminaccount/marketing/emails/DeveloperEmails'), { loading: () => <Loader2 className="animate-spin" /> });

// Management components using absolute paths
const PartnerManagement = dynamic(() => import('@/app/adminaccount/marketing/partner-management'), { loading: () => <Loader2 className="animate-spin" /> });
const ISAManagement = dynamic(() => import('@/app/adminaccount/marketing/isa-management'), { loading: () => <Loader2 className="animate-spin" /> });
const InvestorManagement = dynamic(() => import('@/app/adminaccount/marketing/investor-management'), { loading: () => <Loader2 className="animate-spin" /> });
const DeveloperManagement = dynamic(() => import('@/app/adminaccount/marketing/developer-management'), { loading: () => <Loader2 className="animate-spin" /> });
const SupplierManagement = dynamic(() => import('@/app/adminaccount/marketing/supplier-management'), { loading: () => <Loader2 className="animate-spin" /> });
const TransporterManagement = dynamic(() => import('@/app/adminaccount/marketing/transporter-management'), { loading: () => <Loader2 className="animate-spin" /> });

const audienceConfig = {
    partners: { title: 'Strategic Partners', Offer: PartnerOffer, Emails: PartnerEmails, Management: PartnerManagement },
    isa: { title: 'ISA Agents', Offer: PartnerOffer, Emails: PartnerEmails, Management: ISAManagement },
    suppliers: { title: 'Suppliers', Offer: SupplierOffer, Emails: SupplierEmails, Management: SupplierManagement },
    transporters: { title: 'Transporters', Offer: TransporterOffer, Emails: TransporterEmails, Management: TransporterManagement },
    investors: { title: 'Investors', Offer: InvestorOffer, Emails: InvestorEmails, Management: InvestorManagement },
    developers: { title: 'Developers', Offer: DeveloperOffer, Emails: DeveloperEmails, Management: DeveloperManagement },
};

interface MarketingPageProps {
  audience: keyof typeof audienceConfig;
}

type ApiPartnerType = 'partner' | 'isa' | 'investor' | 'developer' | 'supplier' | 'transporter';

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
            // Error is handled by the parent component's toast
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
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
                        <FormField control={form.control} name="partnerId" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Log against {singularAudience}</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger disabled={isLoadingPartners}>
                                        <SelectValue placeholder={isLoadingPartners ? "Loading..." : `Select a ${singularAudience.toLowerCase()}...`} />
                                    </SelectTrigger></FormControl>
                                    <SelectContent>
                                        {partners.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.companyName || 'N/A'})</SelectItem>)}
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
  const config = audienceConfig[audience];
  const { Offer, Emails, Management } = config;
  const [activeTab, setActiveTab] = useState('company-profile');
  const { toast } = useToast();
  
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [partners, setPartners] = useState<any[]>([]);
  const [isLoadingPartners, setIsLoadingPartners] = useState(true);

  const fetchPartnersForLogging = useCallback(async () => {
    if (!Management) {
      setIsLoadingPartners(false);
      setPartners([]);
      return;
    }
    
    setIsLoadingPartners(true);
    try {
        const token = await getClientSideAuthToken();
        if (!token) throw new Error("Not authenticated");

        let apiType: ApiPartnerType = 'partner';
        if (audience === 'isa') apiType = 'isa';
        else if (audience === 'investors') apiType = 'investor';
        else if (audience === 'developers') apiType = 'developer';
        else if (audience === 'suppliers') apiType = 'supplier';
        else if (audience === 'transporters') apiType = 'transporter';
        
        const result = await performAdminAction(token, 'getPartnersByType', { type: apiType });
        setPartners(result.data || []);
        
    } catch (e: any) {
        toast({ variant: 'destructive', title: `Could not load partners for logging`, description: e.message });
    } finally {
        setIsLoadingPartners(false);
    }
  }, [audience, Management, toast]);

  useEffect(() => {
    fetchPartnersForLogging();
  }, [fetchPartnersForLogging]);


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
        throw new Error('Your browser may not support this feature, or there was an error.');
      }
    } else {
      throw new Error(`Could not find the content for the active tab (ID: ${contentId}).`);
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

        toast({ title: 'Logged and Copied!', description: 'Communication has been logged. Images may be blocked by the recipient\'s email client.' });
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
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Marketing & Pitch Library: {config.title}</h1>
                <p className="text-muted-foreground">Tailored content and email sequences for engaging with {config.title.toLowerCase()}.</p>
            </div>
            <Tabs defaultValue="company-profile" className="w-full" onValueChange={setActiveTab}>
                <TabsList className="h-auto flex-wrap justify-start">
                    <TabsTrigger value="company-profile">Company Profile</TabsTrigger>
                    <TabsTrigger value="tech-architecture">Tech Architecture</TabsTrigger>
                    <TabsTrigger value="revenue-model">Revenue Model</TabsTrigger>
                    <TabsTrigger value="offer">The Offer</TabsTrigger>
                    <TabsTrigger value="pitch">The Pitch</TabsTrigger>
                    <TabsTrigger value="framework">The Framework</TabsTrigger>
                    <TabsTrigger value="emails">Emails</TabsTrigger>
                    {Management && <TabsTrigger value="management">Management</TabsTrigger>}
                </TabsList>

                <Card className="mt-4">
                    <CardHeader className="flex flex-row items-center justify-end border-b">
                        <Button variant="outline" onClick={() => setIsLogDialogOpen(true)} disabled={isLoadingPartners || (partners.length === 0 && !!Management)}>
                            {isLoadingPartners ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <ClipboardCopy className="mr-2 h-4 w-4" />
                            )}
                            Log & Copy Content
                        </Button>
                    </CardHeader>
                    <CardContent className="p-6">
                        <TabsContent value="company-profile">
                            <div id="tab-content-company-profile"><CompanyProfile audience={audience} /></div>
                        </TabsContent>
                        <TabsContent value="tech-architecture">
                            <div id="tab-content-tech-architecture"><TechArchitecture /></div>
                        </TabsContent>
                        <TabsContent value="revenue-model">
                            <div id="tab-content-revenue-model"><RevenueModel /></div>
                        </TabsContent>
                        <TabsContent value="offer">
                            <div id="tab-content-offer"><Offer /></div>
                        </TabsContent>
                        <TabsContent value="pitch">
                            <div id="tab-content-pitch"><PitchDeck /></div>
                        </TabsContent>
                        <TabsContent value="framework">
                            <div id="tab-content-framework"><Framework /></div>
                        </TabsContent>
                        <TabsContent value="emails">
                            <div id="tab-content-emails"><Emails /></div>
                        </TabsContent>
                        {Management && (
                            <TabsContent value="management">
                                <div id="tab-content-management"><Management /></div>
                            </TabsContent>
                        )}
                    </CardContent>
                </Card>
            </Tabs>
        </div>
    </>
  );
}
