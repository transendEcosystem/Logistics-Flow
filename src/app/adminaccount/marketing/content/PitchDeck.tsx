'use client';

import React, { useMemo } from "react";

export default function PitchDeck({ partner }: { partner?: any }) {
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
                STRATEGIC PROPOSAL FOR {companyName.toUpperCase()}
            </p>
            <p>We have identified <strong>{companyName}</strong> as a foundational stakeholder in the Logistics Flow ecosystem. This proposal outlines the personalized roadmap for your business to achieve exponential growth through digital collaboration.</p>
            <p style={{ margin: '15pt 0', fontWeight: 'bold' }}>Executive Summary:</p>
            <ul style={{ paddingLeft: '20pt' }}>
                <li style={{ marginBottom: '8pt' }}><strong>The Foundation:</strong> Granting your business a Free Lifetime Premium Membership to ensure full access to all platform tools.</li>
                <li style={{ marginBottom: '8pt' }}><strong>The Strategy:</strong> Digitalizing your existing haulier and supplier contacts to create a high-velocity commercial network.</li>
                <li style={{ marginBottom: '8pt' }}><strong>The Upside:</strong> Unlocking multiple recurring and transactional revenue streams that scale with your network activity.</li>
            </ul>
            <p>We believe {companyName} is uniquely positioned to turn its current operational footprint into a powerful digital asset.</p>
            <p style={{ marginTop: '20pt' }}>Regards,</p>
            <p><strong>The Logistics Flow Growth Strategy Team</strong></p>
            <img src={pixelUrl} width="1" height="1" style={{ display: 'none' }} alt="" />
        </div>
    );
}