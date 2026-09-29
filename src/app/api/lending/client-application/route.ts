import { FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';

function removeUndefinedValues<T>(value: T): T {
  if (Array.isArray(value)) return value.filter((item) => item !== undefined).map((item) => removeUndefinedValues(item)) as T;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([, item]) => item !== undefined).map(([key, item]) => [key, removeUndefinedValues(item)])) as T;
  return value;
}

export async function POST(request: NextRequest) {
  try {
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    const decodedToken = await getAuth(app).verifyIdToken(authorization.split('Bearer ')[1]);
    const db = app ? (await import('firebase-admin/firestore')).getFirestore(app) : null;
    if (!db) throw new Error('Database unavailable.');
    const body = await request.json();
    const values = removeUndefinedValues(body?.values || {});
    const userSnapshot = await db.collection('users').doc(decodedToken.uid).get();
    const user = userSnapshot.data() || {};
    const companyId = String(user.companyId || '').trim();
    if (!companyId) return NextResponse.json({ success: false, error: 'Your member account is not linked to a company.' }, { status: 409 });
    if (!String(values.name || '').trim()) return NextResponse.json({ success: false, error: 'Client name is required.' }, { status: 400 });

    const existingSnapshot = await db.collection('lendingClients').where('companyId', '==', companyId).limit(1).get();
    const clientRef = existingSnapshot.empty ? db.collection('lendingClients').doc() : existingSnapshot.docs[0].ref;
    const now = new Date().toISOString();
    await clientRef.set({ ...values, id: clientRef.id, companyId, userId: decodedToken.uid, status: 'active', applicationSource: 'member_portal', updatedAt: FieldValue.serverTimestamp(), createdAt: existingSnapshot.empty ? FieldValue.serverTimestamp() : (existingSnapshot.docs[0].data()?.createdAt || FieldValue.serverTimestamp()) }, { merge: true });

    const facilitiesSnapshot = await db.collection('facilities').where('clientId', '==', clientRef.id).get();
    const existingGlobal = facilitiesSnapshot.docs.find((document) => { const facility = document.data(); return facility.facilityClass === 'global' || !facility.parentId; });
    const facilityRef = existingGlobal?.ref || db.collection('facilities').doc();
    await facilityRef.set({ id: facilityRef.id, ownerType: 'client', clientId: clientRef.id, companyId, facilityClass: 'global', parentId: null, type: 'Global Client Facility', limit: Number(existingGlobal?.data()?.limit || 0), status: existingGlobal?.data()?.status || 'pending_credit', onboardingStage: existingGlobal?.data()?.onboardingStage || 'application', source: 'completed_client_application', clientApplicationId: clientRef.id, updatedAt: FieldValue.serverTimestamp(), createdAt: existingGlobal?.data()?.createdAt || FieldValue.serverTimestamp() }, { merge: true });

    const casesSnapshot = await db.collection('lendingApplications').where('clientId', '==', clientRef.id).get();
    const existingCase = casesSnapshot.docs.find((document) => { const item = document.data(); return item.masterFacilityId === facilityRef.id && !item.facilityId; });
    const caseRef = existingCase?.ref || db.collection('lendingApplications').doc();
    await caseRef.set({ id: caseRef.id, applicationId: caseRef.id, caseType: 'global_facility_indication', clientId: clientRef.id, masterFacilityId: facilityRef.id, companyId, companyName: String(values.name), entityType: String(values.entityType || 'Pty Ltd'), primaryContact: String(values.primaryContact || ''), email: String(values.email || decodedToken.email || ''), phone: String(values.phone || ''), amountRequested: 0, termMonths: 0, facilityType: 'Global Client Facility', fundingNeed: 'broad_client_facility', status: existingCase?.data()?.status || 'submitted', sourceCollections: ['lendingClients', 'facilities', 'agreements'], sourceSnapshot: { clientId: clientRef.id, masterFacilityId: facilityRef.id, capturedAt: now }, updatedAt: now, createdAt: existingCase?.data()?.createdAt || now }, { merge: true });
    await clientRef.set({ globalFacilityId: facilityRef.id, globalFacilityCaseId: caseRef.id, facilityReviewStatus: 'pending_credit' }, { merge: true });
    return NextResponse.json({ success: true, clientId: clientRef.id, facilityId: facilityRef.id, creditCaseId: caseRef.id });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Unable to save client application.' }, { status: 500 });
  }
}
