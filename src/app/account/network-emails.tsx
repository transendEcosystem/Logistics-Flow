
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardCopy, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React from 'react';
import { useUser } from '@/firebase';

const EmailTemplate = ({ subject, content, referralLink }: { subject: string, content: string, referralLink: string }) => {
    const { toast } = useToast();
    const formattedContent = content.replace('[Your Referral Link]', referralLink);

    const handleCopyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text.trim());
        toast({
            title: "Copied to Clipboard!",
            description: "You can now paste the content into your email client.",
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Email Template</CardTitle>
                <CardDescription>Subject: {subject}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="p-4 bg-muted/50 border rounded-md whitespace-pre-wrap font-mono text-sm max-h-96 overflow-y-auto">
                    {formattedContent.trim()}
                </div>
            </CardContent>
            <CardFooter>
                 <Button onClick={() => handleCopyToClipboard(formattedContent)}>
                    <ClipboardCopy className="mr-2 h-4 w-4" />
                    Copy Email Content
                </Button>
            </CardFooter>
        </Card>
    );
};

const templates = {
    intro: {
        subject: "Invitation to Join Logistics Flow",
        content: `
Hi [Lead Name],

I hope this email finds you well.

I'm reaching out to invite you to join Logistics Flow, a digital ecosystem built for transporters like us. It's designed to help us access capital, find more work, and reduce our operational costs.

I've been using it and think it could be really beneficial for your business.

You can sign up using my personal referral link: [Your Referral Link]

Let me know if you have any questions.

Best regards,

[Your Name]
        `
    },
    proposal: {
        subject: "How Logistics Flow Can Benefit Your Business",
        content: `
Hi [Lead Name],

Following up on my previous message, here's a bit more detail on what Logistics Flow offers:

- A Funding Division: Access to flexible finance solutions where traditional banks often can't help.
- A Network of Malls: Specialized marketplaces for parts, vehicles, and services with group-negotiated discounts.
- Powerful Tech Tools: Including an AI-powered system to match available trucks with freight loads, reducing empty miles.

By joining, you become part of a community that works together to lower costs and create new opportunities.

You can join using my personal link: [Your Referral Link]

Best regards,

[Your Name]
        `
    },
    revenue: {
        subject: "How You Can Earn with Logistics Flow",
        content: `
Hi [Lead Name],

One of the best parts about Logistics Flow is that you can earn recurring revenue just by helping the network grow.

Once you become a member, you also get your own referral link. When you invite other businesses and they sign up, you earn a percentage of their membership fees and a share of the revenue they generate on the platform.

It's a true partnership model where your earnings grow as you help build the community.

Sign up here to get started: [Your Referral Link]

Best regards,

[Your Name]
        `
    },
    explanation: {
        subject: "Your Network is Your Most Valuable Asset",
        content: `
Hi [Lead Name],

The transport industry thrives on relationships. You already have a network of transporters, suppliers, and contacts you've built over years. Logistics Flow provides the tools to turn those relationships into a revenue engine.

Think about it:
- Who do you buy parts from?
- Who do you subcontract loads to?
- Who asks you for advice on financing?

By introducing them to Logistics Flow—where they can get better pricing, find more work, or access capital—you are not only helping them, but you are also building your own business within our ecosystem.

Our platform handles the tracking, the transactions, and the payouts. Your job is to do what you already do best: connect people. We just provide the framework for you to get paid for it.

Ready to leverage your most valuable asset? Join here: [Your Referral Link]

Best regards,

[Your Name]
        `
    },
    howTo: {
        subject: "How to Use Your Network Dashboard",
        content: `
**Your Guide to Building and Managing Your Referral Network in Logistics Flow**

This guide explains how to use the "My Network" section of your account to invite new members and track your referral success.

**Step 1: Access Your Network Dashboard**
1.  Log in to your Logistics Flow account.
2.  From the main account dashboard, navigate to the "Sales" section in the sidebar and click on "My Network".
3.  This is your central hub for viewing all the members who have joined using your personal referral link.

**Step 2: Invite New Leads**
1.  Click the "Invite Lead" button. This will open WhatsApp on your device.
2.  A pre-written message containing your unique referral link will be ready to send. Your link will look something like this: \`https://[app-url]/join?ref=[your_company_id]\`.
3.  Send this message to any transporters, suppliers, or other businesses in your network who you think would benefit from Logistics Flow.
4.  **Important:** They MUST use this specific link for you to be credited as the referrer and earn commissions.

**Step 3: Track Your Referrals**
-   The "My Network" table displays all the companies that have signed up using your link.
-   **Status:** This is a key column.
    -   \`Pending\`: The user has signed up but has not yet purchased a paid membership.
    -   \`Active\`: The user has upgraded to a paid membership. You will now earn commission on their fees.
    -   \`Suspended\`: The account has been temporarily suspended.

By actively inviting new members and tracking their status, you can effectively build a recurring revenue stream. The more your network grows and engages with the platform, the more you earn.
        `
    }
};

const tabs = [
    { value: "intro", label: "1. Intro" },
    { value: "proposal", label: "2. Proposal" },
    { value: "revenue", label: "3. Revenue" },
    { value: "explanation", label: "4. Explanation" },
    { value: "howTo", label: "5. How To" },
];


export default function NetworkEmails() {
    const { user } = useUser();
    const baseUrl = 'https://studio--ecosystem-hub.us-central1.hosted.app';
    const referralLink = user?.companyId ? `${baseUrl}/join?ref=${user.companyId}` : `${baseUrl}/join`;

    return (
        <div className="space-y-8">
            <CardHeader className="px-0">
                <div className="flex items-center gap-4">
                    <Mail className="h-8 w-8 text-primary"/>
                    <div>
                        <CardTitle>Network Outreach Email Sequence</CardTitle>
                        <CardDescription>
                            Use these templates to introduce, propose, and explain the Logistics Flow opportunity to your network. Your personal referral link is automatically included.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <Tabs defaultValue="intro" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                   {tabs.map(tab => (
                       <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
                   ))}
                </TabsList>
                <TabsContent value="intro">
                    <EmailTemplate subject={templates.intro.subject} content={templates.intro.content} referralLink={referralLink} />
                </TabsContent>
                <TabsContent value="proposal">
                     <EmailTemplate subject={templates.proposal.subject} content={templates.proposal.content} referralLink={referralLink} />
                </TabsContent>
                <TabsContent value="revenue">
                     <EmailTemplate subject={templates.revenue.subject} content={templates.revenue.content} referralLink={referralLink} />
                </TabsContent>
                <TabsContent value="explanation">
                     <EmailTemplate subject={templates.explanation.subject} content={templates.explanation.content} referralLink={referralLink} />
                </TabsContent>
                 <TabsContent value="howTo">
                     <EmailTemplate subject={templates.howTo.subject} content={templates.howTo.content} referralLink={referralLink} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
