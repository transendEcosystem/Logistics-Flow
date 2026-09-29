import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp, verifyAdmin } from '@/lib/firebase-admin';
import { buildAccountingJournalBatch } from '@/lib/integrations/accounting-export';

function text(value: unknown): string { return String(value || '').trim(); }

export async function POST(request: NextRequest) {
  try {
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');
    const auth = await verifyAdmin(request);
    const body = await request.json();
    const applicationId = text(body?.applicationId) || undefined;
    const period = text(body?.period) || undefined;
    const idempotencyKey = text(body?.idempotencyKey);
    if (!idempotencyKey || (!applicationId && !period) || (period && !/^\d{4}-\d{2}$/.test(period))) {
      return NextResponse.json({ success: false, error: 'idempotencyKey and applicationId or YYYY-MM period are required.' }, { status: 400 });
    }
    const existing = await auth.db.collection('integrationRuns').where('idempotencyKey', '==', idempotencyKey).limit(1).get();
    if (!existing.empty) return NextResponse.json({ success: true, duplicate: true, data: { id: existing.docs[0].id, ...existing.docs[0].data() } });

    let query = auth.db.collection('transactions').where('type', 'in', ['debit', 'credit']) as FirebaseFirestore.Query;
    if (applicationId) query = query.where('applicationId', '==', applicationId);
    const snapshot = await query.get();
    const transactions = snapshot.docs
      .map((document) => ({ id: document.id, ...document.data() }))
      .filter((transaction: any) => !period || String(transaction.effectiveDate || transaction.date || '').slice(0, 7) === period);
    const journal = buildAccountingJournalBatch(transactions, applicationId, period);
    if (journal.totalDebit !== journal.totalCredit) throw new Error('Accounting journal is not balanced.');
    const now = new Date().toISOString();
    const run = await auth.db.collection('integrationRuns').add({ provider: 'accounting', operation: 'export_lending_transactions', status: 'queued', idempotencyKey, requestData: { applicationId: applicationId || null, period: period || null }, responseData: { lineCount: journal.lines.length, totalDebit: journal.totalDebit, totalCredit: journal.totalCredit }, createdAt: now, updatedAt: now, initiatedBy: auth.adminUid, relatedEntityType: applicationId ? 'lendingApplication' : 'accountingPeriod', relatedEntityId: applicationId || period });
    await auth.db.collection('accountingExports').doc(run.id).set({ id: run.id, ...journal, status: 'prepared', createdAt: now, createdBy: auth.adminUid });
    await auth.db.collection('auditLogs').add({ action: 'accounting_export_prepared', integrationRunId: run.id, applicationId: applicationId || null, period: period || null, lineCount: journal.lines.length, actorId: auth.adminUid, timestamp: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true, id: run.id, status: 'prepared', data: { ...journal, integrationRunId: run.id } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Unable to prepare accounting export.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');
    const auth = await verifyAdmin(request);
    const body = await request.json();
    const exportId = text(body?.exportId);
    const reconciliationId = text(body?.reconciliationId);
    if (!exportId || !reconciliationId) return NextResponse.json({ success: false, error: 'exportId and reconciliationId are required.' }, { status: 400 });
    const exportReference = auth.db.collection('accountingExports').doc(exportId);
    if (!(await exportReference.get()).exists) return NextResponse.json({ success: false, error: 'Accounting export not found.' }, { status: 404 });
    const now = new Date().toISOString();
    await exportReference.set({ status: 'reconciled', reconciliationId, reconciledAt: now, reconciledBy: auth.adminUid }, { merge: true });
    await auth.db.collection('integrationRuns').doc(exportId).set({ status: 'succeeded', externalReference: reconciliationId, updatedAt: now, completedAt: now, responseData: { reconciliationId } }, { merge: true });
    await auth.db.collection('auditLogs').add({ action: 'accounting_export_reconciled', integrationRunId: exportId, reconciliationId, actorId: auth.adminUid, timestamp: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true, exportId, reconciliationId, status: 'reconciled' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Unable to reconcile accounting export.' }, { status: 500 });
  }
}
