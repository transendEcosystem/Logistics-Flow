import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp, verifyAdmin } from '@/lib/firebase-admin';

function text(value: unknown): string { return String(value || '').trim(); }

export async function POST(request: NextRequest) {
  try {
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');
    const auth = await verifyAdmin(request);
    const body = await request.json();
    const applicationId = text(body?.applicationId);
    const consentStatus = text(body?.consentStatus || 'obtained');
    const outcome = text(body?.outcome || 'completed');
    const notes = text(body?.notes);
    const bureauReference = text(body?.bureauReference);
    const provider = text(body?.provider || 'credit_bureau');
    const operation = text(body?.operation || 'lending_credit_check');
    const idempotencyKey = text(body?.idempotencyKey || `integration-${provider}-${applicationId}-${Date.now()}`);
    if (!applicationId) {
      return NextResponse.json({ success: false, error: 'applicationId is required.' }, { status: 400 });
    }
    if (outcome === 'completed' && consentStatus !== 'obtained' && !provider.includes('open_banking') && !provider.includes('cipc')) {
      return NextResponse.json({ success: false, error: 'A completed 3rd-party API check requires recorded applicant consent.' }, { status: 400 });
    }
    const applicationRef = auth.db.collection('lendingApplications').doc(applicationId);
    const applicationSnap = await applicationRef.get();
    const existing = await auth.db.collection('integrationRuns').where('idempotencyKey', '==', idempotencyKey).limit(1).get();
    if (!existing.empty) return NextResponse.json({ success: true, duplicate: true, data: { id: existing.docs[0].id, ...existing.docs[0].data() } });
    const now = new Date().toISOString();
    const run = await auth.db.collection('integrationRuns').add({ 
      provider, 
      operation, 
      status: outcome === 'completed' ? 'succeeded' : 'queued', 
      idempotencyKey, 
      requestData: { applicationId, consentStatus, outcome, notes: notes || null, ...body?.requestData }, 
      responseData: bureauReference ? { bureauReference, ...body?.responseData } : (body?.responseData || null), 
      createdAt: now, 
      updatedAt: now, 
      completedAt: outcome === 'completed' ? now : null, 
      initiatedBy: auth.adminUid, 
      relatedEntityType: 'lendingApplication', 
      relatedEntityId: applicationId 
    });
    const check = { id: run.id, applicationId, provider, operation, consentStatus, outcome, bureauReference: bureauReference || null, notes: notes || null, recordedAt: now, recordedBy: auth.adminUid, integrationRunId: run.id, responseData: body?.responseData || null };
    if (applicationSnap.exists) {
      await applicationRef.collection('creditBureauChecks').doc(run.id).set(check);
      await applicationRef.set({ creditBureauStatus: outcome, creditBureauConsentStatus: consentStatus, creditBureauCheckId: run.id, updatedAt: now }, { merge: true });
    }
    await auth.db.collection('auditLogs').add({ action: 'lending_3rd_party_api_call_completed', provider, operation, applicationId, integrationRunId: run.id, consentStatus, outcome, bureauReference: bureauReference || null, actorId: auth.adminUid, timestamp: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true, id: run.id, data: check }, { status: 201 });
  } catch (error: any) {
    console.error('Credit bureau workflow step failed:', error);
    return NextResponse.json({ success: false, error: error.message || 'Unable to record credit-bureau workflow step.' }, { status: 500 });
  }
}
