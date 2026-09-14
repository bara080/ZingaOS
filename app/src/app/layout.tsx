import './globals.css';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import NextTopLoader from 'nextjs-toploader';
import { ThemeProvider } from '@/components/provider/ThemeProvider';
import { ClientProviders } from '@/components/provider/ClientProviders';

// Load Geist + Geist Mono and expose them as the CSS variables the Tailwind
// `@theme` block already maps (`--font-geist-sans` / `--font-geist-mono`), so
// `font-sans` / `font-mono` resolve to real fonts instead of falling back.
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Zinga Admin',
    template: '%s | Zinga Admin',
  },
  description:
    'Zinga Admin Panel for managing customers, service providers, organizations and operations.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>
        <NextTopLoader color="#1C6FC7" height={3} showSpinner={false} />

        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ClientProviders>{children}</ClientProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
