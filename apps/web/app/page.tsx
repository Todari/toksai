import { Hero } from "../components/landing/Hero";
import { HowItWorks } from "../components/landing/HowItWorks";
import { Features } from "../components/landing/Features";
import { PrivacyStrip } from "../components/landing/PrivacyStrip";
import { Faq } from "../components/landing/Faq";
import { Footer } from "../components/landing/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#FFFBF3] dark:bg-[#171310]">
      <Hero />
      <div className="mx-auto max-w-[600px] space-y-6 px-4 pb-16">
        <HowItWorks />
        <Features />
        <PrivacyStrip />
        <Faq />
      </div>
      <Footer />
    </main>
  );
}
