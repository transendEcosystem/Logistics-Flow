'use client';

import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { UserCheck, ShieldCheck, Zap, ShoppingCart, TrendingUp, BarChart3 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React from 'react';
import { useSearchParams } from 'next/navigation';
import { useUser } from '@/firebase';

const EmailTemplate = ({ subject, content, partner, referralLink }: { subject: string, content: string, partner: any, referralLink: string }) => {
    const personalizedContent = React.useMemo(() => {
        let text = content;
        const name = partner?.firstName || (partner?.contactPerson ? partner.contactPerson.split(' ')[0] : 'Supplier');
        const company = partner?.companyName || '[Your Company]';
        
        const baseUrl = 'https://studio--ecosystem-hub.us-central1.hosted.app';
        text = text.replace(/\[Supplier Name\]/g, name);
        text = text.replace(/\[Name\]/g, name);
        text = text.replace(/\[Lead Name\]/g, name);
        text = text.replace(/\[Your Company\]/g, company);
        text = text.replace(/\[Referral Link\]/g, referralLink);
        text = text.replace(/\[Sign-up Link\]/g, referralLink);
        text = text.replace(/\[Opt-in Link\]/g, `${baseUrl}/opt-in/${partner?.id || 'TEST'}`);

        return text;
    }, [content, partner, referralLink]);

    return (
        <Card className="border-none shadow-none bg-transparent text-left">
            <CardHeader className="px-0 text-left">
                <div className="flex items-center justify-between text-left">
                    <div className="text-left text-foreground text-left text-foreground">
                        <CardTitle className="text-lg text-left text-foreground">Email Subject</CardTitle>
                        <CardDescription className="font-medium text-foreground select-all text-left">{subject}</CardDescription>
                    </div>
                    {partner && (
                         <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border border-green-200">
                            <UserCheck className="h-3.5 w-3.5" /> Personalized for {partner.firstName || partner.contactPerson?.split(' ')[0]}
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="px-0 text-left text-foreground text-foreground text-foreground">
                <div className="p-6 bg-white border rounded-md whitespace-pre-wrap font-sans text-sm shadow-inner min-h-[300px] text-left text-foreground leading-relaxed">
                    {personalizedContent.trim()}
                </div>
            </CardContent>
            {partner && (
                <CardFooter className="px-0 pt-4 border-t mt-4 text-xs text-muted-foreground italic text-center">
                    Sell more, faster. Registration is 100% free.
                </CardFooter>
            )}
        </Card>
    );
};

const getTemplates = (supplierType: string) => ({
    handshake: {
        subject: `Sell More ${supplierType}: Access 5,400+ Verified Transport Buyers`,
        content: `
Hi [Supplier Name],

We are writing to share how Logistics Flow helps suppliers like [Your Company] accelerate sales velocity and capture direct market share across Southern Africa's transport sector.

1. **Verified Transport Network (5,400+ Companies):**
We maintain a forensically verified database of 5,400+ transport and fleet operating companies in Southern Africa—complete with active fleet sizes, maintenance schedules, and procurement contacts.

2. **The 3 Pillars of the Application:**
• **1. Verified Market Intelligence & Reach:** Search and filter our registry of 5,400+ transport companies. Unlocking a record populates complete contact and fleet details directly into your secure portal as an active, verified, high-intent lead.
• **2. Secure Transactions & Direct Sales:** Sell products directly to transport buyers in our online shop using their pre-funded digital wallets, completely eliminating non-payment stress.
• **3. Anonymized Data & Machine Learning:** Deeper platform activity tracked anonymously and reserved exclusively for internal machine learning tools to optimize buyer-supplier matching.

3. **Breaking Your Business Constraints:**
Uniting verified lead unlocking, wallet-backed shop sales, and internal machine learning systematically eliminates cold calling, bad debt risk, and high customer acquisition costs.

Establish your free standing in the supplier registry to unlock direct deal-flow:
[Opt-in Link]

Best regards,

The Logistics Flow Team
        `
    },
    leadyield: {
        subject: `Lead Yield Audit: Handshake Requests for [Your Company]`,
        content: `
Hi [Supplier Name],

I am writing to notify you that our industrial registry has recorded multiple "High-Intent Engagements" for your business profile among our 5,400+ verified transport companies.

Logistics Flow tracks every time a verified fleet owner or procurement lead selects your profile to engage across our 3-pillar platform architecture (Verified Intelligence, Secure Transactions, and Anonymized Data).

Currently, these leads are held as "Blind Leads." To reveal these buyer profiles and establish the handshake, claim your free digital standing here:
[Opt-in Link]

Turn passive interest into confirmed sales velocity.

Best regards,

The Logistics Flow Team
        `
    }
});

const tabs = [
    { value: "handshake", label: "0. Sales Growth Pitch", icon: TrendingUp },
    { value: "leadyield", label: "1. Lead Yield Pitch", icon: BarChart3 },
];

export default function SupplierEmails({ partner }: { partner?: any }) {
    const { user } = useUser();
    const searchParams = useSearchParams();
    const supplierType = searchParams.get('type') || 'Industrial';
    const templates = getTemplates(supplierType);
    const baseUrl = 'https://studio--ecosystem-hub.us-central1.hosted.app';

    const referralLink = React.useMemo(() => {
        if (!partner) return `${baseUrl}/join`;
        return `${baseUrl}/join?ref=${partner.id}&role=vendor&type=${encodeURIComponent(supplierType)}`;
    }, [partner, baseUrl, supplierType]);

    return (
        <div className="space-y-6 text-left">
            <Tabs defaultValue="handshake" className="w-full text-left">
                <TabsList className="h-auto flex-wrap justify-start bg-muted/30 text-left">
                   {tabs.map(tab => {
                       const Icon = tab.icon;
                       return (
                           <TabsTrigger key={tab.value} value={tab.value} className="text-xs gap-2">
                               {Icon && <Icon className="h-3 w-3" />}
                               {tab.label}
                           </TabsTrigger>
                       );
                   })}
                </TabsList>
                {Object.entries(templates).map(([key, t]) => (
                    <TabsContent key={key} value={key} className="mt-6 text-left">
                        <EmailTemplate 
                            subject={t.subject} 
                            content={t.content.replace(/\[Your Name\]/g, user?.displayName || 'Logistics Flow Team')} 
                            partner={partner} 
                            referralLink={referralLink}
                        />
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
