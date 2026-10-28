import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Book with Salomé — Agenda un espacio',
  description:
    'Reserva un café, una sesión de estudio, una charla express o un buen chisme con Salomé en segundos.',
  openGraph: {
    title: 'Book with Salomé',
    description: 'Agenda un espacio con Salomé en segundos.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#fafaf9',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={geist.variable}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}

