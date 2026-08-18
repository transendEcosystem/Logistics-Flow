'use client';

import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { Mail, UserCheck, Link as LinkIcon, ShieldCheck, Zap } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React from 'react';
import { useUser } from '@/firebase';

const EmailTemplate = ({ subject, content, partner, referralLink }: { subject: string, content: string, partner: any, referralLink: string }) => {
    const personalizedContent = React.useMemo(() => {
        let text = content;
        const name = partner?.firstName || (partner?.contactPerson ? partner.contactPerson.split(' ')[0] : 'Partner');
        const company = partner?.companyName || '[Your Company]';
        
        const baseUrl = 'https://studio--ecosystem-hub.us-central1.hosted.app';
        text = text.replace(/\[Partner Name\]/g, name);
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
                <div className="flex items-center justify-between text-left text-foreground">
                    <div className="text-left">
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
            <CardContent className="px-0 text-left text-foreground">
                <div className="p-6 bg-white border rounded-md whitespace-pre-wrap font-sans text-sm shadow-inner min-h-[300px] text-left text-foreground">
                    {personalizedContent.trim()}
                </div>
            </CardContent>
            {partner && (
                <CardFooter className="px-0 pt-4 border-t mt-4 text-left">
                    <div className="w-full flex items-center justify-between text-xs text-muted-foreground text-left">
                        <div className="flex items-center gap-4 text-left">
                            <span className="flex items-center gap-1 text-left"><LinkIcon className="h-3 w-3"/> Referral ID: <span className="font-mono text-primary font-bold">{partner.id}</span></span>
                        </div>
                        <span className="italic text-left">Start free and scale with intelligence.</span>
                    </div>
                </CardFooter>
            )}
        </Card>
    );
};

const templates = {
    handshake: {
        subject: "The Digital Handshake: Free Access to the Industrial Brain",
        content: `
Hi [Partner Name],

The transport industry has long been held back by an "Information Divide." Large players have the data; smaller hauliers and vendors are left in the dark. Logistics Flow exists to break this constraint.

Registration is 100% free. Before we provide you with access to our forensic industrial registry or match you with our funding syndicate, we require a formal "Digital Handshake." This establishes a secure, POPI-compliant connection between your business and our industrial brain.

Establish your free account in 30 seconds here:
[Opt-in Link]

Why establish this foundation?
- Free Registry Access: Unlock the map to 22,000+ industry decision-makers.
- Synergy Matching: Proactive alerts for load matches and group savings.
- Digital Standing: Build a verified track record to unlock future capital.

Best regards,

The Logistics Flow Team
        `
    },
    intelligence: {
        subject: "Mapping the Industry: The Free Intelligence Advantage",
        content: `
Dear [Partner Name],

Information is the only true hedge against rising operating costs.

Registration for Logistics Flow is free. We have mapped the entire South African transport grid, cataloging every haulier, supplier, and lender into a forensic database.

Sign up for free now to unlock:
- Direct MD/CEO Contacts for 22,000+ records.
- AI-powered capacity matching to find the right work.
- Instant introductions to our 85+ specialized finance partners.

Access the registry for free here: [Sign-up Link]

Best regards,

[Your Name]
        `
    }
};

const tabs = [
    { value: "handshake", label: "0. Digital Handshake", icon: ShieldCheck },
    { value: "intelligence", label: "1. The Intelligence Pitch", icon: Zap },
];

export default function PartnerEmails({ partner }: { partner?: any }) {
    const { user } = useUser();
    const baseUrl = 'https://studio--ecosystem-hub.us-central1.hosted.app';
    
    const referralLink = React.useMemo(() => {
        if (!partner) return `${baseUrl}/join`;
        const firstName = partner.firstName || (partner.contactPerson ? partner.contactPerson.split(' ')[0] : '');
        const lastName = partner.lastName || (partner.contactPerson ? partner.contactPerson.split(' ').slice(1).join(' ') : '');
        return `${baseUrl}/join?ref=${partner.id}&firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}&email=${encodeURIComponent(partner.email || '')}`;
    }, [partner, baseUrl]);

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
