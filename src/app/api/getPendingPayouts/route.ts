
import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { verifyAdmin } from '@/lib/firebase-admin';

// Helper to convert Firestore Timestamps to JSON-serializable strings
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

export async function POST(req: NextRequest) {
    try {
        const { db } = await verifyAdmin(req);
        
        // New Strategy: Avoid collection group query to bypass indexing issues.
        // 1. Get all companies.
        const companiesSnap = await db.collection('companies').get();
        if (companiesSnap.empty) {
            return NextResponse.json({ success: true, data: [] });
        }

        // 2. Create a promise for each company to fetch its pending payout requests.
        const promises = companiesSnap.docs.map(companyDoc => {
            return db.collection(`companies/${companyDoc.id}/payoutRequests`)
                     .where('status', '==', 'pending')
                     .get();
        });

        // 3. Execute all fetches in parallel.
        const results = await Promise.all(promises);

        // 4. Flatten the results into a single array.
        const allPayouts: any[] = [];
        results.forEach(querySnapshot => {
            if (!querySnapshot.empty) {
                querySnapshot.docs.forEach(doc => {
                    allPayouts.push({ id: doc.id, ...serializeTimestamps(doc.data()) });
                });
            }
        });
        
        return NextResponse.json({ success: true, data: allPayouts });

    } catch (error: any) {
        console.error(`API Error in /api/getPendingPayouts:`, error);
        const status = error.message.includes('Forbidden') ? 403 : error.message.includes('Unauthorized') ? 401 : 500;
        return NextResponse.json({ success: false, error: error.message }, { status });
    }
}
