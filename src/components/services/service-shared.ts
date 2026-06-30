// Shared constants + helpers for the Services experience.
// Palette is scoped to the Services page redesign (global brand palette untouched).
import {
  Video,
  Camera,
  Palette,
  Box,
  Code,
  Smartphone,
  Share2,
  Lightbulb,
  Megaphone,
  Sparkles,
  Workflow,
  LineChart,
  type LucideIcon,
} from "lucide-react";

export const ACCENT = "#FF2020";

/** Visual identity tokens for the Services page. */
export const SX = {
  bg: "#050505",
  card: "#111111",
  card2: "#161616",
  accent: ACCENT,
  border: "rgba(255,255,255,0.08)",
  radius: "32px",
} as const;

/** Maps CMS `icon` string values to Lucide components. */
export const iconMap: Record<string, LucideIcon> = {
  Video,
  Camera,
  Palette,
  Box,
  Code,
  Smartphone,
  Share2,
  Lightbulb,
  Megaphone,
  Sparkles,
  Workflow,
  LineChart,
};

export function resolveIcon(icon?: string | null): LucideIcon {
  return (icon && iconMap[icon]) || Box;
}

export interface Service {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string | null;
  image: string | null;
  features: string[];
  order: number;
  isActive: boolean;
}

/** Shared easing for cinematic reveals. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
