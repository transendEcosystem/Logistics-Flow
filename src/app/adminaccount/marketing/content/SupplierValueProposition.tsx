'use client';

import React, { useMemo } from "react";

export default function SupplierValueProposition({ partner }: { partner?: any }) {
    const isValid = (val: any) => {
        if (!val) return false;
        const v = String(val).trim().toLowerCase();
        const forbidden = ['n/a', 'null', 'none', 'locked', 'undefined', '[locked]', 'no email', 'no phone', 'pending', 'h', 'x'];
        return v.length > 1 && !forbidden.includes(v);
    };

    const resolvedName = useMemo(() => {
        const primaryRole = partner?.primaryContactRole;
        const primaryContact = primaryRole ? partner[primaryRole] : null;
        if (primaryContact?.name && isValid(primaryContact.name)) return primaryContact.name;

        if (partner?.marketingManager?.name && isValid(partner.marketingManager.name)) return partner.marketingManager.name;
        if (partner?.ceo?.name && isValid(partner.ceo.name)) return partner.ceo.name;
        if (partner?.contactPerson && isValid(partner.contactPerson)) return partner.contactPerson;
        if (partner?.contact_person && isValid(partner.contact_person)) return partner.contact_person;
        return (partner?.firstName && isValid(partner.firstName)) ? partner.firstName : 'Valued Supplier';
    }, [partner]);

    const firstName = resolvedName.split(' ')[0];
    const companyName = partner?.companyName || 'your business';
    
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://studio--ecosystem-hub.us-central1.hosted.app';
    const optInLink = `${baseUrl}/opt-in/${partner?.id || 'PROSPECT'}`;
    const pixelUrl = `${baseUrl}/api/trackEmailOpen/${partner?.id || 'anonymous'}`;

    return (
        <div style={{ fontFamily: 'Calibri, sans-serif', fontSize: '12pt', color: '#000000', lineHeight: '1.5' }}>
            {/* HEADER BADGE */}
            <p style={{ fontWeight: 'bold', color: '#228B22', fontSize: '15pt', marginBottom: '8pt', textTransform: 'uppercase' }}>
                SUPPLIER GROWTH ENGINE: 5,400+ VERIFIED BUYERS
            </p>
            
            <p>Good day {firstName},</p>
            
            <p style={{ marginTop: '10pt' }}>
                We are reaching out to share how Logistics Flow enables suppliers like <strong>{companyName}</strong> to accelerate sales velocity, capture market share, and eliminate credit risk across Southern Africa's transport sector.
            </p>

            {/* POINT 1: VERIFIED REGISTRY */}
            <div style={{ backgroundColor: '#f0fdf4', borderLeft: '4px solid #228B22', padding: '12pt 15pt', margin: '15pt 0', borderRadius: '4pt' }}>
                <p style={{ fontWeight: 'bold', color: '#166534', margin: '0 0 4pt 0', fontSize: '11pt', textTransform: 'uppercase' }}>
                    1. Verified Market Intelligence & Reach
                </p>
                <p style={{ margin: '0', color: '#15803d', fontSize: '10.5pt' }}>
                    Logistics Flow maintains a live, forensically verified registry of over <strong>5,400+ transport and fleet operating companies</strong> across Southern Africa. You can search and filter this database by fleet size, location, and operational requirements.
                </p>
            </div>

            {/* POINT 2: THE 3 PILLARS OF THE APPLICATION */}
            <p style={{ marginTop: '15pt', fontWeight: 'bold' }}>
                2. The 3 Pillars of the Logistics Flow Application
            </p>
            <p style={{ marginTop: '4pt' }}>
                To connect your business directly to this active buyer base, our platform operates across three simple, non-technical pillars:
            </p>

            <div style={{ margin: '12pt 0' }}>
                {/* PILLAR 1: VERIFIED MARKET INTELLIGENCE & REACH */}
                <div style={{ marginBottom: '14pt', backgroundColor: '#f8fafc', padding: '12pt 15pt', borderRadius: '6pt', border: '1px solid #e2e8f0' }}>
                    <p style={{ fontWeight: 'bold', color: '#0f172a', margin: '0 0 4pt 0', fontSize: '11pt' }}>
                        🔹 1. Verified Market Intelligence & Reach (Search & Unlock Leads)
                    </p>
                    <p style={{ margin: '0', color: '#334155', fontSize: '10.5pt', lineHeight: '1.5' }}>
                        Using our simple search portal, you can filter and explore our complete registry of 5,400+ transport companies. When you identify a fleet matching your target profile, you unlock the record—transferring complete contact and fleet profile information directly into your secure member portal as an active, verified, high-intent lead.
                    </p>
                </div>

                {/* PILLAR 2: SECURE TRANSACTIONS & DIRECT SALES */}
                <div style={{ marginBottom: '14pt', backgroundColor: '#f8fafc', padding: '12pt 15pt', borderRadius: '6pt', border: '1px solid #e2e8f0' }}>
                    <p style={{ fontWeight: 'bold', color: '#0f172a', margin: '0 0 4pt 0', fontSize: '11pt' }}>
                        🔹 2. Secure Transactions & Direct Sales (Online Shop & Wallet-Backed Sales)
                    </p>
                    <p style={{ margin: '0', color: '#334155', fontSize: '10.5pt', lineHeight: '1.5' }}>
                        List and sell your products, tyres, fuel, parts, and services directly through our built-in online shop. Transport buyers purchase directly using pre-funded digital wallets, completely eliminating the stress, delays, and risks of non-payment or bad debt.
                    </p>
                </div>

                {/* PILLAR 3: ANONYMIZED DATA & MACHINE LEARNING */}
                <div style={{ marginBottom: '14pt', backgroundColor: '#f8fafc', padding: '12pt 15pt', borderRadius: '6pt', border: '1px solid #e2e8f0' }}>
                    <p style={{ fontWeight: 'bold', color: '#0f172a', margin: '0 0 4pt 0', fontSize: '11pt' }}>
                        🔹 3. Anonymized Data & Machine Learning (Internal Platform Intelligence)
                    </p>
                    <p style={{ margin: '0', color: '#334155', fontSize: '10.5pt', lineHeight: '1.5' }}>
                        This deeper layer tracks broader platform activity and procurement trends strictly in an anonymized format. This data is never exposed to external parties or competitors—it is used exclusively by our internal machine learning tools designed to help the platform deliver better matching and enhanced services to you.
                    </p>
                </div>
            </div>

            {/* SYNTHESIS: BREAKING BUSINESS CONSTRAINTS */}
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '14pt 16pt', borderRadius: '8pt', margin: '18pt 0' }}>
                <p style={{ fontWeight: 'bold', color: '#166534', margin: '0 0 6pt 0', fontSize: '11pt', textTransform: 'uppercase' }}>
                    🚀 Breaking Known Business Constraints
                </p>
                <p style={{ margin: '0', color: '#15803d', fontSize: '10.5pt', lineHeight: '1.5' }}>
                    When <strong>Verified Market Intelligence, Secure Transactions, and Anonymized Data</strong> work together, they deliver a simple yet powerful growth solution. By combining instant lead unlocking, wallet-backed shop sales, and internal machine learning, Logistics Flow systematically breaks the major constraints holding back suppliers: endless cold calling, payment delays, bad debt, and high acquisition costs.
                </p>
            </div>

            {/* CALL TO ACTION */}
            <p style={{ margin: '20pt 0', padding: '15pt', border: '2px dashed #228B22', borderRadius: '10pt', backgroundColor: '#f9fff9', textAlign: 'center' }}>
                <strong>Establish your FREE standing in the supplier registry to unlock direct deal-flow:</strong><br />
                <a href={optInLink} target="_blank" rel="noreferrer" style={{ color: '#228B22', fontWeight: 'bold', fontSize: '13pt', textDecoration: 'underline' }}>{optInLink}</a>
            </p>

            <p style={{ marginTop: '20pt' }}>Regards,</p>
            <p><strong>The Logistics Flow Team</strong></p>
            <img src={pixelUrl} width="1" height="1" style={{ display: 'none' }} alt="" />
        </div>
    );
}
