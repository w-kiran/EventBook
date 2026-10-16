import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/component/Navbar';
import { StoreProvider } from '@/store/StoreProvider';

export const metadata: Metadata = {
  title: 'EventBook',
  description: 'Browse and book events',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          <div className="min-h-screen bg-gray-50 text-gray-900">
            <Navbar />
            <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
          </div>
        </StoreProvider>
      </body>
    </html>
  );
}