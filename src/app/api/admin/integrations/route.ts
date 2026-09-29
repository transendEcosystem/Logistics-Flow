import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp, verifyAdmin } from '@/lib/firebase-admin';
import { IntegrationRunStatus, isIntegrationProvider, isIntegrationRunStatus } from '@/lib/integrations/integration-run';

function requiredText(value: unknown): string {
  return String(value || '').trim();
}

export async function GET(request: NextRequest) {
  try {
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');
    const auth = await verifyAdmin(request);
    const url = new URL(request.url);
    const provider = url.searchParams.get('provider');
    const status = url.searchParams.get('status');
    let query = auth.db.collection('integrationRuns').orderBy('createdAt', 'desc').limit(200) as FirebaseFirestore.Query;
    if (provider && isIntegrationProvider(provider)) query = query.where('provider', '==', provider);
    if (status && isIntegrationRunStatus(status)) query = query.where('status', '==', status);
    const snapshot = await query.get();
    return NextResponse.json({ success: true, data: snapshot.docs.map((document) => ({ id: document.id, ...document.data() })) });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Unable to load integration runs.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');
    const auth = await verifyAdmin(request);
    const body = await request.json();
    const provider = requiredText(body?.provider);
    const operation = requiredText(body?.operation);
    const idempotencyKey = requiredText(body?.idempotencyKey);
    const status = requiredText(body?.status || 'queued') as IntegrationRunStatus;
    if (!isIntegrationProvider(provider) || !operation || !idempotencyKey || !isIntegrationRunStatus(status)) {
      return NextResponse.json({ success: false, error: 'provider, operation, idempotencyKey, and a valid status are required.' }, { status: 400 });
    }
    const existing = await auth.db.collection('integrationRuns').where('idempotencyKey', '==', idempotencyKey).limit(1).get();
    if (!existing.empty) return NextResponse.json({ success: true, duplicate: true, data: { id: existing.docs[0].id, ...existing.docs[0].data() } });
    const now = new Date().toISOString();
    const record = {
      provider,
      operation,
      status,
      idempotencyKey,
      externalReference: requiredText(body?.externalReference) || null,
      requestData: body?.requestData && typeof body.requestData === 'object' ? body.requestData : {},
      responseData: body?.responseData && typeof body.responseData === 'object' ? body.responseData : null,
      responseStatus: Number.isFinite(Number(body?.responseStatus)) ? Number(body.responseStatus) : null,
      errorCode: requiredText(body?.errorCode) || null,
      errorMessage: requiredText(body?.errorMessage) || null,
      createdAt: now,
      updatedAt: now,
      completedAt: ['succeeded', 'failed'].includes(status) ? now : null,
      initiatedBy: auth.adminUid,
      relatedEntityType: requiredText(body?.relatedEntityType) || null,
      relatedEntityId: requiredText(body?.relatedEntityId) || null,
    };
    const reference = await auth.db.collection('integrationRuns').add(record);
    await auth.db.collection('auditLogs').add({ action: 'integration_run_created', integrationRunId: reference.id, provider, operation, status, idempotencyKey, actorId: auth.adminUid, timestamp: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true, id: reference.id, data: { id: reference.id, ...record } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Unable to create integration run.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');
    const auth = await verifyAdmin(request);
    const body = await request.json();
    const runId = requiredText(body?.id);
    const status = requiredText(body?.status) as IntegrationRunStatus;
    if (!runId || !isIntegrationRunStatus(status)) return NextResponse.json({ success: false, error: 'id and a valid status are required.' }, { status: 400 });
    const reference = auth.db.collection('integrationRuns').doc(runId);
    if (!(await reference.get()).exists) return NextResponse.json({ success: false, error: 'Integration run not found.' }, { status: 404 });
    const now = new Date().toISOString();
    await reference.set({ status, responseData: body?.responseData || null, responseStatus: body?.responseStatus || null, errorCode: requiredText(body?.errorCode) || null, errorMessage: requiredText(body?.errorMessage) || null, updatedAt: now, completedAt: ['succeeded', 'failed'].includes(status) ? now : null }, { merge: true });
    await auth.db.collection('auditLogs').add({ action: 'integration_run_updated', integrationRunId: runId, status, actorId: auth.adminUid, timestamp: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true, id: runId, status });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Unable to update integration run.' }, { status: 500 });
  }
}
