import './globals.css';
import type { Metadata } from 'next';
import NextTopLoader from 'nextjs-toploader';
import { ThemeProvider } from '@/components/provider/ThemeProvider';
import { ClientProviders } from '@/components/provider/ClientProviders';

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
    <html lang="en" suppressHydrationWarning>
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
