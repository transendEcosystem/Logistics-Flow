'use client';

import React, { useMemo } from "react";

export default function RevenueModel({ partner }: { partner?: any }) {
    const isValid = (val: any) => !!val && val !== 'N/A' && val !== 'null' && val !== 'None';

    const resolvedName = useMemo(() => {
        if (partner?.marketingManager?.name && isValid(partner.marketingManager.name)) return partner.marketingManager.name;
        if (partner?.ceo?.name && isValid(partner.ceo.name)) return partner.ceo.name;
        return partner?.firstName || partner?.contactPerson || 'Partner';
    }, [partner]);

    const firstName = resolvedName.split(' ')[0];
    const companyName = partner?.companyName || 'your business';
    const pixelUrl = `https://studio--ecosystem-hub.us-central1.hosted.app/api/trackEmailOpen/${partner?.id || 'anonymous'}`;

    return (
        <div style={{ fontFamily: 'Calibri, sans-serif', fontSize: '12pt', color: '#000000', lineHeight: '1.4' }}>
            <p style={{ fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '2px solid #000000', paddingBottom: '4pt' }}>
                REVENUE GENERATION & NETWORK MONETIZATION: {companyName.toUpperCase()}
            </p>
            <p>Good day {firstName}, your most valuable asset is the network you have built over years of operation. Logistics Flow provides the mechanism to turn those industry relationships into a passive revenue engine.</p>
            <p style={{ margin: '15pt 0', fontWeight: 'bold' }}>Primary Earning Streams:</p>
            <ul style={{ paddingLeft: '20pt' }}>
                <li style={{ marginBottom: '10pt' }}><strong>Annuity Membership Share:</strong> Earn a recurring percentage share of every monthly membership fee paid by your referrals.</li>
                <li style={{ marginBottom: '10pt' }}><strong>Transactional Commissions:</strong> Participate in the platform revenue whenever your network members buy tires, parts, or access finance.</li>
                <li style={{ marginBottom: '10pt' }}><strong>Value-Added Reselling:</strong> Offer high-demand services like RAF Assist or specialized liability cover directly to your contacts for immediate splits.</li>
            </ul>
            <p>This model ensures that as the ecosystem grows and your network engages, your profitability increases without a corresponding increase in operational effort.</p>
            <p style={{ marginTop: '20pt' }}>Regards,</p>
            <p><strong>The Logistics Flow Commercial Team</strong></p>
            <img src={pixelUrl} width="1" height="1" style={{ display: 'none' }} alt="" />
        </div>
    );
}