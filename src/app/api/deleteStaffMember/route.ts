
import { getFirestore } from 'firebase-admin/firestore';
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
    const { companyId, staffId } = await req.json();

    if (!companyId || !staffId) {
        return NextResponse.json({ success: false, error: 'Bad Request: companyId and staffId are required.' }, { status: 400 });
    }
    
    const db = getFirestore(app);
    
    const companyRef = db.doc(`companies/${companyId}`);
    const companySnap = await companyRef.get();
    const companyData = companySnap.data();

    const isAdmin = decodedToken.email === 'beyondtransport@gmail.com';

    // Authorization: Only the owner of the company OR an admin can delete staff
    if (companyData?.ownerId !== uid && !isAdmin) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const staffRef = db.doc(`companies/${companyId}/staff/${staffId}`);
    const staffSnap = await staffRef.get();
    const staffData = staffSnap.data();
    
    // Check if status is 'unconfirmed' before deleting
    if (staffData?.status === 'confirmed') {
        return NextResponse.json({ success: false, error: 'Cannot delete a confirmed staff member. Please unconfirm first.' }, { status: 400 });
    }

    await staffRef.delete();

    return NextResponse.json({ success: true, message: 'Staff member deleted successfully.' });
  } catch (error: any) {
    console.error('Error deleting staff member:', error);
    if (error.code?.startsWith('auth/')) {
       return NextResponse.json({ success: false, error: 'Authentication error' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
