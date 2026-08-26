import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  const { app, error: initError } = getAdminApp();
  if (initError || !app) return NextResponse.json({ success: false, error: 'Service unavailable.' }, { status: 500 });
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });

  try {
    const { enquiryId } = await req.json();
    if (!enquiryId) return NextResponse.json({ success: false, error: 'Load enquiry is required.' }, { status: 400 });
    const decoded = await getAuth(app).verifyIdToken(token);
    const db = getFirestore(app);
    const provider = (await db.collection('users').doc(decoded.uid).get()).data();
    if (!provider?.companyId) return NextResponse.json({ success: false, error: 'Company information not found.' }, { status: 403 });

    const enquiryRef = db.collection('companies').doc(provider.companyId).collection('enquiries').doc(enquiryId);
    const enquiry = (await enquiryRef.get()).data();
    if (!enquiry || enquiry.type !== 'load_response') return NextResponse.json({ success: false, error: 'Load response not found.' }, { status: 404 });
    if (enquiry.status !== 'pending') return NextResponse.json({ success: false, error: 'This response has already been actioned.' }, { status: 409 });

    const loadRef = db.collection('companies').doc(provider.companyId).collection('loads').doc(enquiry.loadId);
    const load = (await loadRef.get()).data();
    if (!load || load.status !== 'active') return NextResponse.json({ success: false, error: 'The load is no longer available for assignment.' }, { status: 409 });

    const batch = db.batch();
    batch.update(loadRef, {
      status: 'assigned', takerId: enquiry.responderCompanyId, takerName: enquiry.responderName,
      instructionNumber: `INS-${Date.now().toString().slice(-6)}`, instructionDate: FieldValue.serverTimestamp(), acceptedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    });
    batch.update(enquiryRef, { status: 'accepted', acceptedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Load-response acceptance failed:', error);
    return NextResponse.json({ success: false, error: error.message || 'Could not accept load response.' }, { status: 500 });
  }
}