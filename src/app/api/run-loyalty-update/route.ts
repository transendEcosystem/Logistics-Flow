
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { verifyAdmin } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
    try {
        const { db, adminUid } = await verifyAdmin(req);
        
        // 1. Fetch loyalty tier thresholds from configuration
        const loyaltyConfigSnap = await db.doc('configuration/loyaltySettings').get();
        const loyaltyConfig = loyaltyConfigSnap.data();

        if (!loyaltyConfig || typeof loyaltyConfig.silver !== 'number' || typeof loyaltyConfig.gold !== 'number') {
            throw new Error("Loyalty tier thresholds are not configured. Please set them in Platform Settings.");
        }

        const { silver: silverThreshold, gold: goldThreshold } = loyaltyConfig;

        // 2. Get all companies
        const companiesSnap = await db.collection('companies').get();

        if (companiesSnap.empty) {
            return NextResponse.json({ success: true, message: "No companies found to process.", promotions: 0, checked: 0 });
        }

        const batch = db.batch();
        let promotions = 0;
        const companiesChecked = companiesSnap.size;

        // 3. Iterate through each company and update tier if necessary
        for (const companyDoc of companiesSnap.docs) {
            const company = companyDoc.data();
            const currentPoints = company.rewardPoints || 0;
            const currentTier = company.loyaltyTier || 'bronze';
            let newTier = 'bronze';

            if (currentPoints >= goldThreshold) {
                newTier = 'gold';
            } else if (currentPoints >= silverThreshold) {
                newTier = 'silver';
            }

            if (newTier !== currentTier) {
                batch.update(companyDoc.ref, { loyaltyTier: newTier, updatedAt: FieldValue.serverTimestamp() });
                promotions++;
            }
        }
        
        if (promotions > 0) {
            await batch.commit();
        }
        
        return NextResponse.json({ 
            success: true, 
            message: `Loyalty tiers updated. ${promotions} members were promoted.`,
            promotions,
            checked: companiesChecked
        });

    } catch (error: any) {
        console.error(`Loyalty Tier Update API Error:`, error);
        const status = error.message.includes('Forbidden') ? 403 : error.message.includes('Unauthorized') ? 401 : 500;
        return NextResponse.json({ success: false, error: error.message }, { status });
    }
}
