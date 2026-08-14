'use client';

import { Button } from '@/components/ui/button';

/**
 * The ultimate error boundary for the entire application.
 * Required by Next.js to handle crashes in the root layout.
 * MUST include <html> and <body> tags.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-background text-foreground text-base">
          <div className="max-w-2xl space-y-6">
            <h2 className="text-4xl font-extrabold font-headline text-primary">Critical System Error</h2>
            <p className="text-muted-foreground text-lg">
              The application failed to initialize a core layout component. This usually indicates a configuration mismatch or a global resource failure.
            </p>
            <div className="bg-muted p-6 rounded-lg font-mono text-xs text-destructive overflow-x-auto text-left border shadow-inner">
               <p className="font-bold mb-2">Error Trace:</p>
               {error.stack || error.message}
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button size="lg" onClick={() => reset()}>Restart Application</Button>
                <Button size="lg" variant="outline" asChild><a href="/">Return to Home</a></Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
