import { HeroSection } from "@/components/sections/hero";
import { ServicesSection } from "@/components/sections/services";
import { PackagesSection } from "@/components/sections/packages";
import { AboutSection } from "@/components/sections/about";
import { TeamSection } from "@/components/sections/team";
import { ClientsSection } from "@/components/sections/clients";
import { CTASection } from "@/components/sections/cta";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ServicesSection />
      <PackagesSection />
      <AboutSection />
      <TeamSection />
      <ClientsSection />
      <CTASection />
    </>
  );
}
