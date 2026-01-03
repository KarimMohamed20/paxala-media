import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { AuthProvider } from "@/components/providers/session-provider";
import { ScrollProvider, ScrollProgress } from "@/components/animations";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { getUserLocale } from '@/lib/locale-actions';
import { rtlLocales } from '@/i18n/config';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

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
    title: {
      default: t.title,
      template: `%s | Paxala Media`,
    },
    description: t.description,
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
      locale: locale === 'ar' ? 'ar_AR' : locale === 'he' ? 'he_IL' : 'en_US',
      url: "https://www.paxalamedia.com",
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
        <AuthProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <ScrollProvider>
              <ScrollProgress />
              <Navbar />
              <main className="min-h-screen">{children}</main>
              <Footer />
            </ScrollProvider>
          </NextIntlClientProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
