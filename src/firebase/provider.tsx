'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect, useCallback } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, onSnapshot } from 'firebase/firestore';
import { Auth, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

export interface FirebaseContextState {
  areServicesAvailable: boolean;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  user: any | null;
  isUserLoading: boolean;
  userError: Error | null;
  forceRefresh: () => void;
}

export interface UserHookResult { 
  user: any | null;
  isUserLoading: boolean;
  userError: Error | null;
  forceRefresh: () => void;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [authState, setAuthState] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [companyData, setCompanyData] = useState<any>(null);
  
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isUserDataLoading, setIsUserDataLoading] = useState(false);
  
  const [userError, setUserError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const forceRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  // 1. Core Auth State Listener
  useEffect(() => {
    if (!auth) {
      setIsAuthLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthState({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            phoneNumber: user.phoneNumber,
        });
      } else {
        setAuthState(null);
        setUserData(null);
        setCompanyData(null);
      }
      setIsAuthLoading(false);
    }, (error) => {
      setUserError(error);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);

  // 2. User Profile Listener
  useEffect(() => {
    if (isAuthLoading || !firestore || !authState?.uid) {
      setIsUserDataLoading(false);
      return;
    }

    setIsUserDataLoading(true);
    const userRef = doc(firestore, 'users', authState.uid);
    
    const unsub = onSnapshot(userRef, (snap) => {
      setUserData(snap.data() || null);
      setIsUserDataLoading(false);
    }, (err) => {
      console.error("Error fetching user data:", err);
      setIsUserDataLoading(false);
    });
    
    return unsub;
  }, [firestore, authState?.uid, refreshKey, isAuthLoading]);

  // 3. Company Data Listener
  useEffect(() => {
    const companyId = userData?.companyId;
    if (!firestore || !companyId) {
      setCompanyData(null);
      return;
    }

    const companyRef = doc(firestore, 'companies', companyId);
    const unsub = onSnapshot(companyRef, (cSnap) => {
        setCompanyData(cSnap.data() || null);
    }, (err) => {
        console.error("Error fetching company data:", err);
    });

    return unsub;
  }, [firestore, userData?.companyId]);

  const enrichedUser = useMemo(() => {
    if (!authState) return null;
    return {
      ...authState,
      ...userData,
      companyData,
      // Engineering Note: Deterministic ID provided only when verified.
      // Removed UID fallback to prevent incorrect path queries during rule evaluation.
      companyId: userData?.companyId || null
    };
  }, [authState, userData, companyData]);

  const isUserLoading = useMemo(() => {
      if (isAuthLoading) return true;
      if (!authState) return false;
      return isUserDataLoading;
  }, [isAuthLoading, isUserDataLoading, authState]);

  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      user: enrichedUser,
      isUserLoading,
      userError,
      forceRefresh,
    };
  }, [firebaseApp, firestore, auth, enrichedUser, isUserLoading, userError, forceRefresh]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  return context;
};

export const useAuth = (): Auth => {
    const fb = useFirebase();
    return fb.auth!;
};
export const useFirestore = (): Firestore => {
    const fb = useFirebase();
    return fb.firestore!;
};
export const useFirebaseApp = (): FirebaseApp => {
    const fb = useFirebase();
    return fb.firebaseApp!;
};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T {
  const memoized = useMemo(factory, deps);
  if (memoized && typeof memoized === 'object') {
    (memoized as any).__memo = true;
  }
  return memoized;
}

export const useUser = (): UserHookResult => { 
  const { user, isUserLoading, userError, forceRefresh } = useFirebase(); 
  return { user, isUserLoading, userError, forceRefresh };
};