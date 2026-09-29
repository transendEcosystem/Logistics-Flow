import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp, verifyAdmin } from '@/lib/firebase-admin';
import { buildInitialDiscoveryGaps, DiscoveryGapStatus } from '@/lib/lending/discovery';

const gapStatuses: DiscoveryGapStatus[] = ['pending', 'confirmed', 'variance_found', 'not_applicable'];

export async function GET(request: NextRequest) {
  try {
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');
    const auth = await verifyAdmin(request);
    const applicationId = new URL(request.url).searchParams.get('applicationId');
    if (!applicationId) return NextResponse.json({ success: false, error: 'applicationId is required.' }, { status: 400 });
    const discovery = await auth.db.collection('lendingApplications').doc(applicationId).collection('discovery').doc('current').get();
    return NextResponse.json({ success: true, data: discovery.exists ? discovery.data() : null });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Unable to load discovery case.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');
    const auth = await verifyAdmin(request);
    const body = await request.json();
    const applicationId = String(body?.applicationId || '').trim();
    if (!applicationId) return NextResponse.json({ success: false, error: 'applicationId is required.' }, { status: 400 });
    const applicationRef = auth.db.collection('lendingApplications').doc(applicationId);
    const applicationSnapshot = await applicationRef.get();
    if (!applicationSnapshot.exists) return NextResponse.json({ success: false, error: 'Application not found.' }, { status: 404 });
    const application = applicationSnapshot.data() || {};
    const discoveryRef = applicationRef.collection('discovery').doc('current');
    const existing = await discoveryRef.get();
    const now = new Date().toISOString();
    if (!existing.exists) {
      await discoveryRef.set({ applicationId, status: 'in_progress', declaredSnapshot: application, gaps: buildInitialDiscoveryGaps(application), createdAt: now, updatedAt: now, initiatedBy: auth.adminUid });
      await applicationRef.set({ discoveryStatus: 'in_progress', discoveryStartedAt: now, updatedAt: now }, { merge: true });
      await auth.db.collection('auditLogs').add({ action: 'lending_discovery_started', applicationId, actorId: auth.adminUid, timestamp: FieldValue.serverTimestamp() });
    }
    return NextResponse.json({ success: true, data: (await discoveryRef.get()).data() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Unable to start discovery.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');
    const auth = await verifyAdmin(request);
    const body = await request.json();
    const applicationId = String(body?.applicationId || '').trim();
    const gapId = String(body?.gapId || '').trim();
    const status = String(body?.status || '').trim() as DiscoveryGapStatus;
    const findings = String(body?.findings || '').trim();
    const source = String(body?.source || '').trim();
    if (!applicationId || !gapId || !gapStatuses.includes(status)) return NextResponse.json({ success: false, error: 'applicationId, gapId, and a valid discovery status are required.' }, { status: 400 });
    const discoveryRef = auth.db.collection('lendingApplications').doc(applicationId).collection('discovery').doc('current');
    const discovery = await discoveryRef.get();
    if (!discovery.exists) return NextResponse.json({ success: false, error: 'Discovery has not been started.' }, { status: 404 });
    const now = new Date().toISOString();
    const gaps = Array.isArray(discovery.data()?.gaps) ? discovery.data()!.gaps : [];
    const nextGaps = gaps.map((gap: any) => gap.id === gapId ? { ...gap, status, findings: findings || null, source: source || null, updatedAt: now, updatedBy: auth.adminUid } : gap);
    await discoveryRef.set({ gaps: nextGaps, updatedAt: now }, { merge: true });
    await auth.db.collection('auditLogs').add({ action: 'lending_discovery_gap_updated', applicationId, gapId, status, source: source || null, actorId: auth.adminUid, timestamp: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true, data: nextGaps });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Unable to update discovery gap.' }, { status: 500 });
  }
}
