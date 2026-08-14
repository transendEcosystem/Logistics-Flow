'use client';

import React, { useMemo } from "react";

/**
 * THE BREAK-UP: Ghost Reply & Loss Aversion
 */
export default function TheBreakUp({ partner }: { partner?: any }) {
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
            <p style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#475569', borderBottom: '2px solid #475569', paddingBottom: '4pt', marginBottom: '15pt' }}>
                FINAL NOTICE: RECORD DEACTIVATION SCHEDULED
            </p>
            
            <p>Good day {firstName},</p>
            
            <p>I assume that digitalizing your sales node and tracking inbound interest is not a priority for <strong>{companyName}</strong> right now. That is perfectly fine.</p>
            
            <p style={{ margin: '15pt 0' }}>
                To keep our industrial registry clean for active members, I have scheduled the deactivation of your forensic tracking node for <strong>Friday at 17:00</strong>.
            </p>
            
            <p style={{ fontWeight: 'bold' }}>What happens upon deactivation:</p>
            <ul style={{ paddingLeft: '20pt' }}>
                <li style={{ marginBottom: '5pt' }}>Your profile is removed from the "Active Handshake" queue.</li>
                <li style={{ marginBottom: '5pt' }}>The <strong>Inbound Interest Ledger</strong> for your account will be cleared (all current blind leads will be deleted).</li>
                <li style={{ marginBottom: '5pt' }}>Your business will be marked as "Unresponsive" for future matching cycles.</li>
            </ul>
            
            <p style={{ marginTop: '15pt' }}>
                If you would like to keep your accumulated interest logs and maintain your standing in the grid, please establish your handshake before the deadline.
            </p>
            
            <p style={{ marginTop: '20pt', textAlign: 'center' }}>
                <a href={optInLink} target="_blank" style={{ color: '#b91c1c', fontWeight: 'bold', textDecoration: 'underline' }}>
                    Preserve My Forensic Profile &rarr;
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
