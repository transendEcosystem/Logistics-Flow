'use client';

import React, { useMemo } from "react";

export default function CompanyProfile({ audience, partner }: { audience: string; partner?: any }) {
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
    const email = partner?.email || '';
    const companyName = partner?.companyName || 'your business';
    const aud = (audience || '').toLowerCase();

    const baseUrl = 'https://studio--ecosystem-hub.us-central1.hosted.app';
    const signupLink = `${baseUrl}/join?email=${encodeURIComponent(email)}&firstName=${encodeURIComponent(firstName)}&ref=${partner?.id || 'SYSTEM'}`;
    const pixelUrl = `${baseUrl}/api/trackEmailOpen/${partner?.id || 'anonymous'}`;

    const introText = useMemo(() => {
        if (aud === 'supplier' || aud === 'vendor') {
            return (
                <p>
                    As a supplier to the South African transport industry, the primary benefit of Logistics Flow for <strong>{companyName}</strong> is our ability to connect your business with high-intent buyers, automate your sales outreach, and ensure you get paid on time.
                </p>
            );
        }
        if (aud === 'transporter' || aud === 'haulier') {
            return (
                <p>
                    As a transport operator, the primary benefit of <strong>{companyName}</strong> joining Logistics Flow is immediate access to our database of <strong>24,000+ verified suppliers</strong> across <strong>22 input categories</strong> to buy tyres, fuel, and parts at direct discounts, paired with an online shop to <strong>sell your transport services</strong> directly to cargo owners.
                </p>
            );
        }
        return (
            <p>
                Logistics Flow is a Data-as-a-Service (DaaS) ecosystem designed to optimize the South African transport industry for companies like <strong>{companyName}</strong>. We provide the map and the tools to break the information constraints that prevent industrial growth.
            </p>
        );
    }, [aud, companyName]);

    return (
        <div style={{ fontFamily: 'Calibri, sans-serif', fontSize: '12pt', color: '#000000', lineHeight: '1.4' }}>
            <p style={{ fontWeight: 'bold', color: '#228B22', fontSize: '14pt', marginBottom: '5pt' }}>
                REGISTRATION IS 100% FREE
            </p>
            
            {/* TRUST SHIELD MODULE */}
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '12pt', borderRadius: '6pt', marginBottom: '15pt' }}>
                <p style={{ fontWeight: 'bold', fontSize: '9pt', color: '#64748b', textTransform: 'uppercase', margin: '0 0 4pt 0' }}>
                    🛡️ FORENSIC INTEGRITY NOTICE
                </p>
                <p style={{ fontSize: '9pt', margin: '0' }}>
                    This correspondence is issued by the Logistics Flow Engagement Division. We have verified <strong>{companyName}</strong> as a legitimate industry stakeholder. Our links are secure, unbranded, and mapped directly to your forensic profile.
                </p>
            </div>

            <p style={{ fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '2px solid #000000', paddingBottom: '4pt', marginBottom: '15pt' }}>
                INDUSTRIAL MEMO: THE DIGITALIZATION OF LOGISTICS FLOW
            </p>
            
            <p>Good day {firstName}, we write to formally introduce the Logistics Flow ecosystem to your business.</p>
            
            {introText}
            
            <p style={{ margin: '15pt 0', fontWeight: 'bold' }}>Our Pillars for Your Success:</p>
            <ul style={{ paddingLeft: '20pt' }}>
                <li style={{ marginBottom: '8pt' }}>
                    <strong>The Registry:</strong> A forensic database of 22,000+ verified transport and supply entities. Bypass gatekeepers and reach the MD/CEO directly.
                </li>
                <li style={{ marginBottom: '8pt' }}>
                    <strong>The Mall:</strong> Specialized marketplaces where you can list your digital branch or buy parts at "Syndicate" rates.
                </li>
                <li style={{ marginBottom: '8pt' }}>
                    <strong>The Capital:</strong> Real-world operational data from platform activity allows our funding division to finance your business where banks fail.
                </li>
            </ul>
            
            <p>You can activate your digital node for free and explore the grid via the link below:</p>
            <p style={{ marginTop: '10pt', padding: '10pt', backgroundColor: '#f0f0f0', borderRadius: '5pt' }}>
                <a href={signupLink} target="_blank" style={{ color: '#228B22', fontWeight: 'bold', textDecoration: 'none' }}>{signupLink}</a>
            </p>
            
            <p style={{ marginTop: '20pt' }}>Regards,</p>
            <p><strong>The Logistics Flow Team</strong></p>
            <img src={pixelUrl} width="1" height="1" style={{ display: 'none' }} alt="" />
        </div>
    );
}
