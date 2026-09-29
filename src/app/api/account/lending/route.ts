import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    const token = authorization.slice('Bearer '.length);
    const decoded = await getAuth(app).verifyIdToken(token);
    const db = getFirestore(app);
    const userSnapshot = await db.collection('users').doc(decoded.uid).get();
    const companyId = String(userSnapshot.data()?.companyId || '').trim();
    if (!companyId) return NextResponse.json({ success: true, data: { applications: [], invoices: [], documents: [] } });

    const applicationsSnapshot = await db.collection('lendingApplications').limit(500).get();
    const applications = applicationsSnapshot.docs
      .filter((document) => document.data().companyId === companyId || String(document.data().email || '').toLowerCase() === String(decoded.email || '').toLowerCase())
      .map((document) => ({ id: document.id, ...document.data() }));
    const applicationIds = applications.map((application) => application.id);
    const schedules: any[] = [];
    const transactionsSnapshot = applicationIds.length
      ? await db.collection('transactions').where('clientId', '==', companyId).limit(500).get()
      : { docs: [] } as any;
    for (const application of applications) {
      const scheduleSnapshot = await db.collection('lendingApplications').doc(application.id).collection('repaymentSchedule').orderBy('installmentNumber', 'asc').get();
      schedules.push(...scheduleSnapshot.docs.map((document) => ({ applicationId: application.id, id: document.id, ...document.data() })));
    }
    const invoicesSnapshot = await db.collection('companies').doc(companyId).collection('invoices').orderBy('date', 'desc').limit(200).get();
    const documentsSnapshot = await db.collection('lendingClients').doc(companyId).collection('documents').orderBy('createdAt', 'desc').limit(200).get();
    return NextResponse.json({ success: true, data: {
      applications,
      schedules,
      transactions: transactionsSnapshot.docs.filter((document: any) => applicationIds.includes(document.data().applicationId)).map((document: any) => ({ id: document.id, ...document.data() })),
      invoices: invoicesSnapshot.docs.filter((document) => document.data().source === 'lending_installment' || applicationIds.includes(document.data().applicationId)).map((document) => ({ id: document.id, ...document.data() })),
      documents: documentsSnapshot.docs.map((document) => ({ id: document.id, ...document.data() })),
    } });
  } catch (error: any) {
    console.error('Client lending account load failed:', error);
    return NextResponse.json({ success: false, error: error.message || 'Unable to load lending account.' }, { status: 500 });
  }
}