import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { LepidusScript } from '../components/lepidus.tsx';
import './globals.css';

export const metadata: Metadata = {
  title: 'MiniDSP',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <link rel="stylesheet" href="https://lepide-design-system.vercel.app/v1/lepidus.css" />
      </head>
      <body>
        {children}
        <LepidusScript />
      </body>
    </html>
  );
}