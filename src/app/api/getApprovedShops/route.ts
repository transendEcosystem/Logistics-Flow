
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
        // Query both root 'shops' collection and 'shops' subcollectionGroup to ensure all commercial nodes are found
        const [rootSnap, groupSnap] = await Promise.all([
            db.collection('shops').get().catch(() => ({ docs: [] })),
            db.collectionGroup('shops').get().catch(() => ({ docs: [] })),
        ]);
        
        const allDocs = [...(rootSnap.docs || []), ...(groupSnap.docs || [])];
        if (allDocs.length === 0) {
            return NextResponse.json({ success: true, data: [] });
        }
        
        const rawShops = allDocs.map((doc: QueryDocumentSnapshot) => ({
            id: doc.id,
            ...serializeTimestamps(doc.data())
        }));

        // De-duplicate: Ensure unique shops by shop ID, keeping newest
        const uniqueShopsMap = new Map();
        rawShops.forEach(shop => {
            if (!shop.id) return;
            const existing = uniqueShopsMap.get(shop.id);
            if (!existing || new Date(shop.updatedAt || 0) > new Date(existing.updatedAt || 0)) {
                uniqueShopsMap.set(shop.id, shop);
            }
        });

        return NextResponse.json({ success: true, data: Array.from(uniqueShopsMap.values()) });

    } catch (error: any) {
        console.error('Error in getApprovedShops:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
