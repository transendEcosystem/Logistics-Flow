
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Providers } from '@/components/providers';

const inter = Inter({ subsets: ['latin'] });

/**
 * CORE LAYOUT CONFIGURATION
 * Build ID: 2026-03-15T11:55:00Z - Forced refresh to resolve ChunkLoadError.
 */
export const metadata: Metadata = {
  title: 'Logistics Flow',
  description: 'The Digital Ecosystem for the Transport Industry.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="flex min-h-dvh flex-col bg-background">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
