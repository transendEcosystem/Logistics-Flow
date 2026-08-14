
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { UserCheck, ShieldCheck, Zap, Share2, Video, MousePointer2, Handshake, MessageSquare, AtSign } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React from 'react';
import { useUser } from '@/firebase';

const EmailTemplate = ({ subject, content, partner, referralLink }: { subject: string, content: string, partner: any, referralLink: string }) => {
    const personalizedContent = React.useMemo(() => {
        let text = content;
        
        // RESILIENT NAME EXTRACTION
        const name = partner?.firstName || 
                     partner?.contactPerson?.split(' ')[0] || 
                     partner?.contact_person?.split(' ')[0] || 
                     'Creator';
        
        text = text.replace(/\[Associate Name\]/g, name);
        text = text.replace(/\[Referral Link\]/g, referralLink);
        
        // Ensure the opt-in link carries the associate role for automated tagging
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://studio--ecosystem-hub.us-central1.hosted.app';
        const optInUrl = `${baseUrl}/opt-in/${partner?.id || 'TEST'}?role=associate`;
        
        text = text.replace(/\[Opt-in Link\]/g, optInUrl);
        text = text.replace(/\[Decline Link\]/g, `${baseUrl}/api/recordConsent?partnerId=${partner?.id || 'TEST'}&status=declined`);

        return text;
    }, [content, partner, referralLink]);

    return (
        <Card className="border-none shadow-none bg-transparent text-left">
            <CardHeader className="px-0 text-left">
                <div className="flex items-center justify-between text-left">
                    <div className="text-left">
                        <CardTitle className="text-lg text-left text-foreground font-black uppercase tracking-tight">Email Subject</CardTitle>
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
                <div className="p-8 bg-white border-2 border-dashed rounded-xl whitespace-pre-wrap font-sans text-sm shadow-inner min-h-[300px] text-left text-foreground leading-relaxed">
                    {personalizedContent.trim()}
                </div>
            </CardContent>
            {partner && (
                <CardFooter className="px-0 pt-4 border-t mt-4 text-[10px] text-muted-foreground italic text-left uppercase font-black tracking-widest">
                    FORENSIC PARTNERSHIP HANDSHAKE: BINARY INTENT MODEL (ROLE: ASSOCIATE)
                </CardFooter>
            )}
        </Card>
    );
};

const templates = {
    'platform-dm': {
        subject: "Curiosity Script: Plan B (Social DM)",
        content: `
Hi [Associate Name], Michael here, owner of Logistics Flow. 

Love your content. We're launching a strategic partner program for SA transport creators—offering free 4K AI Studio access & 30% recurring splits. I've already established your node in our industrial registry.

Interested in the details? Let's establish the handshake here:
[Opt-in Link]
        `
    },
    'strategic-intro': {
        subject: "Strategic Partnership: [Associate Name] x Logistics Flow",
        content: `
Good day [Associate Name],

My name is Michael Koton, I am the owner of Logistics Flow. I am reaching out to form a strategic relationship with you.

**Who we are:** We have built the "Industrial Brain" of South Africa's Logistics sector which includes a high-fidelity digital grid that maps over 22,000 suppliers, 5000 transporters and 4000 Financiers. Our app enables our members to transact with one another directly in a closed loop.

**Why I am reaching out:** We have identified your creative influence as a perfect match for our ecosystem. We are looking to establish a formal partnership with you to generate exposure for the platform.

**What you get:**
- **Free membership.** Valued at R6,000 p.a.
- **Content Studio:** Unrestricted access to our cinematic video generators.
- **Social Studio:** Enabling tracked posts to social networks.
- **My Network:** Tracking of your network growth and revenue generated.
- **The Annuity Layer:** Earn 30% recurring share on all membership fees directly into your wallet.

**Are you interested in exploring this?**

[   ] **YES**, I am interested. Let's establish the handshake:
[Opt-in Link]

[   ] **NO**, I am not interested at this time:
[Decline Link]

Best regards,

Michael Koton
Owner, Logistics Flow
        `
    },
    'creative-tech': {
        subject: "Empower Your Content: Unlock the 4K AI Industrial Studio",
        content: `
Hi [Associate Name],

The South African transport industry is shifting to the digital grid, and your audience is the most valuable asset in this transition.

We are inviting you to join Logistics Flow as an **Authorized Digital Associate**. Unlike standard memberships, your access to the platform is **100% Free**.

By establishing your handshake today, you unlock:
1. **Free AI Content Studio:** Get unrestricted access to our 4K video and image generators. Produce professional cinematic industrial content for your channels for free.
2. **Yield-Based Earnings:** We don't just pay for sales. We pay for the "Flow." Track every click you generate.

Establish your creative standing and unlock the Studio here:
[Opt-in Link]

Best regards,

The Logistics Flow Team
        `
    },
    'revenue-yield': {
        subject: "The Revenue Model: Clicks, Handshakes, and Recurring Annuity",
        content: `
Hi [Associate Name],

Let's talk about the revenue model. As a Digital Associate, you are an owner of the flow.

How you earn:
- **Click Dividend:** We track every unique lead that lands on the platform via your content.
- **Handshake Bounty:** Earn a direct payout for every business that establishes their free digital node through your referral.
- **Recurring Annuity:** Earn a 30% share of every monthly membership fee paid by your network for the lifetime of their account.

By using our **AI Studio**, you can create high-converting visuals that drive this flow at zero production cost to you.

Establish your node and start building your annuity: [Opt-in Link]

Best regards,

Michael Koton
        `
    }
};

const tabs = [
    { value: "strategic-intro", label: "0. Strategic Intro", icon: Handshake },
    { value: "platform-dm", label: "0. Platform DM Script", icon: MessageSquare },
    { value: "creative-tech", label: "1. Creative Tech Hook", icon: Video },
    { value: "revenue-yield", label: "2. Revenue & Yield", icon: MousePointer2 },
];


export default function AssociateEmails({ partner }: { partner?: any }) {
    const { user } = useUser();
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://studio--ecosystem-hub.us-central1.hosted.app';

    const referralLink = React.useMemo(() => {
        if (!partner) return `${baseUrl}/join?role=associate`;
        return `${baseUrl}/join?ref=${partner.id}&role=associate`;
    }, [partner, baseUrl]);

    return (
        <div className="space-y-6 text-left text-foreground">
            <Tabs defaultValue="strategic-intro" className="w-full text-left">
                <TabsList className="h-auto flex-wrap justify-start bg-muted/30 text-left">
                   {tabs.map(tab => (
                       <TabsTrigger key={tab.value} value={tab.value} className="text-xs gap-2 py-2.5 px-4 font-bold uppercase tracking-widest text-[10px]">
                           <tab.icon className="h-3.5 w-3.5" />
                           {tab.label}
                       </TabsTrigger>
                   ))}
                </TabsList>
                {Object.entries(templates).map(([key, t]) => (
                    <TabsContent key={key} value={key} className="mt-6 text-left">
                        <EmailTemplate 
                            subject={t.subject} 
                            content={t.content} 
                            partner={partner} 
                            referralLink={referralLink}
                        />
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
