
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/firebase-admin';

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
  try {
    const { db } = await verifyAdmin(req);
    const { path, data } = await req.json();

    if (!path || !data) {
        return NextResponse.json({ success: false, error: 'Bad Request: "path" and "data" are required.' }, { status: 400 });
    }
    
    // Basic path validation to ensure it's targeting an expected config collection
    const allowedCollections = ['configuration', 'memberships', 'rewards', 'permissions'];
    const collectionName = path.split('/')[0];
    if (!allowedCollections.includes(collectionName)) {
        return NextResponse.json({ success: false, error: `Forbidden: Updates to collection "${collectionName}" are not allowed via this endpoint.` }, { status: 403 });
    }
    
    const docRef = db.doc(path);
    const deserializedData = deserializeData(data);
    await docRef.set(deserializedData, { merge: true });

    return NextResponse.json({ success: true, message: 'Configuration document updated successfully.' });

  } catch (error: any) {
    console.error(`Error in updateConfigDoc:`, error);
    const status = error.message.includes('Forbidden') ? 403 : error.message.includes('Unauthorized') ? 401 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
