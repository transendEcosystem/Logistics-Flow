'use client';

import React, { useMemo } from "react";

/**
 * THE ELITE FILTER: Negative CTA & Elite Positioning
 */
export default function TheEliteFilter({ partner }: { partner?: any }) {
    const isValid = (val: any) => {
        if (!val) return false;
        const v = String(val).trim().toLowerCase();
        const forbidden = ['n/a', 'null', 'none', 'locked', 'undefined', '[locked]', 'no email', 'no phone', 'pending', 'h', 'x'];
        return v.length > 1 && !forbidden.includes(v);
    };

    const resolvedName = useMemo(() => {
        // --- V13 RESOLUTION: PRIORITIZE ACCOUNT LEAD ---
        const primaryRole = partner?.primaryContactRole;
        const primaryContact = primaryRole ? partner[primaryRole] : null;
        if (primaryContact?.name && isValid(primaryContact.name)) return primaryContact.name;

        if (partner?.marketingManager?.name && isValid(partner.marketingManager.name)) return partner.marketingManager.name;
        if (partner?.ceo?.name && isValid(partner.ceo.name)) return partner.ceo.name;
        return (partner?.firstName && isValid(partner.firstName)) ? partner.firstName : 'Partner';
    }, [partner]);

    const firstName = resolvedName.split(' ')[0];
    const companyName = partner?.companyName || 'your business';
    const pixelUrl = `https://studio--ecosystem-hub.us-central1.hosted.app/api/trackEmailOpen/${partner?.id || 'anonymous'}`;
    const optInLink = `https://studio--ecosystem-hub.us-central1.hosted.app/opt-in/${partner?.id || 'TEST'}`;

    return (
        <div style={{ fontFamily: 'Calibri, sans-serif', fontSize: '12pt', color: '#000000', lineHeight: '1.4' }}>
            <p style={{ fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '2px solid #000000', paddingBottom: '4pt', marginBottom: '15pt' }}>
                INTERNAL MEMO: ISA AUTHORIZATION CRITERIA
            </p>
            
            <p>Good day {firstName},</p>
            
            <p>We are reaching out to <strong>{companyName}</strong> regarding a potential appointment as an <strong>Authorized Independent Sales Agent (ISA)</strong>. However, it is important to be clear: <strong>Logistics Flow is not for everyone.</strong></p>
            
            <p style={{ margin: '15pt 0' }}>
                We are not looking for "affiliates" or general referrers. We are looking for <strong>Industrial Enablers</strong>—individuals or businesses with an active, high-trust network of at least 50 transport stakeholders. 
            </p>
            
            <p style={{ fontWeight: 'bold' }}>Do not apply if:</p>
            <ul style={{ paddingLeft: '20pt' }}>
                <li style={{ marginBottom: '5pt' }}>You do not have a direct line to CEO/MD level decision-makers.</li>
                <li style={{ marginBottom: '5pt' }}>You are looking for a "get-rich-quick" referral scheme.</li>
                <li style={{ marginBottom: '5pt' }}>You are unwilling to help "heal" the registry with verified data.</li>
            </ul>
            
            <p style={{ marginTop: '15pt' }}>
                If, however, you want to own a piece of the industrial grid and build a multi-stream annuity based on the digitalization of South African logistics, we are ready to grant you authorization.
            </p>
            
            <p style={{ marginTop: '20pt', textAlign: 'center' }}>
                <a href={optInLink} target="_blank" style={{ color: '#228B22', fontWeight: 'bold', fontSize: '13pt' }}>
                    Request ISA Authorization Audit &rarr;
                </a>
            </p>
            
            <p style={{ marginTop: '20pt' }}>
                Regards,<br />
                <strong>The Logistics Flow Team</strong>
            </p>
            <img src={pixelUrl} width="1" height="1" style={{ display: 'none' }} alt="" />
        </div>
    );
}
