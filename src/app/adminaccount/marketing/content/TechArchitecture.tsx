'use client';

import React from "react";

export default function TechArchitecture({ partner }: { partner?: any }) {
    const companyName = partner?.companyName || 'your business';
    const pixelUrl = `https://studio--ecosystem-hub.us-central1.hosted.app/api/trackEmailOpen/${partner?.id || 'anonymous'}`;

    return (
        <div style={{ fontFamily: 'Calibri, sans-serif', fontSize: '12pt', color: '#000000', lineHeight: '1.4' }}>
            <p style={{ fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '2px solid #000000', paddingBottom: '4pt' }}>
                THE INDUSTRIAL BRAIN: INTELLIGENCE ARCHITECTURE
            </p>
            <p>Technology is the vehicle, but data is the fuel. Logistics Flow provides {companyName} with a robust "Industrial Brain" designed to replace manual, fragmented processes with high-velocity intelligence.</p>
            <p style={{ margin: '15pt 0', fontWeight: 'bold' }}>Architectural Pillars:</p>
            <ul style={{ paddingLeft: '20pt' }}>
                <li style={{ marginBottom: '10pt' }}><strong>Forensic Registry Engine:</strong> Our proprietary crawlers have mapped the South African transport grid, cataloging every haulier and supplier into a searchable, high-fidelity database.</li>
                <li style={{ marginBottom: '10pt' }}><strong>AI Synergy Matching:</strong> We use advanced LLMs to analyze your fleet equipment and cargo needs, proactively matching you with the most efficient partners in the registry.</li>
                <li style={{ marginBottom: '10pt' }}><strong>Immutable Activity Ledger:</strong> Every quote, transaction, and interaction is logged, creating a validated track record of your business standing for our funding partners.</li>
            </ul>
            <p>By leveraging this stack, your business gains a definitive technological advantage, allowing you to compete and scale with precision.</p>
            <p style={{ marginTop: '20pt' }}>Regards,</p>
            <p><strong>Logistics Flow Technical Division</strong></p>
            <img src={pixelUrl} width="1" height="1" style={{ display: 'none' }} alt="" />
        </div>
    );
}