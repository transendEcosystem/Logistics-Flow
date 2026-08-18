'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

/**
 * Standard Next.js Error Boundary for the app directory.
 * This catches runtime errors in segments and prevents the "missing components" loop.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error centrally
    console.error('Next.js Segment Error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)] p-4 text-base">
      <Card className="w-full max-w-md text-center shadow-xl border-destructive/20">
        <CardHeader>
          <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-4">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-headline">Something went wrong</CardTitle>
          <CardDescription>
            The application encountered an unexpected error in this section.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-3 rounded-md text-left mb-4 overflow-x-auto">
            <p className="text-xs font-mono text-destructive whitespace-pre-wrap">
              {error.message || 'Unknown runtime error'}
            </p>
          </div>
          <Button onClick={() => reset()} className="w-full">
            <RefreshCcw className="mr-2 h-4 w-4" /> Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
