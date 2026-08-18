
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from '@/lib/firebase-admin';

// Helper to convert server-side values to JSON-serializable strings for logging
function serializeTimestamps(docData: any): any {
    if (!docData) return docData;
    const newDocData: { [key: string]: any } = {};
    for (const key in docData) {
        const value = docData[key];
        if (value instanceof FieldValue) {
            newDocData[key] = '(FieldValue: serverTimestamp)';
        } else if (value instanceof Timestamp) {
            newDocData[key] = value.toDate().toISOString();
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
            newDocData[key] = serializeTimestamps(value);
        } else {
            newDocData[key] = value;
        }
    }
    return newDocData;
}


// Helper function to convert serverTimestamp placeholders from client
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
    return NextResponse.json({ success: false, error: 'Internal Server Error: Could not connect to Firebase.' }, { status: 500 });
  }

  const authorization = req.headers.get('authorization');
  
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'Unauthorized: No token provided.' }, { status: 401 });
  }

  const idToken = authorization.split('Bearer ')[1];
  
  try {
    const { collectionPath, data } = await req.json();

    if (!collectionPath || !data) {
        return NextResponse.json({ success: false, error: 'Bad Request: "collectionPath" and "data" are required.' }, { status: 400 });
    }
    
    const adminAuth = getAuth(app);
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    
    const db = getFirestore(app);
    
    const pathSegments = collectionPath.split('/');
    let isAuthorized = false;

    // Authorization logic
    const userDocSnap = await db.collection('users').doc(uid).get();
    const userCompanyId = userDocSnap.data()?.companyId;

    // Check if the user owns the company path or is an admin
    if (pathSegments.length >= 2 && pathSegments[0] === 'companies' && pathSegments[1] === userCompanyId) {
        isAuthorized = true;
    }
    
    const isAdmin = decodedToken.email === 'beyondtransport@gmail.com' || 
                    decodedToken.email === 'mkoton100@gmail.com' ||
                    decodedToken.email === 'michael@logisticsflow.co.za' ||
                    decodedToken.admin === true;

    if (!isAuthorized && !isAdmin) {
          return NextResponse.json({ success: false, error: `Forbidden: Access to ${collectionPath} denied for user ${uid}.` }, { status: 403 });
    }

    const batch = db.batch();
    const collectionRef = db.collection(collectionPath);
    const newDocRef = collectionRef.doc();

    // Add server-side timestamps and ID
    const deserializedData = deserializeData(data);
    const finalDataForDb = { 
        ...deserializedData, 
        id: newDocRef.id,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    };
    
    batch.set(newDocRef, finalDataForDb);
    
    // Check if a product/route is being added and award points if so
    if (collectionPath.endsWith('/products')) {
        const loyaltyConfigDoc = await db.collection('configuration').doc('loyaltySettings').get();
        const loyaltyConfig = loyaltyConfigDoc.data();
        
        const companyRef = db.doc(`companies/${pathSegments[1]}`);
        const companyDoc = await companyRef.get();
        const isTransporter = companyDoc.data()?.shopType === 'transporter';

        // Award points based on whether it's a "Product" or a "Service Lane"
        const pointsKey = isTransporter ? 'routeListingPoints' : 'productAddPoints';
        const pointsToAdd = loyaltyConfig?.[pointsKey] || 10;
        
        batch.update(companyRef, { 
            rewardPoints: FieldValue.increment(pointsToAdd),
            updatedAt: FieldValue.serverTimestamp(),
        });
    }
    
    // Add audit log entry for significant actions (exclude support messages for clarity)
    if (!collectionPath.includes('supportMessages')) {
        const auditLogRef = db.collection('auditLogs').doc();
        batch.set(auditLogRef, {
            collectionPath,
            documentId: newDocRef.id,
            userId: uid,
            companyId: userCompanyId || pathSegments[1], 
            action: 'create',
            timestamp: FieldValue.serverTimestamp(),
            before: null,
            after: serializeTimestamps(finalDataForDb) 
        });
    }

    await batch.commit();

    return NextResponse.json({ success: true, id: newDocRef.id, message: 'Document created successfully.' });

  } catch (error: any) {
    console.error(`Error in addUserDoc:`, error);
    if (error.code === 'auth/id-token-expired') {
       return NextResponse.json({ success: false, error: 'Authentication token has expired.' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}
