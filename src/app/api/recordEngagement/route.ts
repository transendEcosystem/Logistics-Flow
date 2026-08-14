
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from '@/lib/firebase-admin';
import sgMail from '@sendgrid/mail';

/**
 * DUAL-ENGAGEMENT LOGGING API (Handshake Terminal)
 * 1. Logs for the Engager (History).
 * 2. Logs for the Target (Engagement Ping).
 * 3. SCHEDULES FOLLOW-UP: Sets a 7-day forensic follow-up marker.
 * 4. TRIGGERS LOOP CLOSURE: Emails the target based on their standing.
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

    const { targetId, targetName, targetType = 'partner' } = await req.json();
    if (!targetId) return NextResponse.json({ success: false, error: 'Missing ID' }, { status: 400 });

    const userSnap = await db.collection('users').doc(uid).get();
    const companyId = userSnap.data()?.companyId;
    if (!companyId) return NextResponse.json({ success: false, error: 'Profile required' }, { status: 403 });

    const companySnap = await db.collection('companies').doc(companyId).get();
    const companyName = companySnap.data()?.companyName || 'A Verified Member';

    const batch = db.batch();

    // 1. LOG FOR THE ENGAGER
    const engagerLogRef = db.collection('companies').doc(companyId).collection('searchLogs').doc();
    batch.set(engagerLogRef, {
        id: engagerLogRef.id,
        type: 'handshake_initiated',
        targetId,
        targetName,
        timestamp: FieldValue.serverTimestamp(),
        details: `Successfully initiated a handshake with ${targetName}.`
    });

    // 2. LOG FOR THE TARGET (The Ping) + SCHEDULE FOLLOW-UP
    const pingRef = db.collection('engagementPings').doc();
    
    // Set follow-up date for 7 days from now
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + 7);

    batch.set(pingRef, {
        id: pingRef.id,
        targetId: targetId, 
        targetType: targetType,
        targetName: targetName,
        engagerId: companyId,
        engagerName: companyName,
        timestamp: FieldValue.serverTimestamp(),
        status: 'pending', // 'pending', 'negotiating', 'closed', 'lost'
        result: 'Awaiting Response',
        nextFollowUpAt: followUpDate,
        isClaimed: false, // Updated if it's a member
    });

    // 3. UPDATE THE REGISTRY RECORD
    const recordCol = targetType === 'lead' ? 'leads' : 'partners';
    const recordRef = db.collection(recordCol).doc(targetId);
    
    const rSnap = await recordRef.get();
    const rData = rSnap.data();
    const currentEngagements = (rData?.engagementCount || 0) + 1;
    const isActuallyClaimed = !!rData?.companyId || !!rData?.isClaimed;

    // Update ping record if it's already a claimed node
    if (isActuallyClaimed) {
        batch.update(pingRef, { isClaimed: true });
    }

    batch.set(recordRef, {
        engagementCount: FieldValue.increment(1),
        lastEngagedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    // 4. CLOSING THE LOOP: TRIGGER MESSAGING
    if (process.env.SENDGRID_API_KEY && rData?.email) {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        
        const baseUrl = 'https://logisticsflow.co.za';
        
        let subject = "";
        let html = "";

        if (isActuallyClaimed) {
            subject = `Logistics Flow: New Handshake Request from ${companyName}`;
            html = `
                <div style="font-family: sans-serif; max-width: 600px; color: #334155;">
                    <h2 style="color: #228B22;">New Handshake Request!</h2>
                    <p>A verified member, <strong>${companyName}</strong>, has just selected your industrial node to initiate a handshake.</p>
                    <p style="margin: 20px 0;">Sign in to your dashboard to view their profile, technical requirements, and direct contact details.</p>
                    <a href="${baseUrl}/signin" style="display: inline-block; background: #228B22; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Enter Commerce Command &rarr;</a>
                </div>
            `;
        } else {
            subject = `Logistics Flow: Your profile is generating industrial heat.`;
            html = `
                <div style="font-family: sans-serif; max-width: 600px; color: #334155;">
                    <h2 style="color: #228B22;">Data Intelligence Alert</h2>
                    <p>Our industrial matching engine has recorded <strong>${currentEngagements} "Select to Engage" actions</strong> for your business profile this week.</p>
                    <p>Verified decision-makers are actively looking for your services in the grid, but your node is currently <strong>Unclaimed</strong>, which prevents these handshakes from reaching your desk.</p>
                    <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0; font-size: 14px;"><strong>Target Action:</strong> Establish your digital standing for <strong>R10/mo</strong> to unlock your Inbound Interest Ledger and see exactly who is searching for you.</p>
                    </div>
                    <a href="${baseUrl}/opt-in/${targetId}" style="display: inline-block; background: #228B22; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Claim Your Forensic Node &rarr;</a>
                </div>
            `;
        }

        try {
            await sgMail.send({
                to: rData.email,
                from: 'michael@logisticsflow.co.za',
                subject,
                html
            });
        } catch (mailErr) {
            console.error("Loop closure email failed:", mailErr);
        }
    }

    await batch.commit();
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Handshake Terminal Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
