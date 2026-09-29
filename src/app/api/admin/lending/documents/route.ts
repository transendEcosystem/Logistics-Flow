import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp, verifyAdmin } from '@/lib/firebase-admin';
import { buildTrackingRef, generateLoanPvPack, LoanPvMergeData } from '@/lib/lending/document-templates';
import { renderDocumentPackHtml } from '@/lib/lending/document-renderer';

function addressOf(client: Record<string, any>): string {
  const address = client.workAddress || {};
  return [address.street, address.suburb, address.city, address.province, address.postalCode].filter(Boolean).join(', ');
}

export async function GET(request: NextRequest) {
  try {
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');
    const auth = await verifyAdmin(request);
    const url = new URL(request.url);
    const caseId = url.searchParams.get('caseId');
    const format = url.searchParams.get('format') || 'json';
    if (!caseId) return NextResponse.json({ success: false, error: 'caseId is required.' }, { status: 400 });

    const caseRef = auth.db.collection('lendingApplications').doc(caseId);
    const [caseSnapshot, letterSnapshot] = await Promise.all([caseRef.get(), caseRef.collection('facilityLetters').doc('current').get()]);
    if (!caseSnapshot.exists) return NextResponse.json({ success: false, error: 'Credit case not found.' }, { status: 404 });

    const creditCase = caseSnapshot.data() || {};
    const letter = letterSnapshot.data() || {};
    const decision = creditCase.creditCommitteeDecision || {};
    if (decision.outcome !== 'approved_subject_to_conditions') {
      return NextResponse.json({ success: false, error: 'Documents can only be generated for an approved credit decision.' }, { status: 409 });
    }

    const clientSnapshot = creditCase.clientId ? await auth.db.collection('lendingClients').doc(String(creditCase.clientId)).get() : null;
    const client = clientSnapshot?.data() || {};
    const primaryDirector = (client.directors || [])[0] || {};

    const firstInstalmentDate = String(letter.terms?.firstInstalmentDate || url.searchParams.get('firstInstalmentDate') || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
    const merge: LoanPvMergeData = {
      trackingRef: buildTrackingRef(caseId),
      documentDate: new Date().toISOString().slice(0, 10),
      clientName: String(creditCase.companyName || client.name || ''),
      clientRegistrationNumber: String(client.registrationId || ''),
      clientAddress: addressOf(client),
      clientContact: [creditCase.primaryContact || client.primaryContact, creditCase.phone || client.phone, creditCase.email || client.email].filter(Boolean).join(' | '),
      clientSignatoryName: String(creditCase.primaryContact || primaryDirector.name || client.primaryContact || ''),
      clientSignatoryIdNumber: String(primaryDirector.rsaIdNumber || ''),
      ncaStatus: 'Juristic person – falls outside the National Credit Act',
      loanPurpose: String(creditCase.purposeNarrative || 'They require the loan for the purpose disclosed in their application.'),
      principal: Number(letter.terms?.approvedAmount || decision.agreementFacilityLimit || 0),
      annualRatePercent: Number(letter.terms?.interestRate || url.searchParams.get('interestRate') || 0),
      numberOfInstalments: Number(letter.terms?.termMonths || creditCase.termMonths || 0),
      firstInstalmentDate,
      facilityDate: String(letter.issuedAt || new Date().toISOString()).slice(0, 10),
      approvalAssumptions: ['Clean ITC check for the various individuals and companies involved in this transaction'],
      suspensiveConditions: ['Signing of all agreements', ...(decision.conditions || []), ...(decision.securityRequirements || []), ...(decision.collateralRequirements || []), ...(decision.suretyRequirements || [])],
      specialConditions: [],
      signedAtPlace: String(client.workAddress?.city || ''),
    };

    const pack = generateLoanPvPack(merge);
    if (format === 'html') {
      return new NextResponse(renderDocumentPackHtml(pack), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    return NextResponse.json({ success: true, data: pack });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Unable to generate the document pack.' }, { status: 500 });
  }
}
