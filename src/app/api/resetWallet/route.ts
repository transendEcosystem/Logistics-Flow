
import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { verifyAdmin } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
    try {
        const { db, adminUid } = await verifyAdmin(req);
        const { companyId, newBalance } = await req.json();

        if (!companyId || typeof newBalance !== 'number') {
            return NextResponse.json({ success: false, error: 'Bad Request: "companyId" and "newBalance" are required.' }, { status: 400 });
        }

        const companyRef = db.doc(`companies/${companyId}`);
        const transactionsRef = companyRef.collection('transactions');
        
        const batch = db.batch();

        // 1. Delete all existing transactions
        const transactionsSnapshot = await transactionsRef.get();
        if (!transactionsSnapshot.empty) {
            transactionsSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
        }
        
        // 2. Delete all existing payout requests
        const payoutsRef = companyRef.collection('payoutRequests');
        const payoutsSnapshot = await payoutsRef.get();
        if (!payoutsSnapshot.empty) {
             payoutsSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
        }
        
        // 3. Delete all existing wallet payments
        const paymentsRef = companyRef.collection('walletPayments');
        const paymentsSnapshot = await paymentsRef.get();
        if (!paymentsSnapshot.empty) {
             paymentsSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
        }


        // 4. Update the company wallet balances
        batch.update(companyRef, {
            walletBalance: newBalance,
            availableBalance: newBalance,
            pendingBalance: 0,
            updatedAt: FieldValue.serverTimestamp(),
        });
        
        // 5. Create a new opening balance transaction
        const newTransactionRef = transactionsRef.doc();
        batch.set(newTransactionRef, {
            transactionId: newTransactionRef.id,
            type: 'credit',
            amount: newBalance,
            date: FieldValue.serverTimestamp(),
            description: 'Opening Balance (Admin Reset)',
            status: 'allocated',
            isAdjustment: true,
            postedBy: adminUid,
        });

        // Commit all batched operations
        await batch.commit();

        return NextResponse.json({ success: true, message: "Wallet reset successfully." });

    } catch (error: any) {
        console.error(`API Error in /api/resetWallet:`, error);
        const status = error.message.includes('Forbidden') ? 403 : error.message.includes('Unauthorized') ? 401 : 500;
        return NextResponse.json({ success: false, error: error.message }, { status });
    }
}
