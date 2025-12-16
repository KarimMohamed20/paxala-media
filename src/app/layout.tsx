import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { AuthProvider } from "@/components/providers/session-provider";
import { ScrollProvider, ScrollProgress } from "@/components/animations";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Paxala Media Production | Creative Studio",
    template: "%s | Paxala Media",
  },
  description:
    "Full-service creative production studio specializing in video production, photography, graphic design, 3D modeling, web development, and more. Based in Sakhnin, Israel.",
  keywords: [
    "video production",
    "photography",
    "graphic design",
    "3D modeling",
    "web development",
    "app development",
    "creative agency",
    "media production",
    "Israel",
    "Sakhnin",
  ],
  authors: [{ name: "Paxala Media Production" }],
  creator: "Paxala Media Production",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.paxalamedia.com",
    siteName: "Paxala Media",
    title: "Paxala Media Production | Creative Studio",
    description:
      "Full-service creative production studio bringing brands to life through impactful visual storytelling.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Paxala Media Production",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Paxala Media Production | Creative Studio",
    description:
      "Full-service creative production studio bringing brands to life through impactful visual storytelling.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-black text-white`}>
        <AuthProvider>
          <ScrollProvider>
            <ScrollProgress />
            <Navbar />
            <main className="min-h-screen">{children}</main>
            <Footer />
          </ScrollProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
