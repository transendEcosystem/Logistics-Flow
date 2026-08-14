import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  const { app, error: initError } = getAdminApp();
  if (initError || !app) {
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }

  const authorization = req.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const token = authorization.split('Bearer ')[1];
  
  try {
    const adminAuth = getAuth(app);
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;
    const { companyId, staffId, status } = await req.json();

    if (!companyId || !staffId || !status || !['confirmed', 'unconfirmed'].includes(status)) {
        return NextResponse.json({ success: false, error: 'Bad Request: companyId, staffId, and a valid status are required.' }, { status: 400 });
    }
    
    const db = getFirestore(app);
    
    const companyRef = db.doc(`companies/${companyId}`);
    const companySnap = await companyRef.get();
    const companyData = companySnap.data();

    // Authorization: Only the owner of the company OR an admin can update staff status
    const isAdmin = decodedToken.email === 'beyondtransport@gmail.com';
    if (companyData?.ownerId !== uid && !isAdmin) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const staffRef = db.doc(`companies/${companyId}/staff/${staffId}`);
    await staffRef.update({
        status: status,
        updatedAt: FieldValue.serverTimestamp()
    });

    return NextResponse.json({ success: true, message: 'Staff status updated successfully.' });
  } catch (error: any) {
    console.error('Error updating staff status:', error);
    if (error.code?.startsWith('auth/')) {
       return NextResponse.json({ success: false, error: 'Authentication error' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
