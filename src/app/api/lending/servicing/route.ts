'use server';

import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp, verifyAdmin } from '@/lib/firebase-admin';
import { buildRepaymentSchedule, getInstallmentStatus } from '@/lib/lending/servicing';

function transactionId(applicationId: string, source: string, reference: string): string {
  return `${applicationId}-${source}-${reference}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 140);
}

export async function GET(request: Request) {
  try {
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');
    const auth = await verifyAdmin(request as any);
    const applicationId = new URL(request.url).searchParams.get('applicationId');
    if (!applicationId) return NextResponse.json({ success: false, error: 'applicationId is required.' }, { status: 400 });
    const snapshot = await auth.db.collection('lendingApplications').doc(applicationId).get();
    if (!snapshot.exists) return NextResponse.json({ success: false, error: 'Application not found.' }, { status: 404 });
    const installments = await auth.db.collection('lendingApplications').doc(applicationId).collection('repaymentSchedule').orderBy('installmentNumber', 'asc').get();
    const transactions = await auth.db.collection('transactions').where('applicationId', '==', applicationId).get();
    return NextResponse.json({
      success: true,
      data: installments.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      transactions: transactions.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Unable to load repayment schedule.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');
    const auth = await verifyAdmin(request as any);
    const body = await request.json();
    const action = String(body?.action || '').trim();
    const applicationId = String(body?.applicationId || '').trim();
    if (!applicationId && !['raise_installments_global', 'invoice_raised_installments'].includes(action) || (applicationId && !['generate_schedule', 'raise_installment', 'post_payment', 'post_receipt', 'post_adjustment', 'close_facility'].includes(action))) {
      return NextResponse.json({ success: false, error: 'applicationId and a valid servicing action are required.' }, { status: 400 });
    }

    if (action === 'invoice_raised_installments') {
      const month = String(body?.month || '').trim();
      const effectiveDate = String(body?.effectiveDate || new Date().toISOString().slice(0, 10)).trim();
      if (!/^\d{4}-\d{2}$/.test(month) || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) return NextResponse.json({ success: false, error: 'month and effectiveDate are required.' }, { status: 400 });
      const applicationsSnapshot = await auth.db.collection('lendingApplications').get();
      const invoices: Array<{ invoiceNumber: string; applicationId: string; installmentId: string }> = [];
      for (const applicationDocument of applicationsSnapshot.docs) {
        const application = applicationDocument.data();
        const clientId = String(application.clientId || applicationDocument.id);
        const scheduleSnapshot = await applicationDocument.ref.collection('repaymentSchedule').get();
        for (const installmentDocument of scheduleSnapshot.docs) {
          const installment = installmentDocument.data();
          if (String(installment.raisedAt || '').slice(0, 7) !== month || installment.invoiceNumber) continue;
          const agreementType = String(application.agreementType || application.type || application.facilityType || '').toLowerCase();
          const isInstallmentSale = agreementType.includes('installment') || application.assetControl?.treatment === 'deferred_sale' || application.assetControl?.stockTreatment === 'exit_on_agreement_implementation';
          const invoiceId = `${applicationDocument.id}-${installmentDocument.id}`;
          const invoiceRef = auth.db.collection('companies').doc(clientId).collection('invoices').doc(invoiceId);
          const clientInvoiceRef = auth.db.collection('lendingClients').doc(clientId).collection('invoices').doc(invoiceId);
          const existingInvoice = await invoiceRef.get();
          if (existingInvoice.exists) {
            const existingNumber = String(existingInvoice.data()?.invoiceNumber || '');
            if (existingNumber) {
              await installmentDocument.ref.set({ invoiceId, invoiceNumber: existingNumber }, { merge: true });
              continue;
            }
          }
          const invoiceNumber = await auth.db.runTransaction(async (transaction) => {
            const counterRef = auth.db.collection('counters').doc('lendingInvoices');
            const counterSnapshot = await transaction.get(counterRef);
            const nextNumber = Number(counterSnapshot.data()?.nextNumber || 1);
            transaction.set(counterRef, { nextNumber: nextNumber + 1, updatedAt: new Date().toISOString() }, { merge: true });
            return `LF-INV-${new Date().getUTCFullYear()}-${String(nextNumber).padStart(6, '0')}`;
          });
          const invoice = {
            id: invoiceId,
            invoiceNumber,
            applicationId: applicationDocument.id,
            installmentId: installmentDocument.id,
            companyName: application.companyName || clientId,
            date: effectiveDate,
            effectiveDate,
            installmentDate: installment.dueDate,
            dueDate: installment.dueDate,
            status: 'ISSUED',
            description: `Lending installment ${installment.installmentNumber}`,
            notes: isInstallmentSale ? 'Ownership does not pass until paid for in full' : null,
            subtotal: Number(installment.amountDue || 0),
            totalAmount: Number(installment.amountDue || 0),
            items: [{ description: `Installment ${installment.installmentNumber}`, quantity: 1, unitPrice: Number(installment.amountDue || 0), total: Number(installment.amountDue || 0) }],
            source: 'lending_installment',
          };
          const batch = auth.db.batch();
          batch.set(invoiceRef, invoice);
          batch.set(clientInvoiceRef, invoice);
          batch.set(installmentDocument.ref, { invoiceId, invoiceNumber, invoicedAt: invoice.date }, { merge: true });
          await batch.commit();
          invoices.push({ invoiceNumber, applicationId: applicationDocument.id, installmentId: installmentDocument.id });
        }
      }
      await auth.db.collection('auditLogs').add({ action: 'lending_installment_invoices_generated', month, effectiveDate, count: invoices.length, invoices, actorId: auth.adminUid, timestamp: FieldValue.serverTimestamp() });
      return NextResponse.json({ success: true, month, effectiveDate, count: invoices.length, invoices });
    }

    if (action === 'raise_installments_global') {
      const month = String(body?.month || '').trim();
      const effectiveDate = String(body?.effectiveDate || '').trim();
      if (!/^\d{4}-\d{2}$/.test(month) || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) return NextResponse.json({ success: false, error: 'month and effectiveDate are required.' }, { status: 400 });
      const applicationsSnapshot = await auth.db.collection('lendingApplications').where('servicingStatus', '==', 'active').get();
      const batch = auth.db.batch();
      const raised: string[] = [];
      for (const applicationDocument of applicationsSnapshot.docs) {
        const scheduleSnapshot = await applicationDocument.ref.collection('repaymentSchedule').get();
        for (const installmentDocument of scheduleSnapshot.docs) {
          const installment = installmentDocument.data();
          if (String(installment.dueDate || '').slice(0, 7) !== month || installment.raisedAt) continue;
          const now = new Date().toISOString();
          const transactionRef = auth.db.collection('transactions').doc(transactionId(applicationDocument.id, 'installment_raise', installmentDocument.id));
          batch.set(installmentDocument.ref, { raisedAt: effectiveDate, raisedForMonth: month, raisedBy: auth.adminUid, updatedAt: now }, { merge: true });
          batch.set(transactionRef, { applicationId: applicationDocument.id, clientId: applicationDocument.data()?.clientId || applicationDocument.id, date: effectiveDate, effectiveDate, installmentDate: installment.dueDate, dueDate: installment.dueDate, raisedForMonth: month, description: `Installment ${installment.installmentNumber} raised and now due`, type: 'debit', amount: installment.amountDue, reference: installmentDocument.id, source: 'installment_raise', createdBy: auth.adminUid });
          raised.push(`${applicationDocument.id}:${installmentDocument.id}`);
        }
      }
      if (raised.length) await batch.commit();
      await auth.db.collection('auditLogs').add({ action: 'lending_installments_raised_global', month, effectiveDate, count: raised.length, installmentIds: raised, actorId: auth.adminUid, timestamp: FieldValue.serverTimestamp() });
      return NextResponse.json({ success: true, month, effectiveDate, count: raised.length, installmentIds: raised });
    }

    const applicationRef = auth.db.collection('lendingApplications').doc(applicationId);
    const applicationSnapshot = await applicationRef.get();
    if (!applicationSnapshot.exists) return NextResponse.json({ success: false, error: 'Application not found.' }, { status: 404 });
    const application = applicationSnapshot.data() || {};

    if (action === 'generate_schedule') {
      const principal = Number(body?.principal || application.approvalLimit || application.amountRequested || 0);
      const annualInterestRate = Number(body?.annualInterestRate || 0);
      const termMonths = Number(body?.termMonths || application.termMonths || 0);
      const firstDueDate = String(body?.firstDueDate || '').trim();
      if (!Number.isFinite(principal) || principal <= 0 || !Number.isFinite(annualInterestRate) || annualInterestRate < 0 || !Number.isInteger(termMonths) || termMonths <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(firstDueDate)) {
        return NextResponse.json({ success: false, error: 'principal, annualInterestRate, termMonths, and firstDueDate are required.' }, { status: 400 });
      }
      const schedule = buildRepaymentSchedule({ applicationId, principal, annualInterestRate, termMonths, firstDueDate });
      const batch = auth.db.batch();
      schedule.forEach((installment) => {
        batch.set(applicationRef.collection('repaymentSchedule').doc(installment.id), installment);
      });
      batch.set(applicationRef, { servicingStatus: 'active', repaymentPrincipal: principal, annualInterestRate, repaymentTermMonths: termMonths, firstDueDate, scheduleGeneratedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, { merge: true });
      await batch.commit();
      return NextResponse.json({ success: true, count: schedule.length, monthlyPayment: schedule[0]?.amountDue });
    }

    if (action === 'raise_installment') {
      const installmentId = String(body?.installmentId || '').trim();
      if (!installmentId) return NextResponse.json({ success: false, error: 'installmentId is required.' }, { status: 400 });
      const installmentRef = applicationRef.collection('repaymentSchedule').doc(installmentId);
      const installmentSnapshot = await installmentRef.get();
      if (!installmentSnapshot.exists) return NextResponse.json({ success: false, error: 'Installment not found.' }, { status: 404 });
      const installment = installmentSnapshot.data() || {};
      const transactionRef = auth.db.collection('transactions').doc(transactionId(applicationId, 'installment_raise', installmentId));
      if (installment.raisedAt || (await transactionRef.get()).exists) return NextResponse.json({ success: true, duplicate: true, data: installment });
      const now = new Date().toISOString();
      const batch = auth.db.batch();
      batch.set(installmentRef, { raisedAt: now, raisedBy: auth.adminUid, updatedAt: now }, { merge: true });
      batch.set(transactionRef, { applicationId, clientId: application.clientId || applicationId, date: now, dueDate: installment.dueDate, description: `Installment ${installment.installmentNumber} raised and now due`, type: 'debit', amount: installment.amountDue, reference: installmentId, source: 'installment_raise', createdBy: auth.adminUid });
      await batch.commit();
      await auth.db.collection('auditLogs').add({ action: 'lending_installment_raised', applicationId, installmentId, amount: installment.amountDue, actorId: auth.adminUid, timestamp: FieldValue.serverTimestamp() });
      return NextResponse.json({ success: true, installmentId, raisedAt: now, status: 'now_due' });
    }

    if (action === 'post_payment' || action === 'post_receipt') {
      const installmentId = String(body?.installmentId || '').trim();
      const amount = Number(body?.amount || 0);
      const reference = String(body?.reference || '').trim();
      if (!installmentId || !Number.isFinite(amount) || amount <= 0 || !reference) return NextResponse.json({ success: false, error: 'installmentId, positive amount, and reference are required.' }, { status: 400 });
      const paymentRef = applicationRef.collection('repaymentSchedule').doc(installmentId);
      const paymentSnapshot = await paymentRef.get();
      if (!paymentSnapshot.exists) return NextResponse.json({ success: false, error: 'Installment not found.' }, { status: 404 });
      const installment = paymentSnapshot.data() || {};
      if (!installment.raisedAt) return NextResponse.json({ success: false, error: 'A receipt can only be allocated to an installment that has been raised.' }, { status: 409 });
      const remaining = Number(installment.amountDue || 0) - Number(installment.amountPaid || 0);
      if (amount > remaining + 0.01) return NextResponse.json({ success: false, error: 'Payment exceeds the installment balance.' }, { status: 409 });
      const receiptRef = auth.db.collection('transactions').doc(transactionId(applicationId, 'bank_receipt', reference));
      const receiptSnapshot = await receiptRef.get();
      if (receiptSnapshot.exists) {
        return NextResponse.json({ success: true, duplicate: true, data: receiptSnapshot.data() });
      }
      const amountPaid = Number((Number(installment.amountPaid || 0) + amount).toFixed(2));
      const status = getInstallmentStatus(String(installment.dueDate), Number(installment.amountDue || 0), amountPaid);
      const batch = auth.db.batch();
      batch.set(paymentRef, { amountPaid, status, paidAt: status === 'paid' ? new Date().toISOString() : null, lastPaymentReference: reference, updatedAt: new Date().toISOString() }, { merge: true });
      batch.set(receiptRef, {
        applicationId,
        clientId: application.clientId || applicationId,
        installmentId,
        date: new Date().toISOString(),
        description: `Bank receipt for installment ${installment.installmentNumber}`,
        type: 'credit',
        amount,
        reference,
        source: 'bank_receipt',
        createdBy: auth.adminUid,
      });
      await batch.commit();
      await auth.db.collection('auditLogs').add({ action: 'lending_receipt_posted', applicationId, installmentId, amount, reference, actorId: auth.adminUid, timestamp: FieldValue.serverTimestamp() });
      return NextResponse.json({ success: true, installmentId, amountPaid, status });
    }

    if (action === 'post_adjustment') {
      const amount = Number(body?.amount || 0);
      const type = String(body?.type || '').trim();
      const reference = String(body?.reference || '').trim();
      const description = String(body?.description || '').trim();
      if (!Number.isFinite(amount) || amount <= 0 || !['debit', 'credit'].includes(type) || !reference || !description) {
        return NextResponse.json({ success: false, error: 'A positive amount, debit or credit type, reference, and description are required.' }, { status: 400 });
      }
      const adjustmentRef = auth.db.collection('transactions').doc(transactionId(applicationId, 'adjustment', reference));
      if ((await adjustmentRef.get()).exists) return NextResponse.json({ success: true, duplicate: true });
      await adjustmentRef.set({ applicationId, clientId: application.clientId || applicationId, date: new Date().toISOString(), description, type, amount, reference, source: 'adjustment', createdBy: auth.adminUid });
      await auth.db.collection('auditLogs').add({ action: 'lending_adjustment_posted', applicationId, amount, type, reference, actorId: auth.adminUid, timestamp: FieldValue.serverTimestamp() });
      return NextResponse.json({ success: true, reference, type, amount });
    }

    const ledger = await auth.db.collection('transactions').where('applicationId', '==', applicationId).get();
    const outstanding = ledger.docs.reduce((total, doc) => {
      const transaction = doc.data();
      return total + (transaction.type === 'debit' ? Number(transaction.amount || 0) : -Number(transaction.amount || 0));
    }, 0);
    if (outstanding > 0.01) return NextResponse.json({ success: false, error: 'A facility can only be closed when the repayment balance is settled.' }, { status: 409 });
    await applicationRef.set({ servicingStatus: 'closed', facilityClosedAt: new Date().toISOString(), facilityClosedBy: auth.adminUid, updatedAt: new Date().toISOString() }, { merge: true });
    await auth.db.collection('auditLogs').add({ action: 'lending_facility_closed', applicationId, actorId: auth.adminUid, timestamp: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true, status: 'closed' });
  } catch (error: any) {
    console.error('Lending servicing action failed:', error);
    return NextResponse.json({ success: false, error: error.message || 'Unable to process servicing action.' }, { status: 500 });
  }
}
