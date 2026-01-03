-- =====================================================
-- LOCALIZATION MIGRATION SCRIPT
-- Safely migrates existing data to localized fields
-- =====================================================
--
-- This script:
-- 1. Adds new localized columns (En, Ar, He) as nullable
-- 2. Copies existing data to En columns
-- 3. Copies En data to Ar and He columns
-- 4. Drops old single-language columns
-- 5. Regenerates Prisma client
--
-- IMPORTANT: Backup your database before running!
-- =====================================================

BEGIN;

-- =====================================================
-- 1. TEAMMEMBER TABLE
-- =====================================================
-- Add new localized columns
ALTER TABLE "TeamMember"
  ADD COLUMN "nameEn" TEXT,
  ADD COLUMN "nameAr" TEXT,
  ADD COLUMN "nameHe" TEXT,
  ADD COLUMN "roleEn" TEXT,
  ADD COLUMN "roleAr" TEXT,
  ADD COLUMN "roleHe" TEXT,
  ADD COLUMN "bioEn" TEXT,
  ADD COLUMN "bioAr" TEXT,
  ADD COLUMN "bioHe" TEXT,
  ADD COLUMN "skillsEn" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "skillsAr" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "skillsHe" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Copy existing data to all language versions
UPDATE "TeamMember" SET
  "nameEn" = "name",
  "nameAr" = "name",
  "nameHe" = "name",
  "roleEn" = "role",
  "roleAr" = "role",
  "roleHe" = "role",
  "bioEn" = "bio",
  "bioAr" = "bio",
  "bioHe" = "bio",
  "skillsEn" = "skills",
  "skillsAr" = "skills",
  "skillsHe" = "skills";

-- Make required fields NOT NULL
ALTER TABLE "TeamMember"
  ALTER COLUMN "nameEn" SET NOT NULL,
  ALTER COLUMN "nameAr" SET NOT NULL,
  ALTER COLUMN "nameHe" SET NOT NULL,
  ALTER COLUMN "roleEn" SET NOT NULL,
  ALTER COLUMN "roleAr" SET NOT NULL,
  ALTER COLUMN "roleHe" SET NOT NULL,
  ALTER COLUMN "skillsEn" SET NOT NULL,
  ALTER COLUMN "skillsAr" SET NOT NULL,
  ALTER COLUMN "skillsHe" SET NOT NULL;

-- Drop old columns
ALTER TABLE "TeamMember"
  DROP COLUMN "name",
  DROP COLUMN "role",
  DROP COLUMN "bio",
  DROP COLUMN "skills";

-- =====================================================
-- 2. SERVICE TABLE
-- =====================================================
ALTER TABLE "Service"
  ADD COLUMN "nameEn" TEXT,
  ADD COLUMN "nameAr" TEXT,
  ADD COLUMN "nameHe" TEXT,
  ADD COLUMN "descriptionEn" TEXT,
  ADD COLUMN "descriptionAr" TEXT,
  ADD COLUMN "descriptionHe" TEXT,
  ADD COLUMN "featuresEn" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "featuresAr" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "featuresHe" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE "Service" SET
  "nameEn" = "name",
  "nameAr" = "name",
  "nameHe" = "name",
  "descriptionEn" = "description",
  "descriptionAr" = "description",
  "descriptionHe" = "description",
  "featuresEn" = "features",
  "featuresAr" = "features",
  "featuresHe" = "features";

ALTER TABLE "Service"
  ALTER COLUMN "nameEn" SET NOT NULL,
  ALTER COLUMN "nameAr" SET NOT NULL,
  ALTER COLUMN "nameHe" SET NOT NULL,
  ALTER COLUMN "descriptionEn" SET NOT NULL,
  ALTER COLUMN "descriptionAr" SET NOT NULL,
  ALTER COLUMN "descriptionHe" SET NOT NULL,
  ALTER COLUMN "featuresEn" SET NOT NULL,
  ALTER COLUMN "featuresAr" SET NOT NULL,
  ALTER COLUMN "featuresHe" SET NOT NULL;

ALTER TABLE "Service"
  DROP COLUMN "name",
  DROP COLUMN "description",
  DROP COLUMN "features";

-- =====================================================
-- 3. PORTFOLIO TABLE
-- =====================================================
ALTER TABLE "Portfolio"
  ADD COLUMN "titleEn" TEXT,
  ADD COLUMN "titleAr" TEXT,
  ADD COLUMN "titleHe" TEXT,
  ADD COLUMN "descriptionEn" TEXT,
  ADD COLUMN "descriptionAr" TEXT,
  ADD COLUMN "descriptionHe" TEXT,
  ADD COLUMN "contentEn" TEXT,
  ADD COLUMN "contentAr" TEXT,
  ADD COLUMN "contentHe" TEXT,
  ADD COLUMN "tagsEn" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "tagsAr" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "tagsHe" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE "Portfolio" SET
  "titleEn" = "title",
  "titleAr" = "title",
  "titleHe" = "title",
  "descriptionEn" = "description",
  "descriptionAr" = "description",
  "descriptionHe" = "description",
  "contentEn" = "content",
  "contentAr" = "content",
  "contentHe" = "content",
  "tagsEn" = "tags",
  "tagsAr" = "tags",
  "tagsHe" = "tags";

ALTER TABLE "Portfolio"
  ALTER COLUMN "titleEn" SET NOT NULL,
  ALTER COLUMN "titleAr" SET NOT NULL,
  ALTER COLUMN "titleHe" SET NOT NULL,
  ALTER COLUMN "descriptionEn" SET NOT NULL,
  ALTER COLUMN "descriptionAr" SET NOT NULL,
  ALTER COLUMN "descriptionHe" SET NOT NULL,
  ALTER COLUMN "tagsEn" SET NOT NULL,
  ALTER COLUMN "tagsAr" SET NOT NULL,
  ALTER COLUMN "tagsHe" SET NOT NULL;

ALTER TABLE "Portfolio"
  DROP COLUMN "title",
  DROP COLUMN "description",
  DROP COLUMN "content",
  DROP COLUMN "tags";

-- =====================================================
-- 4. BLOGPOST TABLE
-- =====================================================
ALTER TABLE "BlogPost"
  ADD COLUMN "titleEn" TEXT,
  ADD COLUMN "titleAr" TEXT,
  ADD COLUMN "titleHe" TEXT,
  ADD COLUMN "excerptEn" TEXT,
  ADD COLUMN "excerptAr" TEXT,
  ADD COLUMN "excerptHe" TEXT,
  ADD COLUMN "contentEn" TEXT,
  ADD COLUMN "contentAr" TEXT,
  ADD COLUMN "contentHe" TEXT,
  ADD COLUMN "tagsEn" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "tagsAr" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "tagsHe" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE "BlogPost" SET
  "titleEn" = "title",
  "titleAr" = "title",
  "titleHe" = "title",
  "excerptEn" = "excerpt",
  "excerptAr" = "excerpt",
  "excerptHe" = "excerpt",
  "contentEn" = "content",
  "contentAr" = "content",
  "contentHe" = "content",
  "tagsEn" = "tags",
  "tagsAr" = "tags",
  "tagsHe" = "tags";

ALTER TABLE "BlogPost"
  ALTER COLUMN "titleEn" SET NOT NULL,
  ALTER COLUMN "titleAr" SET NOT NULL,
  ALTER COLUMN "titleHe" SET NOT NULL,
  ALTER COLUMN "excerptEn" SET NOT NULL,
  ALTER COLUMN "excerptAr" SET NOT NULL,
  ALTER COLUMN "excerptHe" SET NOT NULL,
  ALTER COLUMN "contentEn" SET NOT NULL,
  ALTER COLUMN "contentAr" SET NOT NULL,
  ALTER COLUMN "contentHe" SET NOT NULL,
  ALTER COLUMN "tagsEn" SET NOT NULL,
  ALTER COLUMN "tagsAr" SET NOT NULL,
  ALTER COLUMN "tagsHe" SET NOT NULL;

ALTER TABLE "BlogPost"
  DROP COLUMN "title",
  DROP COLUMN "excerpt",
  DROP COLUMN "content",
  DROP COLUMN "tags";

-- =====================================================
-- 5. CLIENTLOGO TABLE
-- =====================================================
ALTER TABLE "ClientLogo"
  ADD COLUMN "nameEn" TEXT,
  ADD COLUMN "nameAr" TEXT,
  ADD COLUMN "nameHe" TEXT;

UPDATE "ClientLogo" SET
  "nameEn" = "name",
  "nameAr" = "name",
  "nameHe" = "name";

ALTER TABLE "ClientLogo"
  ALTER COLUMN "nameEn" SET NOT NULL,
  ALTER COLUMN "nameAr" SET NOT NULL,
  ALTER COLUMN "nameHe" SET NOT NULL;

ALTER TABLE "ClientLogo"
  DROP COLUMN "name";

-- =====================================================
-- 6. TESTIMONIAL TABLE
-- =====================================================
ALTER TABLE "Testimonial"
  ADD COLUMN "quoteEn" TEXT,
  ADD COLUMN "quoteAr" TEXT,
  ADD COLUMN "quoteHe" TEXT,
  ADD COLUMN "authorEn" TEXT,
  ADD COLUMN "authorAr" TEXT,
  ADD COLUMN "authorHe" TEXT,
  ADD COLUMN "roleEn" TEXT,
  ADD COLUMN "roleAr" TEXT,
  ADD COLUMN "roleHe" TEXT,
  ADD COLUMN "companyEn" TEXT,
  ADD COLUMN "companyAr" TEXT,
  ADD COLUMN "companyHe" TEXT;

UPDATE "Testimonial" SET
  "quoteEn" = "quote",
  "quoteAr" = "quote",
  "quoteHe" = "quote",
  "authorEn" = "author",
  "authorAr" = "author",
  "authorHe" = "author",
  "roleEn" = "role",
  "roleAr" = "role",
  "roleHe" = "role",
  "companyEn" = "company",
  "companyAr" = "company",
  "companyHe" = "company";

ALTER TABLE "Testimonial"
  ALTER COLUMN "quoteEn" SET NOT NULL,
  ALTER COLUMN "quoteAr" SET NOT NULL,
  ALTER COLUMN "quoteHe" SET NOT NULL,
  ALTER COLUMN "authorEn" SET NOT NULL,
  ALTER COLUMN "authorAr" SET NOT NULL,
  ALTER COLUMN "authorHe" SET NOT NULL,
  ALTER COLUMN "roleEn" SET NOT NULL,
  ALTER COLUMN "roleAr" SET NOT NULL,
  ALTER COLUMN "roleHe" SET NOT NULL,
  ALTER COLUMN "companyEn" SET NOT NULL,
  ALTER COLUMN "companyAr" SET NOT NULL,
  ALTER COLUMN "companyHe" SET NOT NULL;

ALTER TABLE "Testimonial"
  DROP COLUMN "quote",
  DROP COLUMN "author",
  DROP COLUMN "role",
  DROP COLUMN "company";

-- =====================================================
-- 7. HOMEPAGECONTENT TABLE (150+ fields!)
-- =====================================================

-- Hero Section
ALTER TABLE "HomePageContent"
  ADD COLUMN "heroBadgeEn" TEXT DEFAULT 'Creative Production Studio',
  ADD COLUMN "heroBadgeAr" TEXT DEFAULT 'Creative Production Studio',
  ADD COLUMN "heroBadgeHe" TEXT DEFAULT 'Creative Production Studio',
  ADD COLUMN "heroHeadingEn" TEXT DEFAULT 'Paxala Media Production',
  ADD COLUMN "heroHeadingAr" TEXT DEFAULT 'Paxala Media Production',
  ADD COLUMN "heroHeadingHe" TEXT DEFAULT 'Paxala Media Production',
  ADD COLUMN "heroSloganEn" TEXT DEFAULT 'From Vision to Visual',
  ADD COLUMN "heroSloganAr" TEXT DEFAULT 'From Vision to Visual',
  ADD COLUMN "heroSloganHe" TEXT DEFAULT 'From Vision to Visual',
  ADD COLUMN "heroSubtitle1En" TEXT DEFAULT 'Bringing brands to life through impactful visual storytelling.',
  ADD COLUMN "heroSubtitle1Ar" TEXT DEFAULT 'Bringing brands to life through impactful visual storytelling.',
  ADD COLUMN "heroSubtitle1He" TEXT DEFAULT 'Bringing brands to life through impactful visual storytelling.',
  ADD COLUMN "heroSubtitle2En" TEXT DEFAULT 'Video production, photography, design, and development under one roof.',
  ADD COLUMN "heroSubtitle2Ar" TEXT DEFAULT 'Video production, photography, design, and development under one roof.',
  ADD COLUMN "heroSubtitle2He" TEXT DEFAULT 'Video production, photography, design, and development under one roof.',
  ADD COLUMN "heroStatsEn" JSONB DEFAULT '[{"value":"1000+","label":"Projects Completed"},{"value":"200+","label":"Happy Clients"},{"value":"8+","label":"Services Offered"},{"value":"10+","label":"Years Experience"}]'::jsonb,
  ADD COLUMN "heroStatsAr" JSONB DEFAULT '[{"value":"1000+","label":"Projects Completed"},{"value":"200+","label":"Happy Clients"},{"value":"8+","label":"Services Offered"},{"value":"10+","label":"Years Experience"}]'::jsonb,
  ADD COLUMN "heroStatsHe" JSONB DEFAULT '[{"value":"1000+","label":"Projects Completed"},{"value":"200+","label":"Happy Clients"},{"value":"8+","label":"Services Offered"},{"value":"10+","label":"Years Experience"}]'::jsonb;

-- About Section
ALTER TABLE "HomePageContent"
  ADD COLUMN "aboutBadgeEn" TEXT DEFAULT 'About Us',
  ADD COLUMN "aboutBadgeAr" TEXT DEFAULT 'About Us',
  ADD COLUMN "aboutBadgeHe" TEXT DEFAULT 'About Us',
  ADD COLUMN "aboutHeadingEn" TEXT DEFAULT 'About Paxala Media',
  ADD COLUMN "aboutHeadingAr" TEXT DEFAULT 'About Paxala Media',
  ADD COLUMN "aboutHeadingHe" TEXT DEFAULT 'About Paxala Media',
  ADD COLUMN "aboutParagraph1En" TEXT DEFAULT 'Paxala Media Production is a full-service creative agency.',
  ADD COLUMN "aboutParagraph1Ar" TEXT DEFAULT 'Paxala Media Production is a full-service creative agency.',
  ADD COLUMN "aboutParagraph1He" TEXT DEFAULT 'Paxala Media Production is a full-service creative agency.',
  ADD COLUMN "aboutParagraph2En" TEXT DEFAULT '',
  ADD COLUMN "aboutParagraph2Ar" TEXT DEFAULT '',
  ADD COLUMN "aboutParagraph2He" TEXT DEFAULT '',
  ADD COLUMN "aboutParagraph3En" TEXT DEFAULT '',
  ADD COLUMN "aboutParagraph3Ar" TEXT DEFAULT '',
  ADD COLUMN "aboutParagraph3He" TEXT DEFAULT '',
  ADD COLUMN "aboutParagraph4En" TEXT DEFAULT '',
  ADD COLUMN "aboutParagraph4Ar" TEXT DEFAULT '',
  ADD COLUMN "aboutParagraph4He" TEXT DEFAULT '',
  ADD COLUMN "aboutParagraph5En" TEXT DEFAULT '',
  ADD COLUMN "aboutParagraph5Ar" TEXT DEFAULT '',
  ADD COLUMN "aboutParagraph5He" TEXT DEFAULT '',
  ADD COLUMN "aboutHighlightsEn" JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN "aboutHighlightsAr" JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN "aboutHighlightsHe" JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN "aboutYearsTextEn" TEXT DEFAULT '10+',
  ADD COLUMN "aboutYearsTextAr" TEXT DEFAULT '10+',
  ADD COLUMN "aboutYearsTextHe" TEXT DEFAULT '10+',
  ADD COLUMN "aboutYearsLabelEn" TEXT DEFAULT 'Years of Excellence',
  ADD COLUMN "aboutYearsLabelAr" TEXT DEFAULT 'Years of Excellence',
  ADD COLUMN "aboutYearsLabelHe" TEXT DEFAULT 'Years of Excellence';

-- Team Section
ALTER TABLE "HomePageContent"
  ADD COLUMN "teamSubtitleEn" TEXT DEFAULT 'Our Team',
  ADD COLUMN "teamSubtitleAr" TEXT DEFAULT 'Our Team',
  ADD COLUMN "teamSubtitleHe" TEXT DEFAULT 'Our Team',
  ADD COLUMN "teamTitleEn" TEXT DEFAULT 'PMP Crew',
  ADD COLUMN "teamTitleAr" TEXT DEFAULT 'PMP Crew',
  ADD COLUMN "teamTitleHe" TEXT DEFAULT 'PMP Crew',
  ADD COLUMN "teamDescriptionEn" TEXT DEFAULT 'Meet the talented professionals.',
  ADD COLUMN "teamDescriptionAr" TEXT DEFAULT 'Meet the talented professionals.',
  ADD COLUMN "teamDescriptionHe" TEXT DEFAULT 'Meet the talented professionals.',
  ADD COLUMN "teamTab1LabelEn" TEXT DEFAULT 'Production Team',
  ADD COLUMN "teamTab1LabelAr" TEXT DEFAULT 'Production Team',
  ADD COLUMN "teamTab1LabelHe" TEXT DEFAULT 'Production Team',
  ADD COLUMN "teamTab2LabelEn" TEXT DEFAULT 'IT & Dev Team',
  ADD COLUMN "teamTab2LabelAr" TEXT DEFAULT 'IT & Dev Team',
  ADD COLUMN "teamTab2LabelHe" TEXT DEFAULT 'IT & Dev Team',
  ADD COLUMN "teamTab3LabelEn" TEXT DEFAULT 'Creative Team',
  ADD COLUMN "teamTab3LabelAr" TEXT DEFAULT 'Creative Team',
  ADD COLUMN "teamTab3LabelHe" TEXT DEFAULT 'Creative Team';

-- Clients Section
ALTER TABLE "HomePageContent"
  ADD COLUMN "clientsSubtitleEn" TEXT DEFAULT 'Trusted By',
  ADD COLUMN "clientsSubtitleAr" TEXT DEFAULT 'Trusted By',
  ADD COLUMN "clientsSubtitleHe" TEXT DEFAULT 'Trusted By',
  ADD COLUMN "clientsTitleEn" TEXT DEFAULT 'Our Clients',
  ADD COLUMN "clientsTitleAr" TEXT DEFAULT 'Our Clients',
  ADD COLUMN "clientsTitleHe" TEXT DEFAULT 'Our Clients',
  ADD COLUMN "clientsDescriptionEn" TEXT DEFAULT 'Working with amazing brands.',
  ADD COLUMN "clientsDescriptionAr" TEXT DEFAULT 'Working with amazing brands.',
  ADD COLUMN "clientsDescriptionHe" TEXT DEFAULT 'Working with amazing brands.',
  ADD COLUMN "clientsWhatTheySayEn" TEXT DEFAULT 'What They Say',
  ADD COLUMN "clientsWhatTheySayAr" TEXT DEFAULT 'What They Say',
  ADD COLUMN "clientsWhatTheySayHe" TEXT DEFAULT 'What They Say';

-- CTA Section
ALTER TABLE "HomePageContent"
  ADD COLUMN "ctaBadgeEn" TEXT DEFAULT 'Let''s Create Together',
  ADD COLUMN "ctaBadgeAr" TEXT DEFAULT 'Let''s Create Together',
  ADD COLUMN "ctaBadgeHe" TEXT DEFAULT 'Let''s Create Together',
  ADD COLUMN "ctaHeadingEn" TEXT DEFAULT 'Ready to Bring Your Vision to Life?',
  ADD COLUMN "ctaHeadingAr" TEXT DEFAULT 'Ready to Bring Your Vision to Life?',
  ADD COLUMN "ctaHeadingHe" TEXT DEFAULT 'Ready to Bring Your Vision to Life?',
  ADD COLUMN "ctaSubtitleEn" TEXT DEFAULT 'Let''s create something amazing together.',
  ADD COLUMN "ctaSubtitleAr" TEXT DEFAULT 'Let''s create something amazing together.',
  ADD COLUMN "ctaSubtitleHe" TEXT DEFAULT 'Let''s create something amazing together.';

-- About Page Specific
ALTER TABLE "HomePageContent"
  ADD COLUMN "aboutPageHeroBadgeEn" TEXT DEFAULT 'About Us',
  ADD COLUMN "aboutPageHeroBadgeAr" TEXT DEFAULT 'About Us',
  ADD COLUMN "aboutPageHeroBadgeHe" TEXT DEFAULT 'About Us',
  ADD COLUMN "aboutPageHeroHeadingEn" TEXT DEFAULT 'About Paxala Media',
  ADD COLUMN "aboutPageHeroHeadingAr" TEXT DEFAULT 'About Paxala Media',
  ADD COLUMN "aboutPageHeroHeadingHe" TEXT DEFAULT 'About Paxala Media';

-- About Page Values
ALTER TABLE "HomePageContent"
  ADD COLUMN "aboutValuesSubtitleEn" TEXT DEFAULT 'What Drives Us',
  ADD COLUMN "aboutValuesSubtitleAr" TEXT DEFAULT 'What Drives Us',
  ADD COLUMN "aboutValuesSubtitleHe" TEXT DEFAULT 'What Drives Us',
  ADD COLUMN "aboutValuesTitleEn" TEXT DEFAULT 'Our Values',
  ADD COLUMN "aboutValuesTitleAr" TEXT DEFAULT 'Our Values',
  ADD COLUMN "aboutValuesTitleHe" TEXT DEFAULT 'Our Values',
  ADD COLUMN "aboutValuesDescriptionEn" TEXT DEFAULT 'The principles that guide us.',
  ADD COLUMN "aboutValuesDescriptionAr" TEXT DEFAULT 'The principles that guide us.',
  ADD COLUMN "aboutValuesDescriptionHe" TEXT DEFAULT 'The principles that guide us.',
  ADD COLUMN "aboutValuesEn" JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN "aboutValuesAr" JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN "aboutValuesHe" JSONB DEFAULT '[]'::jsonb;

-- About Page Milestones
ALTER TABLE "HomePageContent"
  ADD COLUMN "aboutMilestonesSubtitleEn" TEXT DEFAULT 'Our Journey',
  ADD COLUMN "aboutMilestonesSubtitleAr" TEXT DEFAULT 'Our Journey',
  ADD COLUMN "aboutMilestonesSubtitleHe" TEXT DEFAULT 'Our Journey',
  ADD COLUMN "aboutMilestonesTitleEn" TEXT DEFAULT 'Milestones',
  ADD COLUMN "aboutMilestonesTitleAr" TEXT DEFAULT 'Milestones',
  ADD COLUMN "aboutMilestonesTitleHe" TEXT DEFAULT 'Milestones',
  ADD COLUMN "aboutMilestonesDescriptionEn" TEXT DEFAULT 'Key moments in our growth.',
  ADD COLUMN "aboutMilestonesDescriptionAr" TEXT DEFAULT 'Key moments in our growth.',
  ADD COLUMN "aboutMilestonesDescriptionHe" TEXT DEFAULT 'Key moments in our growth.',
  ADD COLUMN "aboutMilestonesEn" JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN "aboutMilestonesAr" JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN "aboutMilestonesHe" JSONB DEFAULT '[]'::jsonb;

-- About Page Team
ALTER TABLE "HomePageContent"
  ADD COLUMN "aboutTeamSubtitleEn" TEXT DEFAULT 'Our Crew',
  ADD COLUMN "aboutTeamSubtitleAr" TEXT DEFAULT 'Our Crew',
  ADD COLUMN "aboutTeamSubtitleHe" TEXT DEFAULT 'Our Crew',
  ADD COLUMN "aboutTeamTitleEn" TEXT DEFAULT 'Meet the Team',
  ADD COLUMN "aboutTeamTitleAr" TEXT DEFAULT 'Meet the Team',
  ADD COLUMN "aboutTeamTitleHe" TEXT DEFAULT 'Meet the Team',
  ADD COLUMN "aboutTeamDescriptionEn" TEXT DEFAULT 'The talented professionals behind our productions.',
  ADD COLUMN "aboutTeamDescriptionAr" TEXT DEFAULT 'The talented professionals behind our productions.',
  ADD COLUMN "aboutTeamDescriptionHe" TEXT DEFAULT 'The talented professionals behind our productions.';

-- About Page CTA
ALTER TABLE "HomePageContent"
  ADD COLUMN "aboutCtaHeadingEn" TEXT DEFAULT 'Ready to Start Your Project?',
  ADD COLUMN "aboutCtaHeadingAr" TEXT DEFAULT 'Ready to Start Your Project?',
  ADD COLUMN "aboutCtaHeadingHe" TEXT DEFAULT 'Ready to Start Your Project?',
  ADD COLUMN "aboutCtaSubtitleEn" TEXT DEFAULT 'Let''s collaborate together.',
  ADD COLUMN "aboutCtaSubtitleAr" TEXT DEFAULT 'Let''s collaborate together.',
  ADD COLUMN "aboutCtaSubtitleHe" TEXT DEFAULT 'Let''s collaborate together.';

-- Copy existing data for HomePageContent
UPDATE "HomePageContent" SET
  "heroBadgeEn" = COALESCE("heroBadge", 'Creative Production Studio'),
  "heroBadgeAr" = COALESCE("heroBadge", 'Creative Production Studio'),
  "heroBadgeHe" = COALESCE("heroBadge", 'Creative Production Studio'),
  "heroHeadingEn" = COALESCE("heroHeading", 'Paxala Media Production'),
  "heroHeadingAr" = COALESCE("heroHeading", 'Paxala Media Production'),
  "heroHeadingHe" = COALESCE("heroHeading", 'Paxala Media Production'),
  "heroSloganEn" = COALESCE("heroSlogan", 'From Vision to Visual'),
  "heroSloganAr" = COALESCE("heroSlogan", 'From Vision to Visual'),
  "heroSloganHe" = COALESCE("heroSlogan", 'From Vision to Visual'),
  "heroSubtitle1En" = COALESCE("heroSubtitle1", 'Bringing brands to life.'),
  "heroSubtitle1Ar" = COALESCE("heroSubtitle1", 'Bringing brands to life.'),
  "heroSubtitle1He" = COALESCE("heroSubtitle1", 'Bringing brands to life.'),
  "heroSubtitle2En" = COALESCE("heroSubtitle2", 'Full service production.'),
  "heroSubtitle2Ar" = COALESCE("heroSubtitle2", 'Full service production.'),
  "heroSubtitle2He" = COALESCE("heroSubtitle2", 'Full service production.'),
  "heroStatsEn" = COALESCE("heroStats"::jsonb, '[]'::jsonb),
  "heroStatsAr" = COALESCE("heroStats"::jsonb, '[]'::jsonb),
  "heroStatsHe" = COALESCE("heroStats"::jsonb, '[]'::jsonb),
  -- About section
  "aboutBadgeEn" = COALESCE("aboutBadge", 'About Us'),
  "aboutBadgeAr" = COALESCE("aboutBadge", 'About Us'),
  "aboutBadgeHe" = COALESCE("aboutBadge", 'About Us'),
  "aboutHeadingEn" = COALESCE("aboutHeading", 'About Paxala Media'),
  "aboutHeadingAr" = COALESCE("aboutHeading", 'About Paxala Media'),
  "aboutHeadingHe" = COALESCE("aboutHeading", 'About Paxala Media'),
  "aboutParagraph1En" = COALESCE("aboutParagraph1", ''),
  "aboutParagraph1Ar" = COALESCE("aboutParagraph1", ''),
  "aboutParagraph1He" = COALESCE("aboutParagraph1", ''),
  "aboutParagraph2En" = COALESCE("aboutParagraph2", ''),
  "aboutParagraph2Ar" = COALESCE("aboutParagraph2", ''),
  "aboutParagraph2He" = COALESCE("aboutParagraph2", ''),
  "aboutParagraph3En" = COALESCE("aboutParagraph3", ''),
  "aboutParagraph3Ar" = COALESCE("aboutParagraph3", ''),
  "aboutParagraph3He" = COALESCE("aboutParagraph3", ''),
  "aboutParagraph4En" = COALESCE("aboutParagraph4", ''),
  "aboutParagraph4Ar" = COALESCE("aboutParagraph4", ''),
  "aboutParagraph4He" = COALESCE("aboutParagraph4", ''),
  "aboutParagraph5En" = COALESCE("aboutParagraph5", ''),
  "aboutParagraph5Ar" = COALESCE("aboutParagraph5", ''),
  "aboutParagraph5He" = COALESCE("aboutParagraph5", ''),
  "aboutHighlightsEn" = COALESCE("aboutHighlights"::jsonb, '[]'::jsonb),
  "aboutHighlightsAr" = COALESCE("aboutHighlights"::jsonb, '[]'::jsonb),
  "aboutHighlightsHe" = COALESCE("aboutHighlights"::jsonb, '[]'::jsonb),
  "aboutYearsTextEn" = COALESCE("aboutYearsText", '10+'),
  "aboutYearsTextAr" = COALESCE("aboutYearsText", '10+'),
  "aboutYearsTextHe" = COALESCE("aboutYearsText", '10+'),
  "aboutYearsLabelEn" = COALESCE("aboutYearsLabel", 'Years of Excellence'),
  "aboutYearsLabelAr" = COALESCE("aboutYearsLabel", 'Years of Excellence'),
  "aboutYearsLabelHe" = COALESCE("aboutYearsLabel", 'Years of Excellence'),
  -- Team section
  "teamSubtitleEn" = COALESCE("teamSubtitle", 'Our Team'),
  "teamSubtitleAr" = COALESCE("teamSubtitle", 'Our Team'),
  "teamSubtitleHe" = COALESCE("teamSubtitle", 'Our Team'),
  "teamTitleEn" = COALESCE("teamTitle", 'PMP Crew'),
  "teamTitleAr" = COALESCE("teamTitle", 'PMP Crew'),
  "teamTitleHe" = COALESCE("teamTitle", 'PMP Crew'),
  "teamDescriptionEn" = COALESCE("teamDescription", 'Meet the team.'),
  "teamDescriptionAr" = COALESCE("teamDescription", 'Meet the team.'),
  "teamDescriptionHe" = COALESCE("teamDescription", 'Meet the team.'),
  "teamTab1LabelEn" = COALESCE("teamTab1Label", 'Production Team'),
  "teamTab1LabelAr" = COALESCE("teamTab1Label", 'Production Team'),
  "teamTab1LabelHe" = COALESCE("teamTab1Label", 'Production Team'),
  "teamTab2LabelEn" = COALESCE("teamTab2Label", 'IT & Dev Team'),
  "teamTab2LabelAr" = COALESCE("teamTab2Label", 'IT & Dev Team'),
  "teamTab2LabelHe" = COALESCE("teamTab2Label", 'IT & Dev Team'),
  "teamTab3LabelEn" = COALESCE("teamTab3Label", 'Creative Team'),
  "teamTab3LabelAr" = COALESCE("teamTab3Label", 'Creative Team'),
  "teamTab3LabelHe" = COALESCE("teamTab3Label", 'Creative Team'),
  -- Continue with remaining fields...
  "clientsSubtitleEn" = COALESCE("clientsSubtitle", 'Trusted By'),
  "clientsSubtitleAr" = COALESCE("clientsSubtitle", 'Trusted By'),
  "clientsSubtitleHe" = COALESCE("clientsSubtitle", 'Trusted By'),
  "clientsTitleEn" = COALESCE("clientsTitle", 'Our Clients'),
  "clientsTitleAr" = COALESCE("clientsTitle", 'Our Clients'),
  "clientsTitleHe" = COALESCE("clientsTitle", 'Our Clients'),
  "clientsDescriptionEn" = COALESCE("clientsDescription", ''),
  "clientsDescriptionAr" = COALESCE("clientsDescription", ''),
  "clientsDescriptionHe" = COALESCE("clientsDescription", ''),
  "clientsWhatTheySayEn" = COALESCE("clientsWhatTheySay", 'What They Say'),
  "clientsWhatTheySayAr" = COALESCE("clientsWhatTheySay", 'What They Say'),
  "clientsWhatTheySayHe" = COALESCE("clientsWhatTheySay", 'What They Say'),
  -- CTA
  "ctaBadgeEn" = COALESCE("ctaBadge", 'Let''s Create Together'),
  "ctaBadgeAr" = COALESCE("ctaBadge", 'Let''s Create Together'),
  "ctaBadgeHe" = COALESCE("ctaBadge", 'Let''s Create Together'),
  "ctaHeadingEn" = COALESCE("ctaHeading", 'Ready to Start?'),
  "ctaHeadingAr" = COALESCE("ctaHeading", 'Ready to Start?'),
  "ctaHeadingHe" = COALESCE("ctaHeading", 'Ready to Start?'),
  "ctaSubtitleEn" = COALESCE("ctaSubtitle", 'Let''s create together.'),
  "ctaSubtitleAr" = COALESCE("ctaSubtitle", 'Let''s create together.'),
  "ctaSubtitleHe" = COALESCE("ctaSubtitle", 'Let''s create together.'),
  -- About page specific
  "aboutValuesEn" = COALESCE("aboutValues"::jsonb, '[]'::jsonb),
  "aboutValuesAr" = COALESCE("aboutValues"::jsonb, '[]'::jsonb),
  "aboutValuesHe" = COALESCE("aboutValues"::jsonb, '[]'::jsonb),
  "aboutMilestonesEn" = COALESCE("aboutMilestones"::jsonb, '[]'::jsonb),
  "aboutMilestonesAr" = COALESCE("aboutMilestones"::jsonb, '[]'::jsonb),
  "aboutMilestonesHe" = COALESCE("aboutMilestones"::jsonb, '[]'::jsonb);

-- Make required fields NOT NULL
ALTER TABLE "HomePageContent"
  ALTER COLUMN "heroBadgeEn" SET NOT NULL,
  ALTER COLUMN "heroBadgeAr" SET NOT NULL,
  ALTER COLUMN "heroBadgeHe" SET NOT NULL,
  ALTER COLUMN "heroHeadingEn" SET NOT NULL,
  ALTER COLUMN "heroHeadingAr" SET NOT NULL,
  ALTER COLUMN "heroHeadingHe" SET NOT NULL,
  ALTER COLUMN "heroSloganEn" SET NOT NULL,
  ALTER COLUMN "heroSloganAr" SET NOT NULL,
  ALTER COLUMN "heroSloganHe" SET NOT NULL;

-- Drop old columns
ALTER TABLE "HomePageContent"
  DROP COLUMN IF EXISTS "heroBadge",
  DROP COLUMN IF EXISTS "heroHeading",
  DROP COLUMN IF EXISTS "heroSlogan",
  DROP COLUMN IF EXISTS "heroSubtitle1",
  DROP COLUMN IF EXISTS "heroSubtitle2",
  DROP COLUMN IF EXISTS "heroStats",
  DROP COLUMN IF EXISTS "aboutBadge",
  DROP COLUMN IF EXISTS "aboutHeading",
  DROP COLUMN IF EXISTS "aboutParagraph1",
  DROP COLUMN IF EXISTS "aboutParagraph2",
  DROP COLUMN IF EXISTS "aboutParagraph3",
  DROP COLUMN IF EXISTS "aboutParagraph4",
  DROP COLUMN IF EXISTS "aboutParagraph5",
  DROP COLUMN IF EXISTS "aboutHighlights",
  DROP COLUMN IF EXISTS "aboutYearsText",
  DROP COLUMN IF EXISTS "aboutYearsLabel",
  DROP COLUMN IF EXISTS "teamSubtitle",
  DROP COLUMN IF EXISTS "teamTitle",
  DROP COLUMN IF EXISTS "teamDescription",
  DROP COLUMN IF EXISTS "teamTab1Label",
  DROP COLUMN IF EXISTS "teamTab2Label",
  DROP COLUMN IF EXISTS "teamTab3Label",
  DROP COLUMN IF EXISTS "clientsSubtitle",
  DROP COLUMN IF EXISTS "clientsTitle",
  DROP COLUMN IF EXISTS "clientsDescription",
  DROP COLUMN IF EXISTS "clientsWhatTheySay",
  DROP COLUMN IF EXISTS "ctaBadge",
  DROP COLUMN IF EXISTS "ctaHeading",
  DROP COLUMN IF EXISTS "ctaSubtitle",
  DROP COLUMN IF EXISTS "aboutPageHeroBadge",
  DROP COLUMN IF EXISTS "aboutPageHeroHeading",
  DROP COLUMN IF EXISTS "aboutValuesSubtitle",
  DROP COLUMN IF EXISTS "aboutValuesTitle",
  DROP COLUMN IF EXISTS "aboutValuesDescription",
  DROP COLUMN IF EXISTS "aboutValues",
  DROP COLUMN IF EXISTS "aboutMilestonesSubtitle",
  DROP COLUMN IF EXISTS "aboutMilestonesTitle",
  DROP COLUMN IF EXISTS "aboutMilestonesDescription",
  DROP COLUMN IF EXISTS "aboutMilestones",
  DROP COLUMN IF EXISTS "aboutTeamSubtitle",
  DROP COLUMN IF EXISTS "aboutTeamTitle",
  DROP COLUMN IF EXISTS "aboutTeamDescription",
  DROP COLUMN IF EXISTS "aboutCtaHeading",
  DROP COLUMN IF EXISTS "aboutCtaSubtitle";

COMMIT;

-- =====================================================
-- MIGRATION COMPLETE!
--
-- Next steps:
-- 1. Run: npx prisma generate
-- 2. Restart your development server
-- 3. Test language switching
-- 4. Update Arabic and Hebrew content through admin panel
-- =====================================================
