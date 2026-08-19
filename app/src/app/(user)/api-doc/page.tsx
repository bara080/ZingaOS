'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Smartphone,
  Server,
  Database,
  Cloud,
  Mail,
  MessageCircle,
  CreditCard,
  Globe,
} from 'lucide-react';

// 💠 Tech Stack
const techStack = [
  {
    name: 'Expo (React Native)',
    desc: 'Mobile app for iOS & Android',
    link: 'https://expo.dev/',
    icon: <Smartphone className="w-4 h-4 text-primary" />,
  },
  {
    name: 'Vercel',
    desc: 'Node.js backend hosting',
    link: 'https://vercel.com/',
    icon: <Globe className="w-4 h-4 text-primary" />,
  },
  {
    name: 'Node.js (Express)',
    desc: 'API backend framework',
    link: 'https://nodejs.org/',
    icon: <Server className="w-4 h-4 text-primary" />,
  },
  {
    name: 'MongoDB',
    desc: 'Database for users & services',
    link: 'https://www.mongodb.com/',
    icon: <Database className="w-4 h-4 text-primary" />,
  },
  {
    name: 'Firebase',
    desc: 'Auth, Realtime DB, Storage',
    link: 'https://firebase.google.com/',
    icon: <Cloud className="w-4 h-4 text-primary" />,
  },
  {
    name: 'Resend',
    desc: 'Email service',
    link: 'https://resend.com/',
    icon: <Mail className="w-4 h-4 text-primary" />,
  },
  {
    name: 'Vonage',
    desc: 'SMS / WhatsApp notifications',
    link: 'https://www.vonage.com/',
    icon: <MessageCircle className="w-4 h-4 text-primary" />,
  },
  {
    name: 'Stripe',
    desc: 'Payments gateway',
    link: 'https://stripe.com/',
    icon: <CreditCard className="w-4 h-4 text-primary" />,
  },
];

// 📚 API Categories
const apiCategories = [
  {
    name: 'Auth',
    icon: '',
    desc: 'User authentication & session management',
    href: '/api-doc/auth',
  },
  {
    name: 'Middleware',
    icon: '🛡️',
    desc: 'API security and caching layers',
    href: '/api-doc/middleware',
  },
  {
    name: 'Users',
    icon: '👤',
    desc: 'General user profile & account actions',
    href: '/api-doc/user',
  },
  {
    name: 'Customer',
    icon: '🛍️',
    desc: 'Endpoints specific to the customer role',
    href: '/api-doc/customer',
  },
  {
    name: 'Service Provider',
    icon: '🏪',
    desc: 'Service provider & store management',
    href: '/api-doc/service-provider',
  },
  { name: 'Services', icon: '🛠️', desc: 'Store services and pricing', href: '/api-doc/services' },
  {
    name: 'Bookings',
    icon: '📅',
    desc: 'Booking creation and management',
    href: '/api-doc/bookings',
  },
  { name: 'Chats', icon: '💬', desc: 'Real-time messaging APIs', href: '/api-doc/chats' },
  {
    name: 'Wallet & Payments',
    icon: '💳',
    desc: 'Wallet, transactions, and Stripe Connect',
    href: '/api-doc/wallet',
  },
  {
    name: 'Notifications',
    icon: '🔔',
    desc: 'Push & in-app notifications',
    href: '/api-doc/notifications',
  },
];

export default function ApiDocHome() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background px-6 py-10">
      <main className="space-y-12 max-w-6xl mx-auto">
        {/* Hero */}
        <section className="text-center space-y-2 mb-10">
          <h1 className="text-3xl font-bold tracking-tight">🧠 Zinga API Documentation</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
            Explore the APIs powering the Zinga platform — from authentication and providers to
            payments, notifications, and real-time interactions.
          </p>
        </section>

        {/* Tech Stack */}
        <section>
          <h2 className="text-xl font-semibold mb-4">🧩 Tech Stack / Services</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {techStack.map((tech) => (
              <Card
                key={tech.name}
                className="hover:shadow-md hover:-translate-y-0.5 border border-border/60 hover:border-primary/30 transition-all"
              >
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    {tech.icon}
                    {tech.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p>{tech.desc}</p>
                  <Link
                    href={tech.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm font-medium"
                  >
                    Learn more →
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator />

        {/* API Categories */}
        <section>
          <h2 className="text-xl font-semibold mb-4">📚 API Categories</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {apiCategories.map((api) => (
              <Link key={api.name} href={api.href}>
                <Card className="hover:shadow-md hover:-translate-y-0.5 border border-border/60 hover:border-primary/30 transition-all cursor-pointer">
                  <CardHeader>
                    <CardTitle className="text-base text-primary flex items-center gap-2">
                      <span>{api.icon}</span>
                      {api.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground min-h-10">
                    {api.desc}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Footer */}
        <p className="text-xs text-muted-foreground text-right">
          API Version: v1.0.0 • Last updated: Oct 2025
        </p>
      </main>
    </div>
  );
}
