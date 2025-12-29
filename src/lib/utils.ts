import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-");
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

/**
 * Get the full site URL from environment variable
 * Falls back to localhost for development
 */
export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

/**
 * Build a full URL for an uploaded file
 * @param relativePath - The relative path (e.g., "/uploads/portfolio/image.png")
 * @returns Full URL (e.g., "https://paxaland.com/uploads/portfolio/image.png")
 */
export function getFileUrl(relativePath: string): string {
  const siteUrl = getSiteUrl();
  // Remove leading slash if present to avoid double slashes
  const cleanPath = relativePath.startsWith("/") ? relativePath.slice(1) : relativePath;
  return `${siteUrl}/${cleanPath}`;
}
