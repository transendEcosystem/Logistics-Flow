import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp, verifyAdmin } from '@/lib/firebase-admin';
import {
  BookingStageState,
  getApplicableBookingStages,
  getNextBookingStage,
  isBookingReadyForLive,
} from '@/lib/lending/facility-letter';

export async function POST(request: NextRequest) {
  try {
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');
    const auth = await verifyAdmin(request);
    const body = await request.json();
    const caseId = String(body?.caseId || '').trim();
    if (!caseId) return NextResponse.json({ success: false, error: 'caseId is required.' }, { status: 400 });

    const caseRef = auth.db.collection('lendingApplications').doc(caseId);
    const letterRef = caseRef.collection('facilityLetters').doc('current');
    const [caseSnapshot, letterSnapshot] = await Promise.all([caseRef.get(), letterRef.get()]);
    if (!caseSnapshot.exists) return NextResponse.json({ success: false, error: 'Credit case not found.' }, { status: 404 });
    if (!letterSnapshot.exists) return NextResponse.json({ success: false, error: 'A signed facility letter is required before go-live.' }, { status: 409 });

    const creditCase = caseSnapshot.data() || {};
    const letter = letterSnapshot.data() || {};
    if (letter.status !== 'accepted') {
      return NextResponse.json({ success: false, error: 'The client must accept the facility letter before go-live.' }, { status: 409 });
    }

    const decision = creditCase.creditCommitteeDecision || {};
    const securityRequired = [...(decision.collateralRequirements || []), ...(decision.securityRequirements || []), ...(decision.suretyRequirements || [])].length > 0;
    const depositAmount = Number(letter.terms?.depositAmount || 0);
    const stages = getApplicableBookingStages({ securityRequired, depositRequired: depositAmount > 0 });
    const state = (letter.bookingStages || {}) as BookingStageState;
    if (!isBookingReadyForLive(stages, state)) {
      return NextResponse.json({ success: false, error: 'All booking stages must be completed before the agreement can go live.', nextStage: getNextBookingStage(stages, state) }, { status: 409 });
    }

    const now = new Date().toISOString();
    const existing = await auth.db.collection('agreements').where('creditCaseId', '==', caseId).limit(1).get();
    const agreementRef = existing.empty ? auth.db.collection('agreements').doc() : existing.docs[0].ref;
    const principal = Number(letter.terms?.approvedAmount || 0);

    await agreementRef.set({
      id: agreementRef.id,
      creditCaseId: caseId,
      clientId: creditCase.clientId || null,
      facilityId: creditCase.facilityId || null,
      masterFacilityId: creditCase.masterFacilityId || null,
      type: letter.terms?.agreementType || creditCase.facilityAgreementType || 'loan-pv-term',
      description: creditCase.purposeNarrative || 'Approved agreement facility',
      totalAdvanced: principal,
      interestRate: Number(letter.terms?.interestRate || 0),
      numberOfInstallments: Number(letter.terms?.termMonths || 0),
      depositAmount,
      status: 'live',
      liveAt: now,
      releasedBy: auth.adminUid,
      facilityLetterAcceptedAt: letter.acceptedAt || null,
      completedCommitteeConditions: decision.conditions || [],
      bookingStages: state,
      createdAt: existing.empty ? FieldValue.serverTimestamp() : (existing.docs[0].data()?.createdAt || FieldValue.serverTimestamp()),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    await caseRef.set({ status: 'disbursed', agreementId: agreementRef.id, liveAt: now, updatedAt: now }, { merge: true });
    if (creditCase.facilityId) {
      await auth.db.collection('facilities').doc(String(creditCase.facilityId)).set({ status: 'live', onboardingStage: 'live', liveAt: now, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
    await auth.db.collection('auditLogs').add({ action: 'lending_agreement_went_live', caseId, agreementId: agreementRef.id, principal, actorId: auth.adminUid, timestamp: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true, agreementId: agreementRef.id, status: 'live', liveAt: now });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Unable to move the agreement to live.' }, { status: 500 });
  }
}
