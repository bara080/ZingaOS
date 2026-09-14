import { Nav } from './Nav';
import { Hero } from './Hero';
import { Verticals } from './Verticals';
import { Features } from './Features';
import { HowItWorks } from './HowItWorks';
import { Channels } from './Channels';
import { Compliance } from './Compliance';
import { CTASection } from './CTASection';
import { Footer } from './Footer';

// Public "Zinga AI" marketing landing shown to logged-out visitors before the
// login gate. Dark-forced (the `dark` class + explicit palette values) so it
// looks right regardless of the visitor's OS theme, since the app default is
// `system`.
export function Landing() {
  return (
    <div className="dark min-h-screen bg-canvas text-ink antialiased">
      <Nav />
      <main>
        <Hero />
        <Verticals />
        <Features />
        <HowItWorks />
        <Channels />
        <Compliance />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
