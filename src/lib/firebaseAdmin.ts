import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const encodedServiceAccount = process.env.FIREBASE_ADMIN_SDK_CONFIG_B64;
const serviceAccount = encodedServiceAccount
  ? JSON.parse(Buffer.from(encodedServiceAccount, 'base64').toString('utf8'))
  : undefined;

if (!getApps().length) {
  initializeApp({
    ...(serviceAccount ? { credential: cert(serviceAccount) } : {})
  });
}

export const adminDb = getFirestore();