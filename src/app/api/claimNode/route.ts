import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from '@/lib/firebase-admin';

/**
 * NODE CLAIMING API (R10 Micro-Subscription)
 * Allows a member to bind their digital identity to an existing registry record.
 * Low-friction entry point for reputation management.
 */
export async function POST(req: NextRequest) {
  const { app, error: initError } = getAdminApp();
  if (initError || !app) return NextResponse.json({ success: false, error: 'Firebase Failure' }, { status: 500 });

  try {
    const authorization = req.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    
    const token = authorization.split('Bearer ')[1];
    const adminAuth = getAuth(app);
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;
    const db = getFirestore(app);

    const { targetId, collection: colName = 'partners' } = await req.json();
    
    const userSnap = await db.collection('users').doc(uid).get();
    const companyId = userSnap.data()?.companyId;
    if (!companyId) return NextResponse.json({ success: false, error: 'Profile required' }, { status: 403 });

    const companyRef = db.collection('companies').doc(companyId);
    const targetRef = db.collection(colName).doc(targetId);

    const CLAIM_FEE = 10;

    return await db.runTransaction(async (transaction) => {
        const [cSnap, tSnap] = await Promise.all([
            transaction.get(companyRef),
            transaction.get(targetRef)
        ]);

        if (!cSnap.exists) throw new Error("Company not found.");
        if (!tSnap.exists) throw new Error("Registry record not found.");
        
        const cData = cSnap.data()!;
        const tData = tSnap.data()!;

        if (tData.isClaimed) throw new Error("This node has already been claimed by another entity.");
        if ((cData.availableBalance || 0) < CLAIM_FEE) throw new Error("Insufficient wallet balance (R10 required).");

        // 1. Debit Wallet
        transaction.update(companyRef, {
            availableBalance: FieldValue.increment(-CLAIM_FEE),
            walletBalance: FieldValue.increment(-CLAIM_FEE),
            updatedAt: FieldValue.serverTimestamp()
        });

        // 2. Bind Identity
        transaction.update(targetRef, {
            isClaimed: true,
            claimantId: companyId,
            verificationStatus: 'owner_verified',
            status: 'active',
            updatedAt: FieldValue.serverTimestamp()
        });

        // 3. Create Transaction Record
        const txRef = companyRef.collection('transactions').doc();
        transaction.set(txRef, {
            id: txRef.id,
            amount: CLAIM_FEE,
            type: 'debit',
            description: `Node Claim: ${tData.companyName || targetId}`,
            chartOfAccountsCode: '4410',
            date: FieldValue.serverTimestamp()
        });

        return { success: true };
    }).then(res => NextResponse.json(res))
      .catch(err => NextResponse.json({ success: false, error: err.message }, { status: 400 }));

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
