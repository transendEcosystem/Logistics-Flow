
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore, Timestamp, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function serializeTimestamps(docData: any) {
    if (!docData) return docData;
    const newDocData: { [key: string]: any } = {};
    for (const key in docData) {
        const value = docData[key];
        if (value instanceof Timestamp) {
            newDocData[key] = value.toDate().toISOString();
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            newDocData[key] = serializeTimestamps(value);
        } else {
            newDocData[key] = value;
        }
    }
    return newDocData;
}

export async function GET() {
    const { app, error: initError } = getAdminApp();
    if (initError || !app) {
        return NextResponse.json({ success: false, error: `Server error: ${initError}` }, { status: 500 });
    }
    
    const db = getFirestore(app);

    try {
        // Fetch all approved shops from the public root collection
        const snapshot = await db.collection('shops').where('status', '==', 'approved').get();
        
        if (snapshot.empty) {
            return NextResponse.json({ success: true, data: [] });
        }
        
        const approvedShops = snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
            id: doc.id,
            ...serializeTimestamps(doc.data())
        }));

        // De-duplicate: Ensure one node per company, keeping newest.
        const uniqueShopsMap = new Map();
        approvedShops.forEach(shop => {
            const cid = shop.companyId;
            if (!cid) return;
            const existing = uniqueShopsMap.get(cid);
            if (!existing || new Date(shop.updatedAt) > new Date(existing.updatedAt)) {
                uniqueShopsMap.set(cid, shop);
            }
        });

        return NextResponse.json({ success: true, data: Array.from(uniqueShopsMap.values()) });

    } catch (error: any) {
        console.error('Error in getApprovedShops:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
