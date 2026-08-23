import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get('authorization') || '';
  return authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
}

async function authenticate(request: NextRequest) {
  const { app, error } = getAdminApp();
  if (error || !app) throw new Error('Firebase authentication is unavailable.');
  const token = getBearerToken(request);
  if (!token) throw new Error('Unauthorized');
  const decoded = await getAuth(app).verifyIdToken(token);
  return { app, decoded };
}

function getRequestIp(request: NextRequest) {
  return (request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '').split(',')[0].trim() || 'unknown';
}

export async function GET(request: NextRequest) {
  try {
    const { app, decoded } = await authenticate(request);
    const snapshot = await getFirestore(app).collection('userSessions').where('userId', '==', decoded.uid).get();
    const devices = snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((a: any, b: any) => String(b.lastSeenAt || '').localeCompare(String(a.lastSeenAt || '')));
    return NextResponse.json({ success: true, devices });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { app, decoded } = await authenticate(request);
    const body = await request.json();
    const deviceId = String(body.deviceId || '').trim();
    const label = String(body.label || '').trim().slice(0, 80);
    if (!deviceId) return NextResponse.json({ success: false, error: 'Device ID is required.' }, { status: 400 });

    const db = getFirestore(app);
    await db.collection('userSessions').doc(deviceId).set({
      userId: decoded.uid,
      email: decoded.email || null,
      label: label || 'Trusted browser',
      userAgent: request.headers.get('user-agent') || 'unknown',
      lastIp: getRequestIp(request),
      lastSeenAt: new Date().toISOString(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({ success: true, deviceId });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { app, decoded } = await authenticate(request);
    const deviceId = new URL(request.url).searchParams.get('deviceId') || '';
    const ref = getFirestore(app).collection('userSessions').doc(deviceId);
    const snapshot = await ref.get();
    if (!snapshot.exists || snapshot.data()?.userId !== decoded.uid) {
      return NextResponse.json({ success: false, error: 'Device session not found.' }, { status: 404 });
    }
    await ref.delete();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
