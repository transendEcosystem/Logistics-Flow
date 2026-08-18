
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from '@/lib/firebase-admin';

/**
 * PAY WITH WALLET ENDPOINT
 * Robust handling for Membership Tiers, Modular Nodes, and Ad Campaigns.
 */
async function processPlanPurchase(db: FirebaseFirestore.Firestore, adminUid: string, payload: any, isAdmin: boolean) {
    const { companyId, amount, description, planType, planId, cycle, title, targetAudience, creativeUrl, totalInstances } = payload;
    
    if (!companyId || typeof amount !== 'number' || !planType) {
        throw new Error('Missing activation metadata.');
    }

    const companyRef = db.doc(`companies/${companyId}`);
    const adPricingRef = db.doc('configuration/adPricing');
    
    return await db.runTransaction(async (transaction) => {
        const [companySnap, adPricingSnap] = await Promise.all([
            transaction.get(companyRef),
            transaction.get(adPricingRef)
        ]);

        if (!companySnap.exists) throw new Error("Member profile not found.");
        
        const companyData = companySnap.data()!;
        const currentBalance = Number(companyData?.availableBalance || 0);

        // 1. AD-SPECIFIC PRICING VALIDATION
        if (planType === 'ad_broadcast') {
            const pricing = adPricingSnap.exists ? adPricingSnap.data() : { pricePerBatch: 100, isEngineActive: true };
            if (!pricing?.isEngineActive && !isAdmin) throw new Error("Ad engine is currently offline for maintenance.");
            
            // Forensic verification of the amount vs provided instances
            if (!totalInstances || totalInstances <= 0) throw new Error("Invalid instance count for ad broadcast.");
        }

        // 2. FUNDS VERIFICATION
        if (!isAdmin && (isNaN(currentBalance) || currentBalance < amount)) {
            throw new Error(`Insufficient funds: Required ${amount}, Available ${currentBalance}`);
        }
        
        // 3. EXECUTE WALLET DEBIT
        transaction.update(companyRef, {
            walletBalance: FieldValue.increment(-amount),
            availableBalance: FieldValue.increment(-amount),
            updatedAt: FieldValue.serverTimestamp(),
        });

        // 4. RESOLVE ACCOUNTING (4000 series for subscriptions, 4500 for ads)
        let chartOfAccountsCode = '4100';
        if (planType === 'membership') chartOfAccountsCode = '4010';
        if (planType === 'ad_broadcast') chartOfAccountsCode = '4500';

        // 5. RECORD MEMBER TRANSACTION
        const companyTransactionRef = companyRef.collection('transactions').doc();
        transaction.set(companyTransactionRef, {
            transactionId: companyTransactionRef.id,
            type: 'debit',
            amount: amount,
            date: FieldValue.serverTimestamp(),
            description: description,
            status: 'allocated',
            chartOfAccountsCode, 
            postedBy: adminUid,
        });

        // 6. RECORD PLATFORM REVENUE
        const platformTransactionRef = db.collection('platformTransactions').doc();
        transaction.set(platformTransactionRef, {
            transactionId: platformTransactionRef.id,
            type: 'credit',
            amount: amount,
            date: FieldValue.serverTimestamp(),
            description: `Revenue: ${description} from ${companyData.companyName}`,
            status: 'allocated',
            chartOfAccountsCode,
            companyId: companyId,
        });

        // 7. APPLY ACTIVATION LOGIC
        if (planType === 'ad_broadcast') {
            const adRef = companyRef.collection('adCampaigns').doc();
            transaction.set(adRef, {
                id: adRef.id,
                companyId,
                title,
                targetAudience,
                creativeUrl,
                budget: amount,
                totalInstances: Number(totalInstances),
                remainingInstances: Number(totalInstances),
                status: 'pending_approval',
                metrics: { impressions: 0, clicks: 0 },
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp()
            });
        } else {
            const nextBilling = new Date();
            if (cycle === 'annual') nextBilling.setFullYear(nextBilling.getFullYear() + 1);
            else nextBilling.setMonth(nextBilling.getMonth() + 1);

            if (planType === 'membership' || planId === 'intelligence') {
                transaction.update(companyRef, {
                    membershipId: planId,
                    billingCycle: cycle || 'monthly',
                    nextBillingDate: nextBilling,
                    status: 'active', 
                });
            } else if (planType === 'node' || planType === 'connect') {
                const nodeMap: Record<string, string> = {
                    'loads_intelligence': 'hasLoadsPlan',
                    'warehouse_intelligence': 'hasWarehousePlan',
                    'buy_sell_intelligence': 'hasBuySellPlan',
                    'finance_intelligence': 'hasFinancePlan',
                    'distribution_intelligence': 'hasDistributionPlan',
                    'transporter_intelligence': 'hasTransporterPlan',
                    'supplier_intelligence': 'hasSupplierPlan',
                    'loyalty': 'hasLoyaltyPlan',
                    'rewards': 'hasRewardsPlan',
                    'actions': 'hasActionsPlan'
                };

                const flag = nodeMap[planId];
                if (flag) {
                    transaction.update(companyRef, {
                        [flag]: true,
                        [`${planId}NextBillingDate`]: nextBilling,
                        [`${planId}BillingCycle`]: cycle || 'monthly'
                    });
                }
            }
        }
        
        return { success: true };
    });
}

export async function POST(req: NextRequest) {
  const { app, error: initError } = getAdminApp();
  if (initError || !app) {
    return NextResponse.json({ success: false, error: 'Firebase Failure' }, { status: 500 });
  }

  const authorization = req.headers.get('authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'Missing Auth' }, { status: 401 });
  }
  
  try {
    const adminAuth = getAuth(app);
    const decodedToken = await adminAuth.verifyIdToken(authorization.split('Bearer ')[1]);
    const db = getFirestore(app);
    const payload = await req.json();

    const isAdmin = decodedToken.email === 'beyondtransport@gmail.com' || 
                    decodedToken.email === 'mkoton100@gmail.com' || 
                    decodedToken.email === 'michael@logisticsflow.co.za';

    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    
    if (userDoc.data()?.companyId !== payload.companyId && !isAdmin) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    
    const result = await processPlanPurchase(db, decodedToken.uid, payload, isAdmin);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Payment API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
