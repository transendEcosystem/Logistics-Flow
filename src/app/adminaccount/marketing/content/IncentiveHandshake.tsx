
'use client';

import React, { useMemo } from "react";

/**
 * THE INCENTIVE HANDSHAKE: Greed & Immediate ROI
 * Focuses on the "Welcome Gift" (R100 membership = R500 value).
 */
export default function IncentiveHandshake({ partner, incentive }: { partner?: any, incentive?: any }) {
    const companyName = partner?.companyName || 'your business';
    const supplierName = incentive?.supplierName || 'a Verified Community Partner';
    const giftTitle = incentive?.title || 'a R500 Industrial Welcome Gift';
    
    const baseUrl = 'https://studio--ecosystem-hub.us-central1.hosted.app';
    const optInLink = `${baseUrl}/opt-in/${partner?.id || 'TEST'}`;
    const pixelUrl = `${baseUrl}/api/trackEmailOpen/${partner?.id || 'anonymous'}`;

    return (
        <div style={{ fontFamily: 'Calibri, sans-serif', fontSize: '12pt', color: '#000000', lineHeight: '1.4' }}>
            <p style={{ fontWeight: 'bold', color: '#228B22', fontSize: '16pt', marginBottom: '5pt', textTransform: 'uppercase' }}>
                IMMEDIATE VALUE: THE ACTIVATION BUNDLE
            </p>
            
            <p>Good day,</p>
            
            <p>We are writing to <strong>{companyName}</strong> regarding your standing in the Logistics Flow industrial registry. To accelerate your entry into the digital grid, we have allocated an <strong>Activation Incentive</strong> to your account.</p>
            
            <div style={{ margin: '15pt 0', padding: '15pt', backgroundColor: '#f0fdf4', border: '2px solid #228B22', borderRadius: '8pt' }}>
                <p style={{ fontWeight: 'bold', fontSize: '11pt', color: '#166534', margin: '0 0 5pt 0' }}>
                    🎁 COMMUNITY WELCOME GIFT
                </p>
                <p style={{ fontSize: '14pt', fontWeight: 'black', margin: '0' }}>
                    {giftTitle}
                </p>
                <p style={{ fontSize: '10pt', color: '#166534', marginTop: '5pt' }}>
                    Provided by: <strong>{supplierName}</strong>
                </p>
            </div>

            <p><strong>The Proposition:</strong> Establish your Intelligence Access node for R100/mo and instantly unlock this gift. Your first month is not a cost—it is a 400% return on investment.</p>
            
            <p style={{ fontWeight: 'bold', marginTop: '15pt' }}>By establishing your handshake today, you unlock:</p>
            <ul style={{ paddingLeft: '20pt' }}>
                <li style={{ marginBottom: '5pt' }}>The {giftTitle} (Voucher Vault).</li>
                <li style={{ marginBottom: '5pt' }}>Unlimited Registry Search for 22,000+ records.</li>
                <li style={{ marginBottom: '5pt' }}>Direct MD/CEO lines to matched transporters and suppliers.</li>
            </ul>
            
            <p style={{ marginTop: '20pt', textAlign: 'center' }}>
                <a href={optInLink} target="_blank" style={{ display: 'inline-block', backgroundColor: '#228B22', color: '#ffffff', padding: '12pt 24pt', borderRadius: '5pt', fontWeight: 'bold', textDecoration: 'none' }}>
                    Claim My Welcome Gift & Access &rarr;
                </a>
            </p>
            
            <p style={{ marginTop: '20pt' }}>
                Regards,<br />
                <strong>The Logistics Flow Engagement Division</strong>
            </p>
            <img src={pixelUrl} width="1" height="1" style={{ display: 'none' }} alt="" />
        </div>
    );
}
