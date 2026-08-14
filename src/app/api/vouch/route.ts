import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from '@/lib/firebase-admin';

/**
 * DATA INTEGRITY VOUCHING API
 * Allows registered members to confirm the accuracy of registry records.
 * Acts like a "Facebook Like" for data fidelity.
 */
export async function POST(req: NextRequest) {
  const { app, error: initError } = getAdminApp();
  if (initError || !app) return NextResponse.json({ success: false, error: 'Firebase Failure' }, { status: 500 });

  try {
    const authorization = req.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    
    const token = authorization.split('Bearer ')[1];
    const adminAuth = getAuth(app);
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;
    const db = getFirestore(app);

    const { targetId, collection: colName = 'partners' } = await req.json();
    if (!targetId) return NextResponse.json({ success: false, error: 'Missing ID' }, { status: 400 });

    const userSnap = await db.collection('users').doc(uid).get();
    const companyId = userSnap.data()?.companyId;
    if (!companyId) return NextResponse.json({ success: false, error: 'Member profile required' }, { status: 403 });

    const vouchRef = db.collection(colName).doc(targetId).collection('vouches').doc(companyId);
    const vouchSnap = await vouchRef.get();

    if (vouchSnap.exists) {
        return NextResponse.json({ success: false, error: 'Already vouched for this record.' }, { status: 400 });
    }

    const batch = db.batch();
    batch.set(vouchRef, {
        vouchedBy: companyId,
        vouchedAt: FieldValue.serverTimestamp()
    });

    batch.update(db.collection(colName).doc(targetId), {
        vouchCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp()
    });

    // Award loyalty points for contributing to integrity
    const loyaltyRef = db.collection('configuration').doc('loyaltySettings');
    const loyaltySnap = await loyaltyRef.get();
    const points = loyaltySnap.data()?.dataVouchPoints || 5;

    batch.update(db.collection('companies').doc(companyId), {
        rewardPoints: FieldValue.increment(points)
    });

    await batch.commit();
    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
