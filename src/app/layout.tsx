import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { FloatingWhatsApp } from "@/components/layout/floating-whatsapp";
import { OrganizationJsonLd } from "@/components/seo/json-ld";
import { SITE_URL } from "@/lib/seo";
import { AuthProvider } from "@/components/providers/session-provider";
import { ToastProvider } from "@/components/ui/toast";
import { ScrollProvider, ScrollProgress } from "@/components/animations";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { getUserLocale } from '@/lib/locale-actions';
import { rtlLocales } from '@/i18n/config';
import { PwaRegistry } from "@/components/pwa-registry";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  // Do NOT disable zoom — pinch-zoom must stay available for accessibility (WCAG 1.4.4).
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUserLocale();

  // Create a simple messages object for metadata
  // In a real implementation, you'd load these from translation files
  const metadataTranslations = {
    en: {
      title: "Paxala Media Production | Creative Studio",
      description: "Full-service creative production studio specializing in video production, photography, graphic design, 3D modeling, web development, and more. Based in Sakhnin, Palestine.",
    },
    ar: {
      title: "باكسالا ميديا للإنتاج | استوديو إبداعي",
      description: "استوديو إنتاج إبداعي متكامل متخصص في إنتاج الفيديو والتصوير الفوتوغرافي والتصميم الجرافيكي والنمذجة ثلاثية الأبعاد وتطوير الويب وأكثر. مقره في سخنين، فلسطين.",
    },
    he: {
      title: "Paxala Media Production | אולפן יצירתי",
      description: "אולפן הפקה יצירתי בשירות מלא המתמחה בהפקת וידאו, צילום, עיצוב גרפי, דוגמנות תלת מימד, פיתוח אתרים ועוד. מבוסס בסח'נין, פלסטין.",
    },
  };

  const t = metadataTranslations[locale] || metadataTranslations.en;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t.title,
      template: `%s | Paxala Media`,
    },
    description: t.description,
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "Paxala Media",
    },
    keywords: [
      "video production",
      "photography",
      "graphic design",
      "3D modeling",
      "web development",
      "app development",
      "creative agency",
      "media production",
      "Palestine",
      "Sakhnin",
    ],
    authors: [{ name: "Paxala Media Production" }],
    creator: "Paxala Media Production",
    openGraph: {
      type: "website",
      locale: locale === 'ar' ? 'ar_PS' : locale === 'he' ? 'he_IL' : 'en_US',
      url: SITE_URL,
      siteName: "Paxala Media",
      title: t.title,
      description: t.description,
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
      title: t.title,
      description: t.description,
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
    icons: {
      icon: "/favicon.ico",
      apple: "/apple-touch-icon.png",
    }
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getUserLocale();
  const messages = await getMessages();
  const dir = rtlLocales.includes(locale) ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-black text-white`}>
        <OrganizationJsonLd />
        <AuthProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            {/* Inside NextIntlClientProvider so toast bodies can be localised
                by their callers; outside ScrollProvider so the viewport is
                unaffected by smooth-scroll teardown between routes. */}
            <ToastProvider>
              <ScrollProvider>
                <PwaRegistry />
                <ScrollProgress />
                <Navbar />
                <main className="min-h-screen">{children}</main>
                <Footer />
                <FloatingWhatsApp />
              </ScrollProvider>
            </ToastProvider>
          </NextIntlClientProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
