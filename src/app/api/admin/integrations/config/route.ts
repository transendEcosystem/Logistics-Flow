import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp, verifyAdmin } from '@/lib/firebase-admin';
import { containsRawCredential } from '@/lib/integrations/provider-adapter';
import { isIntegrationProvider } from '@/lib/integrations/integration-run';

const allowedAuthTypes = ['api_key', 'oauth2', 'basic', 'service_account'];

export async function GET(request: NextRequest) {
  try {
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');
    const auth = await verifyAdmin(request);
    const snapshot = await auth.db.collection('integrationConfigs').orderBy('updatedAt', 'desc').get();
    return NextResponse.json({ success: true, data: snapshot.docs.map((document) => ({ id: document.id, ...document.data(), credentials: { secretRef: document.data().credentials?.secretRef, authType: document.data().credentials?.authType } })) });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Unable to load integration configuration.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');
    const auth = await verifyAdmin(request);
    const body = await request.json();
    if (containsRawCredential(body)) return NextResponse.json({ success: false, error: 'Raw credentials must not be submitted to this endpoint. Store the secret in Secret Manager and provide only secretRef.' }, { status: 400 });
    const provider = String(body?.provider || '').trim();
    const displayName = String(body?.displayName || '').trim();
    const baseUrl = String(body?.baseUrl || '').trim();
    const secretRef = String(body?.secretRef || '').trim();
    const authType = String(body?.authType || '').trim();
    if (!isIntegrationProvider(provider) || !displayName || !/^https:\/\//i.test(baseUrl) || !secretRef || !allowedAuthTypes.includes(authType)) {
      return NextResponse.json({ success: false, error: 'provider, displayName, HTTPS baseUrl, secretRef, and valid authType are required.' }, { status: 400 });
    }
    const now = new Date().toISOString();
    const config = { provider, displayName, baseUrl, enabled: body?.enabled !== false, credentials: { secretRef, authType }, updatedAt: now, updatedBy: auth.adminUid };
    const reference = body?.id ? auth.db.collection('integrationConfigs').doc(String(body.id)) : auth.db.collection('integrationConfigs').doc();
    await reference.set(body?.id ? config : { ...config, createdAt: now }, { merge: true });
    await auth.db.collection('auditLogs').add({ action: 'integration_config_updated', integrationConfigId: reference.id, provider, secretRef, actorId: auth.adminUid, timestamp: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true, id: reference.id, data: { id: reference.id, ...config } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Unable to save integration configuration.' }, { status: 500 });
  }
}
