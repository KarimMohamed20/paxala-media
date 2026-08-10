import type { Metadata } from "next";
import { ServicesHero } from "@/components/services/services-hero";
import { TrustStrip } from "@/components/services/trust-strip";
import { JourneySection } from "@/components/services/journey-section";
import { RevealSection } from "@/components/services/reveal-section";
import { FinalCTA } from "@/components/services/final-cta";
import { SX } from "@/components/services/service-shared";

export const metadata: Metadata = {
  title: "Services — A Complete Business Ecosystem",
  description:
    "Paxala Media Production builds complete business ecosystems — production, branding, AI, advertising, web, applications and automation, connected into one growth engine.",
};

export default function ServicesPage() {
  return (
    <main style={{ backgroundColor: SX.bg }}>
      <ServicesHero />
      <TrustStrip />
      <JourneySection />
      <RevealSection />
      <FinalCTA />
    </main>
  );
}
