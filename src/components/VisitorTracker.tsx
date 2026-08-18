
'use client';

import { useEffect } from 'react';
import { useFirestore } from '@/firebase/provider';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const VISITOR_ID_KEY = 'logisticsflow_visitor_id';

export function VisitorTracker() {
  const firestore = useFirestore();

  useEffect(() => {
    // Add a check to ensure this code only runs in the browser.
    if (typeof window === 'undefined' || !firestore) {
      return;
    }

    const trackVisitor = () => {
      let visitorId = localStorage.getItem(VISITOR_ID_KEY);
      
      if (!visitorId) {
        // Generate a new simple random ID
        visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem(VISITOR_ID_KEY, visitorId);

        const visitorRef = doc(firestore, 'visitors', visitorId);
        setDoc(visitorRef, {
            id: visitorId,
            firstVisitedAt: serverTimestamp(),
            lastVisitedAt: serverTimestamp(),
            initialReferrer: document.referrer,
            userAgent: navigator.userAgent,
        }, { merge: true });

      } else {
        // If visitor ID exists, just update their last visit timestamp
        const visitorRef = doc(firestore, 'visitors', visitorId);
        setDoc(visitorRef, {
            lastVisitedAt: serverTimestamp(),
        }, { merge: true });
      }
    };

    // Run after a short delay to avoid impacting initial page load performance
    const timeoutId = setTimeout(trackVisitor, 2000);

    return () => clearTimeout(timeoutId);
  }, [firestore]);

  return null; // This component does not render anything
}
