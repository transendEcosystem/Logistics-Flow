import { initializeApp, getApps, getApp, App, cert } from 'firebase-admin/app';
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const ADMIN_APP_NAME = 'firebase-admin-app-transconnect-studio-v7';

let adminApp: App | null = null;
let adminAppError: string | null = null;

function initializeAdminApp(): { app: App; error: null } | { app: null; error: string } {
    if (adminApp) {
        return { app: adminApp, error: null };
    }

    try {
        const existingApp = getApps().find(a => a.name === ADMIN_APP_NAME) || getApp(ADMIN_APP_NAME);
        if (existingApp) {
            adminApp = existingApp;
            return { app: adminApp, error: null };
        }
    } catch (e) {
        // App not initialized
    }

    const tryFallbackInit = (errMsg?: string) => {
        try {
            const existing = getApps().find(a => a.name === ADMIN_APP_NAME);
            if (existing) {
                adminApp = existing;
                adminAppError = null;
                return { app: adminApp, error: null };
            }
            const app = initializeApp({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'ecosystem-hub',
            }, ADMIN_APP_NAME);
            adminApp = app;
            adminAppError = null;
            return { app: adminApp, error: null };
        } catch (fallbackError: any) {
            adminAppError = errMsg || ('Firebase Admin SDK fallback initialization failed: ' + fallbackError.message);
            return { app: null, error: adminAppError };
        }
    };
    
    const rawB64 = process.env.FIREBASE_ADMIN_SDK_CONFIG_B64;
    const encodedServiceAccount = rawB64?.replace(/[\r\n\s]/gm, '').trim();

    if (!encodedServiceAccount) {
        return tryFallbackInit();
    }

    try {
        const decodedString = Buffer.from(encodedServiceAccount, 'base64').toString('utf8');
        
        const startIdx = decodedString.indexOf('{');
        const endIdx = decodedString.lastIndexOf('}');
        
        if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
            console.warn('Decoded Base64 does not contain a valid JSON object. Using fallback Admin initialization.');
            return tryFallbackInit();
        }
        
        const serviceAccountJson = decodedString.substring(startIdx, endIdx + 1);
        const serviceAccountObject = JSON.parse(serviceAccountJson);

        if (!serviceAccountObject || typeof serviceAccountObject !== 'object' || !serviceAccountObject.project_id || !serviceAccountObject.client_email || !serviceAccountObject.private_key) {
            console.warn('Service account object is missing required fields. Using fallback Admin initialization.');
            return tryFallbackInit();
        }

        const app = initializeApp({
            credential: cert(serviceAccountObject),
            projectId: serviceAccountObject.project_id,
        }, ADMIN_APP_NAME);
        
        adminApp = app;
        adminAppError = null;
        return { app: adminApp, error: null };

    } catch (error: any) {
        console.warn(`Firebase Admin SDK cert initialization failed: ${error.message}. Using fallback initialization.`);
        return tryFallbackInit();
    }
}


export function getAdminApp(): { app: App; error: null } | { app: null; error: string } {
    if (adminApp && !adminAppError) {
        return { app: adminApp, error: null };
    }
    if (adminAppError) {
        return { app: null, error: adminAppError };
    }
    return initializeAdminApp();
}

export async function verifyAdmin(req: NextRequest) {
    const { app, error: initError } = getAdminApp();
    if (initError || !app) {
        throw new Error(`Admin SDK failed: ${initError}`);
    }

    const authorization = req.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
        throw new Error('Unauthorized: Missing or invalid token.');
    }
    const token = authorization.split('Bearer ')[1];
    
    const adminAuth = getAuth(app);
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    const adminEmails = ['mkoton100@gmail.com', 'beyondtransport@gmail.com', 'michael@logisticsflow.co.za'];
    const emailMatch = adminEmails.includes((decodedToken.email || '').toLowerCase());
    const roleMatch = decodedToken.admin === true || decodedToken.superadmin === true || decodedToken.role === 'admin' || decodedToken.role === 'superadmin';

    let isAdmin = emailMatch || roleMatch;

    if (!isAdmin) {
        try {
            const db = getFirestore(app);
            const userDoc = await db.collection('users').doc(decodedToken.uid).get();
            if (userDoc.exists) {
                const uData = userDoc.data();
                if (
                    uData?.role === 'superadmin' || 
                    uData?.role === 'admin' || 
                    uData?.declaredPosition === 'admin' || 
                    uData?.isSuperAdmin === true || 
                    adminEmails.includes((uData?.email || '').toLowerCase())
                ) {
                    isAdmin = true;
                }
            }
        } catch (e) {
            // Ignore error in fallback check
        }
    }

    if (!isAdmin) {
        throw new Error("Forbidden: Admin access required.");
    }
    
    return {
        db: getFirestore(app),
        adminUid: decodedToken.uid
    };
}
