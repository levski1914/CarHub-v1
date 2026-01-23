import CTA from "@/components/landing/CTA";
import Features from "@/components/landing/Features";
import Footer from "@/components/landing/Footer";
import Hero from "@/components/landing/Hero";
import Pricing from "@/components/landing/Pricing";

// app/(public)/page.tsx
export default function PublicHomePage() {
  return (
    <main className="max-w-6xl mx-auto p-6">
      <Hero />
      <Features />
      <Pricing />
      <CTA />
      <Footer />
    </main>
  );
}
