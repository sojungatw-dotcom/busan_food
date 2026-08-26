import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://mori-summer-archive.skp-k-2881.chatgpt.site'),
  title: 'MORI — 오래 남는 여름의 기록',
  description: '평범한 날의 빛과 목소리를 모으는 작은 계절 아카이브',
  openGraph: {
    title: 'MORI — 오래 남는 여름의 기록',
    description: '평범한 날의 빛과 목소리를 모으는 작은 계절 아카이브',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'MORI — 오래 남는 여름의 기록' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MORI — 오래 남는 여름의 기록',
    description: '평범한 날의 빛과 목소리를 모으는 작은 계절 아카이브',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
