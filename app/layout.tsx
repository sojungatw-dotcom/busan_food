import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  icons: { icon: '/favicon.svg' },
  title: '부산한끼 — 부산의 맛있는 우연',
  description: '부산광역시 모범음식점 공공데이터로 발견하는 오늘의 한 끼. 지역과 음식 종류를 골라 랜덤으로 추천받으세요.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
