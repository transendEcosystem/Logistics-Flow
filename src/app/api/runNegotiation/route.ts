
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { negotiateAgreement } from '@/ai/flows/negotiation-flow';
import { verifyAdmin } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
    try {
        const { db, adminUid } = await verifyAdmin(req);
        const { agreement } = await req.json();

        if (!agreement || !agreement.companyId || !agreement.shopId || !agreement.id) {
            return NextResponse.json({ success: false, error: 'Invalid agreement data provided.' }, { status: 400 });
        }

        // Update the agreement status to 'negotiating' to provide UI feedback
        const agreementRef = db.doc(`companies/${agreement.companyId}/shops/${agreement.shopId}/agreements/${agreement.id}`);
        await agreementRef.update({ aiStatus: 'negotiating', updatedAt: FieldValue.serverTimestamp() });

        // Asynchronously run the agent without awaiting it
        runAgentInBackground(agreementRef, agreement, adminUid);

        return NextResponse.json({ success: true, message: 'AI negotiation process started.' });

    } catch (error: any) {
        console.error(`API Error in /api/runNegotiation:`, error);
        const status = error.message.includes('Forbidden') ? 403 : 500;
        return NextResponse.json({ success: false, error: error.message }, { status });
    }
}

async function runAgentInBackground(agreementRef: FirebaseFirestore.DocumentReference, agreement: any, adminUid: string) {
    try {
        const negotiationResult = await negotiateAgreement({
            companyId: agreement.companyId,
            shopId: agreement.shopId,
            agreementId: agreement.id,
            proposedRate: agreement.percentage,
        });

        // Store the result back to the agreement document
        await agreementRef.update({
            aiStatus: 'completed',
            aiDecision: negotiationResult.decision,
            aiJustification: negotiationResult.justification,
            aiTrace: negotiationResult.agentTrace,
            aiCounterOffer: negotiationResult.counterOfferRate,
            updatedAt: FieldValue.serverTimestamp(),
        });
        
    } catch (error: any) {
        console.error("Error in background negotiation agent:", error);
        // Update the document to reflect the error
        await agreementRef.update({
            aiStatus: 'failed',
            aiJustification: `Agent failed: ${error.message}`,
            updatedAt: FieldValue.serverTimestamp(),
        });
    }
}
