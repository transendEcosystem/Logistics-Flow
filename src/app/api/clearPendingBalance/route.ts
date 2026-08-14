
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
    try {
        const { db, adminUid } = await verifyAdmin(req);
        const { companyId } = await req.json();

        if (!companyId) {
            return NextResponse.json({ success: false, error: 'Bad Request: "companyId" is required.' }, { status: 400 });
        }

        const companyRef = db.doc(`companies/${companyId}`);
        let clearedAmount = 0;

        await db.runTransaction(async (transaction) => {
            const companyDoc = await transaction.get(companyRef);
            if (!companyDoc.exists) {
                throw new Error("Company not found.");
            }
            const companyData = companyDoc.data();
            clearedAmount = companyData?.pendingBalance || 0;

            if (clearedAmount <= 0) {
                throw new Error("No pending balance to clear.");
            }

            // Move pending balance to available balance and reset pending
            transaction.update(companyRef, {
                pendingBalance: 0,
                availableBalance: FieldValue.increment(clearedAmount),
                updatedAt: FieldValue.serverTimestamp(),
            });

            // Create a transaction log for this clearing event
            const newTransactionRef = companyRef.collection('transactions').doc();
            transaction.set(newTransactionRef, {
                transactionId: newTransactionRef.id,
                type: 'credit',
                amount: clearedAmount,
                date: FieldValue.serverTimestamp(),
                description: 'Cleared funds from pending sales',
                status: 'allocated',
                isAdjustment: true,
                postedBy: adminUid,
            });
        });

        return NextResponse.json({ success: true, message: `Successfully cleared ${clearedAmount.toFixed(2)} from pending balance.` });

    } catch (error: any) {
        console.error(`API Error in /api/clearPendingBalance:`, error);
        const status = error.message.includes('Forbidden') ? 403 : error.message.includes('Unauthorized') ? 401 : 500;
        return NextResponse.json({ success: false, error: error.message }, { status });
    }
}
