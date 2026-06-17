import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';

export const metadata: Metadata = {
  title: 'Momentum Monster Scanner',
  description: 'Real-time US low-float momentum scanner. Track RVOL, Float Rotation, Monster Score, ORB, VWAP for NASDAQ/NYSE/AMEX.',
  keywords: ['stock scanner', 'momentum', 'low float', 'RVOL', 'day trading', 'VWAP', 'ORB'],
};

export const viewport: Viewport = {
  themeColor: '#0a0b0d',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground antialiased h-screen overflow-hidden flex flex-col">
        <TopBar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto scrollbar-thin">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
