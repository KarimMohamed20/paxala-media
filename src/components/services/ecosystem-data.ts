import {
  Monitor,
  Clapperboard,
  Camera,
  Megaphone,
  PenTool,
  Cpu,
  Smartphone,
  Workflow,
  Users,
  LineChart,
  type LucideIcon,
} from "lucide-react";

export interface EcoNode {
  key: string;
  label: string;
  Icon: LucideIcon;
  desc: string;
  cta: string;
  href: string;
  highlights: string[];
}

export const ECO_NODES: EcoNode[] = [
  {
    key: "website",
    label: "Website",
    Icon: Monitor,
    desc: "High-performance websites designed to convert visitors into customers and present your business with authority.",
    cta: "Book a Consultation",
    href: "/booking",
    highlights: ["Custom design tailored to your brand", "Mobile-first & blazing fast", "Multilingual: Arabic, Hebrew & English"],
  },
  {
    key: "production",
    label: "Production",
    Icon: Clapperboard,
    desc: "Cinematic commercial production from concept to final delivery.",
    cta: "Book a Consultation",
    href: "/booking",
    highlights: ["Concept development & scripting", "Cinematic quality for TV & social", "Reels, ads & brand films"],
  },
  {
    key: "photography",
    label: "Photography",
    Icon: Camera,
    desc: "Professional photography for products, people, events, campaigns and commercial productions that tell your brand's story.",
    cta: "Book a Consultation",
    href: "/booking",
    highlights: ["Product & commercial photography", "Personal branding & team shoots", "Event & campaign coverage"],
  },
  {
    key: "advertising",
    label: "Advertising",
    Icon: Megaphone,
    desc: "Performance marketing across Meta, Google and social platforms that puts your brand in front of the right people.",
    cta: "Book a Consultation",
    href: "/booking",
    highlights: ["Meta & Google paid campaigns", "Audience targeting & retargeting", "ROI-focused reporting & optimization"],
  },
  {
    key: "brand",
    label: "Brand Identity",
    Icon: PenTool,
    desc: "Logos, visual systems, typography, colors and complete branding that makes your business unforgettable.",
    cta: "Book a Consultation",
    href: "/booking",
    highlights: ["Logo design & visual identity", "Color system & typography", "Full brand guidelines & social templates"],
  },
  {
    key: "ai",
    label: "AI",
    Icon: Cpu,
    desc: "Smart AI systems that automate workflows and improve business performance so you can focus on growth.",
    cta: "Book a Consultation",
    href: "/booking",
    highlights: ["AI chatbots & virtual assistants", "Smart workflow automation", "Data analysis & business intelligence"],
  },
  {
    key: "apps",
    label: "Applications",
    Icon: Smartphone,
    desc: "Custom mobile and web applications designed for modern businesses that want to extend their brand experience.",
    cta: "Book a Consultation",
    href: "/booking",
    highlights: ["iOS & Android mobile apps", "Custom web applications", "E-commerce & booking systems"],
  },
  {
    key: "automation",
    label: "Automation",
    Icon: Workflow,
    desc: "Business automation that saves time, captures leads and increases efficiency — so the system works for you.",
    cta: "Book a Consultation",
    href: "/booking",
    highlights: ["Lead capture & follow-up sequences", "CRM & tool integrations", "Process automation that runs 24/7"],
  },
  {
    key: "crm",
    label: "CRM",
    Icon: Users,
    desc: "Customer relationship systems that organize leads, follow-ups, sales and client communication into one place.",
    cta: "Book a Consultation",
    href: "/booking",
    highlights: ["Centralized contact & lead management", "Sales pipeline tracking", "Automated follow-up & reminders"],
  },
  {
    key: "analytics",
    label: "Analytics",
    Icon: LineChart,
    desc: "Beautiful dashboards that transform your business data into clear decisions and measurable growth.",
    cta: "Book a Consultation",
    href: "/booking",
    highlights: ["Real-time sales & revenue dashboards", "Campaign performance reporting", "Clear insights for faster decisions"],
  },
];
