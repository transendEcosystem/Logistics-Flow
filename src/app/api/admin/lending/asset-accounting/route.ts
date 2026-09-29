import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp, verifyAdmin } from '@/lib/firebase-admin';
import { buildAssetAccountingEvent, AssetAccountingEventType } from '@/lib/lending/asset-accounting';

const eventTypes: AssetAccountingEventType[] = ['installment_sale_conclusion', 'lease_depreciation', 'rent_to_own_residual_settlement', 'discounting_cession'];
function text(value: unknown): string { return String(value || '').trim(); }

export async function GET(request: NextRequest) {
  try {
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');
    const auth = await verifyAdmin(request);
    const assetId = new URL(request.url).searchParams.get('assetId');
    let query = auth.db.collection('assetAccountingEvents').orderBy('effectiveDate', 'desc').limit(200) as FirebaseFirestore.Query;
    if (assetId) query = query.where('assetId', '==', assetId);
    const snapshot = await query.get();
    return NextResponse.json({ success: true, data: snapshot.docs.map((document) => ({ id: document.id, ...document.data() })) });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Unable to load asset accounting events.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');
    const auth = await verifyAdmin(request);
    const body = await request.json();
    const eventType = text(body?.eventType) as AssetAccountingEventType;
    const reference = text(body?.reference);
    const effectiveDate = text(body?.effectiveDate);
    const eventDate = text(body?.eventDate || effectiveDate);
    const amount = Number(body?.amount || 0);
    const assetId = text(body?.assetId) || undefined;
    const agreementId = text(body?.agreementId) || undefined;
    const clientId = text(body?.clientId) || undefined;
    const assetCost = body?.assetCost === undefined ? undefined : Number(body.assetCost);
    const accumulatedDepreciation = body?.accumulatedDepreciation === undefined ? undefined : Number(body.accumulatedDepreciation);
    if (!eventTypes.includes(eventType) || !reference || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate) || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: 'eventType, reference, eventDate, effectiveDate, and a positive amount are required.' }, { status: 400 });
    }
    const assetReference = assetId ? auth.db.collection('lendingAssets').doc(assetId) : null;
    const assetSnapshot = assetReference ? await assetReference.get() : null;
    const assetData = assetSnapshot?.data() || {};
    const assetControl = body?.assetControl || assetData.assetControl || {
      assetKind: assetData.assetKind || 'physical_asset',
      ownership: assetData.ownership || 'lender_inventory',
      treatment: assetData.treatment || 'acquired_for_resale',
      stockTreatment: assetData.stockTreatment,
      accountingStatus: assetData.accountingStatus,
    };
    if (!assetControl || typeof assetControl !== 'object') return NextResponse.json({ success: false, error: 'assetControl is required for an asset accounting event.' }, { status: 400 });
    if (eventType !== 'discounting_cession' && !assetReference) return NextResponse.json({ success: false, error: 'assetId is required for physical asset accounting events.' }, { status: 400 });
    const eventKey = `${eventType}-${reference}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 140);
    const eventReference = auth.db.collection('assetAccountingEvents').doc(eventKey);
    if ((await eventReference.get()).exists) return NextResponse.json({ success: true, duplicate: true, id: eventKey });
    const event = buildAssetAccountingEvent({ eventType, eventDate, effectiveDate, reference, amount, assetId, agreementId, clientId, assetControl, assetCost, accumulatedDepreciation });
    const now = new Date().toISOString();
    const batch = auth.db.batch();
    batch.set(eventReference, { id: eventKey, ...event, createdAt: now, createdBy: auth.adminUid });
    batch.set(auth.db.collection('accountingJournals').doc(eventKey), { id: eventKey, source: 'asset_accounting', ...event, createdAt: now, createdBy: auth.adminUid });
    if (eventType === 'rent_to_own_residual_settlement') {
      const counterRef = auth.db.collection('counters').doc('lendingInvoices');
      const invoiceNumber = await auth.db.runTransaction(async (transaction) => {
        const counterSnapshot = await transaction.get(counterRef);
        const nextNumber = Number(counterSnapshot.data()?.nextNumber || 1);
        transaction.set(counterRef, { nextNumber: nextNumber + 1, updatedAt: now }, { merge: true });
        return `LF-INV-${new Date().getUTCFullYear()}-${String(nextNumber).padStart(6, '0')}`;
      });
      const invoiceId = `rent-to-own-${eventKey}`;
      const invoice = { id: invoiceId, invoiceNumber, agreementId, assetId, companyName: assetData.clientName || clientId, date: now, effectiveDate, status: 'ISSUED', description: 'Rent-to-own residual / balloon settlement', subtotal: amount, totalAmount: amount, source: 'rent_to_own_residual_settlement', items: [{ description: 'Residual / balloon settlement', quantity: 1, unitPrice: amount, total: amount }] };
      batch.set(auth.db.collection('companies').doc(String(clientId || assetData.clientId)).collection('invoices').doc(invoiceId), invoice);
      batch.set(auth.db.collection('lendingClients').doc(String(clientId || assetData.clientId)).collection('invoices').doc(invoiceId), invoice);
      batch.set(eventReference, { invoiceId, invoiceNumber }, { merge: true });
    }
    if (assetReference && eventType !== 'lease_depreciation') {
      const nextStatus = eventType === 'installment_sale_conclusion' || eventType === 'rent_to_own_residual_settlement' ? 'released_to_borrower' : 'rights_only';
      batch.set(assetReference, { accountingStatus: nextStatus, ownership: 'borrower', releasedAt: effectiveDate, lastAccountingEventId: eventKey, updatedAt: now }, { merge: true });
    }
    await batch.commit();
    await auth.db.collection('auditLogs').add({ action: 'asset_accounting_event_posted', eventId: eventKey, eventType, reference, effectiveDate, actorId: auth.adminUid, timestamp: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true, id: eventKey, data: event });
  } catch (error: any) {
    console.error('Asset accounting event failed:', error);
    return NextResponse.json({ success: false, error: error.message || 'Unable to post asset accounting event.' }, { status: 500 });
  }
}
