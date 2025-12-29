-- CreateTable
CREATE TABLE "HomePageContent" (
    "id" TEXT NOT NULL,
    "heroBadge" TEXT NOT NULL DEFAULT 'Creative Production Studio',
    "heroHeading" TEXT NOT NULL DEFAULT 'Paxala Media Production',
    "heroSlogan" TEXT NOT NULL DEFAULT 'From Vision to Visual',
    "heroSubtitle1" TEXT NOT NULL DEFAULT 'Bringing brands to life through impactful visual storytelling.',
    "heroSubtitle2" TEXT NOT NULL DEFAULT 'Video production, photography, design, and development under one roof.',
    "heroStats" JSONB NOT NULL DEFAULT '[{"value":"1000+","label":"Projects Completed"},{"value":"200+","label":"Happy Clients"},{"value":"8+","label":"Services Offered"},{"value":"10+","label":"Years Experience"}]',
    "aboutBadge" TEXT NOT NULL DEFAULT 'About Us',
    "aboutHeading" TEXT NOT NULL DEFAULT 'About Paxala Media',
    "aboutImage" TEXT,
    "aboutParagraph1" TEXT NOT NULL DEFAULT 'Paxala Media Production is a full-service creative agency with in-house production, built to shape, scale, and elevate brands through strategic visual storytelling.',
    "aboutParagraph2" TEXT NOT NULL DEFAULT 'What began as a passion-driven studio has evolved into a multidisciplinary creative house that leads with strategy and creative direction, while executing everything under one roof — from branding and content to film, digital, and growth.',
    "aboutParagraph3" TEXT NOT NULL DEFAULT 'Every project is led under a single creative direction and executed through a fully integrated in-house system — ensuring clarity, consistency, and control from strategy to final delivery.',
    "aboutParagraph4" TEXT NOT NULL DEFAULT 'We partner with ambitious brands, institutions, and companies that understand visuals are not decoration — they are a business asset.',
    "aboutParagraph5" TEXT NOT NULL DEFAULT 'At PMP, we don''t just produce content. We build visual systems that tell stories, build trust, and drive results.',
    "aboutHighlights" JSONB NOT NULL DEFAULT '["Full-service creative agency","Expert team of filmmakers & designers","Cutting-edge equipment & technology","End-to-end project management","Dedicated to client success"]',
    "aboutYearsText" TEXT NOT NULL DEFAULT '10+',
    "aboutYearsLabel" TEXT NOT NULL DEFAULT 'Years of Excellence',
    "teamSubtitle" TEXT NOT NULL DEFAULT 'Our Team',
    "teamTitle" TEXT NOT NULL DEFAULT 'PMP Crew',
    "teamDescription" TEXT NOT NULL DEFAULT 'Meet the talented professionals behind our creative productions.',
    "teamTab1Label" TEXT NOT NULL DEFAULT 'Production Team',
    "teamTab2Label" TEXT NOT NULL DEFAULT 'IT & Dev Team',
    "clientsSubtitle" TEXT NOT NULL DEFAULT 'Trusted By',
    "clientsTitle" TEXT NOT NULL DEFAULT 'Our Clients',
    "clientsDescription" TEXT NOT NULL DEFAULT 'We''ve had the privilege of working with amazing brands and businesses.',
    "clientsWhatTheySay" TEXT NOT NULL DEFAULT 'What They Say',
    "ctaBadge" TEXT NOT NULL DEFAULT 'Let''s Create Together',
    "ctaHeading" TEXT NOT NULL DEFAULT 'Ready to Bring Your Vision to Life?',
    "ctaSubtitle" TEXT NOT NULL DEFAULT 'Let''s create something amazing together. Book a consultation or get in touch to discuss your next project.',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomePageContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "image" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);
