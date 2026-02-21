import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nexo — Share Your World',
  description: 'A modern social feed for sharing thoughts and moments.',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
