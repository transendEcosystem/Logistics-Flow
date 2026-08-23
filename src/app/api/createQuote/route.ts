
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from '@/lib/firebase-admin';
import { getCompanyPartnerDiscount, calculateDiscountedAmount } from '@/lib/partner-discounts';

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
    const { data } = await req.json();
    if (!data) {
        return NextResponse.json({ success: false, error: 'Bad Request: "data" is required.' }, { status: 400 });
    }

    const adminAuth = getAuth(app);
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    
    const db = getFirestore(app);
    
    // Get companyId from user document
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data();
    if (!userData || !userData.companyId) {
        return NextResponse.json({ success: false, error: 'Forbidden: Company information not found for user.' }, { status: 403 });
    }
    const companyId = userData.companyId;

    const collectionPath = `companies/${companyId}/quotes`;
    const collectionRef = db.collection(collectionPath);
    
    const deserializedData: Record<string, any> = { ...deserializeData(data), userId: uid, companyId: companyId };

    // Apply any locked-in partner-sale discount (e.g. CTS Trailers) if the requesting company is tagged for it.
    const targetPartnerId = deserializedData.partnerId || deserializedData.shopPartnerId;
    if (targetPartnerId && typeof deserializedData.amount === 'number') {
        const discountTag = getCompanyPartnerDiscount(userData, String(targetPartnerId));
        if (discountTag?.agreementId) {
            const agreementSnap = await db.collection('partnerAgreements').doc(discountTag.agreementId).get();
            const agreement = agreementSnap.data();
            if (agreement?.status === 'active') {
                deserializedData.originalAmount = deserializedData.amount;
                deserializedData.amount = calculateDiscountedAmount(deserializedData.amount, agreement as any);
                deserializedData.partnerDiscountApplied = { partnerId: targetPartnerId, agreementId: discountTag.agreementId, discountType: agreement.discountType, discountValue: agreement.discountValue };
            }
        }
    }

    const newDocRef = await collectionRef.add(deserializedData);

    return NextResponse.json({ success: true, id: newDocRef.id, message: 'Quote created successfully.' });

  } catch (error: any) {
    console.error(`Error in createQuote:`, error);
    if (error.code === 'auth/id-token-expired') {
       return NextResponse.json({ success: false, error: 'Authentication token has expired.' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}
