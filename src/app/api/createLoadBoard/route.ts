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
        
        const loyaltyConfigDoc = await db.collection('configuration').doc('loyaltySettings').get();
        const loadBoardCreationPoints = loyaltyConfigDoc.data()?.loadBoardCreationPoints || 50;

        const loadBoardCollectionRef = companyRef.collection('loadBoards');
        
        const newLoadBoardRef = loadBoardCollectionRef.doc();

        const newLoadBoardData = {
          ownerId: uid,
          companyId: companyId,
          status: 'active',
          boardName: `${decodedToken.name || 'My'}'s Load Board`,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          id: newLoadBoardRef.id,
        };
        
        const batch = db.batch();
        batch.set(newLoadBoardRef, newLoadBoardData);
        batch.update(companyRef, { 
            loadBoardId: newLoadBoardRef.id,
            rewardPoints: FieldValue.increment(loadBoardCreationPoints)
        });
        await batch.commit();

        return NextResponse.json({ success: true, loadBoardId: newLoadBoardRef.id });
    } catch (error: any) {
        console.error('Error creating load board:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
