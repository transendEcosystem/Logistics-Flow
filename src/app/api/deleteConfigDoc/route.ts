
import { getFirestore } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const { db } = await verifyAdmin(req);
    const { path } = await req.json();

    if (!path) {
      return NextResponse.json({ success: false, error: 'Bad Request: "path" is required.' }, { status: 400 });
    }

    // Basic path validation to ensure it's targeting an expected config collection
    const allowedCollections = ['configuration', 'memberships', 'rewards', 'permissions'];
    const collectionName = path.split('/')[0];
    if (!allowedCollections.includes(collectionName)) {
        return NextResponse.json({ success: false, error: `Forbidden: Deletion from collection "${collectionName}" is not allowed.` }, { status: 403 });
    }

    await db.doc(path).delete();

    return NextResponse.json({ success: true, message: 'Document deleted successfully.' });

  } catch (error: any) {
    console.error(`Error in deleteConfigDoc:`, error);
    const status = error.message.includes('Forbidden') ? 403 : error.message.includes('Unauthorized') ? 401 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
