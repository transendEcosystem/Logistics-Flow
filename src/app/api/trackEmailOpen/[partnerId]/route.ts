
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';

/**
 * INTERACTION TRACKING ENDPOINT
 * Handles Pixels (Email Opens), Pings (App Access), Ad Metrics, and Associate Yield (Clicks).
 */
export async function GET(req: NextRequest, { params }: { params: { partnerId: string } }) {
  const { partnerId: viewerId } = params;
  const { searchParams } = new URL(req.url);
  const source = searchParams.get('source') || 'email';
  const campaignId = searchParams.get('campaignId');
  const advertiserId = searchParams.get('advertiserId');
  const dest = searchParams.get('dest'); // Support for redirect after tracking
  
  const { app } = getAdminApp();

  if (app && viewerId) {
    try {
        const db = getFirestore(app);
        const batch = db.batch();

        let entityName = 'Anonymous Entity';
        
        // 1. RESOLVE VIEWER IDENTITY (if possible)
        const userDoc = await db.collection('users').doc(viewerId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            const companySnap = await db.collection('companies').doc(userData?.companyId || 'N/A').get();
            entityName = companySnap.data()?.companyName || userData?.firstName || entityName;
        }

        // 2. AD CAMPAIGN TRACKING
        if (campaignId && advertiserId) {
            const adRef = db.doc(`companies/${advertiserId}/adCampaigns/${campaignId}`);
            const actionLabel = source === 'ad_click' ? 'ad_click' : 'ad_impression';
            const metricField = source === 'ad_click' ? 'metrics.clicks' : 'metrics.impressions';

            batch.update(adRef, {
                [metricField]: FieldValue.increment(1),
                remainingInstances: FieldValue.increment(-1),
                updatedAt: FieldValue.serverTimestamp()
            });

            const auditRef = db.collection('auditLogs').doc();
            batch.set(auditRef, {
                action: actionLabel,
                details: `${entityName} ${source === 'ad_click' ? 'clicked' : 'viewed'} promotion.`,
                companyId: viewerId,
                companyName: entityName,
                timestamp: FieldValue.serverTimestamp(),
                metadata: { source, campaignId, advertiserId }
            });
        } 
        // 3. ASSOCIATE YIELD TRACKING (Clicks)
        else if (source === 'associate_click') {
            const associateRef = db.collection('companies').doc(viewerId); // In this case viewerId is the Associate ID
            
            batch.update(associateRef, {
                totalClicksGenerated: FieldValue.increment(1),
                updatedAt: FieldValue.serverTimestamp()
            });

            const auditRef = db.collection('auditLogs').doc();
            batch.set(auditRef, {
                action: 'associate_click',
                details: `Digital Associate generated a click from ${searchParams.get('platform') || 'Social'}.`,
                companyId: viewerId,
                timestamp: FieldValue.serverTimestamp(),
                metadata: { campaign: searchParams.get('campaign'), platform: searchParams.get('platform') }
            });
        }
        // 4. STANDARD EMAIL/APP TRACKING
        else {
            const fieldToUpdate = source === 'app' ? 'lastAccessedAt' : 'lastOpenedAt';
            const actionLabel = source === 'app' ? 'landing_page_accessed' : 'email_opened';
            
            const update = { [fieldToUpdate]: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() };

            const partnerRef = db.collection('partners').doc(viewerId);
            const leadRef = db.collection('leads').doc(viewerId);

            const [pSnap, lSnap] = await Promise.all([partnerRef.get(), leadRef.get()]);
            
            if (pSnap.exists) batch.set(partnerRef, update, { merge: true });
            if (lSnap.exists) batch.set(leadRef, update, { merge: true });

            const auditRef = db.collection('auditLogs').doc();
            batch.set(auditRef, {
                action: actionLabel,
                details: `${entityName}: ${source === 'app' ? 'Landed on handshake link.' : 'Opened engagement email.'}`,
                companyId: viewerId,
                companyName: entityName,
                timestamp: FieldValue.serverTimestamp(),
                metadata: { source, partnerId: viewerId }
            });
        }

        await batch.commit();
        
    } catch (e) {
        console.error("Tracking failure:", e);
    }
  }

  // REDIRECT LOGIC
  if (dest) {
      return NextResponse.redirect(new URL(dest, req.url));
  }

  if (source === 'ad_click' && advertiserId) {
      const redirectUrl = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/shops/${advertiserId}`;
      return NextResponse.redirect(redirectUrl);
  }

  // Return pixel for email opens
  const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  return new NextResponse(pixel, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
