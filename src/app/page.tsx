import { ScrollVideoHero } from "@/components/sections/scroll-video-hero";
import { ServicesSection } from "@/components/sections/services";
import { PackagesSection } from "@/components/sections/packages";
import { AboutSection } from "@/components/sections/about";
import { TeamSection } from "@/components/sections/team";
import { ClientsSection } from "@/components/sections/clients";
import { CTASection } from "@/components/sections/cta";

async function getHomePageContent() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/homepage`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch homepage content');
    }

    const data = await response.json();

    // Parse JSON fields
    return {
      ...data,
      heroStats: typeof data.heroStats === 'string' ? JSON.parse(data.heroStats) : data.heroStats,
      aboutHighlights: typeof data.aboutHighlights === 'string' ? JSON.parse(data.aboutHighlights) : data.aboutHighlights,
    };
  } catch (error) {
    console.error('Error fetching homepage content:', error);
    return null;
  }
}

async function getTeamMembers() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/team?activeOnly=true`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch team members');
    }

    const data = await response.json();

    // Group by team type
    return {
      production: data.filter((m: any) => m.team === 'PRODUCTION'),
      itDev: data.filter((m: any) => m.team === 'IT_DEV'),
      creative: data.filter((m: any) => m.team === 'CREATIVE'),
    };
  } catch (error) {
    console.error('Error fetching team members:', error);
    return { production: [], itDev: [], creative: [] };
  }
}

export default async function HomePage() {
  const content = await getHomePageContent();
  const teamMembers = await getTeamMembers();

  return (
    <>
      <ScrollVideoHero content={content} />
      <ServicesSection />
      <PackagesSection />
      <AboutSection content={content} />
      <TeamSection content={content} teamMembers={teamMembers} />
      <ClientsSection content={content} />
      <CTASection content={content} />
    </>
  );
}
