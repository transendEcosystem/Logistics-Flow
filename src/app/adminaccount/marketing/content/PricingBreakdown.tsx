'use client';

import React, { useMemo } from "react";

/**
 * THE PRICING BREAKDOWN
 * A clear, honest cost breakdown of the membership ladder — used when a prospect
 * asks "what does this actually cost?". Ordered Free -> Intelligence -> Transaction
 * -> Loyalty & Reward, with monthly/annual discount and no-cancellation-fee notes.
 */
export default function PricingBreakdown({ partner }: { partner?: any }) {
    const isValid = (val: any) => !!val && val !== 'N/A' && val !== 'null' && val !== 'None';

    const resolvedName = useMemo(() => {
        if (partner?.marketingManager?.name && isValid(partner.marketingManager.name)) return partner.marketingManager.name;
        if (partner?.ceo?.name && isValid(partner.ceo.name)) return partner.ceo.name;
        return partner?.firstName || partner?.contactPerson || 'Partner';
    }, [partner]);

    const firstName = resolvedName.split(' ')[0];
    const companyName = partner?.companyName || 'your business';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://logisticsflow.co.za';
    const pixelUrl = `${baseUrl}/api/trackEmailOpen/${partner?.id || 'anonymous'}`;

    const tiers = [
        {
            name: 'Free',
            price: 'R 0 / month + R10 once-off to own your record',
            description: 'Your entry point into the ecosystem. Get listed in the registry at no cost. For a once-off R10, you can claim and own your record — this activates the vouch and review mechanism, turning your listing into a verified, review-ready profile that transporters, suppliers, and finance companies can trust when they find you.',
        },
        {
            name: 'Intelligence',
            price: 'R 100 / month',
            description: 'Unlocks the data layer: unlimited registry search across 22,000+ verified records, direct MD/CEO contact reveals, and access to matched leads so you can see who to call and why — before you pay a cent to reach them. It also switches on your sales visibility — you receive verified leads directly, and you can see exactly who has clicked on and viewed your record in the registry, so you know who is interested before you even make contact.',
        },
        {
            name: 'Transaction',
            price: 'From R 275 / month',
            description: 'Unlocks your commercial profile and the transaction tools: receive direct requests for quotes from buyers ready to purchase, publish your shop or branch, apply for verified funding introductions, and sell directly into our transporter and finance registries — this is where deal-flow turns into revenue.',
        },
        {
            name: 'Loyalty & Reward',
            price: 'Earned, not paid',
            description: 'Not a fee — a rebate. As you contribute data, transact on the platform, and refer verified peers, you earn reward points that are deducted directly from your membership fees, reducing your Intelligence and Transaction costs by up to 50%.',
        },
    ];

    return (
        <div style={{ fontFamily: 'Calibri, sans-serif', fontSize: '12pt', color: '#000000', lineHeight: '1.4' }}>
            <p style={{ fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '2px solid #000000', paddingBottom: '4pt' }}>
                MEMBERSHIP & COST BREAKDOWN: {companyName.toUpperCase()}
            </p>
            <p>Good day {firstName}, thank you for asking for the detail — transparency on cost is important to us, so here is exactly how membership works, tier by tier.</p>

            {tiers.map((tier, idx) => (
                <div key={tier.name} style={{ margin: '15pt 0', padding: '12pt', backgroundColor: idx % 2 === 0 ? '#f8fafc' : '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6pt' }}>
                    <p style={{ margin: '0 0 4pt 0', fontWeight: 'bold', fontSize: '13pt' }}>
                        {idx + 1}. {tier.name} <span style={{ fontWeight: 'normal', color: '#475569' }}>— {tier.price}</span>
                    </p>
                    <p style={{ margin: 0 }}>{tier.description}</p>
                </div>
            ))}

            <p style={{ fontWeight: 'bold', marginTop: '20pt' }}>Monthly vs. Annual:</p>
            <p>Every paid tier can be billed monthly or annually. Choosing annual billing gives you a discount of up to 10% off the equivalent monthly cost, paid once upfront — the tier and included capabilities stay exactly the same either way, so it's simply a way to save if you'd rather not think about it every month.</p>

            <p style={{ fontWeight: 'bold', marginTop: '15pt' }}>No cancellation fees:</p>
            <p>There are no lock-in contracts and no cancellation fees on any tier. If a membership no longer suits {companyName}, you can downgrade or cancel at any time — you only ever pay for the period you've used.</p>

            <p style={{ marginTop: '20pt' }}>Happy to answer any follow-up questions on this by email.</p>
            <p style={{ marginTop: '20pt' }}>Regards,</p>
            <p><strong>The Logistics Flow Commercial Team</strong></p>
            <img src={pixelUrl} width="1" height="1" style={{ display: 'none' }} alt="" />
        </div>
    );
}
