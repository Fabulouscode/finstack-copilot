import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FinStack Copilot',
  description: 'Approve what your AI agent proposes, before any money moves',
  // A private tool: keep it out of search engines.
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased text-zinc-900">{children}</body>
    </html>
  );
}
