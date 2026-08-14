
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
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'Unauthorized: No token provided.' }, { status: 401 });
  }

  const idToken = authorization.split('Bearer ')[1];
  
  try {
    const { companyId, amount } = await req.json();
    if (!companyId || typeof amount !== 'number' || amount <= 0) {
        return NextResponse.json({ success: false, error: 'Bad Request: "companyId" and a valid "amount" are required.' }, { status: 400 });
    }
      
    const adminAuth = getAuth(app);
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    
    const db = getFirestore(app);

    // Authorization check
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.data()?.companyId !== companyId) {
        const isAdmin = decodedToken.email === 'beyondtransport@gmail.com' || decodedToken.email === 'mkoton100@gmail.com';
        if (!isAdmin) {
            return NextResponse.json({ success: false, error: 'Forbidden: You can only request payouts for your own company.' }, { status: 403 });
        }
    }
    
    const newDocRef = await db.runTransaction(async (transaction) => {
        const companyRef = db.collection('companies').doc(companyId);
        const companyDoc = await transaction.get(companyRef);
        const companyData = companyDoc.data();

        if (!companyData) {
            throw new Error("Company not found.");
        }

        const availableBalanceFromDoc = companyData.availableBalance || 0;

        const pendingPayoutsQuery = db.collection(`companies/${companyId}/payoutRequests`).where('status', '==', 'pending');
        const pendingPayoutsSnap = await transaction.get(pendingPayoutsQuery);
        const pendingTotal = pendingPayoutsSnap.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
        
        const effectivelyAvailable = availableBalanceFromDoc - pendingTotal;

        if (amount > effectivelyAvailable) {
            throw new Error(`Insufficient available funds. Your available balance is R${availableBalanceFromDoc.toFixed(2)}, but R${pendingTotal.toFixed(2)} is already pending withdrawal, leaving R${effectivelyAvailable.toFixed(2)} for this request.`);
        }

        const payoutDocRef = db.collection(`companies/${companyId}/payoutRequests`).doc();
        const payoutData = {
            id: payoutDocRef.id,
            userId: uid,
            companyId: companyId,
            amount,
            status: 'pending',
            createdAt: FieldValue.serverTimestamp(),
        };
        
        transaction.set(payoutDocRef, payoutData);
        return payoutDocRef;
    });

    return NextResponse.json({ success: true, id: newDocRef.id, message: 'Payout request submitted successfully.' });

  } catch (error: any) {
    console.error(`Error in createPayoutRequest:`, error);
    if (error.code === 'auth/id-token-expired') {
       return NextResponse.json({ success: false, error: 'Authentication token has expired.' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: `${error.message}` }, { status: 500 });
  }
}
