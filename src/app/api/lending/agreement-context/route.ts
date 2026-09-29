import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });

    const token = authorization.split('Bearer ')[1];
    const decodedToken = await getAuth(app).verifyIdToken(token);
    const db = getFirestore(app);
    const userSnapshot = await db.collection('users').doc(decodedToken.uid).get();
    const user = userSnapshot.data() || {};
    const companyId = String(user.companyId || user.companyData?.id || '').trim();
    const identityKeys = [decodedToken.uid, companyId, decodedToken.email, user.email].filter(Boolean).map((value) => String(value).toLowerCase());
    const clientSnapshot = await db.collection('lendingClients').limit(500).get();
    const clientDocument = clientSnapshot.docs.find((document) => {
      const client = document.data() || {};
      return [document.id, client.companyId, client.userId, client.email, client.contactEmail].filter(Boolean).some((value) => identityKeys.includes(String(value).toLowerCase()));
    });

    if (!clientDocument) return NextResponse.json({ success: true, hasClient: false, hasGlobalFacility: false }, { status: 200 });
    const clientId = clientDocument.id;
    const facilitiesSnapshot = await db.collection('facilities').where('clientId', '==', clientId).get();
    const globalFacility = facilitiesSnapshot.docs.find((document) => {
      const facility = document.data() || {};
      return (facility.facilityClass === 'global' || !facility.parentId) && (facility.status === 'approved' || facility.status === 'active');
    });

    return NextResponse.json({
      success: true,
      hasClient: true,
      clientId,
      client: {
        name: clientDocument.data()?.name || '',
        entityType: clientDocument.data()?.entityType || '',
        vehicleAssets: Array.isArray(clientDocument.data()?.vehicleAssets) ? clientDocument.data()?.vehicleAssets : [],
        bankAccounts: Array.isArray(clientDocument.data()?.bankAccounts) ? clientDocument.data()?.bankAccounts : [],
      },
      hasGlobalFacility: Boolean(globalFacility),
      globalFacility: globalFacility ? { id: globalFacility.id, limit: globalFacility.data()?.limit || 0, status: globalFacility.data()?.status } : null,
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Unable to resolve agreement application context.' }, { status: 500 });
  }
}
