
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const CLIENT_APP_NAME = 'firebase-client-app-transconnect';

interface FirebaseServices {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
}

let firebaseServices: FirebaseServices | null = null;


// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase(): FirebaseServices {
    if (firebaseServices) {
        return firebaseServices;
    }

    let firebaseApp: FirebaseApp;
    
    try {
        // This will throw if the app is not already initialized
        firebaseApp = getApp(CLIENT_APP_NAME);
    } catch (e) {
        // App not initialized, so initialize it now
        firebaseApp = initializeApp(firebaseConfig, CLIENT_APP_NAME);
    }

    const auth = getAuth(firebaseApp);
    const firestore = getFirestore(firebaseApp);
    const storage = getStorage(firebaseApp); 

    firebaseServices = { firebaseApp, auth, firestore, storage };
    return firebaseServices;
}


// New function to access the initialized services
export function getInitializedFirebaseServices(): FirebaseServices {
  if (!firebaseServices) {
    // This will be called if getInitializedFirebaseServices is used before FirebaseClientProvider
    // has had a chance to run. It's a safe fallback.
    return initializeFirebase();
  }
  return firebaseServices;
}
