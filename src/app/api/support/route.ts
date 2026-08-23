import { getAuth } from 'firebase-admin/auth';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { supportQuery } from '@/ai/flows/support-flow';

export async function POST(request: NextRequest) {
  const { app, error: initError } = getAdminApp();
  if (initError || !app) {
    return NextResponse.json({ success: false, error: 'Firebase authentication is unavailable.' }, { status: 500 });
  }

  const authorization = request.headers.get('authorization') || '';
  if (!authorization.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'Authentication is required.' }, { status: 401 });
  }

  try {
    await getAuth(app).verifyIdToken(authorization.slice(7));
    const body = await request.json();
    const query = String(body.query || '').trim();
    const history = Array.isArray(body.history) ? body.history : [];

    if (!query) {
      return NextResponse.json({ success: false, error: 'A support question is required.' }, { status: 400 });
    }

    const result = await supportQuery({ query, history });
    return NextResponse.json({ success: true, response: result.response });
  } catch (error: any) {
    console.error('Support API Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Support assistant unavailable.' }, { status: 500 });
  }
}
