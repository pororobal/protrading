import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';

export const metadata: Metadata = {
  title: '모멘텀 몬스터 스캐너',
  description: '미국 저유동성 모멘텀 주식 실시간 스캐너. NASDAQ/NYSE/AMEX 종목의 RVOL, 유동회전율, 몬스터 점수, ORB, VWAP 추적.',
  keywords: ['주식 스캐너', '모멘텀', '저유동성', 'RVOL', '데이 트레이딩', 'VWAP', 'ORB'],
};

export const viewport: Viewport = {
  themeColor: '#0a0b0d',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="dark">
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
