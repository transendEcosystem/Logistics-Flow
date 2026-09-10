
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';

/**
 * PUBLIC API ENDPOINT
 * Allows a public visitor (lead/partner) to record their POPI and marketing consent.
 * Uses Admin SDK to bypass Firestore rules since visitors are not authenticated as admins.
 */
export async function POST(req: NextRequest) {
  const { app, error: initError } = getAdminApp();
  if (initError || !app) {
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }

  try {
    const authorization = req.headers.get('authorization') || '';
    if (!authorization.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Sign-in required before completing the handshake.' }, { status: 401 });
    }
    await getAuth(app).verifyIdToken(authorization.slice(7));
    const { partnerId, status, collection: requestedCollection = 'partners' } = await req.json();
    const allowedCollections = ['partners', 'leads', 'suppliers', 'strategic_partners'];
    const collectionName = allowedCollections.includes(requestedCollection) ? requestedCollection : null;

    if (!partnerId || !['accepted', 'declined'].includes(status) || !collectionName) {
        return NextResponse.json({ success: false, error: 'Bad Request: partnerId and valid status required.' }, { status: 400 });
    }
    
    const db = getFirestore(app);
    const partnerRef = db.collection(collectionName).doc(partnerId);
    const partnerSnap = await partnerRef.get();

    if (!partnerSnap.exists) {
        return NextResponse.json({ success: false, error: 'Partner record not found.' }, { status: 404 });
    }

    await partnerRef.update({
        consentStatus: status,
        consentDate: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
    });

    return NextResponse.json({ success: true, message: 'Consent recorded successfully.' });

  } catch (error: any) {
    console.error('Error in recordConsent:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
