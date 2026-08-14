
'use client'; // Error components must be Client Components

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)] p-4">
      <Card className="w-full max-w-2xl text-center">
        <CardHeader>
          <CardTitle className="text-2xl text-destructive">Something went wrong</CardTitle>
          <CardDescription>
            We encountered an unexpected error while trying to load the backend dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-md text-left">
                <p className="font-mono text-sm text-destructive-foreground bg-destructive p-2 rounded-t-md">Error Details:</p>
                <code className="block whitespace-pre-wrap break-words p-2 text-xs bg-destructive/10 rounded-b-md">
                    {error.message || 'An unknown error occurred.'}
                </code>
            </div>
          <p className="text-sm text-muted-foreground">
            This could be due to a temporary connection issue or a problem with the server. You can try to load the page again.
          </p>
          <Button
            onClick={
              // Attempt to recover by trying to re-render the segment
              () => reset()
            }
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
