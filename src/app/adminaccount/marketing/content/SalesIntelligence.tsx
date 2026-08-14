'use client';

import React, { useMemo } from "react";

export default function SalesIntelligence({ partner }: { partner?: any }) {
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
        if (partner?.contactPerson && isValid(partner.contactPerson)) return partner.contactPerson;
        if (partner?.contact_person && isValid(partner.contact_person)) return partner.contact_person;
        return (partner?.firstName && isValid(partner.firstName)) ? partner.firstName : 'Member';
    }, [partner]);

    const firstName = resolvedName.split(' ')[0];
    const companyName = partner?.companyName || 'your business';
    
    const baseUrl = 'https://studio--ecosystem-hub.us-central1.hosted.app';
    const signupLink = `${baseUrl}/join?email=${encodeURIComponent(partner?.email || '')}&firstName=${encodeURIComponent(firstName)}&ref=${partner?.id || 'SYSTEM'}`;
    const pixelUrl = `${baseUrl}/api/trackEmailOpen/${partner?.id || 'anonymous'}`;

    return (
        <div style={{ fontFamily: 'Calibri, sans-serif', fontSize: '12pt', color: '#000000', lineHeight: '1.4' }}>
            <p style={{ fontWeight: 'bold', color: '#228B22', fontSize: '14pt', marginBottom: '5pt' }}>
                MONETIZING INBOUND DEMAND
            </p>
            
            <p style={{ fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '2px solid #000000', paddingBottom: '4pt', marginBottom: '15pt' }}>
                STRATEGIC MEMO: THE SALES INTELLIGENCE MECHANISM
            </p>
            
            <p>Good day {firstName},</p>
            
            <p>The primary benefit of <strong>{companyName}</strong> establishing a digital standing in the Logistics Flow registry is the activation of our <strong>Inbound Interest Ledger</strong>.</p>
            
            <p>Our platform doesn't just list your capacity; it monitors high-intent engagement. Every time an industrial decision-maker—be it a transporter looking for spares or a shipper looking for a fleet—selects your profile to engage, our system logs a forensic ping.</p>
            
            <p style={{ margin: '15pt 0', fontWeight: 'bold' }}>How this transforms your sales profile:</p>
            <ul style={{ paddingLeft: '20pt' }}>
                <li style={{ marginBottom: '8pt' }}>
                    <strong>Blind Lead Capture:</strong> Even before you are a paying member, we record the interest your profile generates.
                </li>
                <li style={{ marginBottom: '8pt' }}>
                    <strong>High-Intent Signals:</strong> These aren't just views; these are "Select to Engage" actions by verified industry peers.
                </li>
                <li style={{ marginBottom: '8pt' }}>
                    <strong>Conversion Transparency:</strong> Upon activating your Intelligence Access, these blind leads are revealed, giving you a direct list of companies currently seeking your services.
                </li>
            </ul>
            
            <p>We are currently recording interest in <strong>{companyName}</strong>. Activate your free node today to start monitoring the demand yield on your professional profile.</p>
            
            <p style={{ marginTop: '15pt', padding: '12pt', backgroundColor: '#f9f9f9', borderRadius: '5pt', border: '1px solid #ddd', textAlign: 'center' }}>
                <strong>Activate Your Free Sales Node Here:</strong><br />
                <a href={signupLink} target="_blank" style={{ color: '#228B22', fontWeight: 'bold', textDecoration: 'none', fontSize: '13pt' }}>{signupLink}</a>
            </p>
            
            <p style={{ marginTop: '20pt' }}>Regards,</p>
            <p><strong>The Logistics Flow Team</strong></p>
            <img src={pixelUrl} width="1" height="1" style={{ display: 'none' }} alt="" />
        </div>
    );
}
