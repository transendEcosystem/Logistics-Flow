import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
    const { app, error: initError } = getAdminApp();
    if (initError || !app) {
        return NextResponse.json({ success: false, error: `Admin SDK not initialized: ${initError}` }, { status: 500 });
    }

    const authorization = req.headers.get('authorization');
    const token = authorization?.split('Bearer ')[1];
    if (!token) {
        return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }
    
    try {
        const adminAuth = getAuth(app);
        const decodedToken = await adminAuth.verifyIdToken(token);
        const uid = decodedToken.uid;

        const db = getFirestore(app);
        
        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        if (!userData || !userData.companyId) {
            return NextResponse.json({ success: false, error: 'User has no associated company.' }, { status: 400 });
        }
        const companyId = userData.companyId;
        const companyRef = db.collection('companies').doc(companyId);
        const companyDoc = await companyRef.get();
        const companyData = companyDoc.data();

        const isTransporter = companyData?.shopType === 'transporter' || userData?.declaredPosition === 'transporter';

        // Fetch loyalty settings
        const loyaltyConfigDoc = await db.collection('configuration').doc('loyaltySettings').get();
        const loyaltyConfig = loyaltyConfigDoc.data();
        
        // Differentiate points based on role
        const pointsToAward = isTransporter 
            ? (loyaltyConfig?.serviceProfileCreationPoints || 100)
            : (loyaltyConfig?.shopCreationPoints || 100);

        const shopCollectionRef = companyRef.collection('shops');
        const newShopRef = shopCollectionRef.doc();

        const newShopData = {
          ownerId: uid,
          companyId: companyId,
          status: 'draft',
          shopType: isTransporter ? 'transporter' : 'vendor',
          shopName: `${decodedToken.name || 'My'}'s New ${isTransporter ? 'Service Profile' : 'Shop'}`,
          category: '',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          id: newShopRef.id,
        };
        
        const batch = db.batch();
        batch.set(newShopRef, newShopData);
        batch.update(companyRef, { 
            shopId: newShopRef.id,
            rewardPoints: FieldValue.increment(pointsToAward),
            updatedAt: FieldValue.serverTimestamp(),
        });
        await batch.commit();

        return NextResponse.json({ success: true, shopId: newShopRef.id });
    } catch (error: any) {
        console.error('Error creating shop:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
