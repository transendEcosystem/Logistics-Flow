import React from 'react';
import { APP_BASE_URL } from '@/lib/app-url';

export default function MahalaOffer({ partner, contactName }: { partner: any; contactName: string }) {
    const company = partner?.companyName || 'your company';
    const cellStyle = { padding: '8px 12px', borderBottom: '1px solid #000000', textAlign: 'left' as const };
    return (
        <div style={{ fontFamily: 'Calibri, sans-serif', fontSize: '12pt', color: '#000000', backgroundColor: '#ffffff', lineHeight: '1.5' }}>
            <p>Good day {contactName.split(' ')[0]},</p>
            <p>My name is Michael Koton, owner of Logistics Flow. Having financed transport businesses for the past 25 years, I have seen first-hand how rising costs affect businesses and the people behind them.</p>
            <p>That is why we built Logistics Flow: to connect companies with suppliers, business opportunities, information and funding resources through one connected ecosystem.</p>
            <p>I would like to invite <strong>{company}</strong> to register for free, with an introductory offer that delivers practical value from the outset.</p>
            <h3>Mahala Benefits. Savings Every Month.</h3>
            <p><strong>Register for free on Logistics Flow and purchase a Mahala monthly subscription for R39 to receive a 25% discount, credited to your in-app wallet.</strong></p>
            <p>This is a recurring benefit: <strong>each month you pay your Mahala subscription, you earn another R9.75 wallet credit.</strong></p>
            <table style={{ borderCollapse: 'collapse', width: '100%', color: '#000000', backgroundColor: '#ffffff' }}>
                <thead><tr><th style={cellStyle}>Your Monthly Subscription</th><th style={cellStyle}>Amount</th></tr></thead>
                <tbody>
                    <tr><td style={cellStyle}>Mahala monthly subscription</td><td style={cellStyle}>R39.00</td></tr>
                    <tr><td style={cellStyle}>Your 25% discount, credited to your wallet</td><td style={cellStyle}><strong>R9.75</strong></td></tr>
                    <tr><td style={cellStyle}>Effective cost after using the wallet credit</td><td style={cellStyle}><strong>R29.25</strong></td></tr>
                </tbody>
            </table>
            <p>You pay the R39 subscription each month, and the R9.75 discount is credited to your Logistics Flow wallet rather than deducted at checkout.</p>
            <h3>What Could You Save?</h3>
            <p>Your Mahala benefits could make a meaningful difference to your household budget:</p>
            <table style={{ borderCollapse: 'collapse', width: '100%', color: '#000000', backgroundColor: '#ffffff' }}>
                <thead><tr><th style={cellStyle}>Illustrative Household Savings</th><th style={cellStyle}>Amount</th></tr></thead>
                <tbody>
                    <tr><td style={cellStyle}>Weekly household spend</td><td style={cellStyle}>R1,750</td></tr>
                    <tr><td style={cellStyle}>Potential weekly savings</td><td style={cellStyle}><strong>R350</strong></td></tr>
                    <tr><td style={cellStyle}>Potential savings over four weeks</td><td style={cellStyle}><strong>Approximately R1,400</strong></td></tr>
                </tbody>
            </table>
            <p><strong>A R39 monthly subscription could unlock approximately R1,400 in household savings over four weeks, with a further R9.75 credited to your Logistics Flow wallet each paid month.</strong></p>
            <p><em>Savings are illustrative, not guaranteed. Actual savings depend on eligible purchases, participating offers and how you use the benefits.</em></p>
            <h3>Explore the Mahala Benefits</h3>
            <p>See the Mahala brochure for more information about the benefits and savings available:</p>
            <p><a href={`${APP_BASE_URL}/brochures/mahala-hub.pdf`} target="_blank" rel="noopener noreferrer" style={{ color: '#228B22', fontWeight: 'bold' }}>View the Mahala Brochure</a></p>
            <h3>A Starting Point for a Wider Business Relationship</h3>
            <p>Beyond the Mahala offer, registering your company on Logistics Flow introduces you to an ecosystem built around business needs: sourcing suppliers, finding opportunities and exploring finance options, subject to the relevant membership and eligibility requirements.</p>
            <p>My objective is straightforward: <strong>give you a practical reason to join today, then build a relationship that creates value over time.</strong></p>
            <p><a href={`${APP_BASE_URL}/opt-in/${encodeURIComponent(partner.id)}`} style={{ color: '#228B22', fontWeight: 'bold' }}>Register for Free and Take Up the Mahala Offer</a></p>
            <p>You are also welcome to reply to this email. I would be happy to discuss how Logistics Flow could fit into your business.</p>
            <p>Kind regards,<br /><strong>Michael Koton</strong><br />Owner | Logistics Flow<br /><a href={APP_BASE_URL} style={{ color: '#228B22' }}>{APP_BASE_URL}</a></p>
        </div>
    );
}