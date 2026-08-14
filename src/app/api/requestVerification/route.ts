import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';

/**
 * HUMAN VERIFICATION REQUEST API
 * Generates a unique tracking PIN for phone verification.
 * Creates an internal CRM task for platform staff follow-up.
 */
export async function POST(req: NextRequest) {
  const { app, error: initError } = getAdminApp();
  if (initError || !app) return NextResponse.json({ success: false, error: 'Firebase Failure' }, { status: 500 });

  try {
    const { partnerId, collection: colName = 'partners' } = await req.json();
    if (!partnerId) return NextResponse.json({ success: false, error: 'Missing ID' }, { status: 400 });

    const db = getFirestore(app);
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const ref = db.collection(colName).doc(partnerId);
    
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 });
    const data = snap.data()!;

    const batch = db.batch();
    
    // 1. Update the record with the PIN
    batch.update(ref, {
        verificationPin: pin,
        verificationStatus: 'pending_phone',
        updatedAt: FieldValue.serverTimestamp()
    });

    // 2. Create the CRM Task
    const taskRef = db.collection('platformTasks').doc();
    batch.set(taskRef, {
        id: taskRef.id,
        title: `PHONE VERIFICATION: ${data.companyName || partnerId}`,
        description: `Lead requested human verification. Tracking PIN: ${pin}. Contact: ${data.mobile || data.phone || 'N/A'}.`,
        status: 'pending',
        priority: 'high',
        type: 'verification',
        targetId: partnerId,
        targetCollection: colName,
        createdAt: FieldValue.serverTimestamp()
    });

    // 3. Log communication
    const logRef = ref.collection('communications').doc();
    batch.set(logRef, {
        id: logRef.id,
        type: 'System',
        subject: 'VERIFICATION PIN ISSUED',
        notes: `PIN: ${pin} | Automation triggered task for Engagement Division.`,
        timestamp: FieldValue.serverTimestamp()
    });

    await batch.commit();

    return NextResponse.json({ success: true, pin });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
