'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardCopy, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React from 'react';

const EmailTemplate = ({ subject, content }: { subject: string, content: string }) => {
    const { toast } = useToast();

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
                    {content.trim()}
                </div>
            </CardContent>
            <CardFooter>
                 <Button onClick={() => handleCopyToClipboard(content)}>
                    <ClipboardCopy className="mr-2 h-4 w-4" />
                    Copy Email Content
                </Button>
            </CardFooter>
        </Card>
    );
};

const templates = {
    intro: {
        subject: "Partnership Opportunity with Logistics Flow",
        content: `
Dear [Partner Name],

I hope this email finds you well.

My name is [Your Name], and I'm reaching out from Logistics Flow. We've developed a comprehensive digital ecosystem specifically for the transport industry, designed to solve the key challenges transporters face every day: accessing capital, finding work, and reducing operational costs.

Would you be open to a brief chat next week to explore how a partnership could be mutually beneficial?

Best regards,

[Your Name]
        `
    },
    proposal: {
        subject: "Following Up: The Logistics Flow Partnership Proposal",
        content: `
Dear [Partner Name],

Following up on our brief chat, here is a bit more detail on what a partnership with Logistics Flow entails.

What is Logistics Flow?

An all-in-one platform that brings together:
- A Funding Division: Flexible finance solutions where traditional banks often can't.
- A Network of Malls: Specialized marketplaces for parts, vehicles, and services with group-negotiated discounts.
- A Value-Added Marketplace: We provide essential third-party products, like the Mahala Hub for drivers, which offers benefits and rewards.
- Powerful Tech Tools: Including an AI-powered system to match available trucks with freight loads.

What we want from a partner:
- To introduce Logistics Flow to your network of transporters and suppliers.
- To act as an ambassador for our mission to empower transport businesses.

What we will give you in return:
- A Free Lifetime Premium Membership.
- A Recurring Revenue Stream: Earn a significant, recurring commission on all membership and subscription fees from every member you bring into the network.
- Transactional Revenue Share: Earn a share of the revenue Logistics Flow generates from your network's activity across our Finance and Supplier Malls.

This is a true business partnership where your earnings grow with your network's activity.

I would be delighted to schedule a more detailed call to walk you through the platform and the commission structure.

Best regards,

[Your Name]
        `
    },
    revenue: {
        subject: "How the Logistics Flow Partnership Revenue Works",
        content: `
Dear [Partner Name],

Thanks for your interest. Here’s a simple explanation of how our partnership model creates value for you:

1. Recurring Subscription Revenue:
You earn a [X%] share of all membership fees from every member you refer. It's a recurring annuity for as long as they remain a member.

2. Transactional Commission:
Your earnings grow as your network uses the platform.
- Finance Mall: When a member from your network finances a truck, you get a [Y%] share of our origination fee.
- Supplier Mall: When your network buys parts, you get a [Z%] share of our commission.
- Marketplace Products: You get a [W%] share of our commission on every value-added product (like RAF Assist or Mahala Hub subscriptions) sold to your network.

This multi-stream approach ensures your income grows exponentially as your network's activity on our platform increases.

Let me know if you have any questions.

Best regards,

[Your Name]
        `
    },
    explanation: {
        subject: "Your Network is Your Asset - Here's Why",
        content: `
Hi [Partner Name],

Let's talk about the core of this partnership: your network.

The transport industry thrives on relationships. You already have a network of transporters, suppliers, and contacts that you've built over years. Logistics Flow provides the tools to turn those relationships into a powerful, automated revenue engine.

Think about it:
- Who do you buy parts from?
- Who do you subcontract loads to?
- Who asks you for advice on financing?

Every one of these interactions is an opportunity. By introducing them to Logistics Flow—where they can get better pricing, find more work, or access capital—you are not only helping them, but you are also building your own business within our ecosystem.

Our platform handles the tracking, the transactions, and the payouts. Your job is to do what you already do best: connect people and solve problems. We just provide the framework for you to get paid for it.

Ready to leverage your most valuable asset?

Best regards,

[Your Name]
        `
    },
    howTo: {
        subject: "User Manual: Managing Your Network",
        content: `
**Your Guide to Building and Managing Your Referral Network in Logistics Flow**

This guide explains how to use the "My Network" section of your account to invite new members and track your referral success.

**Step 1: Access Your Network Dashboard**
1.  Log in to your Logistics Flow account.
2.  From the main account dashboard, navigate to the "Sales" section in the sidebar and click on "Network".
3.  This is your central hub for viewing all the members who have joined using your personal referral link.

**Step 2: Invite New Leads**
1.  Click the "Invite Lead" button. This will open WhatsApp on your device.
2.  A pre-written message containing your unique referral link will be ready to send. Your link will look something like this: \`https://[app-url]/join?ref=[your_company_id]\`.
3.  Send this message to any transporters, suppliers, or other businesses in your network who you think would benefit from Logistics Flow.
4.  **Important:** They MUST use this specific link for you to be credited as the referrer and earn commissions.

**Step 3: Track Your Referrals**
-   The "My Network" table displays all the companies that have signed up using your link.
-   **Member Name & Email:** Shows the details of the primary contact who registered.
-   **Company Name:** The name of the business they registered.
-   **Membership:** Shows their current membership plan (e.g., Free, Standard, Premium).
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


export default function PartnerEmailSequence() {
    return (
        <div className="space-y-8">
            <CardHeader className="px-0">
                <div className="flex items-center gap-4">
                    <Mail className="h-8 w-8 text-primary"/>
                    <div>
                        <CardTitle>Partner Email Sequence</CardTitle>
                        <CardDescription>
                            Use these templates to introduce, propose, and explain the Logistics Flow partnership opportunity.
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
                    <EmailTemplate subject={templates.intro.subject} content={templates.intro.content} />
                </TabsContent>
                <TabsContent value="proposal">
                     <EmailTemplate subject={templates.proposal.subject} content={templates.proposal.content} />
                </TabsContent>
                 <TabsContent value="revenue">
                    <EmailTemplate subject={templates.revenue.subject} content={templates.revenue.content} />
                </TabsContent>
                <TabsContent value="explanation">
                    <EmailTemplate subject={templates.explanation.subject} content={templates.explanation.content} />
                </TabsContent>
                 <TabsContent value="howTo">
                     <EmailTemplate subject={templates.howTo.subject} content={templates.howTo.content} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
