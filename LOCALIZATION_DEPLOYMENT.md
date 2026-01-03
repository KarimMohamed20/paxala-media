# 🌍 Localization Deployment Guide

## Overview
This guide covers deploying the **localized** version of Paxala Media Production with support for **English, Arabic (العربية), and Hebrew (עברית)**.

---

## 📋 What's Included in Localization

### Frontend Localization ✅
- **3 languages**: English (default), Arabic, Hebrew
- **RTL support**: Automatic right-to-left layout for Arabic and Hebrew
- **URL-based routing**: `/en`, `/ar`, `/he`
- **Language switcher**: UI component for changing languages
- **SEO optimized**: hreflang tags, localized meta tags

### Admin Panel Localization ✅  
- **21 pages** fully localized (UI elements only)
- **Portal pages** (6): Dashboard, Projects, Project Detail, Bookings, Files, Settings
- **Admin pages** (15): Dashboard, Services, Team, Blog, Portfolio, Projects, Bookings, Inquiries, Approvals, Payment Reports, Users, etc.
- **Translation keys**: 200+ UI translation keys in all languages

### Database Localization ✅
- **7 tables** with multilingual content:
  1. TeamMember (name, role, bio, skills)
  2. Service (name, description, features)
  3. Portfolio (title, description, content, tags)
  4. BlogPost (title, excerpt, content, tags)
  5. ClientLogo (name)
  6. Testimonial (quote, author, role, company)
  7. HomePageContent (50+ fields for homepage content)

---

## 🗄️ Database Migration - CRITICAL STEP

### ⚠️ IMPORTANT: Backup First!

**Before running ANY migrations:**

```bash
# Create backup
docker-compose exec postgres pg_dump -U paxala paxala_media | gzip > backup_pre_localization_$(date +%Y%m%d_%H%M%S).sql.gz

# Or if deploying to server:
./scripts/deploy.sh backup
```

### Migration Overview

The localization migration (`prisma/migrations/add_localization_manual.sql`) performs:

1. **Adds new localized columns** for each table (En, Ar, He versions)
2. **Copies existing English data** to all language columns
3. **Sets NOT NULL constraints** on required fields
4. **Drops old single-language columns**

**Example transformation:**
```sql
-- Before:
Service { name: "Video Production", description: "..." }

-- After:  
Service {
  nameEn: "Video Production",
  nameAr: "Video Production",  # Initially copied from English
  nameHe: "Video Production",  # Initially copied from English
  ...
}
```

---

## 🚀 Deployment Process

### Method 1: Docker Deployment (Recommended)

#### Step 1: Prepare Environment

```bash
cd /var/www/paxala-media  # or your project directory

# Ensure you have latest code
git pull origin main

# Verify translation files exist
ls -la src/messages/
# Should show: en.json, ar.json, he.json
```

#### Step 2: Run Localization Migration

**Option A: Using Docker Compose with migration file**

```bash
# 1. Start database only
docker-compose up -d postgres

# 2. Wait for database to be ready
sleep 10
docker-compose exec postgres pg_isready -U paxala

# 3. Copy migration file to container
docker cp prisma/migrations/add_localization_manual.sql pmp_postgres:/tmp/

# 4. Run migration
docker-compose exec postgres psql -U paxala -d paxala_media -f /tmp/add_localization_manual.sql

# 5. Verify migration succeeded
docker-compose exec postgres psql -U paxala -d paxala_media -c "\d \"Service\""
# Should show: nameEn, nameAr, nameHe, descriptionEn, descriptionAr, descriptionHe, etc.
```

**Option B: Using Prisma Migrate (Alternative)**

```bash
# If you're using Prisma's migration system
docker-compose exec app npx prisma migrate deploy
docker-compose exec app npx prisma generate
```

#### Step 3: Build and Deploy Application

```bash
# Build with latest code including localization
docker-compose build app

# Start all services
docker-compose up -d

# Check health
docker-compose ps
docker-compose logs -f app
```

#### Step 4: Verify Localization Works

```bash
# Test English version
curl -I https://your-domain.com/en

# Test Arabic version  
curl -I https://your-domain.com/ar

# Test Hebrew version
curl -I https://your-domain.com/he

# Test API with locale
curl https://your-domain.com/api/services?locale=ar

# Check for proper hreflang tags
curl https://your-domain.com/en | grep hreflang
```

---

### Method 2: Server Deployment (PM2/Node)

#### Step 1: Pull Latest Code

```bash
cd /var/www/paxala-media
git pull origin main
```

#### Step 2: Run Localization Migration

```bash
# Connect to database and run migration
sudo -u postgres psql -d paxala_media -f prisma/migrations/add_localization_manual.sql

# Verify migration
sudo -u postgres psql -d paxala_media -c "
  SELECT column_name 
  FROM information_schema.columns 
  WHERE table_name='Service' AND column_name LIKE '%En';
"
# Should show: nameEn, descriptionEn, featuresEn
```

#### Step 3: Update and Restart Application

```bash
# Install dependencies
npm ci

# Generate Prisma client
npx prisma generate

# Build application
npm run build

# Restart PM2
pm2 restart paxala-media

# Monitor logs
pm2 logs paxala-media
```

---

## ✅ Verification Checklist

### 1. Database Verification

```sql
-- Connect to database
docker-compose exec postgres psql -U paxala -d paxala_media

-- Check Service table structure
\d "Service"

-- Expected columns:
-- nameEn, nameAr, nameHe
-- descriptionEn, descriptionAr, descriptionHe  
-- featuresEn, featuresAr, featuresHe

-- Check data migration
SELECT slug, "nameEn", "nameAr", "nameHe" FROM "Service" LIMIT 3;

-- Should show data in all three columns

-- Check TeamMember
\d "TeamMember"
SELECT "nameEn", "roleEn" FROM "TeamMember" LIMIT 3;

-- Check Portfolio
\d "Portfolio"
SELECT "titleEn", "titleAr", "titleHe" FROM "Portfolio" LIMIT 3;

-- Check BlogPost
\d "BlogPost"
SELECT "titleEn", "titleAr", "titleHe" FROM "BlogPost" LIMIT 3;

-- Check HomePageContent
\d "HomePageContent"
SELECT "heroBadgeEn", "heroBadgeAr", "heroBadgeHe" FROM "HomePageContent" LIMIT 1;

-- Exit
\q
```

### 2. Frontend Verification

Visit your site and check:

- [ ] **Language switcher appears** in navbar
- [ ] **English route works**: `https://your-domain.com/en`
- [ ] **Arabic route works**: `https://your-domain.com/ar`
- [ ] **Hebrew route works**: `https://your-domain.com/he`
- [ ] **RTL layout** displays correctly for Arabic/Hebrew
- [ ] **UI text** is localized (buttons, labels, headings)
- [ ] **Content** shows in selected language
- [ ] **Language persists** across page navigations

### 3. Admin Panel Verification

Login to admin panel and check:

- [ ] **Admin nav menu** is localized
- [ ] **Service edit form** shows tabs for En/Ar/He
- [ ] **Team edit form** shows localized input fields
- [ ] **Homepage form** has localization tabs
- [ ] **Portfolio edit** shows language tabs
- [ ] **Blog edit** has localized fields
- [ ] **All admin pages** show localized UI (buttons, labels)
- [ ] **Dashboard stats** display in selected language

### 4. API Verification

```bash
# Test Services API with locale parameter
curl https://your-domain.com/api/services?locale=en
curl https://your-domain.com/api/services?locale=ar
curl https://your-domain.com/api/services?locale=he

# Test with allLocales parameter (for admin)
curl https://your-domain.com/api/services?allLocales=true

# Expected response should include all language versions:
# {
#   "nameEn": "Video Production",
#   "nameAr": "إنتاج الفيديو",
#   "nameHe": "הפקת וידאו"
# }
```

### 5. SEO Verification

```bash
# Check for hreflang tags
curl https://your-domain.com/en | grep -o '<link[^>]*hreflang[^>]*>' | head -5

# Expected output:
# <link rel="alternate" hreflang="en" href="https://your-domain.com/en" />
# <link rel="alternate" hreflang="ar" href="https://your-domain.com/ar" />
# <link rel="alternate" hreflang="he" href="https://your-domain.com/he" />
# <link rel="alternate" hreflang="x-default" href="https://your-domain.com/en" />
```

---

## 🎨 Post-Deployment: Adding Translations

After deployment, you need to add Arabic and Hebrew translations for your content:

### 1. Login to Admin Panel

```
https://your-domain.com/admin
```

### 2. Update Services

- Navigate to **Admin → Services**
- Click **Edit** on each service
- Add Arabic translations in the **Ar** tab
- Add Hebrew translations in the **He** tab
- Click **Save**

### 3. Update Team Members

- Navigate to **Admin → Team**
- Click **Edit** on each team member
- Fill in Arabic and Hebrew versions of:
  - Name
  - Role
  - Bio
  - Skills
- Save changes

### 4. Update Portfolio Items

- Navigate to **Admin → Portfolio**
- Edit each item
- Add translations for:
  - Title
  - Description
  - Content
  - Tags
- Save

### 5. Update Blog Posts

- Navigate to **Admin → Blog**
- Edit existing posts
- Add Arabic and Hebrew versions
- Save

### 6. Update Homepage Content

- Navigate to **Admin → Homepage**
- This has 50+ fields to translate!
- Fill in all sections:
  - Hero section
  - About section
  - Team section
  - Clients section
  - CTA section
- Save changes

---

## 🔧 Configuration Files

### Translation Files

Located in `/src/messages/`:

```
src/messages/
├── en.json  (550+ lines)
├── ar.json  (550+ lines)
├── he.json  (550+ lines)
```

These files contain **UI translations** (not user-generated content):
- Navigation items
- Buttons and actions
- Form labels
- Status badges
- Empty states
- Error messages
- Common terms

### i18n Configuration

**`/src/i18n/config.ts`**:
```typescript
export const locales = ['en', 'ar', 'he'] as const;
export const defaultLocale: Locale = 'en';
export const rtlLocales: Locale[] = ['ar', 'he'];
```

**`/src/middleware.ts`**:
- Handles locale detection
- Redirects to appropriate language route
- Sets cookies for language persistence

**`/next.config.ts`**:
- Configured with `next-intl` plugin
- Standalone output for Docker deployment

---

## 🐛 Troubleshooting Localization

### Problem: Translation keys showing instead of text

**Example:** Seeing "adminUI.paymentReports" instead of "Payment Reports"

**Cause:** Translation key doesn't exist in translation file

**Solution:**
```bash
# Check if key exists in translation files
grep "paymentReports" src/messages/ar.json
grep "paymentReports" src/messages/he.json

# If missing, add the key:
# Edit src/messages/ar.json and add:
"paymentReports": "تقارير المدفوعات",

# Rebuild and restart
npm run build
pm2 restart paxala-media  # or docker-compose restart app
```

### Problem: RTL not working

**Symptoms:** Arabic/Hebrew pages show left-to-right

**Solution:**
```bash
# Check middleware is working
curl -I https://your-domain.com/ar
# Should see: Set-Cookie: NEXT_LOCALE=ar

# Check HTML has dir="rtl"
curl https://your-domain.com/ar | grep '<html'
# Should show: <html lang="ar" dir="rtl">

# If not, check middleware.ts is in place:
cat src/middleware.ts
```

### Problem: Language switcher not working

**Symptoms:** Can't switch languages

**Solution:**
```bash
# Verify language switcher component exists
ls src/components/layout/language-switcher.tsx

# Check it's imported in navbar
grep language-switcher src/components/layout/navbar.tsx

# Rebuild frontend
npm run build
```

### Problem: Migration failed

**Symptoms:** Error during migration, columns already exist

**Diagnosis:**
```sql
-- Check if migration was already run
docker-compose exec postgres psql -U paxala -d paxala_media -c "\d \"Service\""

-- If you see nameEn, nameAr, nameHe - migration already ran
```

**Solution:**
```bash
# If migration partially failed, restore backup and retry
docker-compose exec postgres psql -U paxala -d paxala_media < backup_pre_localization.sql

# Then run migration again
docker cp prisma/migrations/add_localization_manual.sql pmp_postgres:/tmp/
docker-compose exec postgres psql -U paxala -d paxala_media -f /tmp/add_localization_manual.sql
```

### Problem: API not returning localized data

**Symptoms:** API always returns English

**Solution:**
```bash
# Check API route accepts locale parameter
# Example: /api/services/route.ts

# Test with explicit locale
curl "https://your-domain.com/api/services?locale=ar" | jq '.name'

# Should return Arabic name if data exists

# If returns English, check if Arabic data was added:
docker-compose exec postgres psql -U paxala -d paxala_media -c "
  SELECT \"nameEn\", \"nameAr\" FROM \"Service\" WHERE slug='video-production';
"
```

---

## 📊 Monitoring Localization

### Check Translation Coverage

```bash
# Count translation keys per language
echo "English keys: $(cat src/messages/en.json | jq 'keys | length')"
echo "Arabic keys: $(cat src/messages/ar.json | jq 'keys | length')"
echo "Hebrew keys: $(cat src/messages/he.json | jq 'keys | length')"

# All should be equal (550+)
```

### Monitor Content Translation Progress

```sql
-- Connect to database
docker-compose exec postgres psql -U paxala -d paxala_media

-- Check Services translation status
SELECT 
  slug,
  CASE WHEN "nameEn" != '' THEN 1 ELSE 0 END as has_en,
  CASE WHEN "nameAr" != '' AND "nameAr" != "nameEn" THEN 1 ELSE 0 END as has_ar,
  CASE WHEN "nameHe" != '' AND "nameHe" != "nameEn" THEN 1 ELSE 0 END as has_he
FROM "Service";

-- Check overall progress
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN "nameAr" != "nameEn" THEN 1 ELSE 0 END) as arabic_translated,
  SUM(CASE WHEN "nameHe" != "nameEn" THEN 1 ELSE 0 END) as hebrew_translated
FROM "Service";
```

---

## 🎯 Success Criteria

Your localization deployment is successful when:

✅ Database migration completed without errors  
✅ All 7 tables have localized columns (En/Ar/He)  
✅ Data copied to all language versions  
✅ Application builds without errors  
✅ All 21 admin/portal pages show localized UI  
✅ Language switcher works on frontend  
✅ Routes work: `/en`, `/ar`, `/he`  
✅ RTL layout works for Arabic and Hebrew  
✅ hreflang tags present in HTML  
✅ API returns localized data when `locale` parameter used  
✅ Admin forms show language tabs  
✅ No translation keys showing in UI  

---

## 📝 Next Steps After Deployment

1. **Add translations** for all content via admin panel
2. **Test all pages** in all three languages
3. **Submit sitemaps** to Google Search Console for each locale
4. **Configure analytics** to track language usage
5. **Train content team** on how to manage multilingual content
6. **Set up monitoring** for missing translations

---

## 🔗 Related Documentation

- Main Deployment Guide: `DEPLOYMENT_GUIDE.md`
- Localization Updates Summary: `LOCALIZATION_UPDATES_SUMMARY.md`  
- Admin Localization Status: `ADMIN_LOCALIZATION_STATUS.md`
- next-intl Documentation: https://next-intl-docs.vercel.app/

---

**Document Version**: 1.0.0  
**Last Updated**: January 3, 2026  
**Maintained By**: Paxala Media Development Team
