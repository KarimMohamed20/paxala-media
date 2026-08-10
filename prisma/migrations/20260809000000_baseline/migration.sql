-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STAFF', 'CLIENT');

-- CreateEnum
CREATE TYPE "TeamType" AS ENUM ('PRODUCTION', 'IT_DEV', 'CREATIVE');

-- CreateEnum
CREATE TYPE "PortfolioCategory" AS ENUM ('VIDEO_PRODUCTION', 'PHOTOGRAPHY', 'GRAPHIC_DESIGN', 'WEB_DEVELOPMENT', 'APP_DEVELOPMENT', 'THREE_D_MODELING', 'ANIMATION', 'SOCIAL_MEDIA');

-- CreateEnum
CREATE TYPE "ProjectCategory" AS ENUM ('VIDEO_PRODUCTION', 'PHOTOGRAPHY', 'GRAPHIC_DESIGN', 'WEB_DEVELOPMENT', 'APP_DEVELOPMENT', 'THREE_D_MODELING', 'ANIMATION', 'SOCIAL_MEDIA');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "BlogCategory" AS ENUM ('NEWS', 'TUTORIALS', 'BEHIND_THE_SCENES', 'CASE_STUDIES', 'INDUSTRY_INSIGHTS');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'READ', 'RESPONDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAYABLE', 'PARTIAL', 'PAID');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'AWAITING_APPROVAL', 'APPROVED', 'REJECTED', 'SCHEDULED', 'PUBLISHED', 'IN_PROGRESS');

-- CreateEnum
CREATE TYPE "ContentPlatform" AS ENUM ('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'LINKEDIN', 'YOUTUBE', 'PAID_ADS');

-- CreateEnum
CREATE TYPE "ContentFormat" AS ENUM ('REEL', 'CAROUSEL', 'POST', 'STORIES', 'VIDEO', 'PAID_CAMPAIGN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "password" TEXT NOT NULL,
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CLIENT',
    "managerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "industry" TEXT,
    "socialMedia" JSONB,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "ClientContact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "jobTitle" TEXT,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameHe" TEXT NOT NULL,
    "roleEn" TEXT NOT NULL,
    "roleAr" TEXT NOT NULL,
    "roleHe" TEXT NOT NULL,
    "bioEn" TEXT,
    "bioAr" TEXT,
    "bioHe" TEXT,
    "image" TEXT,
    "team" "TeamType" NOT NULL DEFAULT 'PRODUCTION',
    "order" INTEGER NOT NULL DEFAULT 0,
    "skillsEn" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "skillsAr" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "skillsHe" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "social" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameHe" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "descriptionAr" TEXT NOT NULL,
    "descriptionHe" TEXT NOT NULL,
    "icon" TEXT,
    "image" TEXT,
    "featuresEn" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "featuresAr" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "featuresHe" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Portfolio" (
    "id" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleHe" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "descriptionAr" TEXT NOT NULL,
    "descriptionHe" TEXT NOT NULL,
    "contentEn" TEXT,
    "contentAr" TEXT,
    "contentHe" TEXT,
    "thumbnail" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "videoUrl" TEXT,
    "category" "PortfolioCategory" NOT NULL,
    "tagsEn" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tagsAr" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tagsHe" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "clientName" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "content" TEXT,
    "thumbnail" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "videoUrl" TEXT,
    "category" "ProjectCategory" NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "clientName" TEXT,
    "clientId" TEXT,
    "serviceId" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "deadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT DEFAULT 'red',
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectFile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'link',
    "size" DOUBLE PRECISION,
    "description" TEXT,
    "category" TEXT DEFAULT 'Video',
    "folder" TEXT DEFAULT 'General',
    "folderId" TEXT,
    "version" TEXT DEFAULT 'V1 Final',
    "status" TEXT DEFAULT 'Approved',
    "duration" TEXT,
    "thumbnail" TEXT,
    "uploader" TEXT DEFAULT 'PMP Creative Team',
    "resolution" TEXT DEFAULT '4K MP4',
    "usageRights" TEXT DEFAULT 'Approved for web and social.',
    "formats" JSONB,
    "versionHistory" JSONB,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "projectId" TEXT NOT NULL,
    "taskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "serviceType" TEXT NOT NULL,
    "packageId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 60,
    "notes" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleHe" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerptEn" TEXT NOT NULL,
    "excerptAr" TEXT NOT NULL,
    "excerptHe" TEXT NOT NULL,
    "contentEn" TEXT NOT NULL,
    "contentAr" TEXT NOT NULL,
    "contentHe" TEXT NOT NULL,
    "coverImage" TEXT,
    "authorId" TEXT NOT NULL,
    "category" "BlogCategory" NOT NULL,
    "tagsEn" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tagsAr" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tagsHe" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientLogo" (
    "id" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameHe" TEXT NOT NULL,
    "logo" TEXT NOT NULL,
    "website" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientLogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactInquiry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'string',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomePageContent" (
    "id" TEXT NOT NULL,
    "heroBadgeEn" TEXT NOT NULL DEFAULT 'Creative Production Studio',
    "heroBadgeAr" TEXT NOT NULL DEFAULT 'Creative Production Studio',
    "heroBadgeHe" TEXT NOT NULL DEFAULT 'Creative Production Studio',
    "heroHeadingEn" TEXT NOT NULL DEFAULT 'Paxala Media Production',
    "heroHeadingAr" TEXT NOT NULL DEFAULT 'Paxala Media Production',
    "heroHeadingHe" TEXT NOT NULL DEFAULT 'Paxala Media Production',
    "heroSloganEn" TEXT NOT NULL DEFAULT 'From Vision to Visual',
    "heroSloganAr" TEXT NOT NULL DEFAULT 'From Vision to Visual',
    "heroSloganHe" TEXT NOT NULL DEFAULT 'From Vision to Visual',
    "heroSubtitle1En" TEXT NOT NULL DEFAULT 'Bringing brands to life through impactful visual storytelling.',
    "heroSubtitle1Ar" TEXT NOT NULL DEFAULT 'Bringing brands to life through impactful visual storytelling.',
    "heroSubtitle1He" TEXT NOT NULL DEFAULT 'Bringing brands to life through impactful visual storytelling.',
    "heroSubtitle2En" TEXT NOT NULL DEFAULT 'Video production, photography, design, and development under one roof.',
    "heroSubtitle2Ar" TEXT NOT NULL DEFAULT 'Video production, photography, design, and development under one roof.',
    "heroSubtitle2He" TEXT NOT NULL DEFAULT 'Video production, photography, design, and development under one roof.',
    "heroStatsEn" JSONB NOT NULL DEFAULT '[{"value":"1000+","label":"Projects Completed"},{"value":"200+","label":"Happy Clients"},{"value":"8+","label":"Services Offered"},{"value":"10+","label":"Years Experience"}]',
    "heroStatsAr" JSONB NOT NULL DEFAULT '[{"value":"1000+","label":"Projects Completed"},{"value":"200+","label":"Happy Clients"},{"value":"8+","label":"Services Offered"},{"value":"10+","label":"Years Experience"}]',
    "heroStatsHe" JSONB NOT NULL DEFAULT '[{"value":"1000+","label":"Projects Completed"},{"value":"200+","label":"Happy Clients"},{"value":"8+","label":"Services Offered"},{"value":"10+","label":"Years Experience"}]',
    "aboutBadgeEn" TEXT NOT NULL DEFAULT 'About Us',
    "aboutBadgeAr" TEXT NOT NULL DEFAULT 'About Us',
    "aboutBadgeHe" TEXT NOT NULL DEFAULT 'About Us',
    "aboutHeadingEn" TEXT NOT NULL DEFAULT 'About Paxala Media',
    "aboutHeadingAr" TEXT NOT NULL DEFAULT 'About Paxala Media',
    "aboutHeadingHe" TEXT NOT NULL DEFAULT 'About Paxala Media',
    "aboutImage" TEXT,
    "aboutParagraph1En" TEXT NOT NULL DEFAULT 'Paxala Media Production is a full-service creative agency with in-house production, built to shape, scale, and elevate brands through strategic visual storytelling.',
    "aboutParagraph1Ar" TEXT NOT NULL DEFAULT 'Paxala Media Production is a full-service creative agency with in-house production, built to shape, scale, and elevate brands through strategic visual storytelling.',
    "aboutParagraph1He" TEXT NOT NULL DEFAULT 'Paxala Media Production is a full-service creative agency with in-house production, built to shape, scale, and elevate brands through strategic visual storytelling.',
    "aboutParagraph2En" TEXT NOT NULL DEFAULT 'What began as a passion-driven studio has evolved into a multidisciplinary creative house that leads with strategy and creative direction, while executing everything under one roof — from branding and content to film, digital, and growth.',
    "aboutParagraph2Ar" TEXT NOT NULL DEFAULT 'What began as a passion-driven studio has evolved into a multidisciplinary creative house that leads with strategy and creative direction, while executing everything under one roof — from branding and content to film, digital, and growth.',
    "aboutParagraph2He" TEXT NOT NULL DEFAULT 'What began as a passion-driven studio has evolved into a multidisciplinary creative house that leads with strategy and creative direction, while executing everything under one roof — from branding and content to film, digital, and growth.',
    "aboutParagraph3En" TEXT NOT NULL DEFAULT 'Every project is led under a single creative direction and executed through a fully integrated in-house system — ensuring clarity, consistency, and control from strategy to final delivery.',
    "aboutParagraph3Ar" TEXT NOT NULL DEFAULT 'Every project is led under a single creative direction and executed through a fully integrated in-house system — ensuring clarity, consistency, and control from strategy to final delivery.',
    "aboutParagraph3He" TEXT NOT NULL DEFAULT 'Every project is led under a single creative direction and executed through a fully integrated in-house system — ensuring clarity, consistency, and control from strategy to final delivery.',
    "aboutParagraph4En" TEXT NOT NULL DEFAULT 'We partner with ambitious brands, institutions, and companies that understand visuals are not decoration — they are a business asset.',
    "aboutParagraph4Ar" TEXT NOT NULL DEFAULT 'We partner with ambitious brands, institutions, and companies that understand visuals are not decoration — they are a business asset.',
    "aboutParagraph4He" TEXT NOT NULL DEFAULT 'We partner with ambitious brands, institutions, and companies that understand visuals are not decoration — they are a business asset.',
    "aboutParagraph5En" TEXT NOT NULL DEFAULT 'At PMP, we don''t just produce content. We build visual systems that tell stories, build trust, and drive results.',
    "aboutParagraph5Ar" TEXT NOT NULL DEFAULT 'At PMP, we don''t just produce content. We build visual systems that tell stories, build trust, and drive results.',
    "aboutParagraph5He" TEXT NOT NULL DEFAULT 'At PMP, we don''t just produce content. We build visual systems that tell stories, build trust, and drive results.',
    "aboutHighlightsEn" JSONB NOT NULL DEFAULT '["Full-service creative agency","Expert team of filmmakers & designers","Cutting-edge equipment & technology","End-to-end project management","Dedicated to client success"]',
    "aboutHighlightsAr" JSONB NOT NULL DEFAULT '["Full-service creative agency","Expert team of filmmakers & designers","Cutting-edge equipment & technology","End-to-end project management","Dedicated to client success"]',
    "aboutHighlightsHe" JSONB NOT NULL DEFAULT '["Full-service creative agency","Expert team of filmmakers & designers","Cutting-edge equipment & technology","End-to-end project management","Dedicated to client success"]',
    "aboutYearsTextEn" TEXT NOT NULL DEFAULT '10+',
    "aboutYearsTextAr" TEXT NOT NULL DEFAULT '10+',
    "aboutYearsTextHe" TEXT NOT NULL DEFAULT '10+',
    "aboutYearsLabelEn" TEXT NOT NULL DEFAULT 'Years of Excellence',
    "aboutYearsLabelAr" TEXT NOT NULL DEFAULT 'Years of Excellence',
    "aboutYearsLabelHe" TEXT NOT NULL DEFAULT 'Years of Excellence',
    "teamSubtitleEn" TEXT NOT NULL DEFAULT 'Our Team',
    "teamSubtitleAr" TEXT NOT NULL DEFAULT 'Our Team',
    "teamSubtitleHe" TEXT NOT NULL DEFAULT 'Our Team',
    "teamTitleEn" TEXT NOT NULL DEFAULT 'PMP Crew',
    "teamTitleAr" TEXT NOT NULL DEFAULT 'PMP Crew',
    "teamTitleHe" TEXT NOT NULL DEFAULT 'PMP Crew',
    "teamDescriptionEn" TEXT NOT NULL DEFAULT 'Meet the talented professionals behind our creative productions.',
    "teamDescriptionAr" TEXT NOT NULL DEFAULT 'Meet the talented professionals behind our creative productions.',
    "teamDescriptionHe" TEXT NOT NULL DEFAULT 'Meet the talented professionals behind our creative productions.',
    "teamTab1LabelEn" TEXT NOT NULL DEFAULT 'Production Team',
    "teamTab1LabelAr" TEXT NOT NULL DEFAULT 'Production Team',
    "teamTab1LabelHe" TEXT NOT NULL DEFAULT 'Production Team',
    "teamTab2LabelEn" TEXT NOT NULL DEFAULT 'IT & Dev Team',
    "teamTab2LabelAr" TEXT NOT NULL DEFAULT 'IT & Dev Team',
    "teamTab2LabelHe" TEXT NOT NULL DEFAULT 'IT & Dev Team',
    "teamTab3LabelEn" TEXT NOT NULL DEFAULT 'Creative Team',
    "teamTab3LabelAr" TEXT NOT NULL DEFAULT 'Creative Team',
    "teamTab3LabelHe" TEXT NOT NULL DEFAULT 'Creative Team',
    "clientsSubtitleEn" TEXT NOT NULL DEFAULT 'Trusted By',
    "clientsSubtitleAr" TEXT NOT NULL DEFAULT 'Trusted By',
    "clientsSubtitleHe" TEXT NOT NULL DEFAULT 'Trusted By',
    "clientsTitleEn" TEXT NOT NULL DEFAULT 'Our Clients',
    "clientsTitleAr" TEXT NOT NULL DEFAULT 'Our Clients',
    "clientsTitleHe" TEXT NOT NULL DEFAULT 'Our Clients',
    "clientsDescriptionEn" TEXT NOT NULL DEFAULT 'We''ve had the privilege of working with amazing brands and businesses.',
    "clientsDescriptionAr" TEXT NOT NULL DEFAULT 'We''ve had the privilege of working with amazing brands and businesses.',
    "clientsDescriptionHe" TEXT NOT NULL DEFAULT 'We''ve had the privilege of working with amazing brands and businesses.',
    "clientsWhatTheySayEn" TEXT NOT NULL DEFAULT 'What They Say',
    "clientsWhatTheySayAr" TEXT NOT NULL DEFAULT 'What They Say',
    "clientsWhatTheySayHe" TEXT NOT NULL DEFAULT 'What They Say',
    "ctaBadgeEn" TEXT NOT NULL DEFAULT 'Let''s Create Together',
    "ctaBadgeAr" TEXT NOT NULL DEFAULT 'Let''s Create Together',
    "ctaBadgeHe" TEXT NOT NULL DEFAULT 'Let''s Create Together',
    "ctaHeadingEn" TEXT NOT NULL DEFAULT 'Ready to Bring Your Vision to Life?',
    "ctaHeadingAr" TEXT NOT NULL DEFAULT 'Ready to Bring Your Vision to Life?',
    "ctaHeadingHe" TEXT NOT NULL DEFAULT 'Ready to Bring Your Vision to Life?',
    "ctaSubtitleEn" TEXT NOT NULL DEFAULT 'Let''s create something amazing together. Book a consultation or get in touch to discuss your next project.',
    "ctaSubtitleAr" TEXT NOT NULL DEFAULT 'Let''s create something amazing together. Book a consultation or get in touch to discuss your next project.',
    "ctaSubtitleHe" TEXT NOT NULL DEFAULT 'Let''s create something amazing together. Book a consultation or get in touch to discuss your next project.',
    "aboutPageHeroBadgeEn" TEXT NOT NULL DEFAULT 'About Us',
    "aboutPageHeroBadgeAr" TEXT NOT NULL DEFAULT 'About Us',
    "aboutPageHeroBadgeHe" TEXT NOT NULL DEFAULT 'About Us',
    "aboutPageHeroHeadingEn" TEXT NOT NULL DEFAULT 'About Paxala Media',
    "aboutPageHeroHeadingAr" TEXT NOT NULL DEFAULT 'About Paxala Media',
    "aboutPageHeroHeadingHe" TEXT NOT NULL DEFAULT 'About Paxala Media',
    "aboutValuesSubtitleEn" TEXT NOT NULL DEFAULT 'What Drives Us',
    "aboutValuesSubtitleAr" TEXT NOT NULL DEFAULT 'What Drives Us',
    "aboutValuesSubtitleHe" TEXT NOT NULL DEFAULT 'What Drives Us',
    "aboutValuesTitleEn" TEXT NOT NULL DEFAULT 'Our Values',
    "aboutValuesTitleAr" TEXT NOT NULL DEFAULT 'Our Values',
    "aboutValuesTitleHe" TEXT NOT NULL DEFAULT 'Our Values',
    "aboutValuesDescriptionEn" TEXT NOT NULL DEFAULT 'The principles that guide everything we do at Paxala Media.',
    "aboutValuesDescriptionAr" TEXT NOT NULL DEFAULT 'The principles that guide everything we do at Paxala Media.',
    "aboutValuesDescriptionHe" TEXT NOT NULL DEFAULT 'The principles that guide everything we do at Paxala Media.',
    "aboutValuesEn" JSONB NOT NULL DEFAULT '[{"icon":"Target","title":"Excellence","description":"We strive for excellence in every project, paying attention to the smallest details to deliver outstanding results."},{"icon":"Users","title":"Collaboration","description":"We believe in the power of teamwork, both within our crew and with our clients, to create something truly remarkable."},{"icon":"Heart","title":"Passion","description":"Our passion for visual storytelling drives us to push creative boundaries and explore new possibilities."},{"icon":"Award","title":"Innovation","description":"We embrace new technologies and techniques to stay at the forefront of the creative industry."}]',
    "aboutValuesAr" JSONB NOT NULL DEFAULT '[{"icon":"Target","title":"Excellence","description":"We strive for excellence in every project, paying attention to the smallest details to deliver outstanding results."},{"icon":"Users","title":"Collaboration","description":"We believe in the power of teamwork, both within our crew and with our clients, to create something truly remarkable."},{"icon":"Heart","title":"Passion","description":"Our passion for visual storytelling drives us to push creative boundaries and explore new possibilities."},{"icon":"Award","title":"Innovation","description":"We embrace new technologies and techniques to stay at the forefront of the creative industry."}]',
    "aboutValuesHe" JSONB NOT NULL DEFAULT '[{"icon":"Target","title":"Excellence","description":"We strive for excellence in every project, paying attention to the smallest details to deliver outstanding results."},{"icon":"Users","title":"Collaboration","description":"We believe in the power of teamwork, both within our crew and with our clients, to create something truly remarkable."},{"icon":"Heart","title":"Passion","description":"Our passion for visual storytelling drives us to push creative boundaries and explore new possibilities."},{"icon":"Award","title":"Innovation","description":"We embrace new technologies and techniques to stay at the forefront of the creative industry."}]',
    "aboutMilestonesSubtitleEn" TEXT NOT NULL DEFAULT 'Our Journey',
    "aboutMilestonesSubtitleAr" TEXT NOT NULL DEFAULT 'Our Journey',
    "aboutMilestonesSubtitleHe" TEXT NOT NULL DEFAULT 'Our Journey',
    "aboutMilestonesTitleEn" TEXT NOT NULL DEFAULT 'Milestones',
    "aboutMilestonesTitleAr" TEXT NOT NULL DEFAULT 'Milestones',
    "aboutMilestonesTitleHe" TEXT NOT NULL DEFAULT 'Milestones',
    "aboutMilestonesDescriptionEn" TEXT NOT NULL DEFAULT 'Key moments in our growth as a creative studio.',
    "aboutMilestonesDescriptionAr" TEXT NOT NULL DEFAULT 'Key moments in our growth as a creative studio.',
    "aboutMilestonesDescriptionHe" TEXT NOT NULL DEFAULT 'Key moments in our growth as a creative studio.',
    "aboutMilestonesEn" JSONB NOT NULL DEFAULT '[{"year":"2014","title":"Founded","description":"Paxala Media was born from a passion for visual storytelling"},{"year":"2016","title":"First Major Client","description":"Completed our first major commercial project"},{"year":"2018","title":"Team Expansion","description":"Grew our team of creative professionals"},{"year":"2020","title":"Studio Launch","description":"Opened our dedicated production studio"},{"year":"2022","title":"Digital Services","description":"Expanded into web and app development"},{"year":"2024","title":"1000+ Projects","description":"Celebrated completing over 1000 client projects"}]',
    "aboutMilestonesAr" JSONB NOT NULL DEFAULT '[{"year":"2014","title":"Founded","description":"Paxala Media was born from a passion for visual storytelling"},{"year":"2016","title":"First Major Client","description":"Completed our first major commercial project"},{"year":"2018","title":"Team Expansion","description":"Grew our team of creative professionals"},{"year":"2020","title":"Studio Launch","description":"Opened our dedicated production studio"},{"year":"2022","title":"Digital Services","description":"Expanded into web and app development"},{"year":"2024","title":"1000+ Projects","description":"Celebrated completing over 1000 client projects"}]',
    "aboutMilestonesHe" JSONB NOT NULL DEFAULT '[{"year":"2014","title":"Founded","description":"Paxala Media was born from a passion for visual storytelling"},{"year":"2016","title":"First Major Client","description":"Completed our first major commercial project"},{"year":"2018","title":"Team Expansion","description":"Grew our team of creative professionals"},{"year":"2020","title":"Studio Launch","description":"Opened our dedicated production studio"},{"year":"2022","title":"Digital Services","description":"Expanded into web and app development"},{"year":"2024","title":"1000+ Projects","description":"Celebrated completing over 1000 client projects"}]',
    "aboutTeamSubtitleEn" TEXT NOT NULL DEFAULT 'Our Crew',
    "aboutTeamSubtitleAr" TEXT NOT NULL DEFAULT 'Our Crew',
    "aboutTeamSubtitleHe" TEXT NOT NULL DEFAULT 'Our Crew',
    "aboutTeamTitleEn" TEXT NOT NULL DEFAULT 'Meet the Team',
    "aboutTeamTitleAr" TEXT NOT NULL DEFAULT 'Meet the Team',
    "aboutTeamTitleHe" TEXT NOT NULL DEFAULT 'Meet the Team',
    "aboutTeamDescriptionEn" TEXT NOT NULL DEFAULT 'The talented professionals behind our creative productions.',
    "aboutTeamDescriptionAr" TEXT NOT NULL DEFAULT 'The talented professionals behind our creative productions.',
    "aboutTeamDescriptionHe" TEXT NOT NULL DEFAULT 'The talented professionals behind our creative productions.',
    "aboutCtaHeadingEn" TEXT NOT NULL DEFAULT 'Ready to Start Your Project?',
    "aboutCtaHeadingAr" TEXT NOT NULL DEFAULT 'Ready to Start Your Project?',
    "aboutCtaHeadingHe" TEXT NOT NULL DEFAULT 'Ready to Start Your Project?',
    "aboutCtaSubtitleEn" TEXT NOT NULL DEFAULT 'Let''s collaborate and create something extraordinary together. Our team is excited to hear about your project.',
    "aboutCtaSubtitleAr" TEXT NOT NULL DEFAULT 'Let''s collaborate and create something extraordinary together. Our team is excited to hear about your project.',
    "aboutCtaSubtitleHe" TEXT NOT NULL DEFAULT 'Let''s collaborate and create something extraordinary together. Our team is excited to hear about your project.',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomePageContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL,
    "quoteEn" TEXT NOT NULL,
    "quoteAr" TEXT NOT NULL,
    "quoteHe" TEXT NOT NULL,
    "authorEn" TEXT NOT NULL,
    "authorAr" TEXT NOT NULL,
    "authorHe" TEXT NOT NULL,
    "roleEn" TEXT NOT NULL,
    "roleAr" TEXT NOT NULL,
    "roleHe" TEXT NOT NULL,
    "companyEn" TEXT NOT NULL,
    "companyAr" TEXT NOT NULL,
    "companyHe" TEXT NOT NULL,
    "image" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "price" DECIMAL(10,2),
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paymentDate" TIMESTAMP(3),
    "paymentAmount" DECIMAL(10,2),
    "deadline" TIMESTAMP(3),
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "language" TEXT NOT NULL DEFAULT 'en',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "projectId" TEXT NOT NULL,
    "milestoneId" TEXT,
    "items" JSONB NOT NULL,
    "notes" TEXT,
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "dueDate" TIMESTAMP(3),
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "milestoneId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "rejectionReason" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPlan" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "caption" TEXT,
    "platform" "ContentPlatform" NOT NULL DEFAULT 'INSTAGRAM',
    "format" "ContentFormat" NOT NULL DEFAULT 'REEL',
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "planId" TEXT NOT NULL,
    "projectId" TEXT,
    "clientNotes" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentItemAsset" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ContentItemAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ProjectContacts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_ProjectStaff" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "ClientContact_clientId_idx" ON "ClientContact"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Portfolio_slug_key" ON "Portfolio"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Folder_slug_key" ON "Folder"("slug");

-- CreateIndex
CREATE INDEX "Folder_projectId_idx" ON "Folder"("projectId");

-- CreateIndex
CREATE INDEX "ProjectFile_projectId_idx" ON "ProjectFile"("projectId");

-- CreateIndex
CREATE INDEX "ProjectFile_taskId_idx" ON "ProjectFile"("taskId");

-- CreateIndex
CREATE INDEX "ProjectFile_category_idx" ON "ProjectFile"("category");

-- CreateIndex
CREATE INDEX "ProjectFile_folder_idx" ON "ProjectFile"("folder");

-- CreateIndex
CREATE INDEX "ProjectFile_folderId_idx" ON "ProjectFile"("folderId");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SiteSetting_key_key" ON "SiteSetting"("key");

-- CreateIndex
CREATE INDEX "Milestone_projectId_idx" ON "Milestone"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_milestoneId_key" ON "Invoice"("milestoneId");

-- CreateIndex
CREATE INDEX "Invoice_projectId_idx" ON "Invoice"("projectId");

-- CreateIndex
CREATE INDEX "Task_milestoneId_idx" ON "Task"("milestoneId");

-- CreateIndex
CREATE INDEX "Task_assigneeId_idx" ON "Task"("assigneeId");

-- CreateIndex
CREATE INDEX "ContentPlan_clientId_idx" ON "ContentPlan"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentPlan_clientId_month_year_key" ON "ContentPlan"("clientId", "month", "year");

-- CreateIndex
CREATE INDEX "ContentItem_planId_idx" ON "ContentItem"("planId");

-- CreateIndex
CREATE INDEX "ContentItem_scheduledAt_idx" ON "ContentItem"("scheduledAt");

-- CreateIndex
CREATE INDEX "ContentItem_status_idx" ON "ContentItem"("status");

-- CreateIndex
CREATE INDEX "ContentItemAsset_contentItemId_idx" ON "ContentItemAsset"("contentItemId");

-- CreateIndex
CREATE INDEX "ContentItemAsset_fileId_idx" ON "ContentItemAsset"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentItemAsset_contentItemId_fileId_key" ON "ContentItemAsset"("contentItemId", "fileId");

-- CreateIndex
CREATE UNIQUE INDEX "_ProjectContacts_AB_unique" ON "_ProjectContacts"("A", "B");

-- CreateIndex
CREATE INDEX "_ProjectContacts_B_index" ON "_ProjectContacts"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ProjectStaff_AB_unique" ON "_ProjectStaff"("A", "B");

-- CreateIndex
CREATE INDEX "_ProjectStaff_B_index" ON "_ProjectStaff"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientContact" ADD CONSTRAINT "ClientContact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFile" ADD CONSTRAINT "ProjectFile_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFile" ADD CONSTRAINT "ProjectFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFile" ADD CONSTRAINT "ProjectFile_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPlan" ADD CONSTRAINT "ContentPlan_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPlan" ADD CONSTRAINT "ContentPlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ContentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentItemAsset" ADD CONSTRAINT "ContentItemAsset_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentItemAsset" ADD CONSTRAINT "ContentItemAsset_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "ProjectFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectContacts" ADD CONSTRAINT "_ProjectContacts_A_fkey" FOREIGN KEY ("A") REFERENCES "ClientContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectContacts" ADD CONSTRAINT "_ProjectContacts_B_fkey" FOREIGN KEY ("B") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectStaff" ADD CONSTRAINT "_ProjectStaff_A_fkey" FOREIGN KEY ("A") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectStaff" ADD CONSTRAINT "_ProjectStaff_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

