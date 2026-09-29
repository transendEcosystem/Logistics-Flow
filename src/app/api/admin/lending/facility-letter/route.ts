import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp, verifyAdmin } from '@/lib/firebase-admin';
import {
  BookingStageId,
  BookingStageState,
  buildFacilityLetterBody,
  canCompleteBookingStage,
  getApplicableBookingStages,
  getBookingProgress,
  getNextBookingStage,
  isBookingReadyForLive,
} from '@/lib/lending/facility-letter';

function resolveRequirements(decision: Record<string, any>, agreement: Record<string, any>) {
  const securityRequired = [
    ...(decision.collateralRequirements || []),
    ...(decision.securityRequirements || []),
    ...(decision.suretyRequirements || []),
  ].length > 0;
  const depositAmount = Number(agreement.applicantDepositAmount || decision.depositAmount || 0);
  return { securityRequired, depositRequired: depositAmount > 0, depositAmount };
}

export async function GET(request: NextRequest) {
  try {
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');
    const auth = await verifyAdmin(request);
    const caseId = new URL(request.url).searchParams.get('caseId');
    if (!caseId) return NextResponse.json({ success: false, error: 'caseId is required.' }, { status: 400 });
    const caseRef = auth.db.collection('lendingApplications').doc(caseId);
    const [caseSnapshot, letterSnapshot] = await Promise.all([
      caseRef.get(),
      caseRef.collection('facilityLetters').doc('current').get(),
    ]);
    if (!caseSnapshot.exists) return NextResponse.json({ success: false, error: 'Credit case not found.' }, { status: 404 });
    const creditCase = caseSnapshot.data() || {};
    const letter = letterSnapshot.data() || null;
    const requirements = resolveRequirements(creditCase.creditCommitteeDecision || {}, creditCase);
    const stages = getApplicableBookingStages(requirements);
    const state = (letter?.bookingStages || {}) as BookingStageState;
    return NextResponse.json({
      success: true,
      data: {
        creditCase,
        letter,
        stages,
        state,
        progress: getBookingProgress(stages, state),
        nextStage: getNextBookingStage(stages, state),
        readyForLive: isBookingReadyForLive(stages, state),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Unable to load facility letter.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');
    const auth = await verifyAdmin(request);
    const body = await request.json();
    const caseId = String(body?.caseId || '').trim();
    if (!caseId) return NextResponse.json({ success: false, error: 'caseId is required.' }, { status: 400 });

    const caseRef = auth.db.collection('lendingApplications').doc(caseId);
    const caseSnapshot = await caseRef.get();
    if (!caseSnapshot.exists) return NextResponse.json({ success: false, error: 'Credit case not found.' }, { status: 404 });
    const creditCase = caseSnapshot.data() || {};
    const decision = creditCase.creditCommitteeDecision || {};
    if (decision.outcome !== 'approved_subject_to_conditions') {
      return NextResponse.json({ success: false, error: 'A facility letter can only be issued for an approved credit decision.' }, { status: 409 });
    }
    if (!creditCase.facilityId) {
      return NextResponse.json({ success: false, error: 'A facility letter requires an approved agreement facility.' }, { status: 409 });
    }

    const requirements = resolveRequirements(decision, creditCase);
    const terms = {
      agreementType: String(creditCase.facilityAgreementType || creditCase.facilityType || 'Agreement facility'),
      approvedAmount: Number(decision.agreementFacilityLimit || 0),
      termMonths: Number(body?.termMonths || creditCase.termMonths || 0),
      interestRate: Number(body?.interestRate || 0),
      firstInstalmentDate: String(body?.firstInstalmentDate || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)),
      depositAmount: requirements.depositAmount,
      conditions: decision.conditions || [],
      collateralRequirements: decision.collateralRequirements || [],
      securityRequirements: decision.securityRequirements || [],
      suretyRequirements: decision.suretyRequirements || [],
    };
    const now = new Date().toISOString();
    const letter = {
      caseId,
      clientId: creditCase.clientId || null,
      facilityId: creditCase.facilityId,
      status: 'issued' as const,
      terms,
      body: buildFacilityLetterBody(String(creditCase.companyName || 'Client'), terms),
      issuedAt: now,
      issuedBy: auth.adminUid,
      bookingStages: { facility_letter_sent: { completed: true, completedAt: now, completedBy: auth.adminUid } },
    };
    await caseRef.collection('facilityLetters').doc('current').set(letter, { merge: true });
    await caseRef.set({ facilityLetterStatus: 'issued', facilityLetterIssuedAt: now, updatedAt: now }, { merge: true });
    await auth.db.collection('auditLogs').add({ action: 'lending_facility_letter_issued', caseId, actorId: auth.adminUid, timestamp: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true, data: letter });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Unable to issue facility letter.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');
    const auth = await verifyAdmin(request);
    const body = await request.json();
    const caseId = String(body?.caseId || '').trim();
    const stageId = String(body?.stageId || '').trim() as BookingStageId;
    if (!caseId || !stageId) return NextResponse.json({ success: false, error: 'caseId and stageId are required.' }, { status: 400 });

    const caseRef = auth.db.collection('lendingApplications').doc(caseId);
    const letterRef = caseRef.collection('facilityLetters').doc('current');
    const [caseSnapshot, letterSnapshot] = await Promise.all([caseRef.get(), letterRef.get()]);
    if (!letterSnapshot.exists) return NextResponse.json({ success: false, error: 'Issue the facility letter before progressing booking.' }, { status: 409 });
    const creditCase = caseSnapshot.data() || {};
    const letter = letterSnapshot.data() || {};
    const requirements = resolveRequirements(creditCase.creditCommitteeDecision || {}, creditCase);
    const stages = getApplicableBookingStages(requirements);
    const state = (letter.bookingStages || {}) as BookingStageState;

    if (!stages.some((stage) => stage.id === stageId)) {
      return NextResponse.json({ success: false, error: 'This booking stage does not apply to the agreement.' }, { status: 400 });
    }
    if (!canCompleteBookingStage(stageId, stages, state)) {
      return NextResponse.json({ success: false, error: 'Earlier booking stages must be completed first.', nextStage: getNextBookingStage(stages, state) }, { status: 409 });
    }

    const now = new Date().toISOString();
    const nextState: BookingStageState = { ...state, [stageId]: { completed: true, completedAt: now, completedBy: auth.adminUid, note: String(body?.note || '') } };
    const update: Record<string, unknown> = { bookingStages: nextState, updatedAt: now };
    if (stageId === 'facility_letter_signed') {
      update.status = 'accepted';
      update.acceptedAt = now;
    }
    await letterRef.set(update, { merge: true });
    const readyForLive = isBookingReadyForLive(stages, nextState);
    await caseRef.set({ bookingProgress: getBookingProgress(stages, nextState), bookingReadyForLive: readyForLive, updatedAt: now }, { merge: true });
    await auth.db.collection('auditLogs').add({ action: 'lending_booking_stage_completed', caseId, stageId, actorId: auth.adminUid, timestamp: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true, data: { state: nextState, progress: getBookingProgress(stages, nextState), readyForLive, nextStage: getNextBookingStage(stages, nextState) } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Unable to update booking stage.' }, { status: 500 });
  }
}
