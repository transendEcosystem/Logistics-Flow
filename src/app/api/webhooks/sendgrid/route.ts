
import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';

/**
 * SENDGRID WEBHOOK HANDLER
 * Listens for 'bounce' and 'dropped' events to flag gapped data in the registry.
 */
export async function POST(req: NextRequest) {
    const { app } = getAdminApp();
    if (!app) return NextResponse.json({ error: "Firebase failed" }, { status: 500 });

    try {
        const events = await req.json();
        const db = getFirestore(app);
        const batch = db.batch();

        for (const event of events) {
            // We only care about delivery failures for forensic tracking
            if (event.event === 'bounce' || event.event === 'dropped') {
                const email = event.email;
                if (!email) continue;

                // Find the record in both registries
                const [leadsSnap, partnersSnap] = await Promise.all([
                    db.collection('leads').where('email', '==', email).get(),
                    db.collection('partners').where('email', '==', email).get()
                ]);

                const update = {
                    pipelineStatus: 'bounced',
                    status: 'new', // Revert to new for scavenger re-scoping
                    forensicNote: `Email bounced on ${new Date().toLocaleDateString()}: ${event.reason || 'Unknown error'}.`,
                    updatedAt: FieldValue.serverTimestamp()
                };

                leadsSnap.docs.forEach(d => batch.update(d.ref, update));
                partnersSnap.docs.forEach(d => batch.update(d.ref, update));

                // Log to global audit
                const auditRef = db.collection('auditLogs').doc();
                batch.set(auditRef, {
                    action: 'email_bounce_detected',
                    details: `Delivery failure for ${email}. Record flagged for V13 Scavenger.`,
                    timestamp: FieldValue.serverTimestamp(),
                    metadata: { email, reason: event.reason }
                });
            }
        }

        await batch.commit();
        return NextResponse.json({ success: true });

    } catch (e: any) {
        console.error("Webhook Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
