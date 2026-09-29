import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp, verifyAdmin } from '@/lib/firebase-admin';
import { isBookingComplete, LendingBookingChecklist } from '@/lib/lending/booking';

export async function POST(request: NextRequest) {
  try {
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');
    const auth = await verifyAdmin(request);
    const body = await request.json();
    const agreementId = String(body?.agreementId || '').trim();
    if (!agreementId) return NextResponse.json({ success: false, error: 'agreementId is required.' }, { status: 400 });
    const agreementRef = auth.db.collection('agreements').doc(agreementId);
    const agreementSnapshot = await agreementRef.get();
    if (!agreementSnapshot.exists) return NextResponse.json({ success: false, error: 'Agreement not found.' }, { status: 404 });
    const agreement = agreementSnapshot.data() || {};
    if (agreement.status !== 'booking') return NextResponse.json({ success: false, error: `Only booking agreements can be released. Current status: ${agreement.status || 'unknown'}.` }, { status: 409 });
    const checklist = (agreement.bookingChecklist || body?.bookingChecklist || {}) as Partial<LendingBookingChecklist>;
    if (!isBookingComplete(checklist)) return NextResponse.json({ success: false, error: 'All booking preconditions must be complete before release.', missing: Object.keys(checklist).filter((key) => checklist[key as keyof LendingBookingChecklist] !== true) }, { status: 409 });
    if (agreement.creditCaseId) {
      const caseSnapshot = await auth.db.collection('lendingApplications').doc(String(agreement.creditCaseId)).get();
      const committeeConditions = Array.isArray(caseSnapshot.data()?.creditCommitteeDecision?.conditions) ? caseSnapshot.data()?.creditCommitteeDecision.conditions : [];
      const completedConditions = Array.isArray(agreement.completedCommitteeConditions) ? agreement.completedCommitteeConditions : [];
      const missingConditions = committeeConditions.filter((condition: string) => !completedConditions.includes(condition));
      if (missingConditions.length > 0) return NextResponse.json({ success: false, error: 'All Credit Committee conditions must be completed before release.', missingConditions }, { status: 409 });
    }
    const now = new Date().toISOString();
    const isInstallmentSale = agreement.type === 'installment-sale-term' || agreement.assetControl?.stockTreatment === 'exit_on_agreement_implementation';
    const batch = auth.db.batch();
    const releaseUpdate: Record<string, unknown> = { status: 'live', liveAt: now, releasedBy: auth.adminUid, bookingChecklist: checklist, updatedAt: now };
    if (isInstallmentSale) {
      const assetId = String(agreement.assetId || agreement.assetControl?.underlyingAssetId || '').trim();
      if (!assetId) return NextResponse.json({ success: false, error: 'An installment-sale agreement must have a linked physical asset before release.' }, { status: 409 });
      const assetRef = auth.db.collection('lendingAssets').doc(assetId);
      const assetSnapshot = await assetRef.get();
      if (!assetSnapshot.exists) return NextResponse.json({ success: false, error: 'Linked asset was not found in the Asset Register.' }, { status: 404 });
      const counterRef = auth.db.collection('counters').doc('lendingInvoices');
      const invoiceNumber = await auth.db.runTransaction(async (transaction) => {
        const counterSnapshot = await transaction.get(counterRef);
        const nextNumber = Number(counterSnapshot.data()?.nextNumber || 1);
        transaction.set(counterRef, { nextNumber: nextNumber + 1, updatedAt: now }, { merge: true });
        return `LF-INV-${new Date().getUTCFullYear()}-${String(nextNumber).padStart(6, '0')}`;
      });
      const invoiceId = `installment-sale-${agreementId}`;
      const invoice = { id: invoiceId, invoiceNumber, agreementId, assetId, companyName: agreement.clientName || agreement.clientId, date: now, effectiveDate: now.slice(0, 10), status: 'ISSUED', description: agreement.description || 'Installment sale of financed asset', subtotal: Number(agreement.totalAdvanced || 0), totalAmount: Number(agreement.totalAdvanced || 0), notes: 'Ownership does not pass until paid for in full', source: 'installment_sale_implementation', items: [{ description: agreement.description || 'Financed asset', quantity: 1, unitPrice: Number(agreement.totalAdvanced || 0), total: Number(agreement.totalAdvanced || 0) }] };
      const journalId = `installment-sale-implementation-${agreementId}`;
      batch.set(auth.db.collection('companies').doc(String(agreement.clientId)).collection('invoices').doc(invoiceId), invoice);
      batch.set(auth.db.collection('lendingClients').doc(String(agreement.clientId)).collection('invoices').doc(invoiceId), invoice);
      const saleAmount = Number(agreement.totalAdvanced || 0);
      const assetCost = Number(assetSnapshot.data()?.costOfSale || saleAmount);
      batch.set(auth.db.collection('assetAccountingEvents').doc(journalId), { id: journalId, eventType: 'installment_sale_implementation', agreementId, assetId, clientId: agreement.clientId, eventDate: now.slice(0, 10), effectiveDate: now.slice(0, 10), reference: invoiceNumber, amount: saleAmount, journalLines: [{ account: 'Asset Sale / Settlement Receivable', debit: saleAmount, credit: 0 }, { account: 'Asset Sales Revenue', debit: 0, credit: saleAmount }, { account: 'Cost of Asset Sales', debit: assetCost, credit: 0 }, { account: 'Stock / Asset Inventory', debit: 0, credit: assetCost }], createdAt: now, createdBy: auth.adminUid });
      batch.set(assetRef, { status: 'sold', accountingStatus: 'sold_pending_settlement', ownership: 'lender_conditional', invoiceId, agreementId, updatedAt: now }, { merge: true });
      releaseUpdate.invoiceId = invoiceId;
      releaseUpdate.invoiceNumber = invoiceNumber;
    }
    batch.set(agreementRef, releaseUpdate, { merge: true });
    await batch.commit();
    await auth.db.collection('auditLogs').add({ action: 'lending_agreement_released_to_live', agreementId, actorId: auth.adminUid, timestamp: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true, agreementId, status: 'live', liveAt: now });
  } catch (error: any) {
    console.error('Lending agreement release failed:', error);
    return NextResponse.json({ success: false, error: error.message || 'Unable to release lending agreement.' }, { status: 500 });
  }
}
