/**
 * Seeds the content calendar with realistic demo data:
 * content plans, scheduled items across every status, approval/rejection threads
 * with notes, and media assets linked to both projects and content items.
 *
 *   npm run db:seed:content          # idempotent — safe to re-run
 *   npm run db:seed:content:reset    # wipe the seeded months first (dev only)
 *
 * Self-healing: it does not assume `npm run db:seed` has run. Any missing demo
 * user, project, folder or file is created first, because without client-owned
 * ProjectFiles the portal asset picker has nothing to show.
 *
 * Determinism: every id is derived from a stable key and every choice is derived
 * from an index. There is no Math.random() anywhere — re-running must converge on
 * the same rows, not accumulate new ones.
 */
import {
  ContentApprovalAction,
  ContentFormat,
  ContentPlatform,
  ContentStatus,
  PlanItemStatus,
  PrismaClient,
  ProjectCategory,
  ProjectStatus,
  Role,
} from "@prisma/client";
import { hashSeedPw } from "../prisma/seed-utils";

const db = new PrismaClient();

const RESET = process.argv.includes("--reset");

// ==================== KEYS ====================
// Deterministic synthetic ids, extending the `${project.id}-milestone-${order}`
// convention already used by prisma/seed.ts.
const planKey = (clientId: string, year: number, month: number) =>
  `seedplan-${clientId}-${year}-${String(month).padStart(2, "0")}`;
const itemKey = (planId: string, n: number) =>
  `${planId}-item-${String(n).padStart(2, "0")}`;
const apprKey = (itemId: string, n: number) => `${itemId}-appr-${n}`;
const cmtKey = (itemId: string, n: number) => `${itemId}-cmt-${n}`;
const delivKey = (planId: string, n: number) => `${planId}-deliv-${n}`;
const keyDateKey = (planId: string, n: number) => `${planId}-keydate-${n}`;
const weekKey = (planId: string, w: number) => `${planId}-week-${w}`;
const wItemKey = (weekId: string, n: number) => `${weekId}-item-${n}`;
const actionKey = (planId: string, n: number) => `${planId}-action-${n}`;
const assetKey = (itemId: string, n: number) => `${itemId}-asset-${n}`;
const fileKey = (projectId: string, n: number) =>
  `${projectId}-seedfile-${String(n).padStart(2, "0")}`;
const folderKey = (projectId: string, slug: string) => `${projectId}-folder-${slug}`;

// ==================== TIME ====================
const now = new Date();

/** First instant of the month `offset` months from the current one, in UTC. */
const monthStart = (offset: number) =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));

const daysInMonth = (m: Date) =>
  new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 0)).getUTCDate();

/** A UTC instant inside month `m`, clamped to a day that actually exists. */
const at = (m: Date, day: number, hour: number, minute = 0) =>
  new Date(
    Date.UTC(
      m.getUTCFullYear(),
      m.getUTCMonth(),
      Math.min(day, daysInMonth(m)),
      hour,
      minute
    )
  );

const minusDays = (d: Date, days: number) =>
  new Date(d.getTime() - days * 24 * 60 * 60 * 1000);
const plusMinutes = (d: Date, mins: number) => new Date(d.getTime() + mins * 60_000);

const MONTHS = [monthStart(-1), monthStart(0), monthStart(1)];

// ==================== DEMO PEOPLE ====================
type PersonSpec = {
  username: string;
  name: string;
  email: string;
  role: Role;
  pw: { env: string; fallback: string };
  industry?: string;
  /// Agency staff only — shown on the Monthly Plan team strip.
  jobTitle?: string;
};

const PEOPLE: Record<string, PersonSpec> = {
  admin: {
    username: "admin",
    name: "Ahmed Hajuj",
    email: "admin@paxalamedia.com",
    role: Role.ADMIN,
    pw: { env: "SEED_ADMIN_PASSWORD", fallback: "ChangeMe!Admin2026" },
    jobTitle: "Creative Director",
  },
  karim: {
    username: "karim",
    name: "Karim Mohamed",
    email: "karim@paxalamedia.com",
    role: Role.STAFF,
    pw: { env: "SEED_STAFF_PASSWORD", fallback: "ChangeMe!Staff2026" },
    jobTitle: "Producer",
  },
  layla: {
    username: "layla",
    name: "Layla Saab",
    email: "layla@paxalamedia.com",
    role: Role.STAFF,
    pw: { env: "SEED_STAFF_PASSWORD", fallback: "ChangeMe!Staff2026" },
    jobTitle: "Ads Manager",
  },
  omar: {
    username: "omar",
    name: "Omar Khaled",
    email: "omar@paxalamedia.com",
    role: Role.STAFF,
    pw: { env: "SEED_STAFF_PASSWORD", fallback: "ChangeMe!Staff2026" },
    jobTitle: "Web & Development",
  },
  roma: {
    username: "roma",
    name: "Roma Restaurant",
    email: "roma@example.com",
    role: Role.CLIENT,
    pw: { env: "SEED_CLIENT_PASSWORD", fallback: "ChangeMe!Client2026" },
    industry: "Food & Beverage",
  },
  client: {
    username: "client",
    name: "Demo Client",
    email: "client@example.com",
    role: Role.CLIENT,
    pw: { env: "SEED_CLIENT_PASSWORD", fallback: "ChangeMe!Client2026" },
    industry: "Fashion & Retail",
  },
};

// ==================== DEMO PROJECTS ====================
type ProjectSpec = {
  slug: string;
  title: string;
  description: string;
  category: ProjectCategory;
  ownerKey: "roma" | "client";
};

const PROJECTS: Record<"roma" | "fashionhub", ProjectSpec> = {
  roma: {
    slug: "roma-restaurant-brand-360",
    title: "Roma Restaurant - Brand 360",
    description:
      "Full brand retainer: monthly video production, food photography and social content for Roma Restaurant, Riyadh.",
    category: ProjectCategory.VIDEO_PRODUCTION,
    ownerKey: "roma",
  },
  fashionhub: {
    slug: "fashion-hub-ecommerce",
    title: "Fashion Hub - E-commerce Launch",
    description:
      "Campaign production and paid social for the Fashion Hub FW26 launch across Egypt.",
    category: ProjectCategory.SOCIAL_MEDIA,
    ownerKey: "client",
  },
};

// ==================== DEMO ASSETS ====================
// Remote hosts are allowlisted in next.config.ts (images.unsplash.com,
// commondatastorage.googleapis.com).
const VIDEO_1 =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
const VIDEO_2 =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4";
const IMG = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

type FileSpec = {
  name: string;
  url: string;
  type: "video" | "image" | "document";
  category: string;
  folder: string;
  thumbnail: string;
  sizeMb: number;
  duration?: string;
  resolution: string;
  version: string;
};

const FILES: Record<"roma" | "fashionhub", FileSpec[]> = {
  roma: [
    {
      name: "roma-brand-film-v3-final.mp4",
      url: VIDEO_1,
      type: "video",
      category: "Video",
      folder: "video",
      thumbnail: IMG("photo-1517248135467-4c7edcad34c4"),
      sizeMb: 842,
      duration: "2:14",
      resolution: "4K MP4",
      version: "V3 Final",
    },
    {
      name: "roma-autumn-menu-teaser.mp4",
      url: VIDEO_2,
      type: "video",
      category: "Video",
      folder: "video",
      thumbnail: IMG("photo-1414235077428-338989a2e8c0"),
      sizeMb: 318,
      duration: "0:28",
      resolution: "1080x1920 MP4",
      version: "V2 Final",
    },
    {
      name: "roma-interior-hero.jpg",
      url: IMG("photo-1552566626-52f8b828add9"),
      type: "image",
      category: "Photography",
      folder: "photography",
      thumbnail: IMG("photo-1552566626-52f8b828add9"),
      sizeMb: 12.4,
      resolution: "6000x4000 JPG",
      version: "V1 Final",
    },
    {
      name: "roma-tagliatelle-closeup.jpg",
      url: IMG("photo-1621996346565-e3dbc353d2e5"),
      type: "image",
      category: "Photography",
      folder: "photography",
      thumbnail: IMG("photo-1621996346565-e3dbc353d2e5"),
      sizeMb: 9.8,
      resolution: "6000x4000 JPG",
      version: "V1 Final",
    },
    {
      name: "roma-chef-portrait.jpg",
      url: IMG("photo-1577219491135-ce391730fb2c"),
      type: "image",
      category: "Photography",
      folder: "photography",
      thumbnail: IMG("photo-1577219491135-ce391730fb2c"),
      sizeMb: 8.1,
      resolution: "4000x6000 JPG",
      version: "V1 Final",
    },
    {
      name: "roma-story-template-01.jpg",
      url: IMG("photo-1414235077428-338989a2e8c0"),
      type: "image",
      category: "Design",
      folder: "campaigns",
      thumbnail: IMG("photo-1414235077428-338989a2e8c0"),
      sizeMb: 3.2,
      resolution: "1080x1920 JPG",
      version: "V2 Final",
    },
    {
      name: "roma-menu-carousel-01.jpg",
      url: IMG("photo-1476224203421-9ac39bcb3327"),
      type: "image",
      category: "Design",
      folder: "campaigns",
      thumbnail: IMG("photo-1476224203421-9ac39bcb3327"),
      sizeMb: 4.6,
      resolution: "1080x1350 JPG",
      version: "V1 Final",
    },
    {
      name: "roma-brand-guidelines.jpg",
      url: IMG("photo-1626785774573-4b799315345d"),
      type: "document",
      category: "Brand Files",
      folder: "campaigns",
      thumbnail: IMG("photo-1626785774573-4b799315345d"),
      sizeMb: 22.7,
      resolution: "A4 PDF",
      version: "V4 Final",
    },
  ],
  fashionhub: [
    {
      name: "fh-white-friday-hero.mp4",
      url: VIDEO_1,
      type: "video",
      category: "Video",
      folder: "video",
      thumbnail: IMG("photo-1483985988355-763728e1935b"),
      sizeMb: 1240,
      duration: "1:05",
      resolution: "4K MP4",
      version: "V2 Final",
    },
    {
      name: "fh-behind-the-scenes-reel.mp4",
      url: VIDEO_2,
      type: "video",
      category: "Video",
      folder: "video",
      thumbnail: IMG("photo-1441986300917-64674bd600d8"),
      sizeMb: 486,
      duration: "0:42",
      resolution: "1080x1920 MP4",
      version: "V1 Final",
    },
    {
      name: "fh-lookbook-fw26-cover.jpg",
      url: IMG("photo-1445205170230-053b83016050"),
      type: "image",
      category: "Photography",
      folder: "photography",
      thumbnail: IMG("photo-1445205170230-053b83016050"),
      sizeMb: 14.2,
      resolution: "5000x7000 JPG",
      version: "V1 Final",
    },
    {
      name: "fh-product-jacket-01.jpg",
      url: IMG("photo-1551028719-00167b16eac5"),
      type: "image",
      category: "Photography",
      folder: "photography",
      thumbnail: IMG("photo-1551028719-00167b16eac5"),
      sizeMb: 7.3,
      resolution: "4000x5000 JPG",
      version: "V1 Final",
    },
    {
      name: "fh-product-jacket-02.jpg",
      url: IMG("photo-1591047139829-d91aecb6caea"),
      type: "image",
      category: "Photography",
      folder: "photography",
      thumbnail: IMG("photo-1591047139829-d91aecb6caea"),
      sizeMb: 7.1,
      resolution: "4000x5000 JPG",
      version: "V1 Final",
    },
    {
      name: "fh-campaign-billboard.jpg",
      url: IMG("photo-1490481651871-ab68de25d43d"),
      type: "image",
      category: "Design",
      folder: "campaigns",
      thumbnail: IMG("photo-1490481651871-ab68de25d43d"),
      sizeMb: 31.5,
      resolution: "6000x3000 JPG",
      version: "V3 Final",
    },
    {
      name: "fh-white-friday-carousel-01.jpg",
      url: IMG("photo-1489987707025-afc232f7ea0f"),
      type: "image",
      category: "Design",
      folder: "campaigns",
      thumbnail: IMG("photo-1489987707025-afc232f7ea0f"),
      sizeMb: 5.4,
      resolution: "1080x1350 JPG",
      version: "V2 Final",
    },
    {
      name: "fh-size-guide.jpg",
      url: IMG("photo-1523381210434-271e8be1f52b"),
      type: "document",
      category: "Documents",
      folder: "campaigns",
      thumbnail: IMG("photo-1523381210434-271e8be1f52b"),
      sizeMb: 1.8,
      resolution: "A4 PDF",
      version: "V1 Final",
    },
  ],
};

const FOLDERS = [
  { key: "campaigns", name: "Campaigns", color: "red" },
  { key: "video", name: "Video Masters", color: "purple" },
  { key: "photography", name: "Photography", color: "amber" },
];

// ==================== CAPTIONS ====================
// Egyptian/Gulf casual Arabic for Roma's social voice; MSA for Fashion Hub's
// retail announcements. English second line for the agency's own review.
const CAPTIONS: Record<"roma" | "fashionhub", string[]> = {
  roma: [
    "ليالي روما 🍝 مساء مليان نكهة في قلب الرياض.\nRoman nights in the heart of Riyadh — the autumn menu is live.\n#روما_الرياض #Riyadh #FoodieSaudi",
    "الباستا اللي الكل بيسأل عنها 👨‍🍳 بتتعمل كل صباح بإيد الشيف.\nHand-rolled every morning. Tagliatelle al tartufo is back by demand.\n#روما_الرياض #PastaLovers",
    "من ورا الكواليس 🎬 شوف الشيف ماركو وهو بيحضّر طبق اليوم.\nBehind the pass with Chef Marco.\n#BehindTheScenes #روما_الرياض",
    "حجزك لنهاية الأسبوع مستني ✨ طاولات محدودة.\nWeekend tables are filling up — book early.\n#روما_الرياض #FineDining",
    "قائمة الخريف الجديدة وصلت 🍂 ستة أطباق جديدة كلياً.\nOur autumn menu has landed — six brand-new dishes.\n#AutumnMenu #روما_الرياض",
    "قهوة الصباح على الطريقة الإيطالية ☕️\nMornings, the Italian way. Espresso bar open from 7am.\n#روما_الرياض #CoffeeLovers",
  ],
  fashionhub: [
    "الجمعة البيضاء اقتربت ⚡ استعدوا لتخفيضات تصل إلى ٥٠٪.\nWhite Friday is coming — up to 50% off, online and in store.\n#الجمعة_البيضاء #FashionHub",
    "تشكيلة خريف وشتاء ٢٠٢٦ متوفرة الآن 🍂\nThe FW26 collection has landed.\n#FW26 #FashionHub #EgyptFashion",
    "من التصميم إلى الرف 🧵 جولة داخل ورشتنا.\nFrom sketch to shelf — inside our atelier.\n#BehindTheSeams #FashionHub",
    "الجاكيت الأكثر مبيعاً عاد بالمخزون 🧥 بمقاسات جديدة.\nOur best-selling jacket is back in stock, in extended sizes.\n#BackInStock #FashionHub",
    "شحن مجاني لجميع المحافظات هذا الأسبوع 📦\nFree nationwide shipping all week.\n#FashionHub #FreeShipping",
    "دليل المقاسات الجديد يسهّل عليك الاختيار 📏\nOur new size guide takes the guesswork out of ordering.\n#FashionHub #SizeGuide",
  ],
};

// ==================== APPROVAL ARCHETYPES ====================
type ApprovalStep = {
  action: ContentApprovalAction;
  /** "staff" | "client" | "admin" — resolved to a real user at write time. */
  reviewer: "staff" | "client" | "admin";
  notes: string | null;
  /** Days before the thread anchor (see anchorFor). */
  daysBefore: number;
  toStatus: ContentStatus;
};

type ArchetypeName =
  | "none"
  | "simple-approve"
  | "reject-fix-approve"
  | "pending"
  | "rejected"
  | "admin-override";

const ARCHETYPES: Record<ArchetypeName, ApprovalStep[]> = {
  none: [],

  "simple-approve": [
    {
      action: ContentApprovalAction.SUBMITTED,
      reviewer: "staff",
      notes: "First cut ready for your review.",
      daysBefore: 5,
      toStatus: ContentStatus.AWAITING_APPROVAL,
    },
    {
      action: ContentApprovalAction.APPROVED,
      reviewer: "client",
      notes: "تمام، الافتتاحية حلوة أوي 👌 / Looks great, love the opening shot.",
      daysBefore: 4,
      toStatus: ContentStatus.APPROVED,
    },
  ],

  // The believable revision loop: submitted, knocked back with a specific note,
  // fixed, resubmitted, approved.
  "reject-fix-approve": [
    {
      action: ContentApprovalAction.SUBMITTED,
      reviewer: "staff",
      notes: "Draft cut with the new colour pass.",
      daysBefore: 9,
      toStatus: ContentStatus.AWAITING_APPROVAL,
    },
    {
      action: ContentApprovalAction.REJECTED,
      reviewer: "client",
      notes:
        "الصورة التانية مش واضحة، ممكن نستبدلها؟ / The second image is blurry — can we swap it?",
      daysBefore: 8,
      toStatus: ContentStatus.REJECTED,
    },
    {
      action: ContentApprovalAction.SUBMITTED,
      reviewer: "staff",
      notes: "Re-uploaded with the corrected frame and a fresh colour pass.",
      daysBefore: 6,
      toStatus: ContentStatus.AWAITING_APPROVAL,
    },
    {
      action: ContentApprovalAction.APPROVED,
      reviewer: "client",
      notes: "تمام كده، ماشي 👍 / Perfect now, ship it.",
      daysBefore: 5,
      toStatus: ContentStatus.APPROVED,
    },
  ],

  pending: [
    {
      action: ContentApprovalAction.SUBMITTED,
      reviewer: "staff",
      notes: "Ready for your review whenever you get a moment.",
      daysBefore: 2,
      toStatus: ContentStatus.AWAITING_APPROVAL,
    },
  ],

  rejected: [
    {
      action: ContentApprovalAction.SUBMITTED,
      reviewer: "staff",
      notes: "Concept board for the campaign post.",
      daysBefore: 3,
      toStatus: ContentStatus.AWAITING_APPROVAL,
    },
    {
      action: ContentApprovalAction.REJECTED,
      reviewer: "client",
      notes:
        "النص طويل شوية والسعر غلط / Copy runs long and the price is wrong — please revise before we reschedule.",
      daysBefore: 2,
      toStatus: ContentStatus.REJECTED,
    },
  ],

  "admin-override": [
    {
      action: ContentApprovalAction.SUBMITTED,
      reviewer: "staff",
      notes: "Final master, ready to go out.",
      daysBefore: 4,
      toStatus: ContentStatus.AWAITING_APPROVAL,
    },
    {
      action: ContentApprovalAction.APPROVED,
      reviewer: "admin",
      notes: "Approved on behalf of the client after today's call.",
      daysBefore: 3,
      toStatus: ContentStatus.APPROVED,
    },
  ],
};

// ==================== FEEDBACK THREADS ====================
// Review conversation, separate from the approval verdicts. Pinned comments carry
// a timecode so the approvals page renders numbered markers on the video.
type CommentSpec = {
  author: "staff" | "client" | "admin";
  body: string;
  /** Seconds into the first attached video. Omit for a general comment. */
  at?: number;
  daysBefore: number;
  resolved?: boolean;
};

const COMMENT_THREADS: Record<string, CommentSpec[]> = {
  // Keyed by item title so specs stay readable.
  "Brand Film — Chapter 2": [
    {
      author: "staff",
      body: "Updated the opening transition and regraded the first 10 seconds.",
      at: 12,
      daysBefore: 2,
    },
    {
      author: "client",
      body: "ممكن نثبّت اللقطة القريبة للمنتج ثانية زيادة؟ / Please hold the product close-up for one more second.",
      at: 31,
      daysBefore: 1,
    },
    {
      author: "staff",
      body: "Revision included in the next cut.",
      at: 38,
      daysBefore: 1,
      resolved: true,
    },
  ],
  "White Friday Hero Cutdown": [
    {
      author: "client",
      body: "الشعار صغير شوية في البداية / The logo reads a bit small in the opening frame.",
      at: 3,
      daysBefore: 1,
    },
    {
      author: "staff",
      body: "Scaling it up 15% and pushing the reveal half a second later.",
      daysBefore: 1,
    },
  ],
  "Weekend Table Reminder": [
    {
      author: "client",
      body: "نضيف رقم الحجز في آخر ستوري / Let's add the reservation number on the last story.",
      daysBefore: 1,
    },
  ],
  "Menu Carousel — Six New Dishes": [
    {
      author: "staff",
      body: "Slide order follows the printed menu. Shout if you want it resequenced.",
      daysBefore: 3,
    },
    {
      author: "client",
      body: "تمام كده / Order works for us.",
      daysBefore: 2,
      resolved: true,
    },
  ],
  "Billboard Adaptation — Cairo Ring Road": [
    {
      author: "client",
      body: "السعر مكتوب غلط، لازم يكون ٤٩٩ / The price is wrong — it should read 499.",
      daysBefore: 2,
    },
  ],
  "Anniversary Dinner Announcement": [
    {
      author: "staff",
      body: "Draft copy attached — the date is still provisional.",
      daysBefore: 1,
    },
  ],
};

/** Review deadlines, in days before the publish date, by status. */
const REVIEW_LEAD_DAYS = 3;

// ==================== ITEM SPECS ====================
type ClientKey = "roma" | "fashionhub";

type ItemSpec = {
  client: ClientKey;
  /** 0 = previous month, 1 = current, 2 = next. */
  monthIndex: number;
  day: number;
  slot: 0 | 1 | 2;
  title: string;
  caption: number;
  platform: ContentPlatform;
  format: ContentFormat;
  status: ContentStatus;
  archetype: ArchetypeName;
  /** Set false on a couple of items to exercise the nullable project path. */
  linkProject?: boolean;
};

/** Three meaningful posting times per day, so ordering within a day means something. */
const SLOT_HOURS: [number, number][] = [
  [10, 0],
  [14, 30],
  [19, 0],
];

const P = ContentPlatform;
const F = ContentFormat;
const S = ContentStatus;

const ITEMS: ItemSpec[] = [
  // ---------- PREVIOUS MONTH (8): a finished, published month ----------
  { client: "roma", monthIndex: 0, day: 3, slot: 2, title: "Autumn Menu Launch Film", caption: 4, platform: P.INSTAGRAM, format: F.REEL, status: S.PUBLISHED, archetype: "simple-approve" },
  { client: "roma", monthIndex: 0, day: 7, slot: 0, title: "Espresso Bar Morning Story", caption: 5, platform: P.INSTAGRAM, format: F.STORIES, status: S.PUBLISHED, archetype: "simple-approve" },
  { client: "roma", monthIndex: 0, day: 12, slot: 1, title: "Tagliatelle al Tartufo Close-up", caption: 1, platform: P.INSTAGRAM, format: F.POST, status: S.PUBLISHED, archetype: "reject-fix-approve" },
  { client: "roma", monthIndex: 0, day: 18, slot: 2, title: "Chef Marco — Behind the Pass", caption: 2, platform: P.TIKTOK, format: F.REEL, status: S.PUBLISHED, archetype: "admin-override" },
  { client: "fashionhub", monthIndex: 0, day: 9, slot: 1, title: "FW26 Lookbook Reveal", caption: 1, platform: P.FACEBOOK, format: F.CAROUSEL, status: S.PUBLISHED, archetype: "simple-approve" },
  { client: "fashionhub", monthIndex: 0, day: 21, slot: 2, title: "Atelier Walkthrough", caption: 2, platform: P.YOUTUBE, format: F.VIDEO, status: S.PUBLISHED, archetype: "reject-fix-approve" },
  { client: "fashionhub", monthIndex: 0, day: 25, slot: 0, title: "Free Shipping Week — Paid Push", caption: 4, platform: P.PAID_ADS, format: F.PAID_CAMPAIGN, status: S.APPROVED, archetype: "simple-approve" },
  { client: "roma", monthIndex: 0, day: 27, slot: 1, title: "Weekend Booking Reminder", caption: 3, platform: P.INSTAGRAM, format: F.STORIES, status: S.REJECTED, archetype: "rejected" },

  // ---------- CURRENT MONTH (15): the live working month ----------
  { client: "roma", monthIndex: 1, day: 2, slot: 2, title: "Roman Nights Teaser", caption: 0, platform: P.INSTAGRAM, format: F.REEL, status: S.PUBLISHED, archetype: "simple-approve" },
  { client: "roma", monthIndex: 1, day: 5, slot: 0, title: "Morning Espresso Ritual", caption: 5, platform: P.INSTAGRAM, format: F.STORIES, status: S.PUBLISHED, archetype: "simple-approve" },
  { client: "fashionhub", monthIndex: 1, day: 6, slot: 1, title: "Best-seller Restock Announcement", caption: 3, platform: P.FACEBOOK, format: F.POST, status: S.PUBLISHED, archetype: "reject-fix-approve" },

  { client: "roma", monthIndex: 1, day: 14, slot: 2, title: "New Collection Teaser — Dinner Service", caption: 4, platform: P.INSTAGRAM, format: F.REEL, status: S.SCHEDULED, archetype: "simple-approve" },
  { client: "fashionhub", monthIndex: 1, day: 16, slot: 1, title: "White Friday Countdown — Day 3", caption: 0, platform: P.PAID_ADS, format: F.PAID_CAMPAIGN, status: S.SCHEDULED, archetype: "admin-override" },

  { client: "roma", monthIndex: 1, day: 18, slot: 1, title: "Menu Carousel — Six New Dishes", caption: 4, platform: P.INSTAGRAM, format: F.CAROUSEL, status: S.APPROVED, archetype: "reject-fix-approve" },
  { client: "fashionhub", monthIndex: 1, day: 19, slot: 2, title: "Size Guide Explainer", caption: 5, platform: P.LINKEDIN, format: F.POST, status: S.APPROVED, archetype: "simple-approve" },

  { client: "roma", monthIndex: 1, day: 21, slot: 2, title: "Brand Film — Chapter 2", caption: 2, platform: P.YOUTUBE, format: F.VIDEO, status: S.AWAITING_APPROVAL, archetype: "pending" },
  { client: "roma", monthIndex: 1, day: 23, slot: 0, title: "Weekend Table Reminder", caption: 3, platform: P.INSTAGRAM, format: F.STORIES, status: S.AWAITING_APPROVAL, archetype: "pending" },
  { client: "fashionhub", monthIndex: 1, day: 24, slot: 1, title: "White Friday Hero Cutdown", caption: 0, platform: P.TIKTOK, format: F.REEL, status: S.AWAITING_APPROVAL, archetype: "pending" },

  { client: "fashionhub", monthIndex: 1, day: 26, slot: 1, title: "Billboard Adaptation — Cairo Ring Road", caption: 1, platform: P.PAID_ADS, format: F.PAID_CAMPAIGN, status: S.REJECTED, archetype: "rejected" },

  { client: "roma", monthIndex: 1, day: 27, slot: 1, title: "Pasta Masterclass Announcement", caption: 1, platform: P.INSTAGRAM, format: F.POST, status: S.IN_PROGRESS, archetype: "none" },
  { client: "fashionhub", monthIndex: 1, day: 28, slot: 2, title: "Creator Collab — Unboxing", caption: 2, platform: P.TIKTOK, format: F.REEL, status: S.IN_PROGRESS, archetype: "none" },

  // Two deliberately unlinked items, to exercise the nullable projectId path.
  { client: "roma", monthIndex: 1, day: 29, slot: 0, title: "Community Repost — Guest Photo", caption: 3, platform: P.INSTAGRAM, format: F.POST, status: S.DRAFT, archetype: "none", linkProject: false },
  { client: "fashionhub", monthIndex: 1, day: 30, slot: 1, title: "Newsletter Cross-post", caption: 4, platform: P.LINKEDIN, format: F.POST, status: S.DRAFT, archetype: "none", linkProject: false },

  // ---------- NEXT MONTH (7): the plan being drafted ----------
  { client: "roma", monthIndex: 2, day: 4, slot: 2, title: "Winter Menu Concept Film", caption: 4, platform: P.INSTAGRAM, format: F.REEL, status: S.DRAFT, archetype: "none" },
  { client: "roma", monthIndex: 2, day: 9, slot: 1, title: "Truffle Season Carousel", caption: 1, platform: P.INSTAGRAM, format: F.CAROUSEL, status: S.DRAFT, archetype: "none" },
  { client: "fashionhub", monthIndex: 2, day: 11, slot: 1, title: "Holiday Gifting Guide", caption: 3, platform: P.FACEBOOK, format: F.CAROUSEL, status: S.DRAFT, archetype: "none" },
  { client: "fashionhub", monthIndex: 2, day: 14, slot: 2, title: "Year-in-Review Brand Video", caption: 2, platform: P.YOUTUBE, format: F.VIDEO, status: S.DRAFT, archetype: "none" },
  { client: "roma", monthIndex: 2, day: 17, slot: 0, title: "Breakfast Menu Stories", caption: 5, platform: P.INSTAGRAM, format: F.STORIES, status: S.IN_PROGRESS, archetype: "none" },
  { client: "fashionhub", monthIndex: 2, day: 20, slot: 1, title: "New Arrivals Paid Burst", caption: 0, platform: P.PAID_ADS, format: F.PAID_CAMPAIGN, status: S.IN_PROGRESS, archetype: "none" },
  { client: "roma", monthIndex: 2, day: 23, slot: 2, title: "Anniversary Dinner Announcement", caption: 0, platform: P.INSTAGRAM, format: F.POST, status: S.AWAITING_APPROVAL, archetype: "pending" },
];


// ==================== MONTHLY PLAN ====================
// The Monthly Plan is the same row as the ContentPlan — objective, deliverables,
// key dates, timeline, client actions and team hang off it.
type StaffKey = "admin" | "karim" | "layla" | "omar";

type PlanSpec = {
  subtitle: string;
  objective: string;
  tags: string[];
  packageId: "package-01" | "package-02" | "package-03";
  isPublished: boolean;
  deliverables: {
    label: string;
    icon: string;
    target: number;
    formats: ContentFormat[];
    manualDone?: number;
  }[];
  keyDates: { day: number; title: string }[];
  weeks: { title: string; items: { title: string; status: PlanItemStatus }[] }[];
  actions: { day: number; title: string; status: PlanItemStatus }[];
  team: { key: StaffKey; role: string }[];
};

const PS = PlanItemStatus;

/** The agency lineup is the same four people on every plan. */
const CREW: { key: StaffKey; role: string }[] = [
  { key: "admin", role: "Creative Director" },
  { key: "karim", role: "Producer" },
  { key: "layla", role: "Ads Manager" },
  { key: "omar", role: "Web & Development" },
];

/**
 * Deliverable targets are set against content the seed actually creates, so the
 * counters and the content calendar always agree. That is the invariant worth
 * protecting — not matching any particular headline percentage.
 */
const PLANS: Record<string, PlanSpec> = {
  // ---------- Roma, previous month: finished and published ----------
  "roma:0": {
    subtitle: "Creative & Marketing Roadmap",
    objective:
      "Launch the autumn menu with a hero film and a steady social cadence, and turn the seasonal buzz into weekend reservations.",
    tags: ["Brand Awareness", "Product Launch", "Seasonal"],
    packageId: "package-02",
    isPublished: true,
    deliverables: [
      { label: "Video Production", icon: "Video", target: 2, formats: [F.REEL, F.VIDEO] },
      { label: "Photography", icon: "Camera", target: 2, formats: [], manualDone: 2 },
      { label: "Social Content", icon: "Share2", target: 3, formats: [F.POST, F.CAROUSEL, F.STORIES] },
      { label: "Paid Campaigns", icon: "Megaphone", target: 1, formats: [F.PAID_CAMPAIGN], manualDone: 1 },
    ],
    keyDates: [
      { day: 4, title: "Campaign Brief" },
      { day: 11, title: "Menu Shoot" },
      { day: 17, title: "First Review" },
      { day: 25, title: "Campaign Launch" },
    ],
    weeks: [
      { title: "Strategy & Pre-production", items: [
        { title: "Creative brief approved", status: PS.COMPLETED },
        { title: "Shot list & moodboard", status: PS.COMPLETED },
        { title: "Location and talent booked", status: PS.COMPLETED } ] },
      { title: "Production", items: [
        { title: "Autumn menu food shoot", status: PS.COMPLETED },
        { title: "Chef interview b-roll", status: PS.COMPLETED },
        { title: "Drone exterior pass", status: PS.COMPLETED } ] },
      { title: "Post-production & Review", items: [
        { title: "Hero film first cut", status: PS.COMPLETED },
        { title: "Colour grade & sound mix", status: PS.COMPLETED },
        { title: "Client review round 1", status: PS.COMPLETED } ] },
      { title: "Launch & Amplification", items: [
        { title: "Publish hero film", status: PS.COMPLETED },
        { title: "Meta campaign live", status: PS.COMPLETED },
        { title: "End-of-month performance report", status: PS.COMPLETED } ] },
    ],
    actions: [
      { day: 6, title: "Approve autumn menu concept", status: PS.COMPLETED },
      { day: 20, title: "Confirm launch date", status: PS.COMPLETED },
    ],
    team: CREW,
  },

  // ---------- Roma, current month: the live working month ----------
  "roma:1": {
    subtitle: "Creative & Marketing Roadmap",
    objective:
      "Grow weekend covers by putting the autumn menu in front of Riyadh diners: one hero film, a photography refresh and a steady social cadence, supported by a targeted Meta push in the second half of the month.",
    tags: ["Brand Awareness", "Product Launch", "Lead Generation"],
    packageId: "package-02",
    isPublished: true,
    deliverables: [
      // auto: REEL + VIDEO delivered
      { label: "Video Production", icon: "Video", target: 3, formats: [F.REEL, F.VIDEO] },
      // manual: a photography session is not a ContentItem — exercises manualDone
      { label: "Photography", icon: "Camera", target: 2, formats: [], manualDone: 1 },
      { label: "Social Content", icon: "Share2", target: 5, formats: [F.POST, F.CAROUSEL, F.STORIES] },
      // auto and currently zero — exercises the empty counter
      { label: "Paid Campaigns", icon: "Megaphone", target: 1, formats: [F.PAID_CAMPAIGN] },
    ],
    keyDates: [
      { day: 5, title: "Campaign Brief" },
      { day: 12, title: "Product Shoot" },
      { day: 18, title: "First Review" },
      { day: 24, title: "Campaign Launch" },
    ],
    weeks: [
      { title: "Strategy & Pre-production", items: [
        { title: "Creative brief approved", status: PS.COMPLETED },
        { title: "Shot list & moodboard", status: PS.COMPLETED },
        { title: "Location and talent booked", status: PS.COMPLETED } ] },
      { title: "Production", items: [
        { title: "Autumn menu food shoot", status: PS.COMPLETED },
        { title: "Chef interview b-roll", status: PS.COMPLETED },
        { title: "Drone exterior pass", status: PS.COMPLETED } ] },
      { title: "Post-production & Review", items: [
        { title: "Hero film first cut", status: PS.COMPLETED },
        { title: "Colour grade & sound mix", status: PS.IN_PROGRESS },
        { title: "Client review round 1", status: PS.AWAITING_CLIENT } ] },
      { title: "Launch & Amplification", items: [
        { title: "Publish hero film", status: PS.IN_PROGRESS },
        { title: "Meta campaign live", status: PS.SCHEDULED },
        { title: "End-of-month performance report", status: PS.SCHEDULED } ] },
    ],
    actions: [
      { day: 8, title: "Approve campaign concept", status: PS.AWAITING_CLIENT },
      { day: 10, title: "Upload product price list", status: PS.SCHEDULED },
    ],
    team: CREW,
  },

  // ---------- Roma, next month: still being prepared ----------
  "roma:2": {
    subtitle: "Creative & Marketing Roadmap",
    objective:
      "Carry the autumn momentum into the winter menu: a concept film, a truffle-season carousel and the groundwork for the anniversary dinner.",
    tags: ["Brand Awareness", "Retention"],
    packageId: "package-02",
    isPublished: false,
    deliverables: [
      { label: "Video Production", icon: "Video", target: 2, formats: [F.REEL, F.VIDEO] },
      { label: "Photography", icon: "Camera", target: 1, formats: [], manualDone: 0 },
      { label: "Social Content", icon: "Share2", target: 4, formats: [F.POST, F.CAROUSEL, F.STORIES] },
      { label: "Paid Campaigns", icon: "Megaphone", target: 1, formats: [F.PAID_CAMPAIGN] },
    ],
    keyDates: [
      { day: 3, title: "Winter Menu Brief" },
      { day: 10, title: "Concept Review" },
      { day: 19, title: "Production Day" },
      { day: 26, title: "Anniversary Dinner" },
    ],
    weeks: [
      { title: "Planning", items: [
        { title: "Winter menu briefing", status: PS.SCHEDULED },
        { title: "Concept development", status: PS.SCHEDULED },
        { title: "Budget sign-off", status: PS.SCHEDULED } ] },
      { title: "Pre-production", items: [
        { title: "Moodboard & references", status: PS.SCHEDULED },
        { title: "Crew and kit booking", status: PS.SCHEDULED },
        { title: "Menu tasting session", status: PS.SCHEDULED } ] },
      { title: "Production", items: [
        { title: "Winter menu film shoot", status: PS.SCHEDULED },
        { title: "Truffle season stills", status: PS.SCHEDULED },
        { title: "Anniversary teaser capture", status: PS.SCHEDULED } ] },
      { title: "Delivery", items: [
        { title: "Edit and grade", status: PS.SCHEDULED },
        { title: "Client review", status: PS.SCHEDULED },
        { title: "Publish and report", status: PS.SCHEDULED } ] },
    ],
    actions: [
      { day: 4, title: "Share winter menu pricing", status: PS.SCHEDULED },
      { day: 12, title: "Confirm anniversary guest list", status: PS.SCHEDULED },
    ],
    team: CREW,
  },

  // ---------- Fashion Hub ----------
  "fashionhub:0": {
    subtitle: "Campaign & Performance Roadmap",
    objective:
      "Introduce the FW26 collection to the Egyptian market and build the audience the White Friday push will retarget.",
    tags: ["Product Launch", "Audience Building"],
    packageId: "package-03",
    isPublished: true,
    deliverables: [
      { label: "Video Production", icon: "Video", target: 1, formats: [F.REEL, F.VIDEO] },
      { label: "Photography", icon: "Camera", target: 1, formats: [], manualDone: 1 },
      { label: "Social Content", icon: "Share2", target: 2, formats: [F.POST, F.CAROUSEL, F.STORIES] },
      { label: "Paid Campaigns", icon: "Megaphone", target: 1, formats: [F.PAID_CAMPAIGN] },
    ],
    keyDates: [
      { day: 6, title: "Lookbook Shoot" },
      { day: 14, title: "Collection Reveal" },
      { day: 22, title: "Performance Review" },
      { day: 28, title: "White Friday Kickoff" },
    ],
    weeks: [
      { title: "Concept", items: [
        { title: "FW26 creative direction", status: PS.COMPLETED },
        { title: "Model casting", status: PS.COMPLETED },
        { title: "Studio booking", status: PS.COMPLETED } ] },
      { title: "Shoot", items: [
        { title: "Lookbook photography", status: PS.COMPLETED },
        { title: "Atelier walkthrough film", status: PS.COMPLETED },
        { title: "Product cutouts", status: PS.COMPLETED } ] },
      { title: "Launch", items: [
        { title: "Collection reveal carousel", status: PS.COMPLETED },
        { title: "Paid burst live", status: PS.COMPLETED },
        { title: "Influencer seeding", status: PS.COMPLETED } ] },
      { title: "Review", items: [
        { title: "Performance report", status: PS.COMPLETED },
        { title: "White Friday planning", status: PS.COMPLETED },
        { title: "Creative retrospective", status: PS.COMPLETED } ] },
    ],
    actions: [
      { day: 5, title: "Approve FW26 creative direction", status: PS.COMPLETED },
      { day: 19, title: "Confirm White Friday budget", status: PS.COMPLETED },
    ],
    team: CREW,
  },

  "fashionhub:1": {
    subtitle: "Campaign & Performance Roadmap",
    objective:
      "Convert the FW26 audience during White Friday: a hero cutdown, a countdown sequence and a paid push tuned to the last 72 hours.",
    tags: ["Conversion", "Paid Media", "Seasonal"],
    packageId: "package-03",
    isPublished: true,
    deliverables: [
      { label: "Video Production", icon: "Video", target: 2, formats: [F.REEL, F.VIDEO] },
      { label: "Photography", icon: "Camera", target: 1, formats: [], manualDone: 1 },
      { label: "Social Content", icon: "Share2", target: 4, formats: [F.POST, F.CAROUSEL, F.STORIES] },
      { label: "Paid Campaigns", icon: "Megaphone", target: 2, formats: [F.PAID_CAMPAIGN] },
    ],
    keyDates: [
      { day: 7, title: "Campaign Brief" },
      { day: 15, title: "Creative Lock" },
      { day: 21, title: "Client Review" },
      { day: 27, title: "White Friday Live" },
    ],
    weeks: [
      { title: "Strategy", items: [
        { title: "Offer architecture agreed", status: PS.COMPLETED },
        { title: "Audience segments built", status: PS.COMPLETED },
        { title: "Creative brief signed off", status: PS.COMPLETED } ] },
      { title: "Production", items: [
        { title: "Hero cutdown edit", status: PS.COMPLETED },
        { title: "Countdown story set", status: PS.IN_PROGRESS },
        { title: "Billboard adaptation", status: PS.AWAITING_CLIENT } ] },
      { title: "Review & Approvals", items: [
        { title: "Creative review round 1", status: PS.IN_PROGRESS },
        { title: "Legal and pricing check", status: PS.AWAITING_CLIENT },
        { title: "Final asset delivery", status: PS.SCHEDULED } ] },
      { title: "Launch", items: [
        { title: "Campaign go live", status: PS.SCHEDULED },
        { title: "Daily performance monitoring", status: PS.SCHEDULED },
        { title: "Post-campaign report", status: PS.SCHEDULED } ] },
    ],
    actions: [
      { day: 9, title: "Approve White Friday offer", status: PS.AWAITING_CLIENT },
      { day: 14, title: "Provide final pricing sheet", status: PS.AWAITING_CLIENT },
    ],
    team: CREW,
  },

  "fashionhub:2": {
    subtitle: "Campaign & Performance Roadmap",
    objective:
      "Hold the post-campaign audience with a gifting guide and a year-in-review film, and prepare the spring drop.",
    tags: ["Retention", "Brand Awareness"],
    packageId: "package-03",
    isPublished: false,
    deliverables: [
      { label: "Video Production", icon: "Video", target: 1, formats: [F.REEL, F.VIDEO] },
      { label: "Photography", icon: "Camera", target: 1, formats: [], manualDone: 0 },
      { label: "Social Content", icon: "Share2", target: 3, formats: [F.POST, F.CAROUSEL, F.STORIES] },
      { label: "Paid Campaigns", icon: "Megaphone", target: 1, formats: [F.PAID_CAMPAIGN] },
    ],
    keyDates: [
      { day: 5, title: "Gifting Guide Brief" },
      { day: 13, title: "Year-in-Review Edit" },
      { day: 20, title: "Spring Drop Planning" },
      { day: 27, title: "Quarterly Review" },
    ],
    weeks: [
      { title: "Planning", items: [
        { title: "Gifting guide concept", status: PS.SCHEDULED },
        { title: "Product selection", status: PS.SCHEDULED },
        { title: "Channel plan", status: PS.SCHEDULED } ] },
      { title: "Production", items: [
        { title: "Gifting guide stills", status: PS.SCHEDULED },
        { title: "Year-in-review edit", status: PS.SCHEDULED },
        { title: "Spring teaser capture", status: PS.SCHEDULED } ] },
      { title: "Delivery", items: [
        { title: "Asset handover", status: PS.SCHEDULED },
        { title: "Client review", status: PS.SCHEDULED },
        { title: "Schedule and publish", status: PS.SCHEDULED } ] },
      { title: "Wrap-up", items: [
        { title: "Quarterly performance review", status: PS.SCHEDULED },
        { title: "Spring drop kickoff", status: PS.SCHEDULED },
        { title: "Retainer renewal check-in", status: PS.SCHEDULED } ] },
    ],
    actions: [
      { day: 6, title: "Share gifting product list", status: PS.SCHEDULED },
      { day: 18, title: "Approve spring drop direction", status: PS.SCHEDULED },
    ],
    team: CREW,
  },
};

// ==================== HELPERS ====================

/**
 * Thread timestamps hang off the earlier of the publish date and now, so that a
 * past item's review happened before it went out, and a future item's review
 * happened recently rather than in the future.
 */
const anchorFor = (scheduledAt: Date) =>
  scheduledAt.getTime() < now.getTime() ? scheduledAt : now;

type Timestamps = {
  approvedAt: Date | null;
  rejectedAt: Date | null;
  publishedAt: Date | null;
  clientNotes: string | null;
};

function deriveTimestamps(
  spec: ItemSpec,
  scheduledAt: Date,
  steps: ApprovalStep[]
): Timestamps {
  const anchor = anchorFor(scheduledAt);
  const stamp = (s: ApprovalStep) => minusDays(anchor, s.daysBefore);

  const lastApprove = [...steps].reverse().find((s) => s.action === ContentApprovalAction.APPROVED);
  const lastReject = [...steps].reverse().find((s) => s.action === ContentApprovalAction.REJECTED);
  const lastVerdict = [...steps].reverse().find((s) => s.action !== ContentApprovalAction.SUBMITTED);

  const out: Timestamps = {
    approvedAt: null,
    rejectedAt: null,
    publishedAt: null,
    // Mirrors the API: clientNotes holds the latest *verdict* note only.
    clientNotes: lastVerdict?.notes ?? null,
  };

  switch (spec.status) {
    case S.APPROVED:
    case S.SCHEDULED:
      out.approvedAt = lastApprove ? stamp(lastApprove) : minusDays(anchor, 4);
      break;
    case S.PUBLISHED:
      out.approvedAt = lastApprove ? stamp(lastApprove) : minusDays(anchor, 4);
      // Published a few minutes after the scheduled slot, as a scheduler would.
      out.publishedAt = plusMinutes(scheduledAt, 3);
      break;
    case S.REJECTED:
      out.rejectedAt = lastReject ? stamp(lastReject) : minusDays(anchor, 2);
      break;
    case S.AWAITING_APPROVAL:
    case S.DRAFT:
    case S.IN_PROGRESS:
      out.clientNotes = null; // nothing has been decided yet
      break;
  }

  return out;
}

/**
 * Fail loudly rather than seeding a state the app can never produce — e.g. a
 * PUBLISHED item that was never approved, or an approval dated after go-live.
 */
function assertConsistent(
  spec: ItemSpec,
  scheduledAt: Date,
  ts: Timestamps,
  steps: ApprovalStep[]
) {
  const label = `${spec.client} "${spec.title}"`;
  // Explicit annotation so TypeScript treats a fail() call as unreachable-after
  // and narrows the nullable timestamps below.
  const fail: (msg: string) => never = (msg) => {
    throw new Error(`Inconsistent seed item — ${label}: ${msg}`);
  };
  const last = steps[steps.length - 1];

  switch (spec.status) {
    case S.DRAFT:
    case S.IN_PROGRESS:
      if (steps.length) fail("unreviewed status must have no approval history");
      if (ts.approvedAt || ts.rejectedAt || ts.publishedAt)
        fail("unreviewed status must have no review timestamps");
      break;

    case S.AWAITING_APPROVAL:
      if (last?.action !== ContentApprovalAction.SUBMITTED)
        fail("awaiting approval must end on a SUBMITTED entry");
      if (ts.approvedAt || ts.rejectedAt || ts.publishedAt)
        fail("awaiting approval must have no verdict timestamps");
      break;

    case S.APPROVED:
      if (last?.action !== ContentApprovalAction.APPROVED)
        fail("approved must end on an APPROVED entry");
      if (!ts.approvedAt) fail("approved must have approvedAt");
      if (ts.approvedAt >= scheduledAt) fail("approvedAt must precede the publish date");
      if (ts.rejectedAt || ts.publishedAt) fail("approved must not carry other verdict stamps");
      break;

    case S.SCHEDULED:
      if (last?.action !== ContentApprovalAction.APPROVED)
        fail("scheduled must have been approved first");
      if (!ts.approvedAt) fail("scheduled must have approvedAt");
      if (scheduledAt.getTime() <= now.getTime())
        fail("scheduled must sit in the future");
      if (ts.publishedAt) fail("scheduled must not be published yet");
      break;

    case S.REJECTED:
      if (last?.action !== ContentApprovalAction.REJECTED)
        fail("rejected must end on a REJECTED entry");
      if (!ts.rejectedAt) fail("rejected must have rejectedAt");
      if (ts.approvedAt || ts.publishedAt) fail("rejected must not carry approval stamps");
      break;

    case S.PUBLISHED:
      if (last?.action !== ContentApprovalAction.APPROVED)
        fail("published must have been approved first");
      if (!ts.approvedAt || !ts.publishedAt) fail("published needs approvedAt and publishedAt");
      if (ts.approvedAt >= ts.publishedAt) fail("approvedAt must precede publishedAt");
      if (scheduledAt.getTime() >= now.getTime()) fail("published must sit in the past");
      break;
  }
}

/** Pick assets for an item: carousels get three, video formats one, else one or two. */
function pickAssets(
  spec: ItemSpec,
  index: number,
  files: { id: string; type: string }[]
): string[] {
  const videos = files.filter((f) => f.type === "video");
  const images = files.filter((f) => f.type !== "video");

  const take = (pool: typeof files, count: number) =>
    pool.length === 0
      ? []
      : Array.from({ length: Math.min(count, pool.length) }, (_, k) => pool[(index + k) % pool.length].id);

  switch (spec.format) {
    case F.CAROUSEL:
      return take(images, 3);
    case F.REEL:
    case F.VIDEO:
      return take(videos, 1);
    case F.PAID_CAMPAIGN:
      return take(images, 2);
    default:
      return take(images, index % 2 === 0 ? 2 : 1);
  }
}

// ==================== ENSURE PREREQUISITES ====================

async function ensureUser(spec: PersonSpec) {
  const password = await hashSeedPw(spec.pw.env, spec.pw.fallback);
  return db.user.upsert({
    where: { username: spec.username },
    // Never clobber an existing dev account's name/role/password — but DO backfill
    // jobTitle, or existing accounts would never gain one and the team strip
    // would render blank titles.
    update: { ...(spec.jobTitle && { jobTitle: spec.jobTitle }) },
    create: {
      username: spec.username,
      name: spec.name,
      email: spec.email,
      password,
      role: spec.role,
      ...(spec.industry && { industry: spec.industry }),
      ...(spec.jobTitle && { jobTitle: spec.jobTitle }),
    },
  });
}

async function ensureProject(spec: ProjectSpec, clientId: string) {
  return db.project.upsert({
    where: { slug: spec.slug },
    // clientId is forced: an orphaned project (clientId null) is invisible to the
    // portal, which is exactly the state the existing dev data is stuck in.
    update: { clientId },
    create: {
      title: spec.title,
      slug: spec.slug,
      description: spec.description,
      category: spec.category,
      status: ProjectStatus.IN_PROGRESS,
      clientId,
    },
  });
}

async function ensureFolders(projectId: string) {
  const out: Record<string, string> = {};
  for (const f of FOLDERS) {
    // Folder.slug is globally unique and scripts/seed-dam.js already owns the
    // generic names, so namespace ours by project.
    const slug = `${projectId}-${f.key}`;
    const folder = await db.folder.upsert({
      where: { slug },
      update: { name: f.name, color: f.color, projectId },
      create: {
        id: folderKey(projectId, f.key),
        name: f.name,
        slug,
        color: f.color,
        projectId,
        description: `${f.name} for this project.`,
      },
    });
    out[f.key] = folder.id;
  }
  return out;
}

async function ensureFiles(
  projectId: string,
  specs: FileSpec[],
  folders: Record<string, string>
) {
  const files: { id: string; type: string }[] = [];
  for (const [i, s] of specs.entries()) {
    const id = fileKey(projectId, i + 1);
    const data = {
      name: s.name,
      url: s.url,
      type: s.type,
      size: Math.round(s.sizeMb * 1024 * 1024),
      category: s.category,
      folder: FOLDERS.find((f) => f.key === s.folder)?.name ?? "General",
      folderId: folders[s.folder] ?? null,
      version: s.version,
      status: "Approved",
      duration: s.duration ?? null,
      thumbnail: s.thumbnail,
      uploader: "PMP Creative Team",
      resolution: s.resolution,
      usageRights: "Approved for web and social.",
      isShared: true,
      projectId,
    };
    const file = await db.projectFile.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    });
    files.push({ id: file.id, type: file.type });
  }
  return files;
}


/**
 * Write a plan's Monthly-Plan children. Upsert-then-prune on synthetic ids, so
 * re-running converges on the intended set instead of accumulating rows.
 */
async function seedPlanContent(
  planId: string,
  spec: PlanSpec,
  month: Date,
  users: Record<string, { id: string; name: string | null; role: Role }>
) {
  // ---- deliverables ----
  const keptDeliv: string[] = [];
  for (const [i, d] of spec.deliverables.entries()) {
    const id = delivKey(planId, i);
    const data = {
      label: d.label,
      icon: d.icon,
      target: d.target,
      formats: d.formats,
      manualDone: d.manualDone ?? null,
      order: i,
    };
    await db.planDeliverable.upsert({
      where: { id },
      update: data,
      create: { id, planId, ...data },
    });
    keptDeliv.push(id);
  }
  await db.planDeliverable.deleteMany({
    where: { planId, id: { notIn: keptDeliv } },
  });

  // ---- key dates ----
  const keptDates: string[] = [];
  for (const [i, k] of spec.keyDates.entries()) {
    const id = keyDateKey(planId, i);
    const data = { title: k.title, date: at(month, k.day, 0), note: null, order: i };
    await db.planKeyDate.upsert({
      where: { id },
      update: data,
      create: { id, planId, ...data },
    });
    keptDates.push(id);
  }
  await db.planKeyDate.deleteMany({ where: { planId, id: { notIn: keptDates } } });

  // ---- weeks and their checklist items ----
  const keptWeeks: string[] = [];
  for (const [w, week] of spec.weeks.entries()) {
    const id = weekKey(planId, w);
    const data = {
      title: week.title,
      order: w,
      startsOn: at(month, 1 + w * 7, 0),
      endsOn: at(month, 7 + w * 7, 23, 59),
    };
    await db.planWeek.upsert({
      where: { id },
      update: data,
      create: { id, planId, ...data },
    });
    keptWeeks.push(id);

    const keptItems: string[] = [];
    for (const [j, item] of week.items.entries()) {
      const itemId = wItemKey(id, j);
      const itemData = { title: item.title, status: item.status, order: j };
      await db.planWeekItem.upsert({
        where: { id: itemId },
        update: itemData,
        create: { id: itemId, weekId: id, ...itemData },
      });
      keptItems.push(itemId);
    }
    await db.planWeekItem.deleteMany({
      where: { weekId: id, id: { notIn: keptItems } },
    });
  }
  await db.planWeek.deleteMany({ where: { planId, id: { notIn: keptWeeks } } });

  // ---- client actions ----
  const keptActions: string[] = [];
  for (const [i, a] of spec.actions.entries()) {
    const id = actionKey(planId, i);
    const done = a.status === PlanItemStatus.COMPLETED;
    const data = {
      title: a.title,
      description: null,
      dueAt: at(month, a.day, 17),
      status: a.status,
      order: i,
      completedAt: done ? at(month, a.day, 12) : null,
      completedById: null,
    };
    await db.planAction.upsert({
      where: { id },
      update: data,
      create: { id, planId, ...data },
    });
    keptActions.push(id);
  }
  await db.planAction.deleteMany({
    where: { planId, id: { notIn: keptActions } },
  });

  // ---- team lineup ----
  // Keyed on the compound unique rather than a synthetic id: the user may
  // already be on the plan from the admin UI's project-staff default.
  const keptTeam: string[] = [];
  for (const [i, member] of spec.team.entries()) {
    const user = users[member.key];
    if (!user) continue;
    const row = await db.planTeamMember.upsert({
      where: { planId_userId: { planId, userId: user.id } },
      update: { roleLabel: member.role, order: i },
      create: { planId, userId: user.id, roleLabel: member.role, order: i },
    });
    keptTeam.push(row.id);
  }
  await db.planTeamMember.deleteMany({
    where: { planId, id: { notIn: keptTeam } },
  });
}

// ==================== MAIN ====================

async function main() {
  console.log("🌱 Seeding content calendar...\n");

  // ---------- people ----------
  console.log("👤 Ensuring demo users...");
  const users: Record<string, { id: string; name: string | null; role: Role }> = {};
  for (const [key, spec] of Object.entries(PEOPLE)) {
    const u = await ensureUser(spec);
    users[key] = { id: u.id, name: u.name, role: u.role };
    console.log(`   • ${spec.username} (${spec.role})`);
  }

  const reviewerFor = (kind: "staff" | "client" | "admin", clientKey: ClientKey) => {
    if (kind === "staff") return users.karim;
    if (kind === "admin") return users.admin;
    return clientKey === "roma" ? users.roma : users.client;
  };

  // ---------- projects, folders, files ----------
  console.log("\n📁 Ensuring demo projects and assets...");
  const projects: Record<ClientKey, { id: string; clientId: string }> = {} as never;
  const projectFiles: Record<ClientKey, { id: string; type: string }[]> = {} as never;

  for (const key of ["roma", "fashionhub"] as ClientKey[]) {
    const spec = PROJECTS[key];
    const owner = users[spec.ownerKey];
    const project = await ensureProject(spec, owner.id);
    const folders = await ensureFolders(project.id);
    const files = await ensureFiles(project.id, FILES[key], folders);
    projects[key] = { id: project.id, clientId: owner.id };
    projectFiles[key] = files;
    console.log(
      `   • ${spec.slug} — ${FOLDERS.length} folders, ${files.length} files`
    );
  }

  // ---------- plans ----------
  console.log("\n🗓️  Ensuring content plans...");
  const plans = new Map<string, string>(); // `${clientKey}:${monthIndex}` -> planId

  for (const clientKey of ["roma", "fashionhub"] as ClientKey[]) {
    const clientId = projects[clientKey].clientId;
    for (const [mi, m] of MONTHS.entries()) {
      const month = m.getUTCMonth() + 1;
      const year = m.getUTCFullYear();
      const label = m.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
      // Upsert on the compound unique, not the id: a plan may already exist for
      // this client/month from the API, and adopting it keeps item keys stable.
      const spec = PLANS[`${clientKey}:${mi}`];
      const scalars = {
        title: `${label} ${year} Content Plan`,
        ...(spec && {
          subtitle: spec.subtitle,
          objective: spec.objective,
          tags: spec.tags,
          packageId: spec.packageId,
          isPublished: spec.isPublished,
          publishedAt: spec.isPublished ? at(m, 1, 9) : null,
          // Deterministic so "Updated 01 Aug 2026" does not drift to whenever
          // the seed last ran.
          contentUpdatedAt: at(m, 1, 9),
        }),
      };
      const plan = await db.contentPlan.upsert({
        where: { clientId_month_year: { clientId, month, year } },
        update: scalars,
        create: {
          id: planKey(clientId, year, month),
          month,
          year,
          clientId,
          projectId: projects[clientKey].id,
          ...scalars,
        },
      });
      plans.set(`${clientKey}:${mi}`, plan.id);
      if (spec) await seedPlanContent(plan.id, spec, m, users);
      console.log(
        `   • ${clientKey} — ${label} ${year}${spec ? (spec.isPublished ? " (published)" : " (draft)") : ""}`
      );
    }
  }

  // ---------- optional reset ----------
  if (RESET) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Refusing to run --reset against NODE_ENV=production");
    }
    const planIds = [...plans.values()];
    await db.$transaction([
      db.planWeek.deleteMany({ where: { planId: { in: planIds } } }),
      db.planDeliverable.deleteMany({ where: { planId: { in: planIds } } }),
      db.planKeyDate.deleteMany({ where: { planId: { in: planIds } } }),
      db.planAction.deleteMany({ where: { planId: { in: planIds } } }),
      db.planTeamMember.deleteMany({ where: { planId: { in: planIds } } }),
    ]);
    const removed = await db.contentItem.deleteMany({
      where: { planId: { in: planIds } },
    });
    console.log(
      `\n♻️  --reset: removed ${removed.count} existing item(s) from the seeded plans`
    );
  }

  // ---------- items ----------
  console.log("\n📝 Seeding content items...");
  const perPlanCounter = new Map<string, number>();
  const statusTally: Record<string, number> = {};
  let assetLinks = 0;
  let approvalRows = 0;
  let commentRows = 0;

  for (const [index, spec] of ITEMS.entries()) {
    const planId = plans.get(`${spec.client}:${spec.monthIndex}`)!;
    const n = (perPlanCounter.get(planId) ?? 0) + 1;
    perPlanCounter.set(planId, n);

    const id = itemKey(planId, n);
    const [hour, minute] = SLOT_HOURS[spec.slot];
    const scheduledAt = at(MONTHS[spec.monthIndex], spec.day, hour, minute);

    const steps = ARCHETYPES[spec.archetype];
    const ts = deriveTimestamps(spec, scheduledAt, steps);
    assertConsistent(spec, scheduledAt, ts, steps);

    const linkProject = spec.linkProject !== false;
    const fileIds = pickAssets(spec, index, projectFiles[spec.client]);

    const data = {
      title: spec.title,
      caption: CAPTIONS[spec.client][spec.caption],
      platform: spec.platform,
      format: spec.format,
      status: spec.status,
      scheduledAt,
      // Reviews are due a few days before the post goes live, so the approvals
      // queue can sort by urgency rather than by publish date.
      reviewDueAt: minusDays(scheduledAt, REVIEW_LEAD_DAYS),
      publishedAt: ts.publishedAt,
      approvedAt: ts.approvedAt,
      rejectedAt: ts.rejectedAt,
      clientNotes: ts.clientNotes,
      planId,
      projectId: linkProject ? projects[spec.client].id : null,
    };

    await db.contentItem.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    });

    // --- assets: converge on the intended set rather than accumulating ---
    const intendedAssetIds = fileIds.map((_, k) => assetKey(id, k));
    for (const [k, fileId] of fileIds.entries()) {
      await db.contentItemAsset.upsert({
        where: { id: assetKey(id, k) },
        update: { fileId, order: k },
        create: { id: assetKey(id, k), contentItemId: id, fileId, order: k },
      });
    }
    await db.contentItemAsset.deleteMany({
      where: { contentItemId: id, id: { notIn: intendedAssetIds } },
    });
    assetLinks += fileIds.length;

    // --- approval thread ---
    const anchor = anchorFor(scheduledAt);
    const intendedApprovalIds = steps.map((_, k) => apprKey(id, k));
    for (const [k, step] of steps.entries()) {
      const reviewer = reviewerFor(step.reviewer, spec.client);
      const fromStatus =
        k === 0 ? ContentStatus.DRAFT : steps[k - 1].toStatus;
      const row = {
        contentItemId: id,
        action: step.action,
        notes: step.notes,
        reviewerId: reviewer.id,
        reviewerRole: reviewer.role,
        reviewerName: reviewer.name,
        fromStatus,
        toStatus: step.toStatus,
        // Explicit timestamp so re-runs keep the thread coherent instead of
        // collapsing every entry onto the moment the seed last ran.
        createdAt: minusDays(anchor, step.daysBefore),
      };
      await db.contentApproval.upsert({
        where: { id: apprKey(id, k) },
        update: row,
        create: { id: apprKey(id, k), ...row },
      });
    }
    await db.contentApproval.deleteMany({
      where: { contentItemId: id, id: { notIn: intendedApprovalIds } },
    });
    approvalRows += steps.length;

    // --- feedback conversation ---
    const commentSpecs = COMMENT_THREADS[spec.title] ?? [];
    const videoAsset = projectFiles[spec.client].find(
      (f) => fileIds.includes(f.id) && f.type === "video"
    );
    const intendedCommentIds = commentSpecs.map((_, k) => cmtKey(id, k));
    for (const [k, c] of commentSpecs.entries()) {
      const author = reviewerFor(c.author, spec.client);
      // A timecode is only meaningful when a video is actually attached.
      const pinned = c.at != null && videoAsset;
      const row = {
        contentItemId: id,
        authorId: author.id,
        authorName: author.name,
        authorRole: author.role,
        body: c.body,
        timecodeSec: pinned ? c.at! : null,
        assetId: pinned ? videoAsset!.id : null,
        resolved: c.resolved ?? false,
        createdAt: minusDays(anchor, c.daysBefore),
      };
      await db.contentComment.upsert({
        where: { id: cmtKey(id, k) },
        update: row,
        create: { id: cmtKey(id, k), ...row },
      });
    }
    await db.contentComment.deleteMany({
      where: { contentItemId: id, id: { notIn: intendedCommentIds } },
    });
    commentRows += commentSpecs.length;

    statusTally[spec.status] = (statusTally[spec.status] ?? 0) + 1;
  }

  // ---------- summary ----------
  console.log(`\n✅ Seeded ${ITEMS.length} content items`);
  console.log(
    `   ${assetLinks} asset links, ${approvalRows} approval entries, ${commentRows} feedback comments\n`
  );
  console.log("   Status breakdown:");
  for (const status of Object.values(ContentStatus)) {
    console.log(`     ${status.padEnd(18)} ${statusTally[status] ?? 0}`);
  }
  const label = (m: Date) =>
    m.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  console.log(
    `\n   Months covered: ${MONTHS.map(label).join(", ")}`
  );
  console.log("\n   Demo logins (passwords from SEED_*_PASSWORD env vars):");
  console.log("     roma    — Roma Restaurant  (18 items)");
  console.log("     client  — Fashion Hub      (12 items)");
  console.log("     admin / karim — agency side\n");
}

main()
  .catch((e) => {
    console.error("❌ Content seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
