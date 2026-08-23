import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';

async function authenticate(request: NextRequest) {
  const { app, error } = getAdminApp();
  if (error || !app) throw new Error('Firebase authentication is unavailable.');
  const authorization = request.headers.get('authorization') || '';
  if (!authorization.startsWith('Bearer ')) throw new Error('Unauthorized');
  const decoded = await getAuth(app).verifyIdToken(authorization.slice(7));
  return { app, decoded };
}

export async function GET(request: NextRequest) {
  try {
    const { app, decoded } = await authenticate(request);
    const db = getFirestore(app);
    const userSnapshot = await db.collection('users').doc(decoded.uid).get();
    const companyId = userSnapshot.data()?.companyId;
    if (!companyId) return NextResponse.json({ success: true, messages: [] });

    const companySnapshot = await db.collection('companies').doc(companyId).get();
    const isAdmin = ['beyondtransport@gmail.com', 'mkoton100@gmail.com', 'michael@logisticsflow.co.za'].includes(String(decoded.email || '').toLowerCase()) || decoded.admin === true;
    if (!isAdmin && companySnapshot.data()?.ownerId !== decoded.uid && userSnapshot.data()?.companyId !== companyId) {
      return NextResponse.json({ success: false, error: 'Support channel access denied.' }, { status: 403 });
    }

    const snapshot = await db.collection('companies').doc(companyId).collection('supportMessages').get();
    const messages = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((left: any, right: any) => {
        const leftTime = left.timestamp?.toMillis?.() || Date.parse(left.timestamp || '') || 0;
        const rightTime = right.timestamp?.toMillis?.() || Date.parse(right.timestamp || '') || 0;
        return leftTime - rightTime;
      });
    return NextResponse.json({ success: true, companyId, messages });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
