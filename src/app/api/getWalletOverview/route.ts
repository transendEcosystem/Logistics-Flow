import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';

function serialize(value: any): any {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serialize(item)]));
  return value;
}

export const dynamic = 'force-dynamic';

function timestampValue(value: any): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === 'string') return new Date(value).getTime() || 0;
  return 0;
}

export async function GET(req: NextRequest) {
  try {
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');
    const authorization = req.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });

    const decodedToken = await getAuth(app).verifyIdToken(authorization.slice('Bearer '.length));
    const db = getFirestore(app);
    const user = await db.collection('users').doc(decodedToken.uid).get();
    const companyId = user.data()?.companyId;
    if (!companyId) return NextResponse.json({ success: false, error: 'Could not determine your company.' }, { status: 400 });

    const companyRef = db.collection('companies').doc(companyId);
    const [company, transactions, payments] = await Promise.all([
      companyRef.get(),
      companyRef.collection('transactions').limit(50).get(),
      companyRef.collection('walletPayments').limit(50).get(),
    ]);
    const recentTransactions = transactions.docs
      .sort((left, right) => timestampValue(right.data().date) - timestampValue(left.data().date))
      .slice(0, 5);
    const recentPayments = payments.docs
      .sort((left, right) => timestampValue(right.data().createdAt) - timestampValue(left.data().createdAt))
      .slice(0, 5);
    return NextResponse.json({
      success: true,
      company: serialize(company.data() || {}),
      transactions: recentTransactions.map(entry => serialize({ id: entry.id, ...entry.data() })),
      pendingPayments: recentPayments.filter(entry => entry.data().status === 'pending').map(entry => serialize({ id: entry.id, ...entry.data() })),
    });
  } catch (error: any) {
    console.error('Error in /api/getWalletOverview:', error);
    return NextResponse.json({ success: false, error: error.message || 'Unable to load wallet data.' }, { status: 500 });
  }
}