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
    const { loadId, brokerId, proposedRate, availableFrom, message } = await req.json();
    if (!loadId || !brokerId || !availableFrom || !message) {
      return NextResponse.json({ success: false, error: 'Load, availability and response details are required.' }, { status: 400 });
    }

    const decoded = await getAuth(app).verifyIdToken(token);
    const db = getFirestore(app);
    const responder = (await db.collection('users').doc(decoded.uid).get()).data();
    if (!responder?.companyId) return NextResponse.json({ success: false, error: 'Company information not found.' }, { status: 403 });
    if (responder.companyId === brokerId) return NextResponse.json({ success: false, error: 'You cannot respond to your own load.' }, { status: 400 });
    const responderCompany = (await db.collection('companies').doc(responder.companyId).get()).data();
    if (!responderCompany?.hasLoadsPlan && !decoded.admin) {
      return NextResponse.json({ success: false, error: 'An active Loads Intelligence membership is required to respond to opportunities.' }, { status: 403 });
    }

    const loadRef = db.collection('companies').doc(brokerId).collection('loads').doc(loadId);
    const load = (await loadRef.get()).data();
    if (!load || load.status !== 'active') return NextResponse.json({ success: false, error: 'This load is no longer available.' }, { status: 409 });

    const enquiries = db.collection('companies').doc(brokerId).collection('enquiries');
    const enquiryRef = enquiries.doc();
    await enquiryRef.set({
      id: enquiryRef.id,
      type: 'load_response',
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      loadId,
      brokerId,
      brokerName: load.brokerName || '',
      route: { origin: load.origin, destination: load.destination },
      cargoType: load.cargoType || '',
      requiredEquipment: load.requiredEquipment || [],
      offeredPayout: load.haulierPayout || 0,
      responderCompanyId: responder.companyId,
      responderName: responder.companyData?.companyName || responder.companyName || decoded.name || 'Verified carrier',
      responderEmail: responder.email || decoded.email || '',
      proposedRate: Number(proposedRate || 0),
      availableFrom,
      message,
    });

    return NextResponse.json({ success: true, enquiryId: enquiryRef.id });
  } catch (error: any) {
    console.error('Load response failed:', error);
    return NextResponse.json({ success: false, error: error.message || 'Could not submit load response.' }, { status: 500 });
  }
}