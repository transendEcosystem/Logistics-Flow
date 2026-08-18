
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const idToken = body.idToken;
    const cookieStore = cookies();

    if (idToken) {
      // Set the cookie to be used by server-side components and actions
      cookieStore.set('firebaseIdToken', idToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
        sameSite: 'lax',
      });
      return NextResponse.json({ success: true, message: 'Session cookie set.' });
    } else {
      // Clear the cookie on sign-out
      cookieStore.delete('firebaseIdToken');
      return NextResponse.json({ success: true, message: 'Session cookie cleared.' });
    }
  } catch (error: any) {
    console.error("Error in /api/auth/session:", error);
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }
}
