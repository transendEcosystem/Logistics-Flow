import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp, verifyAdmin } from '@/lib/firebase-admin';
import { CreditCommitteeOutcome, normalizeRequirementLines } from '@/lib/lending/credit-evaluation';
import { toAgreementPolicySubject, validateAgreementAgainstPolicies } from '@/lib/lending/policy-engine';

const outcomes: CreditCommitteeOutcome[] = ['approved_subject_to_conditions', 'declined', 'further_discovery_required'];

export async function GET(request: NextRequest) {
  try {
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');
    const auth = await verifyAdmin(request);
    const applicationId = new URL(request.url).searchParams.get('applicationId');
    if (!applicationId) return NextResponse.json({ success: false, error: 'applicationId is required.' }, { status: 400 });
    const snapshot = await auth.db.collection('lendingApplications').doc(applicationId).collection('creditEvaluationPacks').doc('current').get();
    if (!snapshot.exists) return NextResponse.json({ success: false, error: 'Credit evaluation pack not found. Prepare the pack first.' }, { status: 404 });
    return NextResponse.json({ success: true, data: snapshot.data() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Unable to load credit evaluation pack.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');
    const auth = await verifyAdmin(request);
    const body = await request.json();
    const applicationId = String(body?.applicationId || '').trim();
    if (!applicationId) return NextResponse.json({ success: false, error: 'applicationId is required.' }, { status: 400 });
    const applicationRef = auth.db.collection('lendingApplications').doc(applicationId);
    const [applicationSnapshot, discoverySnapshot] = await Promise.all([applicationRef.get(), applicationRef.collection('discovery').doc('current').get()]);
    if (!applicationSnapshot.exists) return NextResponse.json({ success: false, error: 'Application not found.' }, { status: 404 });
    if (!discoverySnapshot.exists) return NextResponse.json({ success: false, error: 'Discovery must be started before a credit evaluation pack can be prepared.' }, { status: 409 });
    const application = applicationSnapshot.data() || {};
    const discovery = discoverySnapshot.data() || {};
    const now = new Date().toISOString();
    const clientId = String(application.clientId || '').trim();
    const clientSnapshot = clientId
      ? await auth.db.collection('lendingClients').doc(clientId).get()
      : await auth.db.collection('lendingClients').where('name', '==', String(application.companyName || '')).limit(1).get();
    const client = clientId ? (clientSnapshot as FirebaseFirestore.DocumentSnapshot).data() : (clientSnapshot as FirebaseFirestore.QuerySnapshot).docs[0]?.data();
    const resolvedClientId = clientId || (clientSnapshot as FirebaseFirestore.QuerySnapshot).docs?.[0]?.id;
    let internalCreditHistory: Record<string, unknown>;
    if (!client || !resolvedClientId) {
      internalCreditHistory = { clientType: 'new_client', note: 'New client with no internal credit history.' };
    } else {
      const [agreementsSnapshot, transactionsSnapshot] = await Promise.all([
        auth.db.collection('agreements').where('clientId', '==', resolvedClientId).get(),
        auth.db.collection('transactions').where('clientId', '==', resolvedClientId).get(),
      ]);
      const agreements = agreementsSnapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
      const transactions = transactionsSnapshot.docs.map((document) => document.data());
      const linkedAgreement = application.agreementId
        ? agreements.find((agreement: any) => agreement.id === application.agreementId)
        : undefined;
      const outstandingBalance = transactions.reduce((total, transaction: any) => total + (transaction.type === 'debit' ? Number(transaction.amount || 0) : -Number(transaction.amount || 0)), 0);
      internalCreditHistory = {
        clientType: 'existing_client',
        clientId: resolvedClientId,
        agreementCount: agreements.length,
        liveAgreementCount: agreements.filter((agreement: any) => agreement.status === 'live').length,
        bookingAgreementCount: agreements.filter((agreement: any) => agreement.status === 'booking').length,
        transactionCount: transactions.length,
        outstandingBalance: Number(outstandingBalance.toFixed(2)),
        arrearsIndicators: transactions.filter((transaction: any) => transaction.source === 'installment_raise' && transaction.status === 'overdue').length,
        agreementConduct: agreements.map((agreement: any) => ({ id: agreement.id, description: agreement.description, status: agreement.status, totalAdvanced: agreement.totalAdvanced, type: agreement.type })),
        linkedAgreement,
      };
    }
    const pack = { applicationId, status: 'ready_for_committee', caseType: application.caseType || (application.facilityId ? 'agreement_facility_case' : 'global_facility_indication'), origination: { type: application.originationType || 'admin', sourceId: application.originationSourceId || null, engagementEvents: application.engagementEvents || [] }, facilityIndication: application.facilityIndication || null, applicationSnapshot: application, discoverySnapshot: discovery, internalCreditHistory, unresolvedGaps: (discovery.gaps || []).filter((gap: any) => gap.status === 'pending'), preparedAt: now, preparedBy: auth.adminUid };
    await applicationRef.collection('creditEvaluationPacks').doc('current').set(pack);
    await applicationRef.set({ creditEvaluationStatus: 'ready_for_committee', creditEvaluationPreparedAt: now, updatedAt: now }, { merge: true });
    await auth.db.collection('auditLogs').add({ action: 'lending_credit_evaluation_pack_prepared', applicationId, unresolvedGapCount: pack.unresolvedGaps.length, actorId: auth.adminUid, timestamp: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true, data: pack });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Unable to prepare credit evaluation pack.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');
    const auth = await verifyAdmin(request);
    const body = await request.json();
    const applicationId = String(body?.applicationId || '').trim();
    const outcome = String(body?.outcome || '').trim() as CreditCommitteeOutcome;
    const clientFacilityLimit = Number(body?.clientFacilityLimit || 0);
    const agreementFacilityLimit = Number(body?.agreementFacilityLimit || 0);
    const rationale = String(body?.rationale || '').trim();
    if (!applicationId || !outcomes.includes(outcome) || !rationale || clientFacilityLimit < 0 || agreementFacilityLimit < 0) return NextResponse.json({ success: false, error: 'A valid outcome, limits, and committee rationale are required.' }, { status: 400 });
    if (outcome === 'approved_subject_to_conditions' && (!clientFacilityLimit || agreementFacilityLimit > clientFacilityLimit)) return NextResponse.json({ success: false, error: 'Approved limits must be positive and the agreement limit may not exceed the client facility limit.' }, { status: 400 });
    const applicationRef = auth.db.collection('lendingApplications').doc(applicationId);
    const applicationSnapshot = await applicationRef.get();
    if (!applicationSnapshot.exists) return NextResponse.json({ success: false, error: 'Application not found.' }, { status: 404 });
    const application = applicationSnapshot.data() || {};
    const isGlobalFacilityCase = !application.facilityId && Boolean(application.masterFacilityId);
    if (outcome === 'approved_subject_to_conditions' && !isGlobalFacilityCase && !agreementFacilityLimit) {
      return NextResponse.json({ success: false, error: 'An approved agreement facility requires a positive allocation limit.' }, { status: 400 });
    }
    if (outcome === 'approved_subject_to_conditions') {
      const policySnapshot = await auth.db.collection('configuration').doc('lendingPolicies').get();
      const policyViolations = validateAgreementAgainstPolicies(toAgreementPolicySubject({ ...application, agreementFacilityLimit }), policySnapshot.data() || {});
      if (policyViolations.length > 0) {
        return NextResponse.json({ success: false, error: policyViolations.join(' '), policyViolations }, { status: 400 });
      }
    }
    const now = new Date().toISOString();
    const decision = { outcome, clientFacilityLimit, agreementFacilityLimit, conditions: normalizeRequirementLines(body?.conditions), collateralRequirements: normalizeRequirementLines(body?.collateralRequirements), securityRequirements: normalizeRequirementLines(body?.securityRequirements), suretyRequirements: normalizeRequirementLines(body?.suretyRequirements), rationale, policyStatus: outcome === 'approved_subject_to_conditions' ? 'compliant' : 'not_applicable', decidedAt: now, decidedBy: auth.adminUid };
    await applicationRef.collection('creditCommitteeDecisions').doc('current').set(decision);
    await applicationRef.set({ creditCommitteeStatus: outcome, creditCommitteeDecision: decision, approvalLimit: outcome === 'approved_subject_to_conditions' ? (isGlobalFacilityCase ? clientFacilityLimit : agreementFacilityLimit) : null, conditions: decision.conditions, status: outcome === 'approved_subject_to_conditions' ? 'approved' : application.status, updatedAt: now }, { merge: true });
    const approvedFacilityId = isGlobalFacilityCase ? application.masterFacilityId : application.facilityId;
    if (outcome === 'approved_subject_to_conditions' && approvedFacilityId) {
      await auth.db.collection('facilities').doc(String(approvedFacilityId)).set({
        status: 'approved',
        limit: isGlobalFacilityCase ? clientFacilityLimit : agreementFacilityLimit,
        approvedLimit: isGlobalFacilityCase ? clientFacilityLimit : agreementFacilityLimit,
        facilityIndication: isGlobalFacilityCase ? {
          status: 'non_binding',
          amount: clientFacilityLimit,
          wording: `You have been approved for a client facility up to ${clientFacilityLimit} subject to a formal agreement application, product-specific terms, and final board approval. This is not a drawdown commitment and does not approve any specific factoring, working capital, or instalment sale transaction.`,
          issuedAt: now,
          issuedBy: auth.adminUid,
          agreementApplicationRequired: true,
          productTermsDeferred: true,
        } : undefined,
        approvedBy: auth.adminUid,
        approvedAt: now,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    await auth.db.collection('auditLogs').add({ action: 'lending_credit_committee_decision_recorded', applicationId, outcome, clientFacilityLimit, agreementFacilityLimit, actorId: auth.adminUid, timestamp: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true, data: decision });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Unable to record credit committee decision.' }, { status: 500 });
  }
}
