'use client';

import React, { useMemo } from "react";
import { useConfig } from "@/hooks/use-config";

type IsaRates = {
    membershipCommission?: number;
    financeMallCommission?: number;
    supplierMallCommission?: number;
    buySellMallCommission?: number;
    marketplaceCommission?: number;
};

const DEFAULT_RATES: Required<IsaRates> = {
    membershipCommission: 30,
    financeMallCommission: 20,
    supplierMallCommission: 20,
    buySellMallCommission: 20,
    marketplaceCommission: 50,
};

export default function PitchDeck({ partner }: { partner?: any }) {
    const isValid = (val: any) => !!val && val !== 'N/A' && val !== 'null' && val !== 'None';

    // Commission percentages are read from the live ISA config so the pitch can
    // never quote a rate that differs from what the platform actually pays.
    const { data: isaConfig } = useConfig<IsaRates>('isaPitch');
    const rates = useMemo(() => ({ ...DEFAULT_RATES, ...(isaConfig || {}) }), [isaConfig]);

    const resolvedName = useMemo(() => {
        if (partner?.marketingManager?.name && isValid(partner.marketingManager.name)) return partner.marketingManager.name;
        if (partner?.ceo?.name && isValid(partner.ceo.name)) return partner.ceo.name;
        return partner?.firstName || partner?.contactPerson || 'Partner';
    }, [partner]);

    const firstName = resolvedName.split(' ')[0];
    const companyName = partner?.companyName || 'your business';
    const pixelUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://logisticsflow.co.za'}/api/trackEmailOpen/${partner?.id || 'anonymous'}`;

    const topTransactional = Math.max(
        rates.financeMallCommission,
        rates.supplierMallCommission,
        rates.buySellMallCommission,
    );

    // Worked example. The monthly fee is an illustrative assumption, but the
    // percentage applied to it is the live configured rate, so the arithmetic
    // shown can never contradict the commission quoted above.
    const ASSUMED_MONTHLY_FEE = 500;
    const annualFee = ASSUMED_MONTHLY_FEE * 12;
    const earningsPerMembership = Math.round(annualFee * (rates.membershipCommission / 100));
    const scenarioVolumes = [25, 50, 100, 250];
    const formatRand = (value: number) => `R${Math.round(value).toLocaleString('en-ZA')}`;

    const headingStyle: React.CSSProperties = { margin: '16pt 0 6pt', fontWeight: 'bold' };
    const listStyle: React.CSSProperties = { paddingLeft: '20pt', margin: '0' };
    const itemStyle: React.CSSProperties = { marginBottom: '8pt' };

    return (
        <div style={{ fontFamily: 'Calibri, sans-serif', fontSize: '12pt', color: '#000000', lineHeight: '1.45' }}>
            <p style={{ fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '2px solid #000000', paddingBottom: '4pt' }}>
                STRATEGIC PROPOSAL FOR {companyName.toUpperCase()}
            </p>

            <p>Good day {firstName},</p>

            <p>
                We are inviting <strong>{companyName}</strong> to join Logistics Flow as an{' '}
                <strong>Authorised Independent Sales Agent (ISA)</strong>. The proposition is simple:
                you already hold the trust of a relationship base of transporters, suppliers and
                operators who have dealt with you for years. We supply the platform, the tooling and
                the automation &mdash; you introduce the memberships. Every member you introduce is
                permanently attached to your network, and you earn from their activity for as long as
                they remain on the platform.
            </p>

            <p style={headingStyle}>1. The Network Builds Itself</p>
            <p>
                You are not being asked to become a salesperson. The network structure is created and
                maintained automatically. Each introduction you make is registered against your ISA
                account the moment it is accepted, and every member that person subsequently brings in
                is mapped beneath you without any administration on your part. There are no forms to
                file, no claims to submit and no commission to chase &mdash; attribution is handled by
                the platform, permanently and in writing.
            </p>

            <p style={headingStyle}>2. You Earn Across Three Benefits</p>
            <ul style={listStyle}>
                <li style={itemStyle}>
                    <strong>Membership Commission &mdash; {rates.membershipCommission}%:</strong> Paid on
                    the membership fee of every member you introduce, recurring for the life of that
                    membership. This is annuity income, not a once-off referral fee.
                </li>
                <li style={itemStyle}>
                    <strong>Transactional Commission &mdash; up to {topTransactional}%:</strong> Earned
                    whenever your network transacts across the platform &mdash; finance
                    ({rates.financeMallCommission}%), supplier purchases ({rates.supplierMallCommission}%)
                    and buy/sell activity ({rates.buySellMallCommission}%). Your members buy parts,
                    tyres and finance anyway; now that spend pays you.
                </li>
                <li style={itemStyle}>
                    <strong>Marketplace Commission &mdash; {rates.marketplaceCommission}%:</strong> The
                    largest share, earned on marketplace revenue generated by the network you
                    established.
                </li>
            </ul>

            <p style={headingStyle}>3. What This Is Actually Worth</p>
            <p>
                Taking Benefit 1 alone, and assuming a membership of{' '}
                {formatRand(ASSUMED_MONTHLY_FEE)} per month:
            </p>
            <ul style={listStyle}>
                <li style={itemStyle}>
                    {formatRand(ASSUMED_MONTHLY_FEE)} per month is{' '}
                    <strong>{formatRand(annualFee)} per membership per year</strong>.
                </li>
                <li style={itemStyle}>
                    Your {rates.membershipCommission}% share of that is{' '}
                    <strong>{formatRand(earningsPerMembership)} per membership, every year</strong>.
                </li>
                <li style={itemStyle}>
                    Introduce <strong>100 memberships</strong> and that is{' '}
                    <strong>{formatRand(earningsPerMembership * 100)} per annum</strong> &mdash;
                    recurring, for as long as those members stay on the platform.
                </li>
            </ul>

            <table cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse', margin: '10pt 0', width: '100%', maxWidth: '420pt' }}>
                <thead>
                    <tr>
                        <th style={{ textAlign: 'left', borderBottom: '1.5pt solid #000000', padding: '5pt 8pt 5pt 0' }}>Memberships introduced</th>
                        <th style={{ textAlign: 'right', borderBottom: '1.5pt solid #000000', padding: '5pt 0' }}>Your annual earnings</th>
                    </tr>
                </thead>
                <tbody>
                    {scenarioVolumes.map(volume => (
                        <tr key={volume}>
                            <td style={{ padding: '5pt 8pt 5pt 0', borderBottom: '0.5pt solid #cccccc' }}>
                                {volume}{volume === 100 ? ' (your example)' : ''}
                            </td>
                            <td style={{ padding: '5pt 0', borderBottom: '0.5pt solid #cccccc', textAlign: 'right', fontWeight: volume === 100 ? 'bold' : 'normal' }}>
                                {formatRand(earningsPerMembership * volume)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <p>
                Critically, this is <strong>Benefit 1 only</strong>. It excludes the transactional
                commission your members generate every time they buy parts, tyres or access finance,
                and it excludes the marketplace share &mdash; both of which are earned on top of the
                figures above, and both of which grow as the network matures.
            </p>

            <p style={headingStyle}>4. Performance Is Monitored For You</p>
            <p>
                Your ISA dashboard shows your entire network in real time: who has joined, who is
                active, what they are transacting and exactly what each benefit has earned you this
                month. Commission is calculated and reconciled by the platform. You are never left
                guessing what you are owed, and you can see at a glance which relationships are
                producing and which need a call.
            </p>

            <p style={headingStyle}>5. Every Tool Is Included &mdash; No Training Required</p>
            <p>
                Introduction links, branded invitations, follow-up messaging, onboarding and member
                support are all built in and ready to use from day one. There is no course to
                complete, no accreditation to sit and no system to learn. If you can send a message,
                you can operate as an ISA. The platform does the explaining, the onboarding and the
                servicing on your behalf.
            </p>

            <p style={headingStyle}>6. Loyalty Points Compound Your Earnings</p>
            <p>
                Activity across your network accrues loyalty points, which lift you through the
                earning tiers. The larger and more active your network becomes, the higher the rate
                you earn on it &mdash; so the same relationship base pays you progressively more over
                time. Early participants compound fastest, because tier position is built on
                accumulated activity.
            </p>

            <p style={{ marginTop: '16pt' }}>
                In short: <strong>{companyName}</strong> already owns the asset that matters &mdash; the
                relationships. We are offering the infrastructure to convert that asset into recurring
                income, with the network creation, the performance monitoring and the member servicing
                automated on your behalf.
            </p>

            <p>
                If this is of interest, we will activate your ISA account and walk your first
                introductions through with you.
            </p>

            <p style={{ marginTop: '20pt' }}>Regards,</p>
            <p><strong>The Logistics Flow Growth Strategy Team</strong></p>
            <img src={pixelUrl} width="1" height="1" style={{ display: 'none' }} alt="" />
        </div>
    );
}
