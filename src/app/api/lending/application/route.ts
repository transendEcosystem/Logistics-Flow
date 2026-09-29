'use server';

import { NextResponse } from 'next/server';
import { getAdminApp, verifyAdmin } from '@/lib/firebase-admin';
import { LENDING_APPLICATION_TRANSITIONS, LendingApplicationStatus, normalizeLendingApplication } from '@/lib/lending/operating-layer';
import { toAgreementPolicySubject, validateAgreementAgainstPolicies } from '@/lib/lending/policy-engine';

function removeUndefinedValues<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.filter((item) => item !== undefined).map((item) => removeUndefinedValues(item)) as T;
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, removeUndefinedValues(item)])
    ) as T;
  }
  return value;
}

function normalizedIdentity(value: unknown): string {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function recordDate(record: Record<string, any>): string {
  const value = record.createdAt || record.updatedAt || record.submittedAt;
  if (value?.toDate) return value.toDate().toISOString();
  return value ? String(value) : new Date(0).toISOString();
}

async function resolveEngagementHistory(db: FirebaseFirestore.Firestore, clientId?: string, clientName?: string, email?: string) {
  if (!clientId && !clientName && !email) return { originationType: undefined, originationSourceId: undefined, engagementEvents: [] };

  const clientKeys = [clientId, clientName, email].map(normalizedIdentity).filter(Boolean);
  const [quoteSnapshot, enquirySnapshot] = await Promise.all([
    db.collectionGroup('quotes').limit(500).get(),
    db.collectionGroup('enquiries').limit(500).get(),
  ]);
  const matches = [
    ...quoteSnapshot.docs.map((document) => ({ id: document.id, sourceType: 'quote' as const, data: document.data() })),
    ...enquirySnapshot.docs.map((document) => ({ id: document.id, sourceType: 'enquiry' as const, data: document.data() })),
  ].filter((record) => {
    const data = record.data as any;
    const recordKeys = [data.clientId, data.applicantId, data.userId, data.companyId, data.companyName, data.companyLegalName, data.name, data.email, data.contactEmail]
      .map(normalizedIdentity)
      .filter(Boolean);
    return recordKeys.some((key) => clientKeys.includes(key));
  }).sort((first, second) => recordDate(second.data).localeCompare(recordDate(first.data)));

  return {
    originationType: matches[0]?.sourceType,
    originationSourceId: matches[0]?.id,
    engagementEvents: matches.map((record) => ({
      type: record.sourceType,
      occurredAt: recordDate(record.data),
      sourceId: record.id,
      metadata: {
        fundingType: record.data.fundingType || record.data.fundingNeed || null,
        amountRequested: record.data.amountRequested || record.data.amount || null,
        status: record.data.status || null,
      },
    })),
  };
}

export async function POST(request: Request) {
  try {
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');

    const auth = await verifyAdmin(request as any);
    const db = auth.db;
    const body = await request.json();
    const payload = body?.payload || body || {};

    const normalized = normalizeLendingApplication(payload);
    const applicationId = String(payload?.id || payload?.applicationId || '').trim();
    const isGlobalFacilityCase = Boolean(normalized.masterFacilityId && !normalized.facilityId);
    const engagementHistory = await resolveEngagementHistory(db, normalized.clientId, normalized.companyName, normalized.email);

    if (!normalized.companyName || (!isGlobalFacilityCase && !normalized.amountRequested)) {
      return NextResponse.json({
        success: false,
        error: isGlobalFacilityCase ? 'companyName is required.' : 'companyName and amountRequested are required.'
      }, { status: 400 });
    }

    const policySnapshot = await db.collection('configuration').doc('lendingPolicies').get();
    const policySubject = toAgreementPolicySubject(payload);
    const policyViolations = isGlobalFacilityCase ? [] : validateAgreementAgainstPolicies(policySubject, policySnapshot.data() || {});
    if (policyViolations.length > 0) {
      return NextResponse.json({
        success: false,
        error: policyViolations.join(' '),
        policyViolations,
      }, { status: 400 });
    }

    const baseRecord = removeUndefinedValues({
      ...normalized,
      caseType: isGlobalFacilityCase ? 'global_facility_indication' : 'agreement_facility_case',
      originationType: normalized.originationType || engagementHistory.originationType || 'admin',
      originationSourceId: normalized.originationSourceId || engagementHistory.originationSourceId,
      engagementEvents: engagementHistory.engagementEvents.length ? engagementHistory.engagementEvents : normalized.engagementEvents,
      contactCompleteness: {
        emailProvided: Boolean(normalized.email),
        phoneProvided: Boolean(normalized.phone),
        status: normalized.email || normalized.phone ? 'partially_complete' : 'follow_up_required',
      },
      policyStatus: 'compliant',
      policySubject,
      policyViolations: [],
      policyEvaluatedAt: new Date().toISOString(),
      status: normalized.status || 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      submittedAt: normalized.submittedAt || (normalized.status === 'submitted' ? new Date().toISOString() : null),
      linkedCaseKey: normalized.clientId && (normalized.facilityId || normalized.masterFacilityId) ? `${normalized.clientId}:${normalized.facilityId || normalized.masterFacilityId}` : undefined,
      sourceSnapshot: {
        clientId: normalized.clientId || null,
        facilityId: normalized.facilityId || null,
        masterFacilityId: normalized.masterFacilityId || null,
        capturedAt: new Date().toISOString(),
      },
      facilityIndication: isGlobalFacilityCase ? {
        status: 'non_binding',
        wording: 'You have been approved for a client facility up to the amount determined by Credit, subject to a formal agreement application and final board approval. This indication is not a drawdown commitment.',
        issuedAt: new Date().toISOString(),
        committeeDetermined: true,
      } : undefined,
    });

    if (applicationId) {
      await db.collection('lendingApplications').doc(applicationId).set(baseRecord, { merge: true });
      return NextResponse.json({ success: true, id: applicationId, message: 'Linked credit case updated successfully.' }, { status: 200 });
    }

    let ref;
    if (normalized.clientId && (normalized.facilityId || normalized.masterFacilityId)) {
      const existing = await db.collection('lendingApplications')
        .where('clientId', '==', normalized.clientId)
        .get();
      const existingCase = existing.docs.find((doc) => {
        const data = doc.data();
        return normalized.facilityId
          ? data.facilityId === normalized.facilityId
          : data.masterFacilityId === normalized.masterFacilityId && !data.facilityId;
      });
      ref = !existingCase
        ? await db.collection('lendingApplications').add(baseRecord)
        : existingCase.ref;
      if (existingCase) await ref.set(baseRecord, { merge: true });
    } else {
      ref = await db.collection('lendingApplications').add(baseRecord);
    }
    return NextResponse.json({ success: true, id: ref.id, message: 'Linked credit case submitted successfully.' }, { status: 200 });
  } catch (error: any) {
    console.error('Lending application save failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Unable to save lending application.'
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');

    const auth = await verifyAdmin(request as any);
    const db = auth.db;
    const url = new URL(request.url);
    const applicationId = url.searchParams.get('id');

    if (applicationId) {
      const snapshot = await db.collection('lendingApplications').doc(applicationId).get();
      if (!snapshot.exists) {
        return NextResponse.json({ success: false, error: 'Application not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: { id: snapshot.id, ...snapshot.data() } }, { status: 200 });
    }

    const snapshot = await db.collection('lendingApplications').orderBy('updatedAt', 'desc').limit(200).get();
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ success: true, data: items }, { status: 200 });
  } catch (error: any) {
    console.error('Lending application query failed:', error);
    return NextResponse.json({ success: false, error: error.message || 'Unable to load lending applications.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');

    const auth = await verifyAdmin(request as any);
    const db = auth.db;
    const body = await request.json();
    const applicationId = String(body?.id || body?.applicationId || '').trim();
    const nextStatus = String(body?.status || '').trim() as LendingApplicationStatus;
    const decisionNotes = String(body?.decisionNotes || '').trim();
    const riskBand = String(body?.riskBand || '').trim();
    const approvalLimit = body?.approvalLimit === undefined ? undefined : Number(body.approvalLimit);
    const offerTerms = String(body?.offerTerms || '').trim();
    const conditions = Array.isArray(body?.conditions)
      ? body.conditions.map((condition: unknown) => String(condition).trim()).filter(Boolean)
      : undefined;

    if (!applicationId || !nextStatus || !Object.prototype.hasOwnProperty.call(LENDING_APPLICATION_TRANSITIONS, nextStatus)) {
      return NextResponse.json({ success: false, error: 'A valid application id and status are required.' }, { status: 400 });
    }

    const applicationRef = db.collection('lendingApplications').doc(applicationId);
    const snapshot = await applicationRef.get();
    if (!snapshot.exists) {
      return NextResponse.json({ success: false, error: 'Application not found.' }, { status: 404 });
    }

    const currentStatus = String(snapshot.data()?.status || 'draft') as LendingApplicationStatus;
    if (nextStatus !== currentStatus && !LENDING_APPLICATION_TRANSITIONS[currentStatus]?.includes(nextStatus)) {
      return NextResponse.json({ success: false, error: `Cannot move an application from ${currentStatus} to ${nextStatus}.` }, { status: 409 });
    }

    const now = new Date().toISOString();
    const update: Record<string, unknown> = {
      status: nextStatus,
      updatedAt: now,
      decisionAt: now,
      decisionNotes: decisionNotes || null,
      decisionBy: auth.adminUid,
    };
    if (riskBand) update.riskBand = riskBand;
    if (approvalLimit !== undefined && Number.isFinite(approvalLimit) && approvalLimit >= 0) update.approvalLimit = approvalLimit;
    if (offerTerms) update.offerTerms = offerTerms;
    if (conditions) update.conditions = conditions;
    if (nextStatus === 'under_review' && !snapshot.data()?.submittedAt) update.submittedAt = now;
    if (nextStatus === 'offer_issued') update.offerIssuedAt = now;
    if (nextStatus === 'offer_accepted') {
      update.offerAcceptedAt = now;
      update.offerAcceptedBy = auth.adminUid;
    }

    await applicationRef.set(update, { merge: true });
    await db.collection('auditLogs').add({
      action: nextStatus === currentStatus ? 'lending_application_decision_updated' : 'lending_application_status_changed',
      applicationId,
      previousStatus: currentStatus,
      status: nextStatus,
      decisionNotes: decisionNotes || null,
      actorId: auth.adminUid,
      timestamp: now,
    });

    return NextResponse.json({ success: true, id: applicationId, status: nextStatus }, { status: 200 });
  } catch (error: any) {
    console.error('Lending application transition failed:', error);
    return NextResponse.json({ success: false, error: error.message || 'Unable to update lending application.' }, { status: 500 });
  }
}
