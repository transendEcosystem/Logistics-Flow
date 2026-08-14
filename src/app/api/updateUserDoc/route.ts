
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from '@/lib/firebase-admin';

// Helper function to deserialize special server values
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

// Helper to convert Firestore Timestamps to JSON-serializable strings for logging
function serializeTimestamps(docData: any): any {
    if (!docData) return docData;
    const newDocData: { [key: string]: any } = {};
    for (const key in docData) {
        const value = docData[key];
        if (value instanceof FieldValue) {
            newDocData[key] = `(FieldValue: serverTimestamp)`;
        } else if (value && typeof value.toDate === 'function') { // Check for Timestamp
            newDocData[key] = value.toDate().toISOString();
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
            newDocData[key] = serializeTimestamps(value);
        } else {
            newDocData[key] = value;
        }
    }
    return newDocData;
}


export async function POST(req: NextRequest) {
  const { app, error: initError } = getAdminApp();
  if (initError || !app) {
    return NextResponse.json({ success: false, error: `Internal Server Error: ${initError}` }, { status: 500 });
  }

  const authorization = req.headers.get('authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'Unauthorized: No token provided.' }, { status: 401 });
  }

  const idToken = authorization.split('Bearer ')[1];
  
  try {
    const { path, data } = await req.json();
    if (!path || !data) {
        return NextResponse.json({ success: false, error: 'Bad Request: "path" and "data" are required.' }, { status: 400 });
    }

    const adminAuth = getAuth(app);
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const isAdmin = decodedToken.email === 'beyondtransport@gmail.com' || decodedToken.email === 'mkoton100@gmail.com';
    
    const db = getFirestore(app);
    const docRef = db.doc(path);
    const pathSegments = path.split('/');
    
    // --- Authorization Logic ---
    let isAuthorized = false;

    if (isAdmin) {
        isAuthorized = true;
    } else {
        if (pathSegments[0] === 'users' && pathSegments[1] === uid) {
            isAuthorized = true;
        } else {
            const userDocForAuth = await db.collection('users').doc(uid).get();
            const userCompanyIdForAuth = userDocForAuth.data()?.companyId;

            if (userCompanyIdForAuth && pathSegments[0] === 'companies' && pathSegments[1] === userCompanyIdForAuth) {
                isAuthorized = true;
            }
        }
    }

    if (!isAuthorized) {
        return NextResponse.json({ success: false, error: 'Forbidden: You do not have permission to modify this resource.' }, { status: 403 });
    }

    const deserializedData = deserializeData(data);
    
    await db.runTransaction(async (transaction) => {
        const userDocForCompanyCheck = await transaction.get(db.collection('users').doc(uid));
        const existingCompanyId = userDocForCompanyCheck.data()?.companyId || null;

        const docSnap = await transaction.get(docRef);
        const beforeData = docSnap.exists ? docSnap.data() : null;

        const dataToSave = { ...deserializedData };
        let finalCompanyId = existingCompanyId;

        if (path.startsWith('companies/')) {
            finalCompanyId = pathSegments[1];
        }

        if (docSnap.exists) {
            transaction.update(docRef, dataToSave);
        } else {
            transaction.set(docRef, dataToSave, { merge: true });
        }
        
        const auditLogRef = db.collection('auditLogs').doc();
        transaction.set(auditLogRef, {
            collectionPath: pathSegments.slice(0, -1).join('/'),
            documentId: pathSegments[pathSegments.length - 1],
            userId: uid,
            companyId: finalCompanyId, 
            action: beforeData ? 'update' : 'create',
            timestamp: FieldValue.serverTimestamp(),
            before: serializeTimestamps(beforeData),
            after: serializeTimestamps({ ...beforeData, ...dataToSave })
        });
    });

    return NextResponse.json({ success: true, message: 'Document updated and audited successfully.' });

  } catch (error: any) {
    console.error(`Error in updateUserDoc:`, error);
    if (error.code === 'auth/id-token-expired') {
       return NextResponse.json({ success: false, error: 'Authentication token has expired.' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}
