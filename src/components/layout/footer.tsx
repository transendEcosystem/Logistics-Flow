
import Link from 'next/link';
import { Truck } from 'lucide-react';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-card border-t">
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <Truck className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">Logistics Flow</span>
          </div>
          <div className="text-sm text-muted-foreground text-center md:text-right">
            <p>&copy; {year} Logistics Flow Inc. All rights reserved.</p>
            <p className="mt-1">
              <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
              <span className="mx-2">|</span>
              <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
