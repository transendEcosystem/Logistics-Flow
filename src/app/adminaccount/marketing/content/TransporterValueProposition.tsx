'use client';

import React, { useMemo } from "react";

export default function TransporterValueProposition({ partner }: { partner?: any }) {
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
        return (partner?.firstName && isValid(partner.firstName)) ? partner.firstName : 'Fleet Operator';
    }, [partner]);

    const firstName = resolvedName.split(' ')[0];
    const companyName = partner?.companyName || 'your transport business';
    
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://studio--ecosystem-hub.us-central1.hosted.app';
    const optInLink = `${baseUrl}/opt-in/${partner?.id || 'PROSPECT'}`;
    const pixelUrl = `${baseUrl}/api/trackEmailOpen/${partner?.id || 'anonymous'}`;

    return (
        <div style={{ fontFamily: 'Calibri, sans-serif', fontSize: '12pt', color: '#000000', lineHeight: '1.5' }}>
            {/* HEADER BADGE */}
            <p style={{ fontWeight: 'bold', color: '#228B22', fontSize: '15pt', marginBottom: '8pt', textTransform: 'uppercase' }}>
                TRANSPORTER SAVINGS & SALES ENGINE: 24,000+ SUPPLIERS & DIRECT FREIGHT SALES
            </p>
            
            <p>Good day {firstName},</p>
            
            <p style={{ marginTop: '10pt' }}>
                We are reaching out to share how Logistics Flow enables transport operators and fleet owners like <strong>{companyName}</strong> to dramatically reduce fleet running costs, source discounted inputs, and sell transport services directly to verified cargo buyers.
            </p>

            {/* POINT 1: VERIFIED SUPPLIER REGISTRY */}
            <div style={{ backgroundColor: '#f0fdf4', borderLeft: '4px solid #228B22', padding: '12pt 15pt', margin: '15pt 0', borderRadius: '4pt' }}>
                <p style={{ fontWeight: 'bold', color: '#166534', margin: '0 0 4pt 0', fontSize: '11pt', textTransform: 'uppercase' }}>
                    1. 24,000+ Verified Supplier Database Across 22 Input Categories
                </p>
                <p style={{ margin: '0', color: '#15803d', fontSize: '10.5pt' }}>
                    Logistics Flow maintains a live, forensically verified database of over <strong>24,000+ industrial suppliers and service vendors</strong> across <strong>22 operational input categories</strong>—including tyres, fuel/diesel, spare parts, vehicle maintenance, lubricants, fleet tracking, asset insurance, and breakdown recovery.
                </p>
            </div>

            {/* POINT 2: THE 3 PILLARS OF THE APPLICATION */}
            <p style={{ marginTop: '15pt', fontWeight: 'bold' }}>
                2. The 3 Pillars of the Logistics Flow Application for Transporters
            </p>
            <p style={{ marginTop: '4pt' }}>
                To optimize your fleet operations and maximize profitability, our platform operates across three simple, non-technical pillars:
            </p>

            <div style={{ margin: '12pt 0' }}>
                {/* PILLAR 1: VERIFIED MARKET INTELLIGENCE & REACH */}
                <div style={{ marginBottom: '14pt', backgroundColor: '#f8fafc', padding: '12pt 15pt', borderRadius: '6pt', border: '1px solid #e2e8f0' }}>
                    <p style={{ fontWeight: 'bold', color: '#0f172a', margin: '0 0 4pt 0', fontSize: '11pt' }}>
                        🔹 1. Verified Market Intelligence & Reach (BUYING Inputs at Direct Discounts)
                    </p>
                    <p style={{ margin: '0', color: '#334155', fontSize: '10.5pt', lineHeight: '1.5' }}>
                        <strong>Transporter as the Buyer:</strong> In the Intelligence Layer, you search and filter our 24,000+ supplier records across 22 operational input categories. Use this intelligence to procure tyres, fuel, spare parts, and maintenance services at community-negotiated direct discounts—eliminating middleman markups and slashing your operational cost-per-kilometer.
                    </p>
                </div>

                {/* PILLAR 2: SECURE TRANSACTIONS & DIRECT SALES */}
                <div style={{ marginBottom: '14pt', backgroundColor: '#f8fafc', padding: '12pt 15pt', borderRadius: '6pt', border: '1px solid #e2e8f0' }}>
                    <p style={{ fontWeight: 'bold', color: '#0f172a', margin: '0 0 4pt 0', fontSize: '11pt' }}>
                        🔹 2. Secure Transactions & Direct Sales (SELLING Transport Services via Your Shop)
                    </p>
                    <p style={{ margin: '0', color: '#334155', fontSize: '10.5pt', lineHeight: '1.5' }}>
                        <strong>Transporter as the Seller:</strong> In the Transaction Layer, you list and sell your transport services, freight hauling capacity, dedicated truck routes, and trailer availability directly through your online shop. Shippers and cargo owners book and pay directly using pre-funded digital wallets or embedded supply chain financing—guaranteeing upfront settlement and eliminating empty return miles.
                    </p>
                </div>

                {/* PILLAR 3: ANONYMIZED DATA & MACHINE LEARNING */}
                <div style={{ marginBottom: '14pt', backgroundColor: '#f8fafc', padding: '12pt 15pt', borderRadius: '6pt', border: '1px solid #e2e8f0' }}>
                    <p style={{ fontWeight: 'bold', color: '#0f172a', margin: '0 0 4pt 0', fontSize: '11pt' }}>
                        🔹 3. Anonymized Data & Machine Learning (Internal Platform Optimization)
                    </p>
                    <p style={{ margin: '0', color: '#334155', fontSize: '10.5pt', lineHeight: '1.5' }}>
                        This deeper layer tracks broader freight movements, route demands, and procurement cycles strictly in an anonymized format. Never exposed to third parties or competitors, this data is used exclusively by our internal machine learning algorithms to optimize load-vehicle matching and drive fleet efficiency for your business.
                    </p>
                </div>
            </div>

            {/* SYNTHESIS: BREAKING BUSINESS CONSTRAINTS */}
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '14pt 16pt', borderRadius: '8pt', margin: '18pt 0' }}>
                <p style={{ fontWeight: 'bold', color: '#166534', margin: '0 0 6pt 0', fontSize: '11pt', textTransform: 'uppercase' }}>
                    🚀 Breaking Known Transporter Constraints
                </p>
                <p style={{ margin: '0', color: '#15803d', fontSize: '10.5pt', lineHeight: '1.5' }}>
                    By uniting discounted supplier sourcing (24,000+ records across 22 categories), wallet-backed transport service sales, and internal machine learning, Logistics Flow systematically eliminates the primary pain points holding back hauliers: soaring operating costs, empty return legs, payment delays, and cash flow strain.
                </p>
            </div>

            {/* CALL TO ACTION */}
            <p style={{ margin: '20pt 0', padding: '15pt', border: '2px dashed #228B22', borderRadius: '10pt', backgroundColor: '#f9fff9', textAlign: 'center' }}>
                <strong>Establish your FREE standing in the haulier registry to unlock savings & freight deal-flow:</strong><br />
                <a href={optInLink} target="_blank" rel="noreferrer" style={{ color: '#228B22', fontWeight: 'bold', fontSize: '13pt', textDecoration: 'underline' }}>{optInLink}</a>
            </p>

            <p style={{ marginTop: '20pt' }}>Regards,</p>
            <p><strong>The Logistics Flow Team</strong></p>
            <img src={pixelUrl} width="1" height="1" style={{ display: 'none' }} alt="" />
        </div>
    );
}
