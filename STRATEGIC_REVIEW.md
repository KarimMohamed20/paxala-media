# Paxala Media Production — Strategic Review, Roadmap & Growth Plan

> **Generated:** 2026-06-26  ·  **Scope:** full codebase audit + product roadmap + client-attraction strategy
> **Method:** 31-agent analysis pass (5 audit dimensions, each finding adversarially re-verified) + manual verification of the security-critical paths.
> **Codebase reviewed:** Next.js 16 / React 19 / Prisma 5 / NextAuth v4 / next-intl v4 — ~176 files, ~34.6k LOC, 53 API routes, trilingual (Arabic / Hebrew / English).

---

## 1. Executive Summary

Paxala Media (PMP) is **further along than a typical agency website**. It is already a real
client-portal + CMS/CRM: authenticated clients, staff and admins; projects broken into milestones
and tasks; PDF invoices; file delivery; a trilingual marketing site. The foundations are sound —
**49 of 53 API routes enforce a session, there is no public privilege-escalation path** (user creation
is admin-only with explicit field destructuring, so no role mass-assignment), and the invoice-download
ACL is done correctly. My own independent reading of the highest-stakes routes confirmed this.

But the platform is **not yet ready to hold real client money and deliverables at scale**, for three reasons,
and it is **leaving its single biggest competitive advantage — the team’s AI-media stack — entirely unused.**

### 🔴 Top risks — fix before onboarding more paying clients

1. **Client deliverables are exposed (`SEC-01` + `SEC-02`).** The per-project file routes fetch by `projectId`
   with *no ownership check*, so any logged-in client can list another client’s files; and those files are written
   to `public/uploads/...` where Next serves them **statically with zero auth** — and "deleting" a file never
   removes it from disk. This is a cross-tenant confidentiality breach of your core product (the videos/photos).
2. **Schema/migration drift (`DEP-01`).** 192 localized columns exist only in a hand-run `psql` script, not in any
   Prisma migration. Any clean deploy or `migrate reset` produces a database that does not match the code.
3. **A GitHub Personal Access Token is committed in the git remote URL (`DEP-02`).** Rotate it today — anyone with
   repo access (or a leaked clone) has your GitHub credentials.

Plus **2 critical / 8 high** issues in total (full list below), including a **41 MB autoplaying hero video** that is
the LCP element (kills mobile load on the very networks your audience uses) and a **task-approval workflow that STAFF
can self-bypass.**

### 🟢 Top opportunities — where the next growth comes from

1. ~~**Revenue engine.** You *invoice* but clients **cannot pay online** and the monthly retainers are not auto-billed.
   Stripe Checkout "Pay now" + recurring retainer subscriptions is the highest-ROI feature you can ship.~~
   **⛔ Parked — payment-gateway integration is out of scope per owner decision (2026-06-26). See §6.**
2. **AI Studio = your local moat.** There is *zero* AI code in the repo today, yet the team operates Gemini, Higgsfield,
   Kling and FLUX daily. Packaging those as metered, recurring in-portal upsells (caption/calendar generator, ad-variation
   generator, virality scoring) is something **no competitor in the Galilee region can match.**
3. **Local SEO + WhatsApp.** i18n is cookie-only, so all three languages **collapse to one URL** — you are invisible
   in Arabic and Hebrew search. Locale-prefixed URLs + hreflang + `LocalBusiness` JSON-LD, plus a WhatsApp-first lead
   CTA (the channel this market actually uses), unlock organic and inbound demand cheaply.

**Bottom line:** spend ~1 week closing the security/integrity holes, ~30 days turning the portal into something clients
can *be reached on* and *find* (WhatsApp + Local SEO), then this quarter start selling AI-accelerated content
as the differentiator. _(Online payments are intentionally parked — see §6.)_ The detailed, prioritized plan is in §5.

---

## 2. Code, Security & Quality Audit

**68 confirmed findings** across 5 dimensions (2 false-positives dropped during adversarial verification).

| Severity | Count | Meaning |
|---|---|---|
| 🔴 Critical | 2 | Breaks production, exposes data, or corrupts deploys. Fix immediately. |
| 🟠 High | 8 | Real exploit/failure path or serious UX/SEO loss. Fix this sprint. |
| 🟡 Medium | 47 | Genuine bug or notable gap; schedule deliberately. |
| 🔵 Low | 11 | Polish, hardening, or minor inconsistency. |

### 2.1 Health by dimension

**Security & Authorization** — 13 findings  
Authentication presence is solid (49/53 routes call getServerSession; the 4 public ones are by design) and the worst classes are absent: there is no public self-registration (user creation is ADMIN-only with explicit field destructuring, so no role mass-assignment), admin CMS/CRM mutation routes (users, services, team, blog, homepage, portfolio, admin/bookings, admin/inquiries, milestones/reorder, projects POST/PUT/DELETE, reports/payments) consistently enforce role checks, and no .env was ever committed to git history. However, authorization CORRECTNESS is inconsistent across the project-data routes. The most serious problem is a cluster of broken object-level authorization on project files: the per-project file routes do object-level filtering by projectId but forget to check ownership/role, so any authenticated CLIENT can read another client's file list and URLs (SEC-01); and because client deliverables are written into /public/uploads they are served statically with no auth at all and "deleted" files are never removed from disk (SEC-02). Several sibling endpoints (milestones GET, tasks GET) leak internal data that the dedicated portal endpoint carefully hides, STAFF can self-attach to any project, public booking/contact endpoints have no rate-limiting and act as an email-relay/DoS surface, tiptap HTML is rendered unsanitized (STAFF-writable blog -> public XSS), and a GitHub PAT sits in plaintext in the git remote URL. Forgot-password is a non-functional stub. Overall: no critical auth bypass, but multiple high/medium IDOR and data-exposure issues that need fixing before this handles real client data.

**Correctness & Data Integrity** — 10 findings  
The codebase is functionally wired but has systemic correctness gaps in exactly the high-value areas: money/invoicing, task workflow, and concurrent writes. There are NO database transactions anywhere ($transaction count = 0), so every multi-write or check-then-write operation (invoice numbering, milestone reorder, booking slot reservation, payment + invoice) is racy and can corrupt data or violate unique constraints. The task-approval state machine is carefully enforced in one route but completely bypassable through a parallel "admin" task-update route, letting STAFF self-approve their own work and silently nulling fields. Money is consistently handled as JS floats (Number()/parseFloat over Prisma Decimal) and summed in floating point. Input is trusted from req.json() with no schema validation (no zod), so NaN coercion and arbitrary enum strings reach Prisma and surface as generic 500s. Next.js 16 async params/cookies are handled correctly throughout (no sync-access bugs found) — the real damage is in business logic and data integrity.

**i18n / RTL / Localization** — 12 findings  
The site has a solid foundation: a clean 3-locale setup (en/ar/he), correct `<html lang/dir>` per-locale in the root layout (src/app/layout.tsx:122-125), cookie-based persistence (src/lib/locale-actions.ts), an English fallback helper for DB content (about.tsx pattern), trilingual columns on most content models, and a dedicated rtl.css. But execution is partial and inconsistent. The most serious issues: (1) translation keys for the admin approvals screen live in the wrong namespace in ar.json/he.json (or are entirely absent), so Arabic/Hebrew admins see raw key names; (2) the entire staff portal and portal login/forgot-password (10 pages) are hardcoded English with no next-intl at all; (3) RTL is only half-done — rtl.css flips text-align and auto-margins but NOT the 400+ physical ml-/mr-/pl-/pr-/left-/right- utilities, so margins, padding, absolute-positioned icons, and the fixed left-0 sidebars do not mirror in Arabic/Hebrew; (4) directional arrow icons never flip (rtl-flip helper is defined but used 0 times); (5) all dates are formatted with hardcoded English/Gregorian patterns (date-fns format() and toLocaleDateString("en-US")), so months appear in English even in Arabic/Hebrew. Admin-panel localization remains incomplete as the project docs already flag. RTL needs to move to logical Tailwind utilities (ms-/me-/ps-/pe-/start-/end-/text-start) rather than relying on the brittle CSS overrides.

**Frontend / UX / Performance / SEO / Accessibility** — 22 findings  
The marketing site is visually ambitious but built in a way that will perform poorly for its stated audience (Arabic/Hebrew local businesses on Saudi/Egypt/local mobile networks) and is weak on accessibility, RTL correctness, localization, and SEO. The single biggest problem is a 41MB autoplaying hero video as the LCP element with no poster or compression. Accessibility regressions are systemic: zoom is disabled at the viewport level, there is zero prefers-reduced-motion handling despite dozens of infinite animations, form labels are not programmatically associated, and the portfolio lightbox is not keyboard-operable. RTL is nominally supported (dir is set, a small rtl.css exists) but the codebase uses 316 physical directional classes and 0 logical ones, so Arabic/Hebrew layouts will break (icon/padding collisions, menu on wrong side). Localization is incomplete on the public site too — the booking flow, contact page, footer, and hero CTAs are hardcoded English even though the audience is RTL-first. SEO is thin: every page shares one title/description, locale is cookie-based with no per-locale URLs or hreflang, there is no sitemap/robots/JSON-LD, and referenced OG/favicon/PWA icons are 404. Loading/empty/error states are inconsistent (good in the portal, absent at the route level). There is also a real interval-leak bug in the clients section and a non-functional newsletter form plus broken /privacy and /terms links.

**Build / Config / Deploy / DevEx** — 11 findings  
The build pipeline has solid bones — TypeScript strict mode is ON (tsconfig.json:7), next.config.ts does NOT set typescript.ignoreBuildErrors or eslint.ignoreDuringBuilds (so type/lint errors fail the build), the Dockerfile uses multi-stage standalone output running as a non-root user with a healthcheck, and nginx provides rate-limiting + security headers. However there are serious deploy-hygiene problems. The single most dangerous issue is Prisma migration drift: schema.prisma contains 192 localized columns (nameEn/Ar/He, etc.) that NONE of the 14 committed migrations create — the entire localization schema change was applied by hand via a loose psql script (add_localization_manual.sql), so a fresh `prisma migrate deploy` produces a database the generated Prisma Client cannot query. Secondary high-impact issues: a GitHub PAT is embedded in the git remote URL, NEXTAUTH_SECRET and DATABASE_URL are passed as Docker build ARGs (baked into image layers/history), the production seed ships weak hardcoded passwords (admin123), next.config images allow any https host (open image proxy/SSRF), HSTS is commented out, there is no error monitoring (Sentry commented out), and several runtime env vars used in code are undocumented in the .env examples. next-auth v4 paired with Next 16 / React 19 is an end-of-life-track compatibility risk.

### 2.2 🔴 Critical findings

#### 🔴 `DEP-01` — Schema/migration drift: 192 localized columns exist only in a hand-run psql script, not in any Prisma migration

- **Severity:** 🔴 CRITICAL  ·  **Area:** Build / Config / Deploy / DevEx  ·  **Category:** prisma-deploy
- **Location:** `prisma/migrations/add_localization_manual.sql:1-20 (vs prisma/schema.prisma:99-111)`
- **Problem:** schema.prisma declares 192 localized field references (e.g. nameEn/nameAr/nameHe at schema.prisma:99-104, plus titleEn, roleEn, bioEn... across TeamMember, Service, Portfolio, HomePageContent, etc.), but grepping every prisma/migrations/*/migration.sql shows NONE of the 14 committed migrations add any En/Ar/He column. The localization rollout was instead delivered as a loose 27KB file prisma/migrations/add_localization_manual.sql that BEGIN/ADD COLUMN/DROP COLUMN/COMMITs new schema, and the deploy docs instruct running it manually via psql (LOCALIZATION_DEPLOYMENT.md:104-107 `docker-compose exec postgres psql ... -f /tmp/add_localization_manual.sql`). This file is not inside a timestamped migration dir and has no entry in _prisma_migrations, so `prisma migrate deploy` ignores it.
- **Impact:** A clean deploy via the documented Dockerfile.migrate (`prisma migrate deploy`) builds a database WITHOUT the localized columns, while the generated Prisma Client (from schema.prisma) selects nameEn/titleAr/etc. — every read of those models throws at runtime, breaking the whole site (home, services, portfolio, about). On existing DBs, schema state depends on whether an operator remembered to hand-run the psql script, and `prisma migrate status` reports drift. There is no reproducible, version-controlled schema.
- **Fix:** Generate a real Prisma migration for the localization change: temporarily revert schema.prisma to pre-localization, run `prisma migrate dev --name add_localization` to capture the additive columns, then add a data-backfill step (copy old -> En, En -> Ar/He) as a follow-up migration, and finally a migration that drops the old single-language columns. Delete the loose add_localization_manual.sql from prisma/migrations/. Verify with `prisma migrate diff` that schema.prisma == migrations.
- **✓ Verified (adversarial re-read):** Independently confirmed. schema.prisma:99-104 declares localized fields (nameEn/nameAr/nameHe/roleEn...); grep shows 192 localized field refs across the schema. The first timestamped migration (prisma/migrations/20251203204026_first/migration.sql:73,91) creates TeamMember/Service with OLD single-language columns name/role/bio/skills (name/role NOT NULL); Portfolio likewise in 20251227185805. A grep across every prisma/migrations/*/migration.sql returns 0 En/Ar/He ADD COLUMN statements — no committed timestamped migration adds localized columns. The localization rollout exists only in the loose…

#### 🔴 `PERF-01` — 41MB autoplaying hero video is the LCP element with no poster or compression

- **Severity:** 🔴 CRITICAL  ·  **Area:** Frontend / UX / Performance / SEO / Accessibility  ·  **Category:** performance
- **Location:** `src/components/sections/scroll-video-hero.tsx:144-152`
- **Problem:** The homepage hero renders a full-bleed autoPlay/loop <video> sourcing /videos/video.mp4, which is 41MB (public/videos/video.mp4). There is no poster image, no preload control, and no mobile fallback, so every visitor downloads (and the browser begins buffering) tens of MB before the hero paints. The video is the Largest Contentful Paint element. There is also a second 38MB and a 22MB MP4 plus several 4MB PNGs in public/uploads/portfolio served raw.
- **Impact:** On the target audience's mobile networks (Saudi/Egypt/local), LCP and time-to-interactive will be measured in many seconds, data caps get burned, and most users bounce before the hero appears. This single asset dominates page weight.
- **Fix:** Add a lightweight poster image (AVIF/WebP) and preload='none'; compress/transcode the hero to a streaming-friendly H.264/H.265 + VP9/AV1 set under ~2-4MB, or serve a static poster on mobile and only autoplay the video on wide/desktop viewports. Move large media to a CDN/object storage with range requests. Re-encode the 4MB portfolio PNGs to WebP/AVIF.
- **✓ Verified (adversarial re-read):** Re-read src/components/sections/scroll-video-hero.tsx:144-152: the hero renders a full-bleed background <video autoPlay muted loop playsInline className="absolute top-0 left-0 w-full h-full object-cover"> with a single <source src="/videos/video.mp4" type="video/mp4"/>. Grep confirms NO `poster` and NO `preload` attribute on the element. With autoPlay (no preload="none"/"metadata"), the browser begins downloading the video immediately and there is no mobile fallback or lazy-load gate.  Asset sizes confirmed on disk: public/videos/video.mp4 = 42,673,667 bytes (41M). It is served raw from Next.j…

### 2.3 🟠 High-severity findings

#### 🟠 `DEP-02` — GitHub Personal Access Token embedded in git remote URL

- **Severity:** 🟠 HIGH  ·  **Area:** Build / Config / Deploy / DevEx  ·  **Category:** secrets
- **Location:** `.git/config:remote "origin" url`
- **Problem:** The origin remote is `https://<TOKEN>@github.com/karimmohamed20/paxala-media.git` — a GitHub PAT is stored in cleartext in the remote URL (token value intentionally not reproduced here). This persists on disk for anyone with filesystem/backup access and leaks via `git remote -v`, shell history, CI logs, or any screen-share.
- **Impact:** Whoever obtains the token gains the granted scope on the karimmohamed20 GitHub account (likely repo read/write, possibly more), enabling code tampering, secret exfiltration from history, or supply-chain injection into deploys.
- **Fix:** Revoke/rotate the PAT in GitHub settings immediately. Re-point the remote to a tokenless URL (`git remote set-url origin https://github.com/karimmohamed20/paxala-media.git`) and use a git credential helper or SSH keys instead of inlining tokens. Audit whether the same token was reused elsewhere.
- **✓ Verified (adversarial re-read):** Independently re-read /home/karim/pmp/paxala-media/.git/config. Line 7 confirms the claim exactly: the origin remote URL is `https://karimmohamed20:***REDACTED-PAT***@github.com/karimmohamed20/paxala-media.git` (the live token value is intentionally redacted from this report). This embeds a GitHub classic personal access token in cleartext. Verification points: (1) the `ghp_` prefix plus 36-character body is the canonical format of a GitHub classic PAT — not a placeholder or example string; (2) it is the password component of HTTP basic auth in the URL (username `karimmohamed20`, then `:<token>@`); (3) it lives in `.git/config` which is…

#### 🟠 `CORR-02` — Task approval workflow is fully bypassable via the project-scoped task PUT (STAFF can self-approve; partial update nulls description)

- **Severity:** 🟠 HIGH  ·  **Area:** Correctness & Data Integrity  ·  **Category:** business-logic / authorization-of-state / data-loss
- **Location:** `src/app/api/projects/[id]/milestones/[milestoneId]/tasks/[taskId]/route.ts:61-130`
- **Problem:** /api/tasks/[id]/status enforces a strict state machine (TODO->IN_PROGRESS->SUBMITTED->APPROVED/REJECTED) plus manager-only approval and assignee-only submission. This parallel route lets ANY ADMIN or STAFF set `status` to any value with zero transition checks and zero manager check (lines 75-93): a STAFF user can PUT {status:'APPROVED'} on their own task, bypassing approval entirely, which also flips milestone/project progress and can trigger auto project-completion. `data.status` is never validated against the TaskStatus enum, so a bad string reaches Prisma and returns a generic 500. The update also blindly writes `description: data.description || null` (line 77) and `priority/isVisible/assigneeId` from the body, so a status-only update from a client that omits those fields wipes the task description to null and clears the assignee. On a downgrade (e.g. back to IN_PROGRESS) submittedAt/approvedAt/approvedById are left stale.
- **Impact:** Integrity of the entire deliverable-approval system is void: staff can approve their own work, progress/payment-readiness and auto-completion fire on unapproved work, and routine edits silently destroy task descriptions and assignments.
- **Fix:** Either delete this route or make it delegate to the same validated transition logic in lib/milestones.getValidNextStatuses + the manager/assignee checks. Validate status against the enum, only touch fields present in the body (spread guarded like the milestone PUT), and clear approval fields on downgrade.
- **✓ Verified (adversarial re-read):** Independently re-read the cited route. The PUT handler gates only on role (`role !== "ADMIN" && role !== "STAFF"`, lines 66-70) with NO transition validation, NO assignee/manager check, and NO enum validation of `data.status`. On `status === "APPROVED"` it sets `approvedById = session.user.id` (lines 90-92) with no manager check, so any STAFF can approve their own task. This directly voids the controls deliberately enforced in the sibling route `/api/tasks/[id]/status` (strict validTransitions map at status/route.ts:68-74 and `isManager || isAdmin` gate for APPROVED/REJECTED at lines 108-115)…

#### 🟠 `A11Y-02` — No prefers-reduced-motion support anywhere despite pervasive infinite animations

- **Severity:** 🟠 HIGH  ·  **Area:** Frontend / UX / Performance / SEO / Accessibility  ·  **Category:** accessibility
- **Location:** `src/app/globals.css:11-122`
- **Problem:** There is no @media (prefers-reduced-motion: reduce) rule in globals.css or rtl.css, and no useReducedMotion() guard in any component (grep found zero matches). Meanwhile the UI runs many continuous animations: float/pulse-glow keyframes (globals.css:95-121), the clients marquee looping x infinitely (clients.tsx:77-97), pulsing blur orbs with repeat:Infinity on the contact and portfolio hero (contact/page.tsx:110-118, portfolio/page.tsx:38-45), and the homepage hero badge/scroll-indicator infinite loops (scroll-video-hero.tsx:171-178, 309-321). Lenis smooth-scroll is also always on (scroll-provider.tsx:21-30).
- **Impact:** WCAG 2.3.3 / vestibular-disorder failure: users who set 'reduce motion' still get continuous parallax, marquees, and scroll-hijacking, which can cause nausea/dizziness. Also wastes CPU/battery on low-end phones.
- **Fix:** Add a global @media (prefers-reduced-motion: reduce){ *{animation-duration:.01ms!important; animation-iteration-count:1!important; transition-duration:.01ms!important; scroll-behavior:auto!important} } rule, gate framer-motion infinite loops with useReducedMotion(), and disable Lenis smooth scroll when the user prefers reduced motion.
- **✓ Verified (adversarial re-read):** Independently confirmed every claim. Read all 123 lines of src/app/globals.css: there is NO @media (prefers-reduced-motion: reduce) rule; instead it unconditionally sets html { scroll-behavior: smooth } (line 24) and defines .animate-float / .animate-pulse-glow with CSS `infinite` (lines 116, 120) from the float/pulse-glow keyframes (lines 95-121). grep across all of src/ for prefers-reduced-motion / useReducedMotion / reduced-motion / reduceMotion returned ZERO matches, confirming no CSS or JS guard exists anywhere. src/styles/rtl.css also has no reduced-motion handling. The infinite animatio…

#### 🟠 `I18N-UI-01` — Core public flows (booking, contact, footer, hero CTAs) hardcoded in English for an RTL-first audience

- **Severity:** 🟠 HIGH  ·  **Area:** Frontend / UX / Performance / SEO / Accessibility  ·  **Category:** localization
- **Location:** `src/components/forms/booking-form.tsx:250-473`
- **Problem:** Major user-facing surfaces are not wired to next-intl. The booking wizard hardcodes step labels ('Service','Date & Time','Details','Confirm', line 250), section headings (300, 349, 473, 599), and even weekday headers 'Su,Mo,Tu...' (line 394). The contact page hardcodes 'Get in Touch'/'Contact Us'/all field labels (contact/page.tsx:129-247). The footer hardcodes 'Quick Links','Services','Contact Us','Stay Updated','Privacy Policy','Terms of Service' (footer.tsx:61,82,103,133,159-169). The hero CTAs 'View Our Work','Book a Consultation','Scroll' are hardcoded (scroll-video-hero.tsx:235,253,313), and the navbar 'Client Login' (navbar.tsx:117). The dashboard greeting subtitle and 'Staff Panel' are English (dashboard/page.tsx:146,155).
- **Impact:** Arabic- and Hebrew-speaking buyers hit English in the highest-intent flows (booking and contact). Mixed-direction English strings inside an RTL page also look broken. This undercuts conversion for the exact audience the site targets.
- **Fix:** Move these strings into messages/{ar,en,he}.json and consume via useTranslations; localize the calendar weekday/month labels with Intl/date-fns locales. Treat the booking and contact flows as priority-1 for localization.
- **✓ Verified (adversarial re-read):** Independently re-read all cited files; every claim holds with no mitigation found.  BOOKING (src/components/forms/booking-form.tsx) — zero next-intl import/usage (grep confirmed). Hardcoded: step labels ["Service","Date & Time","Details","Confirm"] (line 250), headings "Select Service(s)" (301), "Choose Date & Time" (350), "Your Details" (473), "Confirm Booking" (599); weekday headers ["Su","Mo","Tu","We","Th","Fr","Sa"] (394); "Available Times" (442); all field labels "Full Name *"/"Email Address *"/"Phone Number"/"Additional Notes" (483-576) plus placeholders. The entire booking wizard is En…

#### 🟠 `SEO-02` — Cookie-based locale with no per-locale URLs and no hreflang

- **Severity:** 🟠 HIGH  ·  **Area:** Frontend / UX / Performance / SEO / Accessibility  ·  **Category:** seo
- **Location:** `src/app/layout.tsx:75-141`
- **Problem:** Locale is resolved from a NEXT_LOCALE cookie via getUserLocale() (lib/locale-actions) and the same URL serves ar/he/en. The metadata sets a single openGraph.locale but no alternates.languages/hreflang, and there are no /ar, /he, /en URL variants. Note openGraph.locale also uses 'ar_AR', which is not a valid locale (should be e.g. ar_SA / ar_EG).
- **Impact:** Googlebot (no cookie) only ever indexes the default-language render; the Arabic and Hebrew versions are effectively invisible to search for a business whose entire audience is Arabic/Hebrew speakers. No hreflang means no language targeting.
- **Fix:** Move to locale-prefixed routes (next-intl routing with /ar, /he, /en) or at minimum emit metadata.alternates.languages with canonical per-locale URLs and correct OG locale codes. This is the highest-leverage SEO fix for a local bilingual studio.
- **✓ Verified (adversarial re-read):** Every claim in the finding is confirmed by re-reading the code:  1. Cookie-based locale: src/app/layout.tsx:28 and :120 both call getUserLocale(), which (src/lib/locale-actions.ts:29-38) reads only the NEXT_LOCALE cookie and returns 'en' when the cookie is absent or invalid. src/i18n/request.ts:5-21 does the same for message loading. So there is no signal a search crawler can use to get the Arabic/Hebrew render.  2. Same URL serves all locales: src/app has NO [locale] route segment (find confirms none; the app dir contains about, admin, api, blog, booking, contact, packages, page.tsx, portal,…

#### 🟠 `I18N-03` — Physical Tailwind spacing/position utilities (ml-/mr-/pl-/pr-/left-/right-) do not flip in RTL

- **Severity:** 🟠 HIGH  ·  **Area:** i18n / RTL / Localization  ·  **Category:** rtl-physical-css
- **Location:** `src/styles/rtl.css:rtl.css:1-100; representative: hero.tsx:292, admin/users/page.tsx:296,302`
- **Problem:** rtl.css (imported via globals.css:2) only overrides .text-left/.text-right and .ml-auto/.mr-auto for [dir=rtl]. It does NOT override the directional spacing/position utilities that dominate the codebase: grep counts 103x mr-2, 23x ml-2, 21x left-0, 17x left-1, 15x right-0, 13x right-2, 11x pl-10, plus pl-8/pl-12/left-3/left-4/right-4 etc. — 400+ occurrences across 68 files, and ZERO logical utilities (ms-/me-/ps-/pe-/start-/end-/text-start) are used anywhere. Concrete breakage: search inputs use an absolutely-positioned icon at `left-3` plus input `pl-10` (admin/users/page.tsx:296,302) — in RTL the text right-aligns but the icon stays on the left and the reserved padding is on the left, so the icon overlaps the typed text. Icon+text spacing like `<ArrowRight className="ml-2">` / `<Play className="mr-2">` keeps the gap on the physical (wrong) side in RTL.
- **Impact:** Across Arabic and Hebrew (both RTL, the default audience), buttons, badges, search fields, list rows, and absolutely-positioned elements keep their gutters and icons on the LTR side. The rtl.css text-align override masks the problem in casual testing (text looks right-aligned) while spacing/positioning is visibly wrong.
- **Fix:** Migrate physical utilities to logical ones: ml-/mr-→ms-/me-, pl-/pr-→ps-/pe-, left-/right-→start-/end-, text-left/right→text-start/end. Tailwind v4 supports these natively; the manually-defined .ms-/.me-/.ps-/.pe- classes in rtl.css can then be removed. Prioritize inputs with absolute icons and any left-/right- absolute positioning.
- **✓ Verified (adversarial re-read):** Independently verified. src/styles/rtl.css (imported at globals.css:2) only mirrors a handful of classes for [dir=rtl]: .text-left/.text-right (lines 4-10), .ml-auto/.mr-auto (13-21), .flex-row (49-51), .dropdown-menu (86-89), plus animation/tooltip rules. It defines logical utility classes .ps-*/.pe-*/.ms-*/.me-* (lines 24-46) but does NOT override the numeric directional utilities ml-/mr-/pl-/pr-/left-/right-. Grep confirms 316 occurrences of those physical utilities across 66 files (mr-2=97, ml-2=23, left-0=21, mr-1=19, left-1=17, right-0=15, pl-10=11, etc.) and exactly 0 usages of any logi…

#### 🟠 `SEC-01` — IDOR: any authenticated user can read any project's files (no ownership/role check)

- **Severity:** 🟠 HIGH  ·  **Area:** Security & Authorization  ·  **Category:** Broken Object-Level Authorization (IDOR)
- **Location:** `src/app/api/projects/[id]/files/route.ts:11-48 (GET); see also files/[fileId]/route.ts:7-46 (GET)`
- **Problem:** GET /api/projects/[id]/files only checks `session?.user?.id` (line 15-17) and then queries `db.projectFile.findMany({ where: { projectId: id } })` with NO check that the caller owns the project (no clientId comparison) and no role gate. The same is true of GET /api/projects/[id]/files/[fileId] (projects/[id]/files/[fileId]/route.ts:14-32), which fetches by `{ id: fileId, projectId: id }` with only an auth check. This is the exact anti-pattern the audit targets: fetch-by-id filtered by object id but NOT by the session user's ownership. Note the sibling route /api/files/route.ts:38-43 DOES enforce `isAdmin || isOwner`, proving the omission here is a bug, not policy.
- **Impact:** A logged-in CLIENT (the studio has many client accounts) can call GET /api/projects/<anyProjectId>/files and receive the full file list — including names, descriptions and the stored `url` of every deliverable — for projects belonging to OTHER clients. Project ids leak through many responses (dashboard, project objects, published-portfolio GET which accepts slug and returns project.id), so obtaining a target id is easy. Combined with SEC-02 the returned URLs are directly downloadable. Cross-tenant confidentiality breach of client deliverables.
- **Fix:** Load the project's clientId (and assigned staff) and enforce the same check used in /api/files: `const isAdmin = role===ADMIN; const isStaff = role===STAFF (and assigned); const isOwner = userId===project.clientId; if(!isAdmin && !isStaff && !isOwner) return 403;` Apply to GET, POST, PUT and DELETE handlers in both projects/[id]/files/route.ts and projects/[id]/files/[fileId]/route.ts.
- **✓ Verified (adversarial re-read):** Independently re-read both cited routes. GET /api/projects/[id]/files/route.ts:11-40 gates only on `if (!session?.user?.id)` (line 15) and then runs `db.projectFile.findMany({ where: { projectId: id } })` (lines 22-38) — no clientId/ownership comparison and no role check. GET /api/projects/[id]/files/[fileId]/route.ts:11-38 is identical: only an auth check, then `findFirst({ where: { id: fileId, projectId: id } })`. So any authenticated user (including a CLIENT) can read names, descriptions and stored urls of any project's files. This is a textbook IDOR. It is NOT mitigated elsewhere: middlewa…

#### 🟠 `SEC-02` — Private client deliverables served from /public/uploads with no authorization; delete leaves files on disk

- **Severity:** 🟠 HIGH  ·  **Area:** Security & Authorization  ·  **Category:** Unauthenticated File Access / Insecure Storage
- **Location:** `src/app/api/files/route.ts:99-129 (POST writes to public/uploads), 191-197 (DELETE never unlinks disk file)`
- **Problem:** Uploaded project files are written to `join(process.cwd(),'public','uploads',projectId)` (line 99) and exposed via `getFileUrl('/uploads/<projectId>/<filename>')` (lib/utils.ts:41-46). Anything under /public is served as a static asset by Next (output:'standalone') with zero authorization — the careful ACL checks in the API are irrelevant to the raw bytes. Worse, DELETE only removes the DB row and explicitly leaves the file on disk (lines 195-197: the unlink is commented out), so a 'deleted' file remains permanently public. Invoices, by contrast, are correctly stored under non-public /storage and streamed through an authz'd handler (invoices/[id]/download/route.ts) — so the pattern exists; project files just don't use it.
- **Impact:** Anyone who obtains or guesses a file URL (URLs are returned to clients, embedded in pages, and shared over email/chat) can download the deliverable with no login. Files 'removed' from a project via the UI are not actually revoked and stay world-readable forever. Filenames are `${timestamp}-${safeName}` so they are also partially guessable for a known project. This defeats SEC-01's intended ACL even after that bug is fixed.
- **Fix:** Store client deliverables outside /public (e.g. /storage/projects/<projectId>) and stream them through an authenticated, ownership-checked route like the invoice download handler (using path.basename to prevent traversal). On DELETE, actually unlink the file from disk. If static hosting must stay, at minimum move to unguessable signed URLs and purge on delete.
- **✓ Verified (adversarial re-read):** Every claim verified by re-reading the cited code.  1) POST writes private deliverables into the public web root: src/app/api/files/route.ts:99 `join(process.cwd(),"public","uploads",projectId)`, mkdir + writeFile at lines 100/114-115. The stored URL is built via getFileUrl (lines 128-129) → src/lib/utils.ts:41-46 produces `https://<site>/uploads/<projectId>/<filename>`. With Next.js (next.config.ts confirms `output:"standalone"`), anything under /public is served as a static asset at the root path with NO authorization hook. Confirmed fact: src/middleware.ts only sets x-locale, performs no au…

### 2.4 🟡 Medium-severity findings

Condensed (grouped by area). Each is a genuine, verified issue — full detail is in the raw audit data.

**Security & Authorization**

- **`SEC-03` Visibility/field-level authorization bypass: milestone endpoints leak hidden milestones, internal task data and staff emails to clients** — `src/app/api/milestones/[id]/route.ts:20-55 (GET); see also milestones/route.ts:43-61 (GET ?projectId=)`  
  _Fix:_ Centralize the client visibility/field policy (used in the portal route) into a shared helper and apply it in milestones/[id] and milestones (?projectId=) GET handlers: filter isVisible for clients and omit assignee/desc…
- **`SEC-04` Horizontal privilege issue within STAFF: any staff can read any task and mutate files on any project** — `src/app/api/tasks/[id]/route.ts:18-56 (GET, role-gate only); projects/[id]/files/route.ts:51-137 (POST); projects/[id]/files/[fileId]/route.ts:48-167 (PUT/DELETE)`  
  _Fix:_ For task GET, require the caller to be ADMIN, the assignee, the assignee's manager, or assigned to the task's project. For project file POST/PUT/DELETE, verify the STAFF user is in project.staff for the target project be…
- **`SEC-05` STAFF can self-assign to (or attach arbitrary users to) any project, gaining access to its data** — `src/app/api/projects/[id]/staff/route.ts:11-58 (POST)`  
  _Fix:_ Restrict staff assignment/unassignment to ADMIN only (assignment is an administrative action). If staff self-service is required, validate the target userId has role STAFF/ADMIN and require the caller to already be an ad…
- **`SEC-06` Stored XSS: tiptap HTML rendered unsanitized via dangerouslySetInnerHTML; blog content is STAFF-writable and shown to the public** — `src/app/blog/[slug]/page.tsx:181 (blog); portfolio/[slug]/page.tsx:196; portal/projects/[slug]/page.tsx:439`  
  _Fix:_ Sanitize all stored HTML before rendering with a strict allowlist (DOMPurify on the client or sanitize-html on the server) for blog, portfolio and project content. Sanitize on write as defense-in-depth. Do not treat tipt…
- **`SEC-07` Unauthenticated booking creation enables email-bombing relay and time-slot squatting DoS** — `src/app/api/bookings/route.ts:35-112 (POST)`  
  _Fix:_ Add per-IP rate limiting and a captcha/turnstile to the booking POST; validate/normalize date+timeSlot against an allowlist of real slots; consider requiring email verification before the slot is reserved and before any…
- **`SEC-08` No rate limiting on public contact form or credentials login (spam relay + brute force)** — `src/app/api/contact/route.ts:5-49 (POST); src/lib/auth.ts:24-67 (authorize)`  
  _Fix:_ Add IP/account-based rate limiting (e.g. upstash/ratelimit or a middleware throttle) and a captcha on the contact form. For login, add per-account+per-IP attempt counters with temporary lockout/backoff and alerting on re…
- **`SEC-09` Public client PII (email, contact name/phone) exposed via project GET for any published project** — `src/app/api/projects/[id]/route.ts:16-91 (GET)`  
  _Fix:_ For unauthenticated/non-owner/non-admin viewers, strip client.email and the contacts array (or omit phone/jobTitle) from the public projection. Only include contact PII when the caller is ADMIN/STAFF or the owning client…
- **`SEC-10` Insecure file upload: MIME validated only from client-supplied file.type, SVG allowed, no size cap, served from /public** — `src/app/api/projects/upload/route.ts:17-87`  
  _Fix:_ Validate by sniffing real file bytes (magic numbers), not file.type; reject or sanitize SVG (or force Content-Disposition: attachment / serve from a sandboxed domain); enforce a sane max file size; randomize the stored f…
- **`SEC-11` GitHub Personal Access Token stored in plaintext in the git remote URL** — `.git/config:origin remote URL (https://<token>@github.com/karimmohamed20/paxala-media.git)`  
  _Fix:_ Rotate/revoke the token immediately. Remove it from the remote URL: switch origin to SSH or to a plain HTTPS URL and use a git credential helper (or GITHUB_TOKEN env in CI). Confirm the token never made it into any commi…

**Correctness & Data Integrity**

- **`CORR-01` Invoice numbering + PDF generation is racy and non-atomic; concurrent PAYABLE marks collide on unique number** — `src/lib/invoice.ts:46-86, 110-123`  
  _Fix:_ Wrap counting+create in an interactive prisma.$transaction with SERIALIZABLE isolation, or derive the sequence from a dedicated counter row / DB sequence. Generate the PDF buffer first, then create the invoice row with p…
- **`CORR-03` Deleting a project that has any invoice fails with a generic 500 (Invoice->Project relation has no onDelete cascade)** — `src/app/api/projects/[id]/route.ts:259-264`  
  _Fix:_ Add onDelete behavior to the Invoice.project relation (Cascade if invoices should die with the project, or block deletion explicitly with a clear 409 message after counting invoices). Either way, detect P2003 and return…
- **`CORR-04` Booking slot reservation is a check-then-create race with no unique constraint (double-booking)** — `src/app/api/bookings/route.ts:52-82`  
  _Fix:_ Add @@unique([date, timeSlot]) (scoped to active statuses via a partial index or an application-level reservation) and create inside a transaction, catching P2002 to return the 409. Disable the submit button while in-fli…
- **`CORR-05` Milestone reorder is non-atomic and accepts a partial ID set, producing duplicate/inconsistent order values** — `src/app/api/milestones/reorder/route.ts:29-52`  
  _Fix:_ Run the updates in prisma.$transaction; require the payload to contain exactly the project's full milestone set (or compute offsets), and add @@unique([projectId, order]) so collisions fail loudly.
- **`CORR-06` Two milestone-create endpoints use divergent order logic (off-by-one) and accept unvalidated client-supplied order** — `src/app/api/projects/[id]/milestones/route.ts:64-82`  
  _Fix:_ Consolidate to a single create path with one ordering rule (max(order)+1, first = 0) computed atomically, and reject/ignore client-supplied order.
- **`CORR-07` Money handled as JavaScript floats throughout invoicing, payments, and reports** — `src/lib/invoice.ts:57-60`  
  _Fix:_ Do arithmetic with Prisma.Decimal (or integer minor units) end-to-end; only convert to Number for display formatting, and round explicitly to 2 decimals at each boundary.
- **`CORR-08` No request-body validation: NaN coercion and arbitrary enum strings reach Prisma as 500s; PARTIAL amount unconstrained** — `src/app/api/milestones/[id]/payment/route.ts:24-77`  
  _Fix:_ Introduce zod schemas per route: validate enums against the Prisma enum, require numeric amounts >= 0 and <= milestone.price for PARTIAL, and return 400 with field errors on parse failure.
- **`CORR-09` Auto project-completion sets publishedAt, silently publishing internal client projects to the public portfolio** — `src/app/api/tasks/[id]/status/route.ts:208-256`  
  _Fix:_ Do not set publishedAt on auto-completion (publishing should be an explicit admin action). Decouple public-portfolio visibility from internal completion via a separate boolean (e.g. isPublic) rather than reusing publishe…

**i18n / RTL / Localization**

- **`I18N-01` adminUI approval keys are in the wrong namespace (or missing) in Arabic & Hebrew — raw keys render** — `src/messages/ar.json:ar.json: admin block 354-424 (reviewApprovals line ~363, manageProjects ~362, projects ~361); en.json adminUI 423-505 (projects 429, manageProjects 430, reviewApprovals 431, actions 432, allCaughtUp 498, noApprovals 500)`  
  _Fix:_ Move reviewApprovals/manageProjects/projects/actions from the admin namespace into the adminUI namespace in ar.json and he.json (matching en.json's structure), and add the missing allCaughtUp + noApprovals keys to adminU…
- **`I18N-02` Entire staff portal and portal auth pages are hardcoded English (no next-intl)** — `src/app/staff/page.tsx:staff/page.tsx:123-201; staff/tasks/page.tsx:128-129,270; portal/login/page.tsx:69,88-130; admin/homepage/page.tsx:363-492`  
  _Fix:_ Add useTranslations hooks to these pages and move strings into the portal/adminUI/common namespaces in all three message files. The staff namespace appears to not exist yet — add one. Prioritize portal/login (first impre…
- **`I18N-04` Admin/portal/staff sidebars are pinned left and do not mirror in RTL** — `src/app/admin/layout.tsx:admin/layout.tsx:48,51; portal/layout.tsx:51,54; staff/layout.tsx:49,52`  
  _Fix:_ Replace `fixed left-0` + `md:ml-64` with logical equivalents `fixed start-0` + `md:ms-64` (Tailwind v4 logical inset/margin) so the sidebar and content offset flip automatically with dir.
- **`I18N-05` Directional arrow/chevron icons never flip in RTL (rtl-flip helper unused)** — `src/styles/rtl.css:rtl.css:54-56; hero.tsx:292-296; usages across 10+ section files`  
  _Fix:_ Add the existing `rtl-flip` class to directional icons (or, better, swap icon components conditionally on locale), and verify carousel/slider next/prev controls reverse. Audit the 78 occurrences to separate truly-directi…
- **`I18N-06` Blanket `[dir=rtl] .flex-row { row-reverse }` causes inconsistent mirroring** — `src/styles/rtl.css:rtl.css:49-51`  
  _Fix:_ Remove the blanket .flex-row reverse. Rely on document `dir` (which already reverses inline/flow order for logical content) and use explicit `flex-row-reverse` only where a specific layout needs it. Handle direction per-…
- **`I18N-07` Dates hardcoded to English/Gregorian formatting regardless of locale** — `src/app/blog/page.tsx:blog/page.tsx:76; blog/[slug]/page.tsx:148,153; api/dashboard/route.ts:89; plus date-fns format() in ~20 files`  
  _Fix:_ Use next-intl's useFormatter().dateTime() (locale comes from context automatically) or pass a date-fns locale (ar, he) selected from useLocale(). Remove the hardcoded 'en-US' arguments.
- **`I18N-09` HomePageContent Arabic/Hebrew columns default to English literals** — `prisma/schema.prisma:schema.prisma:373-430 (HomePageContent defaults)`  
  _Fix:_ Seed Arabic and Hebrew defaults with actual translations (or empty + a translated fallback chain), and/or surface 'missing translation' warnings in the admin/homepage editor so the gap is visible to editors.
- **`I18N-10` Project model is monolingual while all other content models are trilingual** — `prisma/schema.prisma:schema.prisma:189-210 (Project) vs Service 127-145, Portfolio 149-170, BlogPost 285-305, Testimonial 534-548`  
  _Fix:_ If project content must be localized, migrate Project to titleEn/Ar/He + description/content/tags variants (a schema migration — get sign-off first since it touches existing data). If projects are intentionally authored…

**Frontend / UX / Performance / SEO / Accessibility**

- **`A11Y-01` Viewport disables pinch-zoom (maximumScale:1, userScalable:false)** — `src/app/layout.tsx:19-25`  
  _Fix:_ Remove maximumScale and userScalable from the Viewport export (or set userScalable: true and drop maximumScale). The minor aesthetic gain is not worth excluding low-vision users.
- **`A11Y-04` Form labels not programmatically associated with inputs** — `src/app/contact/page.tsx:186-257`  
  _Fix:_ Add matching id + htmlFor (or wrap input in the label), and use aria-required/required plus aria-describedby for the '*'. Consider extending the Input component to accept and render a label.
- **`ASSET-01` Referenced OG image, favicon, and PWA icons are missing (404)** — `src/app/layout.tsx:82-111`  
  _Fix:_ Generate and add og-image.png (1200x630), favicon.ico, apple-touch-icon.png, and the two android-chrome PNGs to public/, or point the metadata/manifest at assets that exist.
- **`BUG-02` Client marquee: pauseOnHover is a no-op and translate distance is hardcoded to -1920px** — `src/components/sections/clients.tsx:77-97`  
  _Fix:_ Drive the marquee with a CSS keyframe animation (so animationPlayState pause works) or measure the row width and animate by exactly -50% of duplicated content; gate with prefers-reduced-motion.
- **`CONTENT-01` Fake placeholder testimonials shipped on the production homepage** — `src/components/sections/clients.tsx:30-52`  
  _Fix:_ Source testimonials from the Testimonial table with per-locale fields, and hide the section entirely when there are none rather than showing placeholders.
- **`FORM-01` Public forms lack field validation feedback and spam protection** — `src/components/forms/booking-form.tsx:108-176`  
  _Fix:_ Add client-side field validation with inline messages (email/phone format), a honeypot + min-time-on-form check (and/or a lightweight captcha) on contact and booking, and replace the plain 'Loading...' fallback with a br…
- **`LINK-01` Footer links to nonexistent /privacy and /terms, and the newsletter form is non-functional** — `src/components/layout/footer.tsx:134-169`  
  _Fix:_ Create the /privacy and /terms pages (or remove the links), wire the newsletter form to a real handler with success/error feedback, add a label/aria-label to the email field, and give the submit button an accessible name…
- **`PERF-02` next/image fill used everywhere without a sizes prop (oversized downloads)** — `src/components/sections/portfolio-grid.tsx:108-113, 237-242, 284-289`  
  _Fix:_ Add accurate sizes to every fill image (e.g. grid '(max-width:768px) 100vw, 33vw', thumbnails '80px', logos '(max-width:768px) 160px, 224px'), and add priority only to the genuine above-the-fold image.
- **`PERF-03` Homepage server component fetches its own API sequentially with cache:'no-store'** — `src/app/page.tsx:9-59`  
  _Fix:_ Query Prisma directly in the server component instead of fetching the app's own API, run the two queries with Promise.all, and use revalidate/ISR (or a short cache) instead of no-store for content that changes rarely.
- **`RTL-01` Pervasive physical directional CSS (316 uses, 0 logical) breaks Arabic/Hebrew layouts** — `src/components/forms/booking-form.tsx:485-540`  
  _Fix:_ Replace physical classes with Tailwind v4 logical equivalents (ps-/pe-/ms-/me-/start-/end-) and use inset-inline-start for absolutely-positioned input icons. Audit the 316 occurrences; prioritize forms, navbar, and CTAs.
- **`RTL-02` Mobile menu and calendar controls are hardcoded to the physical right/left, not flipped for RTL** — `src/components/layout/navbar.tsx:152-157`  
  _Fix:_ Use logical positioning (inset-inline-end, border-inline-start) and flip the slide direction based on dir; swap or mirror the calendar chevrons in RTL (e.g. rtl-flip utility already defined in rtl.css).
- **`RTL-03` rtl.css blanket-reverses every .flex-row and re-declares logical utilities that are never used** — `src/styles/rtl.css:24-51`  
  _Fix:_ Remove the blanket .flex-row reversal and instead adopt Tailwind's logical/flex utilities at the component level; delete the redundant ps/pe/ms/me declarations and rely on Tailwind v4 built-ins.
- **`SEO-01` Every public page shares one title and meta description (duplicate metadata)** — `src/app/layout.tsx:27-113`  
  _Fix:_ Add a generateMetadata (or static metadata) to each route, and dynamic generateMetadata to blog/[slug] and portfolio/[slug] that pulls the item title/excerpt/og image per locale.
- **`SEO-03` No sitemap, robots, or JSON-LD structured data** — `src/app:n/a`  
  _Fix:_ Add app/sitemap.ts (enumerate static + blog/portfolio slugs per locale), app/robots.ts, and inject JSON-LD: LocalBusiness/Organization in the root layout (name, address in Sakhnin, +972 phone, sameAs socials, openingHour…
- **`STATE-01` No route-level loading.tsx, error.tsx, or not-found.tsx anywhere** — `src/app:n/a`  
  _Fix:_ Add app/loading.tsx (branded skeleton) and app/error.tsx + app/global-error.tsx (localized retry UI) and app/not-found.tsx. Wrap the homepage sections in Suspense or fetch in parallel with streaming.

**Build / Config / Deploy / DevEx**

- **`DEP-04` Production seed creates accounts with weak hardcoded passwords (admin123 / staff123 / client123)** — `prisma/seed.ts:12-23`  
  _Fix:_ Make seed non-production-safe: read initial admin password from an env var and fail fast if NODE_ENV=production and the var is unset; never ship literal default passwords. Force a password-change-on-first-login flag for…
- **`DEP-05` next/image allows any HTTPS host (hostname "**") — open image proxy / SSRF surface** — `next.config.ts:11-24`  
  _Fix:_ Replace `**` with the explicit hostnames actually used (your CDN/upload domain, any external partners). If user-supplied external images are a real requirement, validate/proxy them through your own storage instead of the…
- **`DEP-06` 1GB request body limit on Server Actions and nginx (memory-exhaustion DoS)** — `next.config.ts:31-35`  
  _Fix:_ Lower the limit to a realistic media ceiling (e.g. 100-250MB) and stream large uploads directly to object storage (S3/R2) via presigned URLs rather than through the Node process. Align nginx client_max_body_size to the s…
- **`DEP-07` next-auth v4 on Next 16 / React 19 — end-of-life-track compatibility risk** — `package.json:42-46`  
  _Fix:_ Plan a migration to Auth.js v5 (next-auth@5) aligned with the App Router, or pin Next to a version range explicitly tested against next-auth v4. At minimum, verify @auth/prisma-adapter compatibility with the installed ne…
- **`DEP-08` Undocumented runtime env vars + self-HTTP fetch in server components; NEXT_PUBLIC_APP_URL missing everywhere** — `src/app/page.tsx:11,35`  
  _Fix:_ Replace the self-fetch in page.tsx with a direct DB/service call (the data is already available server-side via Prisma). Document every consumed env var (NEXT_PUBLIC_APP_URL, SMTP_SECURE/PORT/FROM, ADMIN_EMAIL) in .env.e…
- **`DEP-09` No error monitoring; minimal structured logging; health endpoint leaks DB error text** — `.env.production.example:55-58`  
  _Fix:_ Add Sentry (or similar) for both server and edge, wire a structured logger that includes the X-Request-ID and relevant entity IDs (matches the operator's logging standard), and make /api/health return a generic status wi…
- **`DEP-10` Real secrets sitting in working-tree env files (including a malformed .env.production. with a live DB password)** — `.env.production.:11-15`  
  _Fix:_ Delete .env.production. and any working-tree files holding live secrets once stored in a proper secret manager; rotate the Brevo SMTP password and DB password that have been on disk. Generate a strong NEXTAUTH_SECRET (`o…

### 2.5 🔵 Low-severity findings

- **`DEP-11`** Weak default credentials baked into docker-compose; HSTS disabled — `docker-compose.yml:11,37,44` (Build / Config / Deploy / DevEx)
- **`DEP-12`** seed.ts excluded from type-checking; allowJs enabled — `tsconfig.json:3,33` (Build / Config / Deploy / DevEx)
- **`CORR-10`** Re-marking a milestone PAYABLE silently no-ops invoice generation; only PAYABLE ever creates an invoice — `src/app/api/milestones/[id]/payment/route.ts:87-100` (Correctness & Data Integrity)
- **`A11Y-05`** Brand logo hidden on mobile/tablet; navbar relies on a bare hamburger — `src/components/layout/navbar.tsx:70-78` (Frontend / UX / Performance / SEO / Accessibility)
- **`BUG-01`** Clients section sets up an interval via useState instead of useEffect (leak + setState after unmount) — `src/components/sections/clients.tsx:254-259` (Frontend / UX / Performance / SEO / Accessibility)
- **`PERF-04`** Unused 380-line hero component with per-mousemove re-renders and heavy blur orbs — `src/components/sections/hero.tsx:105-211` (Frontend / UX / Performance / SEO / Accessibility)
- **`I18N-08`** Numbers and currency not locale-formatted (no Arabic-Indic numerals, no Intl) — `src/app/portal/projects/[slug]/page.tsx:portal/projects/[slug]/page.tsx:548,555,583,587; admin/reports/payments/page.tsx:223,328,384` (i18n / RTL / Localization)
- **`I18N-11`** Hardcoded English in language switcher and user-facing alert()s — `src/components/layout/language-switcher.tsx:language-switcher.tsx:27,54,66,93,102; admin/approvals/page.tsx:100,137` (i18n / RTL / Localization)
- **`I18N-12`** Metadata translations hand-rolled outside message files; invalid OG locale 'ar_AR' — `src/app/layout.tsx:layout.tsx:32-47,77` (i18n / RTL / Localization)
- **`SEC-12`** Forgot-password is a non-functional stub (fake success, no reset token flow) — `src/app/portal/forgot-password/page.tsx:16-32` (Security & Authorization)
- **`SEC-13`** Email-prefix fallback login uses non-deterministic findFirst on email local-part — `src/lib/auth.ts:35-43` (Security & Authorization)

---

## 3. Product & Company Roadmap (12–18 months)

**North-star vision**

> Evolve Paxala Media from a marketing site plus manual project tracker into a bilingual (Arabic/Hebrew) 'creative operating system' for Israeli local businesses: a single portal where clients discover, sign, pay, receive and approve creative work — and buy AI-accelerated content — while PMP runs sales, recurring billing, delivery, and automated Meta-ads reporting on autopilot. The defensible wedge competitors locally can't match is productized generative AI (the team already operates Higgsfield/Gemini/FLUX/Kling) sold as metered, recurring upsells layered on top of the retainer model. Over 12-18 months the platform turns its existing manual scaffolding (invoices, milestones, file uploads, inquiries) into automated cashflow, delivery, and growth loops, then extends into a client mobile app and white-label SaaS.

### 3.1 Revenue Engine: Online Payments, Retainer Billing & Quoting

> **⛔ Scope decision (2026-06-26): payment-gateway integration is SKIPPED for now** (owner decision). The
> _Online invoice payment_ and _Recurring retainer subscriptions_ rows below are **parked — not being built**.
> The non-payment items in this theme (quote/proposal builder, VAT-compliant invoice fields, accounting-provider
> export) remain valid and can proceed independently.

_Biggest revenue leak in the product. PMP sells three monthly retainers (constants.ts:217 Brand 360 / PLUS / infinite) and issues per-milestone invoices (src/lib/invoice.ts, Invoice model schema.prisma:599 with status DRAFT/ISSUED/PAID/VOID and a pdfUrl), yet collects ZERO online: Milestone.paymentStatus is flipped by hand via /api/milestones/[id]/payment, packages have price 'Customized' with no checkout, and there is no subscription concept anywhere. This theme converts the existing invoice/milestone scaffolding into an actual cashflow system. Region note: company is Sakhnin/+972 selling to Israeli (Hebrew + Arab) local businesses, so the relevant rails are Stripe (now live in Israel, supports ILS + Billing for recurring), a local gateway (Tranzila/Cardcom/PayPlus), and Bit (dominant local P2P) — NOT Gulf gateways; Tap/PayTabs only matter if they expand to Saudi later._

| Priority | Feature | Effort | Impact | What it is |
|---|---|:--:|:--:|---|
| 🟢 Now | **Online invoice payment (Stripe Checkout + local gateway + Bit)** | M | high | Add a 'Pay now' button to the existing Invoice surface. Stripe Checkout/Payment Links in ILS; a webhook flips InvoiceStatus->PAID and Milestone.paymentStatus->PAID, replacing the manual /api/milestones/[id]/payment toggle. Add an Israeli ga… |
| 🟢 Now | **Recurring retainer subscriptions (Stripe Billing)** | L | high | Promote the static packages array (constants.ts:217) into a Package/Subscription Prisma model and drive monthly auto-billing for Brand 360 / PLUS / infinite: card-on-file, automatic monthly invoice generation, dunning/retries, proration. El… |
| 🟡 Next | **VAT-compliant tax invoices + Israel allocation-number clearance** | M | high | invoice.ts:58 hardcodes taxRate=0 but Israel VAT is ~18% and the Tax Authority's continuous invoice-clearance model now requires an allocation number (mispar haktzaa) for invoices above a (declining) threshold. Make taxRate a SiteSetting, r… |
| 🟡 Next | **Quote / proposal builder with e-signature** | L | high | Generate a branded bilingual (Ar/He/En) proposal from selected services/packages reusing the @react-pdf/renderer + InvoiceTemplate pattern. Client reviews in-portal + via WhatsApp, e-signs/accepts, which auto-provisions a Project + Mileston… |
| ⚪ Later | **Israeli accounting/invoicing provider integration (Green Invoice / iCount / EZcount)** | M | medium | Sync invoices and payments to a licensed Israeli provider for legal receipts, bookkeeping export, and the clearance API, instead of self-generated PDFs written to local disk (invoice.ts:16 storage/invoices). De-risks compliance and accounta… |

### 3.2 Client Delivery & Approval Portal

_For a video/photo studio this is the core product surface, yet today ProjectFile (schema.prisma:222) is written to LOCAL DISK at public/uploads/{projectId} (files/route.ts:107) with a single videoUrl per project, and there is a solid INTERNAL Task approval flow (SUBMITTED->APPROVED/REJECTED + rejectionReason, milestones.ts:91) but NOTHING client-facing to approve final cuts. This theme turns the portal into a real proofing-and-delivery product and removes the local-disk scaling risk._

| Priority | Feature | Effort | Impact | What it is |
|---|---|:--:|:--:|---|
| 🟢 Now | **Cloud media storage migration (S3 / Cloudflare R2 + Mux or Bunny for video)** | M | high | Replace fs.writeFile (files/route.ts:115, projects/upload/route.ts:75, invoice.ts) with object storage + signed URLs, and a video host (Mux/Bunny) for adaptive streaming. Large reels/photo sets on the app server's local disk is a reliabilit… |
| 🟡 Next | **Watermarked previews with pay-to-unlock final assets** | M | high | Serve watermarked/low-res previews of deliverables until the linked Invoice/Milestone is PAID, then unlock originals. Directly couples delivery to billing using the existing Milestone<->Invoice relation (schema.prisma:617). |
| 🟡 Next | **Client proofing & approval on deliverables** | L | high | Extend the proven internal approval pattern (Task SUBMITTED/APPROVED/REJECTED + rejectionReason, schema.prisma:638) to a client-facing 'Approve / Request changes' action on ProjectFile, with timestamped frame-accurate comments on video and… |
| ⚪ Later | **Branded shareable delivery galleries** | M | medium | Password-protected public gallery links for final reels/photo sets that clients can share and bulk-download (zip packs), with PMP branding. Doubles as marketing. |

### 3.3 Lead Pipeline, Smart Booking & Reputation

_ContactInquiry (schema.prisma:344) has only NEW/READ/RESPONDED/ARCHIVED — no owner, stages, follow-up, or conversion to a client. Booking (schema.prisma:259) availability is a naive exact date+timeSlot dedupe (bookings/route.ts:52) with no staff assignment, calendar, or round-robin. Testimonials (schema.prisma:534) are entered by hand. This theme builds the front of the funnel and closes the loop on reputation._

| Priority | Feature | Effort | Impact | What it is |
|---|---|:--:|:--:|---|
| 🟢 Now | **CRM pipeline for inquiries & leads** | L | high | Add real stages (NEW->QUALIFIED->PROPOSAL->WON/LOST), owner assignment, follow-up tasks/reminders, and lead source on top of ContactInquiry/InquiryStatus; converting a WON lead provisions a CLIENT User + Project (reusing ClientContact, sche… |
| 🟡 Next | **Real booking calendar with availability + staff round-robin** | L | medium | Replace exact-slot dedupe (bookings/route.ts:52) with per-staff availability windows, skill/role-based or round-robin assignment using TeamMember (schema.prisma:97), buffers, and 2-way Google Calendar sync. Booking currently can't even prev… |
| 🟡 Next | **Automated review & testimonial collection** | S | medium | When a Project flips to COMPLETED, trigger a WhatsApp/email request, capture a rating + quote, route 5-star clients to a Google review and store the rest as a pending Testimonial (schema.prisma:534) for admin approval. Currently testimonial… |

### 3.4 WhatsApp-First Communications & Notification Infrastructure

_This market lives on WhatsApp, but today all comms are SMTP email (src/lib/email/service.ts) sent INLINE in the request path (bookings/route.ts:87 await Promise.all), and the portal 'notifications' are ephemeral values recomputed each request from recent files/reviews/bookings (dashboard/route.ts:98-164) with NO Notification model, no read/unread, and no push. This theme lays the messaging plumbing every other theme depends on._

| Priority | Feature | Effort | Impact | What it is |
|---|---|:--:|:--:|---|
| 🟢 Now | **Notification system: persistent model + job queue** | M | high | Add a Notification table (user, type, read, payload), move email/WhatsApp sends onto a queue (pg-boss/BullMQ/Upstash) so they stop blocking API requests, and add an in-portal bell with real read state. Replaces the ad-hoc dashboard feed (da… |
| 🟡 Next | **WhatsApp Business API channel** | L | high | Make WhatsApp a first-class channel (Meta Cloud API direct or via 360dialog/Wati/Twilio) for booking confirmations, milestone/delivery alerts, invoice + payment links, and approval requests — with approved bilingual Ar/He templates. Email-o… |
| ⚪ Later | **WhatsApp lead capture + OTP passwordless login** | M | medium | A 'Message us on WhatsApp' entry point that auto-creates a CRM lead, plus WhatsApp OTP as a passwordless login option for the CLIENT portal (auth.ts is username+password only today). Lowers friction for non-technical restaurant/retail owner… |

### 3.5 AI Studio: Productizing Generative Media (the local moat)

_There is ZERO AI code in the repo today, yet the team are heavy operators of Gemini, Higgsfield, Kling, FLUX and Nano Banana. Packaging those into client-facing, metered, recurring upsells is something no local competitor can match — and the schema already stores per-client context (User.industry + User.socialMedia, schema.prisma:25-26) to personalize generations. This is the differentiation flywheel, not a side feature._

| Priority | Feature | Effort | Impact | What it is |
|---|---|:--:|:--:|---|
| 🟡 Next | **AI social-post & caption generator (Gemini)** | M | high | In-portal tool that drafts bilingual (Ar/He) captions, hooks, hashtags, and a monthly content calendar from the client's industry/brand context (User.industry, User.socialMedia). Bundle into PLUS/Infinite retainers or sell as an add-on. Cos… |
| 🟡 Next | **AI ad-variation & showreel generator (Higgsfield / Kling / FLUX)** | L | high | Generate multiple reel/ad and image-creative variants from a brief or a single product photo to feed the paid-ads service (constants.ts package-01). Sold as credit packs. Outputs land in the cloud-storage delivery flow for review/approval. |
| ⚪ Later | **Virality prediction for client reels** | M | medium | Before publishing client reels, score hook strength, attention, retention risk and creative quality (e.g. Higgsfield virality predictor) and surface concrete fixes. A premium 'we predict performance before you post' selling point for the co… |
| ⚪ Later | **AI brand-kit generator** | L | medium | Auto-generate logo concepts, a color palette, type pairing, and a bilingual brand-guideline PDF (reuse @react-pdf/renderer) as a paid onboarding deliverable that seeds the 'visual system' PMP already sells (about copy, schema.prisma HomePag… |
| ⚪ Later | **AI credits / usage metering & billing** | M | medium | Meter AI generations per client and bill them. Use Stripe for ILS, but consider Paddle as merchant-of-record specifically for cross-border digital AI usage to offload VAT/MoR complexity. Underpins every AI upsell as recurring revenue rather… |

### 3.6 Ads & Content Performance Reporting (deliver what's already sold)

_Every retainer explicitly promises Meta ad management plus 'Performance optimization & summary reports' (constants.ts package-01), but there is NO Meta Graph/Marketing API integration anywhere in the codebase — reporting is manual. Automating it is high-retention, high-trust, and differentiated for non-technical SMB clients._

| Priority | Feature | Effort | Impact | What it is |
|---|---|:--:|:--:|---|
| 🟡 Next | **Automated Meta Ads reporting** | L | high | Connect each client's Meta ad account via the Marketing/Graph API, pull spend/reach/CTR/cost-per-result, and render a branded monthly dashboard + PDF in Ar/He, auto-delivered via WhatsApp/email. Replaces hand-built reports for every retaine… |
| ⚪ Later | **Content performance dashboard (IG/FB organic insights)** | M | medium | Pull organic IG/FB insights (reach, saves, shares, follows) for the content PMP produced and tie it back to the specific reels/posts delivered, so creative output is measured, not just shipped. |
| ⚪ Later | **AI plain-language insight summaries on reports** | S | medium | Use Gemini to turn raw ad/content metrics into a short Ar/He 'what worked, what to do next' narrative aimed at non-technical restaurant/retail owners, attached to each monthly report. |

### 3.7 Platform Hardening, Roles & Scale

_Security and ops debt plus growth optionality. Route protection is 64 scattered inline string checks (session.user.role !== 'ADMIN'); src/middleware.ts only sets the locale header (confirmed) and does no auth; there is no audit log and no granular permissions; admin i18n is 3/15 pages (NEXT_STEPS.md). Since PMP builds apps and white-label sites, a client mobile app and multi-tenant mode are natural revenue extensions once money flows through the platform._

| Priority | Feature | Effort | Impact | What it is |
|---|---|:--:|:--:|---|
| 🟡 Next | **Centralized RBAC + middleware auth guard** | M | medium | Replace the 64 inline role string comparisons with a permission helper and an auth matcher in middleware (today it only reads NEXT_LOCALE and sets x-locale). Add finer permissions beyond ADMIN/STAFF/CLIENT (e.g. editor vs viewer staff). Red… |
| 🟡 Next | **Audit log** | S | medium | Add an AuditLog model recording who changed projects, milestones, payments, and users — none exists today. Becomes essential the moment real money moves through invoices/subscriptions. |
| 🟡 Next | **Finish admin panel i18n (Ar/He) + reconcile key drift** | M | low | Localize the remaining ~12 admin pages (NEXT_STEPS.md, ADMIN_LOCALIZATION_STATUS.md) and reconcile the ar/en/he message-file drift (sizes differ: 23KB/18KB/21KB). The admin/staff users are Arabic/Hebrew speakers. |
| ⚪ Later | **Admin analytics & revenue dashboard** | M | medium | Extend /api/admin/stats (currently simple counts, admin/stats/route.ts) and /api/reports/payments into MRR from retainers, pipeline value, AR aging, and staff utilization — a real operating dashboard for the founder. |
| ⚪ Later | **Client mobile app (Flutter or Expo)** | XL | medium | A branded client app over the existing API for projects, deliveries, approvals, invoices and WhatsApp/push — both a product for retainer clients and a live showcase of PMP's app-dev capability (sold in package-03, schema.prisma packageId). |
| ⚪ Later | **Multi-tenant / white-label readiness** | XL | medium | Introduce an Org/Tenant model so PMP can resell the portal to chains or offer it white-labeled as a SaaS — a new recurring revenue line beyond services, leveraging the platform they already maintain. |

---

## 4. Client Attraction & Marketing Strategy

**Positioning**

> Own the angle no other local studio can claim: PMP is the only full-stack creative + tech studio in the Sakhnin / Galilee region that runs a restaurant or retail brand's ENTIRE digital presence on one monthly retainer — the reels and photos, the drone/FPV shots, the paid Meta ads, AND the website/app — in fluent Arabic and Hebrew. Competitors are either a freelance videographer OR a web agency OR an ads guy; PMP replaces all three. Lead every page with that one-throat-to-choke promise plus proof from real local clients ("we already run the content + ads + site for Abu Elhof, La Flamingo, Munches, Sultan…"). Sharpen the differentiators that are genuinely rare locally: in-house drone/FPV cinematography and an in-house dev team (so a restaurant can get a booking/ordering app, not just posts), and quietly use the AI media stack to deliver more reels per retainer at the same price. Secondary message: bilingual-by-default — one studio that speaks to both the Arabic and Hebrew customer of the same town. Anchor the brand on outcomes (foot traffic, reservations, followers) not on "we make beautiful videos," because restaurants buy results, not craft.

### 4.1 Strategies (grouped by channel)

#### Local SEO

- **Ship the missing technical Local-SEO foundation: sitemap, robots, and LocalBusiness/Organization JSON-LD wired to a fully consistent NAP, so PMP can actually rank for 'video production Sakhnin / شركة انتاج سخنين / הפקת וידאו'.**  _(effort M · impact high)_
  - _Why:_ For a town-level service business, the LocalBusiness schema + consistent Name/Address/Phone is what lets Google connect the website to the Google Business Profile and the local pack. Right now there is literally zero structured data and no sitemap/robots, so Google has to guess what PMP is and where it operates. A creative studio in a +972 Arabic+Hebrew town competing with Tel Aviv/Haifa agencies wins on local intent, not generic 'media production' terms.
  - _How:_ 1) Add src/app/sitemap.ts that pulls published Portfolio + BlogPost slugs from Prisma and lists all marketing routes. 2) Add src/app/robots.ts pointing to the sitemap and allowing crawl of public routes only (disallow /admin, /portal, /staff, /api). 3) Create a <JsonLd> component injecting LocalBusiness (better: ProfessionalService) schema: name 'Paxala Media Production', url https://paxaland.com, telephone +972 52-330-0119, address (Sakhnin), geo coordinates, openingHours from siteConfig.businessHours, sameAs the Instagram/Facebook/YouTube/LinkedIn URLs, areaServed listing Sakhnin + nearby towns, plus an itemListElement of services. 4) Create/verify a Google Business Profile with the IDENTICAL NAP, primary category 'Video production service' + secondary 'Marketing agency', and post weekly. 5) Fix the NAP inconsistencies first (see siteChanges) or the schema undermines itself.
  - _Site change:_ Create src/app/sitemap.ts and src/app/robots.ts (neither exists today). Add a reusable JSON-LD component (e.g. src/components/seo/json-ld.tsx) and render LocalBusiness schema in src/app/layout.tsx. Fix og:url in src/app/layout.tsx:78 ('https://www.paxalamedia.com') to match the real domain 'https://paxaland.com' from src/lib/constants.ts:6. Add the missing public/og-image.png, public/favicon.ico, public/apple-touch-icon.png referenced at layout.tsx:82,108-110. Add real geo coordinates + a Google Maps embed in src/app/contact/page.tsx (replace the 'Map integration coming soon' placeholder at line 333).
- **Convert the cookie-only i18n into locale-prefixed URLs (/ar, /he, /en) with hreflang + canonical, so all three language versions are separately indexable instead of collapsing to one URL.**  _(effort XL · impact high)_
  - _Why:_ Today locale is chosen by the NEXT_LOCALE cookie (src/i18n/request.ts, src/lib/locale-actions.ts), so every page has ONE URL whose language depends on a cookie Googlebot doesn't send. Result: Google can only ever index a single language per page and the Arabic + Hebrew content — the exact terms local customers search — is effectively invisible. This is the single biggest SEO blocker. With three real markets (Arabic, Hebrew, English) sharing one town, you need three indexable URL trees and hreflang reciprocity to rank for 'تصوير مطاعم' and 'הפקת וידאו לעסקים' separately.
  - _How:_ 1) Adopt next-intl's routing with a [locale] segment so URLs become /ar/services, /he/services, /en/services (next-intl already installed). 2) Set the default locale strategy (e.g. as-needed prefix or always-prefix) and 301 the old cookie-based URLs. 3) Emit alternates.languages (hreflang ar / he / en + x-default) and a self-canonical via generateMetadata in each page. 4) Keep the existing cookie only as a UX preference for first-visit redirect, not as the source of truth for rendering. This is an XL architectural change — brainstorm the routing approach with the dev team before executing, and treat it as the prerequisite for strategies 3 and 4 paying off.
  - _Site change:_ Restructure src/app to a [locale] route group; rewire src/i18n/request.ts and src/middleware.ts (currently only sets x-locale header) to derive locale from the path; add alternates/hreflang in every generateMetadata; update LocaleSwitcher to navigate between /ar /he /en paths instead of only setting the cookie via src/lib/locale-actions.ts.
- **Give every marketing page its own server-rendered title/description/canonical/OG, and convert the client-rendered portfolio & blog detail pages to server components with VideoObject + Article + BreadcrumbList schema.**  _(effort L · impact high)_
  - _Why:_ Only layout.tsx and booking/page.tsx export metadata, so /services, /packages, /portfolio, /blog, /about, /contact all share one generic title and have no canonical or unique OG — they compete with each other and share poorly on WhatsApp/social. Worse, portfolio/[slug] and blog/[slug] are 'use client' with useEffect fetches, so the actual case-study and article content isn't in the initial HTML and has no per-item metadata — the most rankable, shareable, link-worthy pages are the weakest for SEO. VideoObject schema on portfolio pieces can win video rich results, which is gold for a video studio.
  - _How:_ 1) Add generateMetadata to services, packages, portfolio, blog, about, contact with localized title/description and self-canonical. 2) Refactor src/app/portfolio/[slug]/page.tsx and src/app/blog/[slug]/page.tsx from client components into server components that fetch via Prisma (or the existing API) at request time, then hydrate only the interactive bits (lightbox, video player). 3) Add generateMetadata to both detail routes pulling the item's title/excerpt/coverImage for OG. 4) Emit VideoObject JSON-LD on portfolio items that have videoUrl, and BlogPosting/Article + BreadcrumbList on blog and portfolio. 5) Add generateStaticParams so detail pages are statically generated where possible for fast mobile loads.
  - _Site change:_ Add generateMetadata to src/app/services/page.tsx, src/app/packages/page.tsx, src/app/portfolio/page.tsx, src/app/blog/page.tsx, src/app/about/page.tsx, src/app/contact/page.tsx. Server-render src/app/portfolio/[slug]/page.tsx (currently 'use client' fetching at line 43) and src/app/blog/[slug]/page.tsx; add VideoObject/Article/BreadcrumbList JSON-LD via the seo/json-ld.tsx component.
- **Build dedicated location + service landing pages ('Video production in Sakhnin', 'تصوير وإنتاج للمطاعم', 'הפקת וידאו לעסקים', plus pages per nearby town) instead of relying on one generic /services page.**  _(effort L · impact high)_
  - _Why:_ Local pack and 'near me' rankings reward pages whose URL, H1, and body match '[service] + [town]'. PMP serves a cluster of towns (Sakhnin, Arraba, Deir Hanna, Kaukab, etc. — the client logos already include Kaukab) so one programmatic template per town/service captures long-tail intent that the homepage never will. Restaurants search '[city] مصور مطاعم' / 'צלם מסעדות [city]', not 'creative production studio'.
  - _How:_ 1) Create a data-driven route, e.g. src/app/services/[serviceSlug]/page.tsx (or /[locale]/[service]-[city]) generating one page per service x priority-town combination from a config array. 2) Each page: localized H1 with service+town, 3-4 portfolio pieces filtered to that vertical (restaurant reels, retail shoots), local trust line ('trusted by Munches, La Flamingo, Sultan'), a town-specific FAQ with FAQPage schema, and a WhatsApp + booking CTA. 3) Mine the existing sakhnin-business-search-keywords.txt file in the repo root for the actual terms and town names to target. 4) Internally link these pages from the footer and /services. 5) Keep them genuinely differentiated (different copy/portfolio per town) — not doorway clones.
  - _Site change:_ Add src/app/services/[serviceSlug]/page.tsx (or locale-aware equivalent) with generateStaticParams from a towns x services config; add FAQPage JSON-LD; surface these in src/components/layout/footer.tsx link columns. Reuse the keyword list already in the repo (sakhnin-business-search-keywords.txt).

#### WhatsApp

- **Make WhatsApp the primary, omnipresent lead channel: a floating WhatsApp button on every page + wa.me deep links with pre-filled, context-aware messages, sitting alongside (not replacing) the calendar booking flow.**  _(effort S · impact high)_
  - _Why:_ WhatsApp is the dominant business-contact channel in the +972 Arabic/Hebrew market, yet there is currently ZERO WhatsApp anywhere — only a tel: link (contact/page.tsx:34, footer.tsx:116) and a 4-step calendar-first booking form that forces a cold visitor to pick a date+timeslot before talking to a human. That is heavy friction for someone who just wants to ask 'how much for monthly reels?'. A one-tap WhatsApp with a pre-written message removes that friction and matches how locals actually buy.
  - _How:_ 1) Add a fixed floating WhatsApp button (logical-position bottom-inline-end so it flips correctly in RTL) rendered in src/app/layout.tsx, opening https://wa.me/972523300119 with a localized prefilled text per locale ('مرحبا، حابب أعرف تفاصيل باقات Brand 360' / Hebrew / English). 2) On each package card and the pricing CTA, deep-link to WhatsApp with the package name pre-filled so the chat opens with 'I'm interested in Brand 360+ PLUS'. 3) Add WhatsApp as a contact method on the contact page and footer next to phone/email. 4) Add a 'Chat on WhatsApp' option as step 0 / escape hatch in the booking form for people not ready to schedule. 5) Add whatsapp + tiktok to siteConfig.social. 6) Track clicks as a conversion event for ad attribution.
  - _Site change:_ New src/components/whatsapp-float.tsx mounted in src/app/layout.tsx (use inset-inline-end, not right). Add a WhatsApp entry to contactInfo in src/app/contact/page.tsx:23-48 and to src/components/layout/footer.tsx near the tel: link at line 116. Add whatsapp deep links to the package CTAs in src/app/packages/page.tsx:177-199 and src/components/sections/cta.tsx. Add phoneWhatsapp + social.whatsapp/social.tiktok to src/lib/constants.ts.

#### Website CRO

- **Rebuild the homepage above-the-fold and trust layer to convert: real showreel/hero video, a logo trust-bar high on the page, a star-rating + review-count badge, and a persistent primary CTA (WhatsApp + Book) — optimized for Saudi/Israeli mobile networks.**  _(effort M · impact high)_
  - _Why:_ The site already has portfolio, packages, and booking, so the gap is conversion, not content. A creative studio's #1 trust signal is showing the work in the first 3 seconds (a showreel), immediately backed by recognizable local logos and a review score. The page currently buries clients/testimonials low (ClientsSection near the end of page.tsx) and has heavy framer-motion/gsap/lenis animation that can hurt mobile LCP. Mobile-network performance is make-or-break for the local audience.
  - _How:_ 1) Ensure ScrollVideoHero leads with an autoplay-muted, poster-backed showreel (compressed, AVIF/WebP poster, lazy heavy frames) with a single dominant CTA pair: 'Watch our work' + 'Talk on WhatsApp'. 2) Move a compact client-logo trust-bar directly under the hero (reuse the real logos from ClientsSection clients[] at clients.tsx:11-27). 3) Add a small rating badge ('4.9 from 30+ local businesses') linking to reviews. 4) Add a sticky bottom CTA bar on mobile. 5) Audit the animation stack (framer-motion + gsap + lenis all loaded) — defer/trim to protect LCP; serve the hero video as compressed AVIF/WebP/H.264 with a poster; lazy-load below-fold sections. 6) Run Lighthouse on a throttled mobile profile and target LCP < 2.5s.
  - _Site change:_ Edit src/components/sections/scroll-video-hero.tsx to front a real showreel + dual CTA. Extract the logo marquee from src/components/sections/clients.tsx into a standalone TrustBar rendered high in src/app/page.tsx (reorder the section list at page.tsx:62-70). Add a sticky mobile CTA component. Review next.config.ts image settings and the framer-motion/gsap/lenis usage for mobile performance; provide a poster image for the hero video in public/videos.
- **Reduce pricing friction: replace 'Customized/Custom' with 'starting from ₪X/month' anchors on the packages, and offer a downloadable bilingual pricing/services guide as a lead magnet.**  _(effort M · impact high)_
  - _Why:_ All three packages show 'Customized' or 'Custom' with no number (constants.ts:226,277,318). For an SMB owner, no price signal = anxiety = they bounce or assume it's out of budget. A transparent-ish 'starting from' anchors expectations, filters out tyre-kickers, and dramatically lifts qualified leads, while still leaving room to quote per-scope. A downloadable guide captures the visitors who aren't ready to talk but will trade an email/WhatsApp for pricing.
  - _How:_ 1) Add a 'starting from' price to each package tier (keep 'final price tailored to scope' as subtext) in the packages data. 2) Show a monthly anchor + the 3-month minimum on Brand 360 clearly. 3) Build a gated lead magnet: a polished PDF 'PMP Packages & Pricing Guide' (Arabic + Hebrew) generated with the already-installed @react-pdf/renderer, delivered to WhatsApp/email after a 1-field form. 4) Capture these as ContactInquiry leads with a 'pricing-guide' source tag for follow-up. 5) A/B test 'starting from' vs 'Custom' on conversion to booking/WhatsApp.
  - _Site change:_ Add startingPrice/currency to each entry in the packages array in src/lib/constants.ts:217-365 and render it in src/app/packages/page.tsx:132-151 (currently branches on price.startsWith('Custom')) and in the homepage PackagesSection. Add a /pricing-guide lead-capture component + a @react-pdf/renderer document, posting to a new lead route that writes a ContactInquiry (reuse /api/contact pattern).

#### Social Proof

- **Replace the fake placeholder testimonials with REAL local client reviews wired to the Testimonial DB model, add star ratings + Review/AggregateRating schema, and launch a systematic Google-review collection loop.**  _(effort M · impact high)_
  - _Why:_ This is a credibility leak: the homepage shows invented American testimonials ('Sarah Johnson, Tech Innovations'; 'Michael Chen, StartUp Hub'; 'Emily Davis, Creative Co' — hardcoded in clients.tsx:30-60) right next to REAL local restaurant/retail logos (Abu Elhof, La Flamingo, Munches, Sultan). Any local prospect who knows these brands instantly senses the mismatch. Meanwhile a fully multilingual Testimonial model already exists in the schema but isn't used on the public site. Real Arabic/Hebrew testimonials with names + photos + business names are the highest-trust asset a local studio has, and Review schema can surface star ratings in search results.
  - _How:_ 1) Collect 8-12 real testimonials (Arabic + Hebrew) from current retainer clients — short video clips are ideal; quotes minimum. 2) Populate the existing Testimonial model (schema.prisma:534) and the admin testimonial manager. 3) Rewire src/components/sections/clients.tsx to render testimonials from the DB/API instead of the hardcoded testimonials[] array, with client photo, business name, and locale-aware quote. 4) Add a star rating per testimonial and emit AggregateRating/Review JSON-LD. 5) Build a post-delivery review loop: when a project/milestone is marked complete, auto-send (via the existing nodemailer setup) a thank-you with a one-tap Google review link in the client's language. 6) Add a 'Reviews' GBP link and embed the live Google rating badge.
  - _Site change:_ Edit src/components/sections/clients.tsx to fetch real entries from the Testimonial model (drop the placeholder array at lines 30-60). Add Review/AggregateRating JSON-LD via seo/json-ld.tsx. Add a post-completion review-request email template under src/lib/email/templates and trigger it from the milestone/project completion path. Optionally add a rating field to the Testimonial model in prisma/schema.prisma.

#### Content

- **Productize delivered work into outcome-driven case studies: extend the Portfolio model with results/metrics + before/after, and template a 'Challenge → What we did → Results' layout with ROI numbers.**  _(effort L · impact high)_
  - _Why:_ The Portfolio model captures title/description/content/clientName/tags/video but has NO results fields (schema.prisma:149-175), so the portfolio reads as a showreel, not as proof of business impact. Restaurants and retailers buy outcomes (reservations, foot traffic, reach, follower growth, sales), not cinematography. A case study that says 'La Flamingo: +180% reach, +35 reservations/week from 3 reels/month' is the most persuasive page you can have and is exactly what justifies a monthly retainer over a one-off shoot.
  - _How:_ 1) Add resultsEn/Ar/He (rich text) + a structured metrics JSON (label, before, after, delta) + optional beforeImage/afterImage to the Portfolio model. 2) Update the admin portfolio editor to capture them. 3) Build a case-study template in portfolio/[slug] (the server-rendered version from strategy 3): hero result stat band, before/after slider, embedded reel, the retainer used, and a 'Get the same for your brand' WhatsApp CTA. 4) Produce 4-6 flagship case studies from existing retainer clients across verticals (restaurant, retail, chain). 5) Link them from the relevant location/service landing pages and from the packages page as proof per tier.
  - _Site change:_ Add results/metrics/before-after fields to model Portfolio in prisma/schema.prisma:149-175 (migration). Extend the admin portfolio form (src/app/admin/portfolio/[id]). Build the case-study layout in the server-rendered src/app/portfolio/[slug]/page.tsx. Reference case studies from src/app/packages/page.tsx and the new location/service pages.
- **Build an interactive 'Free Reels-Idea Generator' lead magnet on the site that uses PMP's own AI stack to generate 5 tailored reel ideas for a visitor's business in their language.**  _(effort L · impact medium)_
  - _Why:_ It's a self-demonstrating differentiator: a restaurant owner enters their business + city, gets 5 genuinely usable Arabic/Hebrew reel hooks in seconds, and experiences PMP's creative + AI capability before paying anything. It captures a lead, generates shareable output (free reach), and naturally up-sells 'we'll actually shoot and edit these for you' into the retainer. It also produces unique, indexable content and showcases the AI capability the operator already works with (Gemini/media APIs).
  - _How:_ 1) Build /reels-ideas: form (business type, city, language, vibe) → server route calls an LLM (Gemini is already in the operator's stack and cheap) to return 5 localized reel concepts with hook + shot list. 2) Show 3 free, gate the last 2 behind a WhatsApp/email capture → creates a ContactInquiry. 3) Add 'Want us to produce these? → WhatsApp' CTA on the results. 4) Rate-limit + cache to control cost; log per-request IDs. 5) Make results shareable (OG image per result set) for organic reach. 6) Cross-promote on Instagram/TikTok ('try our free reel-idea tool, link in bio').
  - _Site change:_ Add src/app/reels-ideas/page.tsx + a server route under src/app/api/ (e.g. /api/tools/reels-ideas) calling the LLM with strict typed Pydantic-style validation on input; gate results into a ContactInquiry capture; add generateMetadata + tool to nav/footer. Add an env var for the LLM key (ask before adding).
- **Run seasonal campaign landing pages tied to local moments — Ramadan/Eid, back-to-school, summer, and Hebrew-calendar holidays — with time-boxed retainer offers.**  _(effort M · impact medium)_
  - _Why:_ Restaurant and retail demand spikes around Ramadan/Eid and holiday seasons, and that's exactly when they urgently need content and ads — a natural trigger to sign a retainer or a short campaign. A bilingual seasonal page ('Get your restaurant Ramadan-ready: reels + ads package') with urgency and a deadline converts far better than evergreen messaging, and the same pages rank year over year for seasonal local searches.
  - _How:_ 1) Build a reusable seasonal-campaign template (hero, offer, what's included, countdown, WhatsApp CTA, relevant case studies). 2) Spin up pages ~4-6 weeks before each key date: Ramadan/Eid (Arabic-led), Hebrew holidays (Hebrew-led), summer, year-end. 3) Bundle a limited 'campaign' SKU (e.g. 6 reels + ads for the month) as an on-ramp to the full retainer. 4) Drive Meta ads + WhatsApp broadcast to existing leads. 5) Reuse pages annually (update dates/creative) so the URL accrues SEO. 6) Localize the offer emphasis per audience (Egyptian-casual vs MSA vs Hebrew).
  - _Site change:_ Add a seasonal-campaign route (e.g. src/app/campaigns/[slug]/page.tsx) driven by a SiteSetting/HomePageContent-style record so the team can launch new seasons from admin without a deploy; include localized copy + countdown + WhatsApp CTA + case-study references; add generateMetadata + seasonal keywords; feature an active campaign banner on the homepage.

#### Offers

- **Launch a low-friction front-end offer — 'Free Brand Audit + one free sample Reel' — as the top-of-funnel entry that feeds the retainer.**  _(effort M · impact high)_
  - _Why:_ Retainers are a big commitment to ask of a cold lead; the booking form jumps straight to scheduling a paid-feeling consultation. A free, concrete, low-risk first step (audit their current Instagram + deliver one free reel concept/cut) is a proven local-services funnel: it demonstrates quality, starts a relationship, and creates reciprocity that converts to the monthly Brand 360 package. It also gives the sales conversation a reason to exist.
  - _How:_ 1) Build a dedicated /free-audit landing page: promise, what they get, 3 sample audit outputs, and a short form (business name, Instagram handle, WhatsApp, vertical). 2) Auto-create a ContactInquiry + notify the team. 3) Deliver the audit as a short Loom/reel within 48h, ending with a tailored package recommendation and a WhatsApp CTA. 4) Use the AI media stack to make the free sample reel cheap to produce at scale (eat your own dog food). 5) Promote this offer in Meta ads and the WhatsApp auto-reply. 6) Add the offer as a banner/CTA on the homepage and packages page.
  - _Site change:_ Add src/app/free-audit/page.tsx with a localized form posting to a new lead API route (reuse the /api/contact + ContactInquiry model + nodemailer flow). Add an InquiryStatus/source field to tag 'free-audit' leads in the admin inquiries view. Add a promo banner/CTA in src/app/page.tsx and src/app/packages/page.tsx.

#### Social

- **Stand up an Instagram/TikTok Reels funnel that republishes client work + behind-the-scenes (drone/FPV, 3D, AI) and routes every CTA to the website's WhatsApp entry — with the site embedding the live feed as fresh social proof.**  _(effort M · impact medium)_
  - _Why:_ Reels are how local restaurants/retail discover a content studio — the best ad for a video studio is its own video. PMP already produces reels for clients; repackaging the best ones plus BTS of the rare capabilities (drone/FPV, 3D, AI-assisted edits) positions PMP as the most advanced studio in the area. There's currently no TikTok in the social config and the social proof on-site is static; an embedded live feed keeps the homepage fresh and feeds the organic-to-WhatsApp loop.
  - _How:_ 1) Add a TikTok account + add tiktok/whatsapp to siteConfig.social. 2) Post 3-5 reels/week: client results, BTS drone shots, 'how we made this reel', before/after edits. 3) Every caption + bio link → paxaland.com/free-audit or WhatsApp. 4) Embed a lightweight Instagram/TikTok feed section on the homepage and a 'Latest Reels' strip on service pages. 5) Pin a 'how to get reels like these monthly' highlight pointing to packages. 6) Repurpose every published Portfolio item into a vertical reel automatically.
  - _Site change:_ Add tiktok + whatsapp to social in src/lib/constants.ts:10-15 and surface them in footer + contact social arrays. Add a 'Latest Reels' embed section component used on src/app/page.tsx and the service/location pages. Update OG/social handles referenced in src/app/layout.tsx openGraph/twitter.

#### Paid

- **Eat your own dog food: run Meta lead/traffic ads for PMP itself driving to /free-audit and the WhatsApp CTA, and on the site showcase 'Ads we've run for clients' with real performance numbers.**  _(effort M · impact high)_
  - _Why:_ PMP sells Meta paid-ads management but a prospect's first question is 'do your own ads even work?'. Running visible ads for PMP and then showing a 'Our Ads in Action' gallery with metrics (CTR, reach, cost-per-lead, sales lift) is the most credible proof you can sell ad-management with. It also directly fills the funnel: ads → /free-audit → WhatsApp → retainer. Since they already run client ads, the creative and Pixel competence exists; they just need to point it at themselves and instrument the site.
  - _How:_ 1) Install the Meta Pixel + Conversions API and define events: WhatsApp-click, free-audit-submit, booking-complete, pricing-guide-download. 2) Run campaigns: cold reels → free-audit lead form; retargeting site visitors → packages/WhatsApp. 3) Add an 'Ads in Action' section to /services (Social Media / Paid Ads service) with 3-4 real client ad creatives + anonymized result metrics. 4) Use the AI stack to spin ad-creative variants cheaply for testing. 5) Feed offline conversions (closed retainers) back to Meta for optimization.
  - _Site change:_ Add the Meta Pixel/CAPI loader in src/app/layout.tsx and fire events from the WhatsApp float, booking-form submit (src/components/forms/booking-form.tsx), contact form (src/app/contact/page.tsx), and lead-magnet routes. Add an 'Ads in Action' proof block to the paid-ads service detail (src/app/services). Ensure UTM params are captured into ContactInquiry for attribution.

#### Referral

- **Launch a structured referral/affiliate program for existing retainer clients and partners, surfaced and tracked through the client portal.**  _(effort M · impact medium)_
  - _Why:_ Existing happy retainer clients (restaurants/retail) talk to other local owners constantly — word of mouth is the strongest channel in a tight-knit Arabic/Hebrew business community. A formalized incentive (e.g. one free reel or a month discount per referred client who signs) turns passive goodwill into a predictable acquisition channel at near-zero CAC. The client portal already exists, giving a natural place to host referral links and track status.
  - _How:_ 1) Define the offer (referrer reward + referred-discount). 2) Add a 'Refer a business' section in the client portal dashboard generating a unique referral code/link and showing referral status + earned rewards. 3) Tag inbound ContactInquiry/Booking with the referral code for attribution. 4) Add a simple admin view of referrals and payouts. 5) Promote it via the post-delivery email and WhatsApp. 6) Extend the same mechanic to non-client partners (see partnerships) as an affiliate tier.
  - _Site change:_ Add a referral code field to User/ClientContact (or a small Referral model) in prisma/schema.prisma; add a referral panel to the portal dashboard (src/app/portal/dashboard); accept a ref param in the booking form (src/components/forms/booking-form.tsx) and /api/bookings + /api/contact, persisting it onto Booking/ContactInquiry; add an admin referrals view.

#### Partnerships

- **Build local co-marketing partnerships — event venues, real-estate agencies, restaurant suppliers, and the local business association — with a dedicated 'Partners' page and revenue-share.**  _(effort M · impact medium)_
  - _Why:_ Venues, realtors, and suppliers all repeatedly need exactly PMP's services (drone tours, property reels, product photography) and all touch the same pool of local SMBs PMP wants as retainer clients. A referral/affiliate arrangement with them is a high-trust, low-cost pipeline. Real-estate in particular is a perfect fit for the rare drone/FPV capability. A partner program also creates backlinks (local SEO) and co-branded content.
  - _How:_ 1) Identify 5-10 anchor partners (a real-estate agency, an event hall, a restaurant supplier, the local business association/chamber). 2) Offer them an affiliate cut (reuse the referral mechanic) or a bundled 'shoot every new listing/event' rate. 3) Build a /partners page explaining the program with a sign-up form. 4) Pitch drone/FPV property tours to realtors as the wedge. 5) Co-host a free 'how local businesses win with reels + ads' workshop with the business association for lead-gen. 6) Exchange links / get listed on partner sites for local backlinks.
  - _Site change:_ Add src/app/partners/page.tsx with a partner-application form (writes a tagged ContactInquiry) and generateMetadata. Add partner logos/links section (reuse ClientLogo model) for backlink exchange. Link /partners from the footer.

---

## 5. Prioritized Action Plan

This merges the audit fixes (§2) with the roadmap (§3) and marketing (§4) into one sequence. Do it top-down.

### 🚑 This week — security & integrity hot-fixes (no new features)

1. **Rotate the leaked GitHub token** (`DEP-02`) and scrub it from the remote URL; use a credential helper, not an inline URL.
2. **Lock down file delivery** (`SEC-01`, `SEC-02`): add ownership/role checks to `projects/[id]/files` routes; move uploads
   out of `public/` into `/storage` and stream them through an authenticated, `path.basename`-guarded handler (mirror the
   working invoice-download route); actually `unlink` files on delete.
3. **Capture the localization columns into a real Prisma migration** (`DEP-01`) so deploys are reproducible.
4. **Fix the task-approval bypass** (`CORR-02`) and audit the other project-data routes for the same ownership-check gap.
5. **Compress + poster the 41 MB hero video** (`PERF-01`) — biggest single mobile-performance win.

### 📅 Next 30 days — make the portal reachable & findable

1. ~~**Stripe Checkout "Pay now"** on the existing invoice surface~~ — **⛔ skipped** (payment-gateway integration parked per owner decision, 2026-06-26; see §6).
2. **WhatsApp-first lead capture**: floating button + `wa.me` deep links with pre-filled context on every page (marketing §4, _High_).
3. **Local SEO foundation**: locale-prefixed URLs (`/ar` `/he` `/en`) + `hreflang` + `LocalBusiness`/`Organization` JSON-LD +
   `sitemap`/`robots` (fixes `SEO-02`; marketing §4.1). This is the single biggest organic-demand unlock.
4. **Replace placeholder testimonials with real client reviews** wired to the `Testimonial` model + `AggregateRating` schema.
5. **Add `prefers-reduced-motion`** (`A11Y-02`) and finish localizing the public booking/contact forms (`I18N-UI-01`).

### 🚀 This quarter — automation & the AI moat

1. ~~**Recurring retainer subscriptions** (Stripe Billing) — turn the static packages into auto-billed monthly plans~~ — **⛔ skipped** (payment-gateway integration parked per owner decision, 2026-06-26; see §6).
2. **Notification system + job queue** so emails/WhatsApp stop blocking API requests (roadmap §3.4).
3. **CRM pipeline for inquiries** (NEW → QUALIFIED → PROPOSAL → WON/LOST) with owner + follow-ups (roadmap §3.3).
4. **First AI upsell**: in-portal bilingual caption/hashtag + monthly content-calendar generator (Gemini) (roadmap §3.5).
5. **Automated Meta-ads reporting** — deliver the report you already sell, automatically (roadmap §3.6).
6. **Growth funnel**: "Free Brand Audit + 1 free sample Reel" landing page → WhatsApp → retainer; outcome-driven case studies
   with real numbers (marketing §4.1, _Offers_/_Content_).

### 🌅 Later — platform leverage

WhatsApp Business API channel · AI ad-variation & showreel generator · centralized RBAC + middleware guard · audit log ·
admin analytics/MRR dashboard · client mobile app (Flutter/Expo over the existing API) · multi-tenant / white-label SaaS.

---

## Appendix — Method & Confidence

- Findings were produced by 5 specialized audit agents (security, correctness, i18n/RTL, frontend/UX, build/deploy),
  then **each high/critical finding was independently re-read by a separate adversarial verifier** prompted to *refute* it;
  2 claim(s) were dropped as false-positive. Medium/low findings are reported as-found.
- The security-critical paths (file ACLs, invoice download, user creation, portal project access, registration, password
  reset, rate-limiting, XSS surface, the leaked token, locale key drift) were **also verified by hand** and corroborated.
- Severities shown reflect the verifier’s *adjusted* severity where it differed from the original.
- §1–§5 are analysis. **§6 below tracks the fixes actually implemented** against this plan.

---

## 6. Implementation Progress Log

> Started 2026-06-26. Tracks which plan items have been built. Each change was type-checked
> (`tsc --noEmit` → **0 errors across the project**) and lint-checked (no new lint issues introduced).
> The app was **not** run in this session (per workflow constraint), so items marked _needs runtime
> verification_ should be smoke-tested before deploy.

### ✅ Done (committed to the working tree)

| Item | Severity | What changed | Files |
|---|---|---|---|
| **SEC-01 — IDOR on project files** | 🟠 High | Added a shared project-access check (`canAccessProject` / `getProjectForAccess`) and enforced it on the file **GET (list)** and **GET (single)** routes, plus the `/api/files` list route (now also covers STAFF). A CLIENT can no longer read another client's files. | `src/lib/authz.ts` (new), `src/app/api/projects/[id]/files/route.ts`, `src/app/api/projects/[id]/files/[fileId]/route.ts`, `src/app/api/files/route.ts` |
| **SEC-02 (part) — delete leaves files on disk** | 🟠 High | Both file DELETE handlers now actually `unlink` the underlying upload via a containment-guarded `deleteLocalUpload` helper (only removes files under `/public/uploads`; safe no-op for external links). | `src/lib/storage.ts` (new), `src/app/api/files/route.ts`, `src/app/api/projects/[id]/files/[fileId]/route.ts` |
| **SEC-02 (part) — upload hardening** | 🟠 High | The binary upload route now rejects files over **500 MB** (`413`) and any MIME type outside an allowlist (`415`) before writing to disk. | `src/app/api/files/route.ts` |
| **CORR-02 — task-approval bypass** | 🟠 High | Rewrote the project-scoped task `PUT`: guarded partial update (no more nulling `description`/`dueDate` on partial edits); status validated against the enum **and** the `getValidNextStatuses` transition graph; **only an ADMIN or the assignee's manager can APPROVE/REJECT** (closes STAFF self-approval); stale approval/rejection metadata cleared on downgrade. | `src/app/api/projects/[id]/milestones/[milestoneId]/tasks/[taskId]/route.ts` |
| **PERF-01 — 41 MB hero video** | 🔴 Critical | Transcoded the hero to a **2.15 MB** optimized H.264 (`video-optimized.mp4`, **95% smaller**) and generated a **104 KB** `hero-poster.jpg`. The hero now paints the poster instantly (LCP) and only mounts the video on desktop **and** when `prefers-reduced-motion` is not set (via `useSyncExternalStore`, SSR-safe) — mobile/reduced-motion users download only the poster. Original `video.mp4` kept as a fallback `<source>`. Partially addresses **A11Y-02** (reduced motion) for the hero. | `src/components/sections/scroll-video-hero.tsx`, `public/videos/hero-poster.jpg` (new), `public/videos/video-optimized.mp4` (new) |
| **WhatsApp lead CTA** (marketing §4) | — Growth | Global floating WhatsApp button (RTL-aware via logical `end-6`; reduced-motion-safe pulse) with **context-aware pre-filled messages** per page (home/services/packages/portfolio/contact), localized in **ar/he/en**. Hidden on `/portal`, `/admin`, `/staff`. Added a WhatsApp link to the footer. Uses `+972 52-330-0119` → `wa.me/972523300119`. _Chosen as the first 30-day item after payments were parked._ | `src/components/layout/floating-whatsapp.tsx` (new), `src/app/layout.tsx`, `src/components/layout/footer.tsx`, `src/lib/constants.ts` (`getWhatsAppUrl`), `src/messages/{ar,en,he}.json` (`whatsapp` namespace) |
| **Local SEO foundation** (marketing §4.1, **SEO-01/SEO-02 partial**) | 🟠 High | Added `sitemap.xml` (static routes + published blog/portfolio, DB-resilient) and `robots.txt` (disallows `/admin` `/portal` `/staff` `/api`). Added site-wide **Organization + LocalBusiness/ProfessionalService JSON-LD** (NAP, geo, opening hours, `sameAs` socials, `knowsLanguage` ar/he/en). Gave the client marketing pages real **per-page title/description/canonical/OG** via lightweight server segment-layouts (services, packages, portfolio, about, contact, blog) plus **dynamic `generateMetadata`** for `portfolio/[slug]` & `blog/[slug]`. Generated the missing `og-image.png` (1200×630). Centralized canonical domain via `SITE_URL`. | `src/lib/seo.ts` (new), `src/components/seo/json-ld.tsx` (new), `src/app/{robots,sitemap}.ts` (new), `src/app/{services,packages,portfolio,about,contact,blog}/layout.tsx` + `…/[slug]/layout.tsx` (new), `src/app/layout.tsx`, `public/og-image.png` (new) |
| **Real testimonials + AggregateRating** (marketing §4.1 Social Proof) | 🟠 High | Replaced the 3 hardcoded fake testimonials (Sarah Johnson / Michael Chen / Emily Davis) with **real, DB-backed testimonials** fetched server-side from the `Testimonial` model (localized ar/he/en, ordered, `isActive`), with a 5-star display. Block auto-hides when there are none (no fake content). Emits server-side **Review + AggregateRating JSON-LD**. Also fixed a pre-existing **hydration bug** (clients row used `Math.random()` during render) and the broken `useState`-as-`useEffect` auto-rotate. | `src/components/sections/clients.tsx`, `src/components/seo/testimonials-json-ld.tsx` (new), `src/app/page.tsx` |
| **Testimonials admin CRUD** | — Feature | Full admin management for testimonials so the owner can self-serve: list (with active/inactive badges, 5★, order), create/edit form with **ar/he/en tabs** (`LocalizedInput`), optional photo upload, order + active toggle, and delete. New REST routes `GET/POST /api/testimonials` and `GET/PUT/DELETE /api/testimonials/[id]` — all mutations **ADMIN-gated** server-side (`?allLocales=true` admin-only). Added a **Testimonials** entry to the admin sidebar (localized label in all 3 locales). | `src/app/api/testimonials/route.ts` (new), `src/app/api/testimonials/[id]/route.ts` (new), `src/app/admin/testimonials/page.tsx` (new), `src/app/admin/testimonials/[id]/page.tsx` (new), `src/components/admin/sidebar.tsx`, `src/messages/{ar,en,he}.json` |
| **Public form hardening** (security finding: contact/booking are an unauth email-relay/DoS surface) | 🟡 Medium | Added a dependency-free **per-IP rate limiter** (5 / 10 min, in-memory — fine for the single `standalone` instance), a **honeypot** field (hidden `website` input; bots that fill it get a silent fake-success), **email-format validation**, and **input length caps** to both `/api/contact` and `/api/bookings` (the booking endpoint sends 2 emails/request). | `src/lib/security.ts` (new), `src/app/api/contact/route.ts`, `src/app/api/bookings/route.ts`, `src/app/contact/page.tsx`, `src/components/forms/booking-form.tsx` |

| **Accessibility & UX polish** (audit A11Y-01/A11Y-04/STATE-01/PERF-02/PERF-03) | 🟡 Medium | Re-enabled pinch-zoom (removed `maximumScale`/`userScalable` — WCAG 1.4.4); associated all contact-form labels with inputs (`htmlFor`/`id`); added route-level `not-found.tsx` / `error.tsx` / `loading.tsx`; parallelized the homepage's 3 server fetches (`Promise.all`); added `sizes` to the 3 `next/image fill` usages in the portfolio grid (avoids oversized downloads, incl. an 80px thumb that was pulling full-res). | `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/contact/page.tsx`, `src/app/{not-found,error,loading}.tsx` (new), `src/components/sections/portfolio-grid.tsx` |

### 🔎 Self-review pass (2026-06-26)

Ran a 6-agent adversarial review over the whole session's diff (each high/critical finding independently
re-verified). Result: **0 critical, 0 high, 0 refuted** — the changes are sound. 9 medium/low findings surfaced;
the legitimate ones were fixed:

- **Canonical leak (medium, verified) — fixed.** The root layout's blanket `alternates.canonical = SITE_URL`
  made every non-overriding route (e.g. `/booking`) claim the homepage as its canonical → Google would treat
  them as duplicates. Removed the blanket canonical; added self-canonicals to `/` (`src/app/page.tsx`) and
  `/booking`. Segment-layout pages already set their own.
- **Rate-limit IP spoofing (medium) — fixed.** `getClientIp` used the spoofable left-most `X-Forwarded-For`;
  now prefers `x-real-ip`, then the right-most XFF hop (documented proxy caveat).
- **Rate-limit map unbounded (low) — fixed.** Added a hard `MAX_BUCKETS` cap with oldest-entry eviction.
- **Testimonials PUT validation (low) — fixed.** Added the same required-field guard the POST has.
- **JSON-LD `</script>` escaping (low) — fixed.** Both JSON-LD scripts now escape `<` so text can't break out.
- **Unknown detail pages indexable (low) — fixed.** `portfolio/[slug]` & `blog/[slug]` fallback metadata is now `noindex`.
- **Dead approval-downgrade branch (low) — fixed.** Removed unreachable code (APPROVED is terminal in the transition graph).
- **5★ AggregateRating (low) — left as-is**, intentionally — it's the documented data trade-off (no `rating` column yet).

### ⏳ Pending — needs you (cannot be done safely from here)

- **DEP-02 — rotate the leaked GitHub PAT.** I won't rotate keys for you. Revoke the token at
  `github.com/settings/tokens`, then reset the remote to drop the inline credential:
  `git remote set-url origin https://github.com/karimmohamed20/paxala-media.git` and authenticate via a
  credential helper / SSH instead. _(Until rotated, treat the token as compromised.)_
- **DEP-01 — capture the 192 localization columns as a real Prisma migration.** Needs DB access and
  `prisma migrate` (schema migration — your rule is "ask first"). Suggested: temporarily revert
  `schema.prisma` to pre-localization → `prisma migrate dev --name add_localization` to capture the
  additive columns → backfill (old→En, En→Ar/He) → drop legacy columns; then delete
  `prisma/migrations/add_localization_manual.sql`. Verify with `prisma migrate diff`.
- **SEO — pick ONE canonical domain and set `NEXT_PUBLIC_SITE_URL`.** The repo mixes `paxaland.com`
  (siteConfig/email), `paxalamedia.com` and `www.paxalamedia.com` (old OG tag) — this splits ranking
  signals. The new sitemap/robots/JSON-LD/canonical all read `SITE_URL = NEXT_PUBLIC_SITE_URL || siteConfig.url`
  (defaults to `https://paxaland.com`). Decide the real domain, set the env var in prod, and 301-redirect the
  others to it.
- **Testimonials — add the real ones.** The DB has none (the seed creates none), so the testimonials block is
  currently **hidden** until rows exist in the `Testimonial` table. ✅ An **admin UI now exists** at
  `/admin/testimonials` (create/edit/delete, ar/he/en) — just log in as ADMIN and add real client quotes. Use the
  real clients already shown as logos (Abu Elhof, La Flamingo, Munches, Sultan…).
- **AggregateRating uses 5★ as a placeholder.** The `Testimonial` model has **no `rating` column**, so the
  Review/AggregateRating markup emits 5★ to match the stars shown on each card. To publish *honest* averaged
  ratings (and avoid Google penalising fabricated review markup), add a `rating Int` field + collect real ratings,
  then compute the average in `testimonials-json-ld.tsx`. Adding that column needs a migration (see DEP-01).

### 🔜 Recommended next (implemented partially / deferred for runtime verification)

- **SEC-02 (full) — move client deliverables out of `/public`.** The unlink + ACL + upload-hardening above
  shrink the exposure, but binary deliverables are still written under `public/uploads` (served statically,
  no auth). The complete fix is to write new uploads to a private `storage/project-files/<projectId>` dir and
  stream them through an authenticated, `path.basename`-guarded route (mirror the invoice-download handler),
  resolving each file's href in the 3 consumers (`admin/project/files-tab.tsx`, `portal/files/page.tsx`,
  `portal/projects/[slug]/page.tsx`) via a helper, plus a one-off migration of existing files + DB URLs.
  **Added complication discovered:** the admin file uploader (`files-tab.tsx`) posts to the **shared**
  `/api/projects/upload` endpoint — the *same* one used for public portfolio/team/testimonial images
  (`public/uploads/portfolio/`). So deliverables and public images share one upload path; the fix needs a
  **separate deliverable-upload endpoint** writing to private storage, not a change to the shared one (which
  would break public images). Deferred — needs the app running to verify image/video rendering through the
  authed serve route. _Recommended as a dedicated, runtime-verified session._
- **Pre-existing lint debt noticed while editing:** `HeroContent` uses `[key: string]: any` and
  `images.remotePatterns` allows `hostname: "**"` (any HTTPS host → image-optimizer abuse vector). Out of scope
  for this pass; logged here so they're not lost.

### ⛔ Scope decisions

- **2026-06-26 — Payment-gateway integration is OUT OF SCOPE.** Owner decided to skip online payments. This
  parks the roadmap's _Online invoice payment (Stripe/local gateway/Bit)_ and _Recurring retainer subscriptions
  (Stripe Billing)_ items (§3.1, §5). Manual payment tracking via `/api/milestones/[id]/payment` stays as-is.
  Adjacent non-payment work in §3.1 (quote/proposal builder, VAT invoice fields, accounting-provider export) is
  **not** affected by this decision. Do not re-propose payment-gateway integration unless the owner reopens it.

