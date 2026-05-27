import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Re—EntryOS — 72-Hour Reentry Coordination',
  description: 'AI-powered case coordination for the first 72 hours after release.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a0a] text-white antialiased">{children}</body>
    </html>
  );
}
