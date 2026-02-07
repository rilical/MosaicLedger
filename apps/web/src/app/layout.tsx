import type { Metadata } from 'next';
import '../styles/globals.css';
import { CursorGlow } from '../components/CursorGlow';

export const metadata: Metadata = {
  title: 'MosaicLedger',
  description: 'Enter with fragments. Leave with something whole.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CursorGlow />
        {children}
      </body>
    </html>
  );
}
