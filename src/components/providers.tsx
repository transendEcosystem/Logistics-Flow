'use client';

import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Toaster } from '@/components/ui/toaster';
import { CartProvider } from '@/context/CartContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import Analytics from '@/components/Analytics';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Suspense, useEffect } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const originalError = console.error;
      console.error = (...args) => {
        if (
          typeof args[0] === 'string' &&
          args[0].includes('Support for defaultProps will be removed from function components')
        ) {
          return;
        }
        originalError.apply(console, args);
      };
    }
  }, []);

  return (
    <ErrorBoundary>
      <FirebaseClientProvider>
        <CartProvider>
          <TooltipProvider>
            <Suspense>
              <Analytics />
            </Suspense>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
            <Toaster />
          </TooltipProvider>
        </CartProvider>
      </FirebaseClientProvider>
    </ErrorBoundary>
  );
}

