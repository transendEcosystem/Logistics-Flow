
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from '@/lib/firebase-admin';

function deserializeData(data: any): any {
    if (!data) return data;
    const newData: { [key: string]: any } = {};
    for (const key in data) {
        const value = data[key];
        if (value && typeof value === 'object' && value._methodName === 'serverTimestamp') {
            newData[key] = FieldValue.serverTimestamp();
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
            newData[key] = deserializeData(value);
        } else {
            newData[key] = value;
        }
    }
    return newData;
}

export async function POST(req: NextRequest) {
  const { app, error: initError } = getAdminApp();
  if (initError || !app) {
    return NextResponse.json({ success: false, error: `Internal Server Error: ${initError}` }, { status: 500 });
  }

  const authorization = req.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'Unauthorized: No token provided.' }, { status: 401 });
  }

  const idToken = authorization.split('Bearer ')[1];
  
  try {
    const { data: paymentPayload } = await req.json();
    if (!paymentPayload) {
        return NextResponse.json({ success: false, error: 'Bad Request: "data" is required.' }, { status: 400 });
    }
      
    const adminAuth = getAuth(app);
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    
    const db = getFirestore(app);
    const batch = db.batch();

    // --- Ensure User and Company exist ---
    const userDocRef = db.collection('users').doc(uid);
    const userDocSnap = await userDocRef.get();
    let companyId = userDocSnap.data()?.companyId;

    if (!companyId) {
        console.log(`createWalletPayment: Company ID not found for user ${uid}, creating new company.`);
        const firebaseUser = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            displayName: decodedToken.name,
            phoneNumber: decodedToken.phone_number,
        };

        const companyRef = db.collection('companies').doc();
        companyId = companyRef.id;
        const displayName = firebaseUser.displayName?.trim();
        const companyName = displayName ? `${displayName}'s Company` : 'My Company';

        const newCompanyData = {
            id: companyRef.id,
            ownerId: uid,
            companyName: companyName,
            membershipId: 'free',
            isBillable: false,
            walletBalance: 0,
            pendingBalance: 0,
            availableBalance: 0,
            loyaltyTier: 'bronze',
            status: 'active', // Changed from pending to active to remove manual step
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };

        const nameParts = (firebaseUser.displayName || '').split(' ');
        const newUserData = {
            id: uid,
            firstName: nameParts[0] || 'New',
            lastName: nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User',
            email: firebaseUser.email,
            phone: firebaseUser.phoneNumber || '',
            companyId: companyRef.id,
            role: 'owner',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };

        batch.set(companyRef, newCompanyData);
        batch.set(userDocRef, newUserData, { merge: true });
    }
    
    const collectionPath = `companies/${companyId}/walletPayments`;
    const collectionRef = db.collection(collectionPath);
    
    const finalData = {
        ...deserializeData(paymentPayload),
        userId: uid,
        companyId: companyId,
    };
    
    const newDocRef = collectionRef.doc();
    batch.set(newDocRef, { ...finalData, id: newDocRef.id });

    await batch.commit();

    return NextResponse.json({ success: true, id: newDocRef.id, message: 'Wallet payment request created successfully.' });

  } catch (error: any) {
    console.error(`Error in createWalletPayment:`, error);
    if (error.code === 'auth/id-token-expired') {
       return NextResponse.json({ success: false, error: 'Authentication token has expired.' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}
