import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

function serialize(value: any): any {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serialize(item)]));
  }
  return value;
}

export async function GET(req: NextRequest) {
  try {
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');

    const authorization = req.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Missing or invalid token.' }, { status: 401 });
    }

    const decodedToken = await getAuth(app).verifyIdToken(authorization.slice('Bearer '.length));
    const db = getFirestore(app);
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    const companyId = userDoc.data()?.companyId;
    if (!companyId) {
      return NextResponse.json({ success: false, error: 'Could not determine your company.' }, { status: 400 });
    }

    const companyRef = db.collection('companies').doc(companyId);
    const [companyDoc, ledgerSnapshot, applicationSnapshot] = await Promise.all([
      companyRef.get(),
      companyRef.collection('commissionLedger').orderBy('earnedAt', 'desc').limit(100).get(),
      db.collection('partners').where('linkedCompanyId', '==', companyId).where('type', '==', 'isa').limit(1).get(),
    ]);
    const company = companyDoc.data() || {};
    const entries = ledgerSnapshot.docs.map(entry => serialize({ id: entry.id, ...entry.data() }));
    const application = applicationSnapshot.docs[0]?.data();

    return NextResponse.json({
      success: true,
      isaStatus: company.isaStatus || 'inactive',
      isaApplicationStatus: application?.applicationStatus || null,
      availableBalance: Number(company.availableBalance || 0),
      entries,
    });
  } catch (error: any) {
    console.error('Error in /api/getEarnings:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error.' }, { status: 500 });
  }
}