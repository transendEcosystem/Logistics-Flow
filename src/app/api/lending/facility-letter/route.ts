import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';

/** Resolves the signed-in member to their own lending client record. */
async function resolveMemberClientId(db: FirebaseFirestore.Firestore, uid: string, email?: string) {
  const userSnapshot = await db.collection('users').doc(uid).get();
  const user = userSnapshot.data() || {};
  const companyId = String(user.companyId || '').trim();
  const keys = [uid, companyId, email, user.email].filter(Boolean).map((value) => String(value).toLowerCase());
  const clients = await db.collection('lendingClients').limit(500).get();
  const match = clients.docs.find((document) => {
    const client = document.data() || {};
    return [document.id, client.companyId, client.userId, client.email, client.contactEmail]
      .filter(Boolean)
      .some((value) => keys.includes(String(value).toLowerCase()));
  });
  return match?.id || null;
}

export async function GET(request: NextRequest) {
  try {
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    const decodedToken = await getAuth(app).verifyIdToken(authorization.split('Bearer ')[1]);
    const db = getFirestore(app);
    const clientId = await resolveMemberClientId(db, decodedToken.uid, decodedToken.email);
    if (!clientId) return NextResponse.json({ success: true, letters: [] });

    const cases = await db.collection('lendingApplications').where('clientId', '==', clientId).get();
    const letters = [];
    for (const caseDocument of cases.docs) {
      const letterSnapshot = await caseDocument.ref.collection('facilityLetters').doc('current').get();
      if (!letterSnapshot.exists) continue;
      const letter = letterSnapshot.data() || {};
      letters.push({
        caseId: caseDocument.id,
        status: letter.status,
        issuedAt: letter.issuedAt,
        acceptedAt: letter.acceptedAt || null,
        terms: letter.terms || null,
        body: letter.body || '',
      });
    }
    return NextResponse.json({ success: true, letters });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Unable to load facility letters.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    const decodedToken = await getAuth(app).verifyIdToken(authorization.split('Bearer ')[1]);
    const db = getFirestore(app);
    const body = await request.json();
    const caseId = String(body?.caseId || '').trim();
    const decision = String(body?.decision || '').trim();
    const signatureName = String(body?.signatureName || '').trim();
    if (!caseId || !['accept', 'decline'].includes(decision)) {
      return NextResponse.json({ success: false, error: 'caseId and a valid decision are required.' }, { status: 400 });
    }
    if (decision === 'accept' && !signatureName) {
      return NextResponse.json({ success: false, error: 'Your full name is required as an electronic signature.' }, { status: 400 });
    }

    const clientId = await resolveMemberClientId(db, decodedToken.uid, decodedToken.email);
    if (!clientId) return NextResponse.json({ success: false, error: 'No client profile is linked to your account.' }, { status: 403 });

    const caseRef = db.collection('lendingApplications').doc(caseId);
    const caseSnapshot = await caseRef.get();
    if (!caseSnapshot.exists || caseSnapshot.data()?.clientId !== clientId) {
      return NextResponse.json({ success: false, error: 'This facility letter is not available on your account.' }, { status: 403 });
    }

    const letterRef = caseRef.collection('facilityLetters').doc('current');
    const letterSnapshot = await letterRef.get();
    if (!letterSnapshot.exists) return NextResponse.json({ success: false, error: 'Facility letter not found.' }, { status: 404 });
    const letter = letterSnapshot.data() || {};
    if (letter.status !== 'issued') {
      return NextResponse.json({ success: false, error: `This facility letter is already ${letter.status}.` }, { status: 409 });
    }

    const now = new Date().toISOString();
    if (decision === 'decline') {
      await letterRef.set({ status: 'declined', declinedAt: now, updatedAt: now }, { merge: true });
      await caseRef.set({ facilityLetterStatus: 'declined', updatedAt: now }, { merge: true });
      await db.collection('auditLogs').add({ action: 'lending_facility_letter_declined', caseId, actorId: decodedToken.uid, timestamp: FieldValue.serverTimestamp() });
      return NextResponse.json({ success: true, status: 'declined' });
    }

    const signature = { name: signatureName, signedAt: now, signedByUid: decodedToken.uid, signedByEmail: decodedToken.email || '' };
    await letterRef.set({
      status: 'accepted',
      acceptedAt: now,
      signature,
      bookingStages: { ...(letter.bookingStages || {}), facility_letter_signed: { completed: true, completedAt: now, completedBy: decodedToken.uid, note: `Signed electronically by ${signatureName}` } },
      updatedAt: now,
    }, { merge: true });
    await caseRef.set({ facilityLetterStatus: 'accepted', facilityLetterAcceptedAt: now, updatedAt: now }, { merge: true });
    await db.collection('auditLogs').add({ action: 'lending_facility_letter_accepted', caseId, actorId: decodedToken.uid, signatureName, timestamp: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true, status: 'accepted', signature });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Unable to record your decision.' }, { status: 500 });
  }
}
