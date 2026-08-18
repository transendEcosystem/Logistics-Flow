'use client';

import React, { useMemo } from "react";

/**
 * THE WEDGE: Micro-Commitment & PAS Strategy
 */
export default function TheWedge({ partner, audience }: { partner?: any, audience?: string }) {
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
    const aud = (audience || '').toLowerCase();
    const pixelUrl = `https://studio--ecosystem-hub.us-central1.hosted.app/api/trackEmailOpen/${partner?.id || 'anonymous'}`;
    const optInLink = `https://studio--ecosystem-hub.us-central1.hosted.app/opt-in/${partner?.id || 'TEST'}`;

    const painPoint = aud === 'transporter' ? 'empty return miles' : 'stagnant sales cycles';
    const specificGap = aud === 'transporter' ? 'RC1 Fleet Verification' : 'Product Node Synchronization';

    return (
        <div style={{ fontFamily: 'Calibri, sans-serif', fontSize: '12pt', color: '#000000', lineHeight: '1.4' }}>
            <p style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#b91c1c', marginBottom: '15pt' }}>
                URGENT: DATA GAP IDENTIFIED FOR {companyName.toUpperCase()}
            </p>
            
            <p>Good day {firstName},</p>
            
            <p>While mapping the South African industrial grid, we have identified <strong>{companyName}</strong> in our forensic registry. However, your account is currently marked with a <strong>Critical Information Constraint</strong>.</p>
            
            <p style={{ margin: '15pt 0' }}>
                <strong>The Pain:</strong> Every day your data remains unverified, you are paying a "Silence Tax." You are currently invisible to our matching engine for high-intent matches in your sector.
            </p>
            
            <p style={{ margin: '15pt 0' }}>
                <strong>The Wedge:</strong> We have active requests for capacity/parts that match your profile, but we cannot route the handshake because your <strong>{specificGap}</strong> is missing.
            </p>
            
            <p>We are not asking for a full commitment today. Simply establish your free standing and bridge this specific gap to become visible to the matched deal-flow.</p>
            
            <p style={{ marginTop: '20pt', padding: '12pt', border: '1px solid #228B22', borderRadius: '5pt', textAlign: 'center' }}>
                <a href={optInLink} target="_blank" style={{ color: '#228B22', fontWeight: 'bold', textDecoration: 'none' }}>Bridge the Gap (R0 Registration) &rarr;</a>
            </p>
            
            <p style={{ marginTop: '20pt', fontSize: '10pt', color: '#64748b' }}>
                Regards,<br />
                <strong>The Logistics Flow Team</strong>
            </p>
            <img src={pixelUrl} width="1" height="1" style={{ display: 'none' }} alt="" />
        </div>
    );
}
