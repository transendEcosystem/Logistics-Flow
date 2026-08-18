import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  const { app, error: initError } = getAdminApp();
  if (initError || !app) {
    return NextResponse.json({ success: false, error: 'Internal Server Error: Could not connect to Firebase.' }, { status: 500 });
  }

  const authorization = req.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'Unauthorized: No token provided.' }, { status: 401 });
  }

  const idToken = authorization.split('Bearer ')[1];
  
  try {
    const { companyId, shopId, percentage } = await req.json();
    if (!companyId || !shopId || typeof percentage !== 'number') {
        return NextResponse.json({ success: false, error: 'Bad Request: companyId, shopId, and percentage are required.' }, { status: 400 });
    }
      
    const adminAuth = getAuth(app);
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const db = getFirestore(app);

    // Authorization check
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.data()?.companyId !== companyId) {
        return NextResponse.json({ success: false, error: 'Forbidden: You can only propose for your own company.' }, { status: 403 });
    }

    const agreementsRef = db.collection(`companies/${companyId}/shops/${shopId}/agreements`);
    
    await db.runTransaction(async (transaction) => {
        // Find existing proposed agreements for this shop and archive them.
        const q = agreementsRef.where('status', '==', 'proposed');
        const proposedSnap = await transaction.get(q);
        
        proposedSnap.docs.forEach(doc => {
            transaction.update(doc.ref, { status: 'archived', updatedAt: FieldValue.serverTimestamp() });
        });
        
        // Create the new proposal
        const newAgreementRef = agreementsRef.doc();
        transaction.set(newAgreementRef, { 
            id: newAgreementRef.id,
            percentage: percentage,
            status: 'proposed',
            effectiveDate: FieldValue.serverTimestamp(), // Placeholder, updated on approval
            proposedBy: uid,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp() 
        });
    });

    return NextResponse.json({ success: true, message: 'Proposal submitted successfully.' });

  } catch (error: any) {
    console.error(`Error in proposeCommercialAgreement:`, error);
    if (error.code?.startsWith('auth/')) {
       return NextResponse.json({ success: false, error: 'Authentication token has expired.' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}
