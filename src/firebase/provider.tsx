'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect, useCallback } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
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

  // 2. User Profile Listener & Auto-Bootstrap
  useEffect(() => {
    if (isAuthLoading || !firestore || !authState?.uid) {
      setIsUserDataLoading(false);
      return;
    }

    setIsUserDataLoading(true);
    const userRef = doc(firestore, 'users', authState.uid);
    
    const unsub = onSnapshot(userRef, async (snap) => {
      if (snap.exists()) {
        setUserData(snap.data() || null);
        setIsUserDataLoading(false);
      } else {
        // Auto-bootstrap user document and company document in Firestore
        try {
          const nameParts = (authState.displayName || '').trim().split(' ');
          const adminEmails = ['mkoton100@gmail.com', 'beyondtransport@gmail.com', 'michael@logisticsflow.co.za'];
          const isAdmin = adminEmails.includes((authState.email || '').toLowerCase());
          const compId = `comp_${authState.uid.substring(0, 12)}`;
          
          const defaultUserData = {
            id: authState.uid,
            email: authState.email || '',
            firstName: nameParts[0] || 'Member',
            lastName: nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User',
            phone: authState.phoneNumber || '',
            companyId: compId,
            role: isAdmin ? 'superadmin' : 'owner',
            declaredPosition: isAdmin ? 'admin' : 'owner',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          const defaultCompanyData = {
            id: compId,
            ownerId: authState.uid,
            companyName: authState.displayName ? `${authState.displayName}'s Organization` : 'My Organization',
            membershipId: 'free',
            isBillable: true,
            walletBalance: 0,
            pendingBalance: 0,
            availableBalance: 0,
            loyaltyTier: 'bronze',
            status: 'active',
            shopType: 'vendor',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          await setDoc(userRef, defaultUserData, { merge: true });
          await setDoc(doc(firestore, 'companies', compId), defaultCompanyData, { merge: true });
          setUserData(defaultUserData);
        } catch (bootErr) {
          console.warn("Client bootstrap notice:", bootErr);
        } finally {
          setIsUserDataLoading(false);
        }
      }
    }, (err) => {
      console.warn("User data listener notice:", err?.message || err);
      setIsUserDataLoading(false);
    });
    
    return unsub;
  }, [firestore, authState?.uid, refreshKey, isAuthLoading]);

  // 3. Company Data Listener
  useEffect(() => {
    const companyId = userData?.companyId || (authState?.uid ? `comp_${authState.uid.substring(0, 12)}` : null);
    if (!firestore || !companyId) {
      setCompanyData(null);
      return;
    }

    const companyRef = doc(firestore, 'companies', companyId);
    const unsub = onSnapshot(companyRef, (cSnap) => {
        setCompanyData(cSnap.data() || null);
    }, (err) => {
        console.warn("Company data listener notice:", err?.message || err);
    });

    return unsub;
  }, [firestore, userData?.companyId, authState?.uid]);

  const enrichedUser = useMemo(() => {
    if (!authState) return null;
    const adminEmails = ['mkoton100@gmail.com', 'beyondtransport@gmail.com', 'michael@logisticsflow.co.za'];
    const isAdminEmail = adminEmails.includes((authState.email || '').toLowerCase());
    const role = userData?.role || (isAdminEmail ? 'superadmin' : 'owner');
    const declaredPosition = userData?.declaredPosition || (isAdminEmail ? 'admin' : 'owner');
    const compId = userData?.companyId || `comp_${authState.uid.substring(0, 12)}`;

    return {
      ...authState,
      ...userData,
      companyData: companyData || {
        id: compId,
        ownerId: authState.uid,
        companyName: authState.displayName ? `${authState.displayName}'s Organization` : 'My Organization',
        status: 'active',
      },
      companyId: compId,
      role: role,
      declaredPosition: declaredPosition,
      isAdmin: isAdminEmail || role === 'admin' || role === 'superadmin' || declaredPosition === 'admin',
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