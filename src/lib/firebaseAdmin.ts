import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = require('../../serviceAccountKey.json');

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

export const adminDb = getFirestore();