import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { app, error: initError } = getAdminApp();
  if (initError || !app) return NextResponse.json({ success: false, error: 'Service unavailable.' }, { status: 500 });

  try {
    const db = getFirestore(app);
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    let unlocked = false;

    if (token) {
      const decoded = await getAuth(app).verifyIdToken(token);
      const user = (await db.collection('users').doc(decoded.uid).get()).data();
      if (user?.companyId) {
        const company = (await db.collection('companies').doc(user.companyId).get()).data();
        unlocked = Boolean(company?.hasLoadsPlan || decoded.admin);
      }
    }

    const loads = await db.collectionGroup('loads').where('status', '==', 'active').limit(60).get();
    const records = loads.docs.map(document => {
      const load = document.data();
      const record = {
        id: document.id,
        brokerId: load.brokerId,
        origin: load.origin || 'Collection location',
        destination: load.destination || 'Delivery location',
        cargoType: load.cargoType || 'Freight opportunity',
        requiredEquipment: load.requiredEquipment || [],
        collectionDate: load.collectionDate || load.pickupDate || null,
        brokerName: load.brokerName || 'Verified load provider',
        createdAt: load.createdAt?.toDate?.()?.toISOString?.() || null,
      };
      return unlocked ? { ...record, haulierPayout: load.haulierPayout || 0, loadType: load.loadType || '', providerName: load.providerName || '', deliveryDate: load.deliveryDate || null, terms: load.demurrageConditions || '' } : record;
    });

    return NextResponse.json({ success: true, unlocked, records });
  } catch (error: any) {
    console.error('Loads Intelligence retrieval failed:', error);
    return NextResponse.json({ success: false, error: error.message || 'Could not retrieve load records.' }, { status: 500 });
  }
}