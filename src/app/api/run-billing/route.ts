
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { verifyAdmin } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
    try {
        const { db, adminUid } = await verifyAdmin(req);
        
        const { startDate, endDate } = await req.json();

        if (!startDate || !endDate) {
            return NextResponse.json({ success: false, error: 'A "From" and "To" date range is required to run billing.' }, { status: 400 });
        }
        
        const membershipsSnap = await db.collection('memberships').get();
        const prices: { [key: string]: { price: number, name: string } } = {};
        membershipsSnap.forEach(doc => {
            const data = doc.data();
            const monthlyPrice = (typeof data.price === 'object' && data.price !== null)
                ? data.price.monthly
                : data.price;
            prices[doc.id] = { price: monthlyPrice, name: data.name };
        });

        // Fetch ALL companies to filter in application code.
        // This is more robust than relying on a potentially missing 'isBillable' flag
        // or complex queries that require specific indexes.
        const allCompaniesSnapshot = await db.collection('companies').get();

        const fromDate = new Date(startDate);
        const toDate = new Date(endDate);
        
        // Filter in code
        const companiesDocs = allCompaniesSnapshot.docs.filter(doc => {
            const company = doc.data();

            // Rule 1: Must be a billable plan (not 'free' or empty)
            const isBillablePlan = company.membershipId && company.membershipId !== 'free';
            if (!isBillablePlan) return false;

            // Rule 2: Must have a nextBillingDate
            if (!company.nextBillingDate) return false;
            
            // Rule 3: Must be within the date range
            let nextBillingDate: Date;
            if (company.nextBillingDate.toDate) { // Firestore Timestamp
                nextBillingDate = company.nextBillingDate.toDate();
            } else if (typeof company.nextBillingDate === 'string') { // ISO string fallback
                nextBillingDate = new Date(company.nextBillingDate);
                if (isNaN(nextBillingDate.getTime())) return false;
            } else {
                return false;
            }

            return nextBillingDate >= fromDate && nextBillingDate <= toDate;
        });


        if (companiesDocs.length === 0) {
            return NextResponse.json({ 
                success: true, 
                message: `No billable members found with billing dates in the selected range. Checked ${allCompaniesSnapshot.size} total members.`, 
                createdCount: 0, 
                checkedCount: allCompaniesSnapshot.size
            });
        }

        const batch = db.batch();
        let createdCount = 0;
        let errors: string[] = [];

        for (const companyDoc of companiesDocs) {
            const company = companyDoc.data();
            const companyId = companyDoc.id;

            const planId = company.membershipId;
            const cycle = company.billingCycle || 'monthly';
            const planDetails = prices[planId];

            if (!planDetails) {
                errors.push(`Price for plan '${planId}' on company ${companyId} not found.`);
                continue;
            }
            
            const planPrice = planDetails.price;
            const planName = planDetails.name || planId;

            if (typeof planPrice !== 'number') {
                errors.push(`Price for plan '${planId}' on company ${companyId} is invalid.`);
                continue;
            }
            
            const paymentRef = db.collection(`companies/${companyId}/walletPayments`).doc();
            batch.set(paymentRef, {
                companyId: companyId,
                userId: company.ownerId,
                status: 'pending',
                description: `Membership Fee: ${planName} (${cycle})`,
                amount: planPrice,
                createdAt: FieldValue.serverTimestamp(),
            });

            // Calculate the *next* next billing date
            let currentNextBillingDate;
             if (company.nextBillingDate.toDate) {
                currentNextBillingDate = company.nextBillingDate.toDate();
            } else {
                currentNextBillingDate = new Date(company.nextBillingDate);
            }
            
            const newNextBillingDate = new Date(currentNextBillingDate);
             if (cycle === 'monthly') {
                newNextBillingDate.setMonth(newNextBillingDate.getMonth() + 1);
            } else {
                newNextBillingDate.setFullYear(newNextBillingDate.getFullYear() + 1);
            }
            batch.update(companyDoc.ref, { nextBillingDate: newNextBillingDate });
            
            createdCount++;
        }
        
        if (createdCount > 0) {
            await batch.commit();
        }
        
        return NextResponse.json({ 
            success: true, 
            message: `Billing run completed. ${createdCount} invoice(s) created.`,
            createdCount,
            errors,
            checkedCount: allCompaniesSnapshot.size
        });

    } catch (error: any) {
        console.error(`Billing Run API Error:`, error);
        const status = error.message.includes('Forbidden') ? 403 : error.message.includes('Unauthorized') ? 401 : 500;
        return NextResponse.json({ success: false, error: error.message }, { status });
    }
}
