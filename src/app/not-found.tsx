import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h1 className="text-6xl font-black text-primary mb-4">404</h1>
      <h2 className="text-2xl font-bold tracking-tight mb-2">Page Not Found</h2>
      <p className="text-muted-foreground max-w-md mb-6">
        The page or resource you are looking for does not exist or has been moved.
      </p>
      <Button asChild>
        <Link href="/">Return to Home</Link>
      </Button>
    </div>
  );
}
