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

    const snapshot = await db.collection('engagementPings').where('companyId', '==', companyId).limit(100).get();
    const data = snapshot.docs
      .map(entry => serialize({ id: entry.id, ...entry.data() }))
      .sort((left: any, right: any) => new Date(right.timestamp || 0).getTime() - new Date(left.timestamp || 0).getTime());
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error in /api/getEngagementPings:', error);
    return NextResponse.json({ success: false, error: error.message || 'Unable to load engagement pings.' }, { status: 500 });
  }
}