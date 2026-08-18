
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

const actionToPointsKey: Record<string, string> = {
    truck: 'truckContributionPoints',
    trailer: 'trailerContributionPoints',
    supplier: 'supplierContributionPoints',
    debtor: 'debtorContributionPoints',
};

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
    const { type, items } = await req.json();
    if (!type || !Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ success: false, error: 'Bad Request: "type" and a non-empty "items" array are required.' }, { status: 400 });
    }
      
    const adminAuth = getAuth(app);
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    
    const db = getFirestore(app);

    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data();
    if (!userData || !userData.companyId) {
        return NextResponse.json({ success: false, error: 'Forbidden: Company information not found for user.' }, { status: 403 });
    }
    const companyId = userData.companyId;

    const loyaltyConfigDoc = await db.collection('configuration').doc('loyaltySettings').get();
    const loyaltyConfig = loyaltyConfigDoc.data();
    
    const pointsKey = actionToPointsKey[type];
    if (!pointsKey) {
        return NextResponse.json({ success: false, error: `Invalid contribution type: ${type}`}, { status: 400 });
    }
    
    const pointsPerItem = loyaltyConfig?.[pointsKey] || 10;
    const totalPointsToAward = items.length * pointsPerItem;

    const batch = db.batch();
    const contributionsCollection = db.collection('contributions');
    
    items.forEach(itemData => {
        const contributionRef = contributionsCollection.doc();
        const contributionData = {
            userId: uid,
            companyId: companyId,
            type: type,
            data: deserializeData(itemData),
            createdAt: FieldValue.serverTimestamp(),
        };
        batch.set(contributionRef, contributionData);
    });
    
    const companyRef = db.collection('companies').doc(companyId);
    batch.update(companyRef, { rewardPoints: FieldValue.increment(totalPointsToAward) });

    await batch.commit();

    return NextResponse.json({ success: true, message: `Contribution received for ${items.length} item(s). ${totalPointsToAward} reward points awarded.` });

  } catch (error: any) {
    console.error(`Error in createContribution:`, error);
    if (error.code === 'auth/id-token-expired') {
       return NextResponse.json({ success: false, error: 'Authentication token has expired.' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}
