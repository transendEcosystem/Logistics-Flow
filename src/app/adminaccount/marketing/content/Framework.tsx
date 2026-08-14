'use client';

import React, { useMemo } from "react";

export default function Framework({ partner }: { partner?: any }) {
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
                PARTNERSHIP FRAMEWORK: {companyName.toUpperCase()}
            </p>
            <p>This framework defines the strategic objective and commercial parameters for our partnership with {companyName}.</p>
            <p style={{ marginTop: '15pt', fontWeight: 'bold' }}>Our Objective:</p>
            <p>To provide {companyName} with the tools and incentives to digitize your existing network, leveraging collective data to unlock funding, savings, and new revenue streams for every participant.</p>
            <p style={{ marginTop: '15pt', fontWeight: 'bold' }}>Commercial Structure:</p>
            <ul style={{ paddingLeft: '20pt' }}>
                <li style={{ marginBottom: '8pt' }}><strong>Annuity Membership Share:</strong> Recurring participation in monthly referral fees.</li>
                <li style={{ marginBottom: '8pt' }}><strong>Mall Transactional Share:</strong> Participation in Mall commissions (Supplier, Finance, etc.).</li>
                <li style={{ marginBottom: '8pt' }}><strong>Data & Origination Credits:</strong> Rewards for high-quality registry contributions.</li>
            </ul>
            <p>This framework ensures that our success is directly tied to the growth and efficiency of {companyName}.</p>
            <p style={{ marginTop: '20pt' }}>Regards,</p>
            <p><strong>The Logistics Flow Management Team</strong></p>
            <img src={pixelUrl} width="1" height="1" style={{ display: 'none' }} alt="" />
        </div>
    );
}