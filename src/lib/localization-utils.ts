import { Locale } from '@/i18n/config';
import { capitalize } from '@/types/localization';

/**
 * Transform Service model to locale-specific format
 */
export function localizeService(service: any, locale: Locale) {
  const suffix = capitalize(locale);

  return {
    id: service.id,
    name: service[`name${suffix}`],
    slug: service.slug,
    description: service[`description${suffix}`],
    icon: service.icon,
    image: service.image,
    features: service[`features${suffix}`],
    order: service.order,
    isActive: service.isActive,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  };
}

/**
 * Transform Portfolio model to locale-specific format
 */
export function localizePortfolio(portfolio: any, locale: Locale) {
  const suffix = capitalize(locale);

  return {
    id: portfolio.id,
    title: portfolio[`title${suffix}`],
    slug: portfolio.slug,
    description: portfolio[`description${suffix}`],
    content: portfolio[`content${suffix}`],
    thumbnail: portfolio.thumbnail,
    images: portfolio.images,
    videoUrl: portfolio.videoUrl,
    category: portfolio.category,
    tags: portfolio[`tags${suffix}`],
    clientName: portfolio.clientName,
    featured: portfolio.featured,
    published: portfolio.published,
    publishedAt: portfolio.publishedAt,
    order: portfolio.order,
    createdAt: portfolio.createdAt,
    updatedAt: portfolio.updatedAt,
  };
}

/**
 * Transform BlogPost model to locale-specific format
 */
export function localizeBlogPost(post: any, locale: Locale) {
  const suffix = capitalize(locale);

  return {
    id: post.id,
    title: post[`title${suffix}`],
    slug: post.slug,
    excerpt: post[`excerpt${suffix}`],
    content: post[`content${suffix}`],
    coverImage: post.coverImage,
    authorId: post.authorId,
    category: post.category,
    tags: post[`tags${suffix}`],
    published: post.published,
    publishedAt: post.publishedAt,
    views: post.views,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

/**
 * Transform TeamMember model to locale-specific format
 */
export function localizeTeamMember(member: any, locale: Locale) {
  const suffix = capitalize(locale);

  return {
    id: member.id,
    name: member[`name${suffix}`],
    role: member[`role${suffix}`],
    bio: member[`bio${suffix}`],
    image: member.image,
    team: member.team,
    order: member.order,
    skills: member[`skills${suffix}`],
    social: member.social,
    isActive: member.isActive,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
  };
}

/**
 * Transform Testimonial model to locale-specific format
 */
export function localizeTestimonial(testimonial: any, locale: Locale) {
  const suffix = capitalize(locale);

  return {
    id: testimonial.id,
    quote: testimonial[`quote${suffix}`],
    author: testimonial[`author${suffix}`],
    role: testimonial[`role${suffix}`],
    company: testimonial[`company${suffix}`],
    image: testimonial.image,
    order: testimonial.order,
    isActive: testimonial.isActive,
    createdAt: testimonial.createdAt,
    updatedAt: testimonial.updatedAt,
  };
}

/**
 * Transform ClientLogo model to locale-specific format
 */
export function localizeClientLogo(logo: any, locale: Locale) {
  const suffix = capitalize(locale);

  return {
    id: logo.id,
    name: logo[`name${suffix}`],
    logo: logo.logo,
    website: logo.website,
    order: logo.order,
    isActive: logo.isActive,
    createdAt: logo.createdAt,
  };
}

/**
 * Transform HomePageContent model to locale-specific format
 * This is a large transformation with 150+ fields
 */
export function localizeHomePageContent(content: any, locale: Locale) {
  const suffix = capitalize(locale);

  return {
    id: content.id,

    // Hero Section
    heroBadge: content[`heroBadge${suffix}`],
    heroHeading: content[`heroHeading${suffix}`],
    heroSlogan: content[`heroSlogan${suffix}`],
    heroSubtitle1: content[`heroSubtitle1${suffix}`],
    heroSubtitle2: content[`heroSubtitle2${suffix}`],
    heroStats: content[`heroStats${suffix}`],

    // About Section
    aboutBadge: content[`aboutBadge${suffix}`],
    aboutHeading: content[`aboutHeading${suffix}`],
    aboutImage: content.aboutImage, // Not localized
    aboutParagraph1: content[`aboutParagraph1${suffix}`],
    aboutParagraph2: content[`aboutParagraph2${suffix}`],
    aboutParagraph3: content[`aboutParagraph3${suffix}`],
    aboutParagraph4: content[`aboutParagraph4${suffix}`],
    aboutParagraph5: content[`aboutParagraph5${suffix}`],
    aboutHighlights: content[`aboutHighlights${suffix}`],
    aboutYearsText: content[`aboutYearsText${suffix}`],
    aboutYearsLabel: content[`aboutYearsLabel${suffix}`],

    // Team Section
    teamSubtitle: content[`teamSubtitle${suffix}`],
    teamTitle: content[`teamTitle${suffix}`],
    teamDescription: content[`teamDescription${suffix}`],
    teamTab1Label: content[`teamTab1Label${suffix}`],
    teamTab2Label: content[`teamTab2Label${suffix}`],
    teamTab3Label: content[`teamTab3Label${suffix}`],

    // Clients Section
    clientsSubtitle: content[`clientsSubtitle${suffix}`],
    clientsTitle: content[`clientsTitle${suffix}`],
    clientsDescription: content[`clientsDescription${suffix}`],
    clientsWhatTheySay: content[`clientsWhatTheySay${suffix}`],

    // CTA Section
    ctaBadge: content[`ctaBadge${suffix}`],
    ctaHeading: content[`ctaHeading${suffix}`],
    ctaSubtitle: content[`ctaSubtitle${suffix}`],

    // About Page
    aboutPageHeroBadge: content[`aboutPageHeroBadge${suffix}`],
    aboutPageHeroHeading: content[`aboutPageHeroHeading${suffix}`],

    // About Page Values
    aboutValuesSubtitle: content[`aboutValuesSubtitle${suffix}`],
    aboutValuesTitle: content[`aboutValuesTitle${suffix}`],
    aboutValuesDescription: content[`aboutValuesDescription${suffix}`],
    aboutValues: content[`aboutValues${suffix}`],

    // About Page Milestones
    aboutMilestonesSubtitle: content[`aboutMilestonesSubtitle${suffix}`],
    aboutMilestonesTitle: content[`aboutMilestonesTitle${suffix}`],
    aboutMilestonesDescription: content[`aboutMilestonesDescription${suffix}`],
    aboutMilestones: content[`aboutMilestones${suffix}`],

    // About Page Team
    aboutTeamSubtitle: content[`aboutTeamSubtitle${suffix}`],
    aboutTeamTitle: content[`aboutTeamTitle${suffix}`],
    aboutTeamDescription: content[`aboutTeamDescription${suffix}`],

    // About Page CTA
    aboutCtaHeading: content[`aboutCtaHeading${suffix}`],
    aboutCtaSubtitle: content[`aboutCtaSubtitle${suffix}`],

    createdAt: content.createdAt,
    updatedAt: content.updatedAt,
  };
}

/**
 * Map incoming form data to localized database fields
 * Used when updating records from admin panel
 */
export function mapToLocalizedFields(
  data: Record<string, any>,
  locale: Locale,
  fields: string[]
): Record<string, any> {
  const suffix = capitalize(locale);
  const result: Record<string, any> = {};

  for (const field of fields) {
    if (field in data) {
      result[`${field}${suffix}`] = data[field];
    }
  }

  return result;
}
