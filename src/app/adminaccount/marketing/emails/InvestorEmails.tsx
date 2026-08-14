'use client';

import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { Mail, UserCheck, Link as LinkIcon, ShieldCheck, Zap, Landmark, Target } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React from 'react';
import { useUser } from '@/firebase';

const EmailTemplate = ({ subject, content, partner, referralLink }: { subject: string, content: string, partner: any, referralLink: string }) => {
    const personalizedContent = React.useMemo(() => {
        let text = content;
        // Robust name extraction
        const name = partner?.firstName || 
                     partner?.contactPerson?.split(' ')[0] || 
                     partner?.contact_person?.split(' ')[0] || 
                     'Partner';

        const company = partner?.companyName || 'your institution';
        
        text = text.replace(/\[Partner Name\]/g, name);
        text = text.replace(/\[Institution Name\]/g, company);
        text = text.replace(/\[Referral Link\]/g, referralLink);
        text = text.replace(/\[Opt-in Link\]/g, `${window.location.origin}/opt-in/${partner?.id || 'TEST'}`);

        return text;
    }, [content, partner, referralLink]);

    return (
        <Card className="border-none shadow-none bg-transparent text-left">
            <CardHeader className="px-0 text-left">
                <div className="flex items-center justify-between text-left">
                    <div className="text-left">
                        <CardTitle className="text-lg text-left text-foreground">Email Subject</CardTitle>
                        <CardDescription className="font-medium text-foreground select-all text-left">{subject}</CardDescription>
                    </div>
                    {partner && (
                         <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border border-green-200">
                            <UserCheck className="h-3.5 w-3.5" /> Personalized for {partner.firstName || partner.contactPerson?.split(' ')[0] || partner.contact_person?.split(' ')[0]}
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="px-0 text-left text-foreground">
                <div className="p-6 bg-white border rounded-md whitespace-pre-wrap font-sans text-sm shadow-inner min-h-[300px] text-left text-foreground leading-relaxed">
                    {personalizedContent.trim()}
                </div>
            </CardContent>
            {partner && (
                <CardFooter className="px-0 pt-4 border-t mt-4 text-xs text-muted-foreground italic text-center">
                    Automating industrial deal-flow for specialized South African lenders.
                </CardFooter>
            )}
        </Card>
    );
};

const templates = {
    dealflow: {
        subject: "Automated Deal Flow: Access Pre-Vetted Transport Applications",
        content: `
Hi [Partner Name],

The primary constraint on capital deployment in the transport sector isn't a lack of opportunity—it's a lack of verified information. Logistics Flow is writing to bridge this gap for [Institution Name].

We have mapped the South African industrial landscape, creating a forensic registry of over 22,000 records, including 5,400+ verified transport companies. Within our **Finance Mall**, we have built a sophisticated **Automated Matching Engine**.

How it works for you:
1. **Lending Focus Configuration:** You define your exact credit appetite—target asset classes, minimum turnover, and preferred risk profiles.
2. **Automated Exposure:** Our system scans every incoming funding enquiry in real-time.
3. **High-Fidelity Matching:** When an application matches your criteria, it is instantly delivered to your desk with a full forensic data pack (CIPC records, RC1 fleet verification, and performance history).

This allows you to bypass cold origination and focus entirely on high-intent, matched deal flow.

Establish your standing in our finance network to review current opportunities:
[Opt-in Link]

Best regards,

The Logistics Flow Capital Division
        `
    },
    intelligence: {
        subject: "Industrial Intelligence: De-Risking the Transport Sector",
        content: `
Dear [Partner Name],

Traditional credit scoring often fails in the logistics sector because it lacks real-world operational context. Logistics Flow provides the missing layer of industrial intelligence.

As a **Finance Mall Partner**, you gain access to our forensic database of 22,000+ records. More importantly, you gain access to the **verified performance data** of our members. When a haulier applies for finance through our platform, we provide more than just a balance sheet—we provide a verified history of their service lanes, fleet capacity, and community standing.

Our automated tools are designed to filter out the noise, exposing [Institution Name] only to applications that meet your institutional risk parameters.

Unlock absolute transparency in your lending cycle here:
[Opt-in Link]

Best regards,

[Your Name]
        `
    }
};

const tabs = [
    { value: "dealflow", label: "0. Automated Deal Flow", icon: Zap },
    { value: "intelligence", label: "1. The Intelligence Pitch", icon: Landmark },
];

export default function InvestorEmails({ partner }: { partner?: any }) {
    const { user } = useUser();
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://studio--ecosystem-hub.us-central1.hosted.app';

    const referralLink = React.useMemo(() => {
        if (!partner) return `${baseUrl}/join`;
        return `${baseUrl}/join?ref=${partner.id}&role=lender`;
    }, [partner, baseUrl]);

    return (
        <div className="space-y-6 text-left">
            <Tabs defaultValue="dealflow" className="w-full text-left">
                <TabsList className="h-auto flex-wrap justify-start bg-muted/30 text-left">
                   {tabs.map(tab => (
                       <TabsTrigger key={tab.value} value={tab.value} className="text-xs gap-2">
                           <tab.icon className="h-3 w-3" />
                           {tab.label}
                       </TabsTrigger>
                   ))}
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