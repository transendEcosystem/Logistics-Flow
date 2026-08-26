import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  const { app, error: initError } = getAdminApp();
  if (initError || !app) {
    return NextResponse.json({ success: false, error: 'Internal Server Error: Could not connect to Firebase.' }, { status: 500 });
  }

  const authorization = req.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'Unauthorized: No token provided.' }, { status: 401 });
  }

  const idToken = authorization.split('Bearer ')[1];

  try {
    const adminAuth = getAuth(app);
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const buyerUid = decodedToken.uid;
    const db = getFirestore(app);

    const { buyerCompanyId, sellerCompanyId, items, totalAmount } = await req.json();

    if (!buyerCompanyId || !sellerCompanyId || !Array.isArray(items) || items.length === 0 || typeof totalAmount !== 'number') {
      return NextResponse.json({ success: false, error: 'Bad Request: Missing required purchase data.' }, { status: 400 });
    }
    
    const buyerUserDoc = await db.collection('users').doc(buyerUid).get();
    if(buyerUserDoc.data()?.companyId !== buyerCompanyId) {
        return NextResponse.json({ success: false, error: 'Forbidden: You can only make purchases for your own company.' }, { status: 403 });
    }

    const buyerCompanyRef = db.collection('companies').doc(buyerCompanyId);
    const sellerCompanyRef = db.collection('companies').doc(sellerCompanyId);
    const salesIncentivesRef = db.collection('configuration').doc('salesIncentives');
    
    const activeAgreementQuery = db.collection(`companies/${sellerCompanyId}/shops/${items[0].shopId}/agreements`).where('status', '==', 'active').limit(1);
    
    await db.runTransaction(async (transaction) => {
      const buyerCompanyDoc = await transaction.get(buyerCompanyRef);
      if (!buyerCompanyDoc.exists || (buyerCompanyDoc.data()?.availableBalance || 0) < totalAmount) {
        throw new Error('Insufficient available funds.');
      }
      const buyerCompanyData = buyerCompanyDoc.data()!;
      const referrerRef = buyerCompanyData.referrerId ? db.collection('companies').doc(buyerCompanyData.referrerId) : null;
      
      const [sellerCompanyDoc, mallCommissionsDoc, activeAgreementSnap, salesIncentivesDoc, referrerSnap] = await Promise.all([
        transaction.get(sellerCompanyRef),
        transaction.get(db.doc('configuration/mallCommissions')),
        transaction.get(activeAgreementQuery),
        transaction.get(salesIncentivesRef),
        referrerRef ? transaction.get(referrerRef) : Promise.resolve(null),
      ]);
      if (!sellerCompanyDoc.exists) {
          throw new Error('Seller company not found.');
      }
      
      let platformDiscountPercent = 2.5; // Default commission
      if (!activeAgreementSnap.empty && activeAgreementSnap.docs[0].data().percentage > 0) {
        platformDiscountPercent = activeAgreementSnap.docs[0].data().percentage;
      } else if (mallCommissionsDoc.exists && mallCommissionsDoc.data()?.supplierMall > 0) {
        platformDiscountPercent = mallCommissionsDoc.data()?.supplierMall;
      }
      
      const platformCommission = totalAmount * (platformDiscountPercent / 100);
      const sellerAmount = totalAmount - platformCommission;
      const productRecords: any[] = [];

      for (const item of items) {
          const privateProductRef = db.doc(`companies/${sellerCompanyId}/shops/${item.shopId}/products/${item.id}`);
          const publicProductRef = db.doc(`shops/${item.shopId}/products/${item.id}`);
          
          const productDoc = await transaction.get(privateProductRef);
          if (!productDoc.exists) {
              throw new Error(`Product ${item.name} not found.`);
          }
          const productData = productDoc.data();
          if (productData?.stock === undefined || productData.stock < item.quantity) {
              throw new Error(`Insufficient stock for ${item.name}. Available: ${productData?.stock || 0}, Requested: ${item.quantity}.`);
          }
            productRecords.push(productData);
          transaction.update(privateProductRef, { stock: FieldValue.increment(-item.quantity) });
          transaction.update(publicProductRef, { stock: FieldValue.increment(-item.quantity) });
      }
          const isIncentivesProduct = productRecords.some(product => product?.isIncentivesProduct === true);

      transaction.update(buyerCompanyRef, { 
          walletBalance: FieldValue.increment(-totalAmount),
          availableBalance: FieldValue.increment(-totalAmount) 
      });

      transaction.update(sellerCompanyRef, { 
          walletBalance: FieldValue.increment(sellerAmount),
          pendingBalance: FieldValue.increment(sellerAmount)
      });
      
      const productNames = items.map((item:any) => `${item.name} (x${item.quantity})`).join(', ');

      const buyerTxRef = db.collection('companies').doc(buyerCompanyId).collection('transactions').doc();
      transaction.set(buyerTxRef, {
        transactionId: buyerTxRef.id,
        type: 'debit',
        amount: totalAmount,
        date: FieldValue.serverTimestamp(),
        description: `Purchase from ${items[0].shopName}: ${productNames}`,
        status: 'allocated',
        chartOfAccountsCode: '6010',
      });

      const sellerTxRef = db.collection('companies').doc(sellerCompanyId).collection('transactions').doc();
      transaction.set(sellerTxRef, {
        transactionId: sellerTxRef.id,
        type: 'credit',
        amount: sellerAmount,
        date: FieldValue.serverTimestamp(),
        description: `Sale to ${buyerCompanyDoc.data()?.companyName}: ${productNames}`,
        status: 'allocated',
        chartOfAccountsCode: '4000',
      });

      if (platformCommission > 0) {
        const platformTxRef = db.collection('platformTransactions').doc();
        transaction.set(platformTxRef, {
            transactionId: platformTxRef.id,
            type: 'credit',
            amount: platformCommission,
            date: FieldValue.serverTimestamp(),
            description: `Commission from ${items[0].shopName} on sale to ${buyerCompanyDoc.data()?.companyName}`,
            status: 'allocated',
            chartOfAccountsCode: '4220',
            companyId: sellerCompanyId,
            revenueType: isIncentivesProduct ? 'incentives_product_revenue' : 'transaction_platform_revenue',
        });

        if (referrerRef && referrerSnap) {
          const incentives = salesIncentivesDoc.data() || {};
          // Brokerage and origination fees are retained platform commission. Only the designated incentives-product revenue participates in a network share.
          const commissionRate = Number(isIncentivesProduct ? incentives.incentivesProductCommissionPercent : 0);

          if (commissionRate > 0) {
            const commissionAmount = Math.round(platformCommission * (commissionRate / 100) * 100) / 100;
            const commissionRef = referrerRef.collection('commissionLedger').doc(platformTxRef.id);
            const payoutEligibleAt = new Date();
            payoutEligibleAt.setMonth(payoutEligibleAt.getMonth() + 1, 7);
            const benefitType = isIncentivesProduct ? 'incentives_product_revenue_share' : 'transaction_revenue_share';

            transaction.set(commissionRef, {
              id: commissionRef.id,
              type: benefitType,
              status: 'accrued',
              referredCompanyId: buyerCompanyId,
              referredCompanyName: buyerCompanyData.companyName || 'Referred member',
              grossAmount: totalAmount,
              retainedPlatformRevenue: platformCommission,
              commissionRate,
              commissionAmount,
              sourceTransactionId: platformTxRef.id,
              earnedAt: FieldValue.serverTimestamp(),
              payoutEligibleAt,
            });
          }
        }
      }
    });

    return NextResponse.json({ success: true, message: 'Purchase processed successfully.' });

  } catch (error: any) {
    console.error(`Error in processPurchase:`, error);
    if (error.code === 'auth/id-token-expired') {
       return NextResponse.json({ success: false, error: 'Authentication token has expired.' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}
