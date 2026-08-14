
import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, FieldPath, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from '@/lib/firebase-admin';

// Helper to serialize Firestore Timestamps
function serializeTimestamps(docData: any): any {
    if (!docData) return docData;
    const newDocData: { [key: string]: any } = {};
    for (const key in docData) {
        const value = docData[key];
        if (value instanceof Timestamp) {
            newDocData[key] = value.toDate().toISOString();
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
            newDocData[key] = serializeTimestamps(value);
        } else {
            newDocData[key] = value;
        }
    }
    return newDocData;
}

export async function GET(req: NextRequest) {
    const { app, error: initError } = getAdminApp();
    if (initError || !app) {
        return NextResponse.json({ success: false, error: 'Internal Server Error: Could not connect to Firebase.' }, { status: 500 });
    }

    const authorization = req.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
        return NextResponse.json({ success: false, error: 'Unauthorized: Missing or invalid token.' }, { status: 401 });
    }
    const token = authorization.split('Bearer ')[1];

    try {
        const adminAuth = getAuth(app);
        const decodedToken = await adminAuth.verifyIdToken(token);
        const uid = decodedToken.uid;
        const db = getFirestore(app);

        // 1. Get the current user's profile to find their companyId
        const userDocSnap = await db.collection('users').doc(uid).get();
        const userData = userDocSnap.data();
        if (!userData?.companyId) {
            return NextResponse.json({ success: false, error: 'Could not determine your company to find referrals.' }, { status: 400 });
        }
        const referrerCompanyId = userData.companyId;

        // 2. Find all companies referred by the current user's company
        const companiesQuery = db.collection('companies').where('referrerId', '==', referrerCompanyId);
        const companiesSnap = await companiesQuery.get();

        if (companiesSnap.empty) {
            return NextResponse.json({ success: true, data: [] });
        }

        // 3. Get the owner IDs from the referred companies
        const ownerIds = companiesSnap.docs.map(doc => doc.data().ownerId);
        
        if (ownerIds.length === 0) {
            return NextResponse.json({ success: true, data: [] });
        }


        // 4. Fetch the user documents for these owners to get their name and email
        const usersSnap = await db.collection('users').where(FieldPath.documentId(), 'in', ownerIds).get();
        const userDetailsMap = new Map<string, any>();
        usersSnap.forEach(doc => {
            const data = doc.data();
            userDetailsMap.set(doc.id, { 
                email: data.email, 
                name: `${data.firstName || ''} ${data.lastName || ''}`.trim()
            });
        });

        // 5. Combine the data
        const networkData = companiesSnap.docs.map(doc => {
            const companyData = doc.data();
            const ownerDetails = userDetailsMap.get(companyData.ownerId) || { email: 'N/A', name: 'N/A' };
            return {
                ...serializeTimestamps(companyData),
                ownerEmail: ownerDetails.email,
                ownerName: ownerDetails.name
            };
        });

        return NextResponse.json({ success: true, data: networkData });

    } catch (error: any) {
        console.error('Error in /api/getNetwork:', error);
        if (error.code?.startsWith('auth/')) {
            return NextResponse.json({ success: false, error: 'Authentication error.' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: 'Internal Server Error.' }, { status: 500 });
    }
}
