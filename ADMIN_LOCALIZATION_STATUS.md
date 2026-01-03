# Admin Pages Localization Status

## Completed Updates (3/15)

### ✅ 1. `/src/app/admin/page.tsx` (Dashboard)
**Status:** COMPLETE
**Changes:**
- Added `useTranslations` imports for 'admin', 'adminUI', 'common', 'portal'
- Localized all UI strings:
  - Dashboard title → `t('dashboard')`
  - Stats labels → `ta('totalUsers')`, `ta('totalProjects')`, etc.
  - Status badges → `tc('active')`, `tc('pending')`, etc.
  - Section titles → portal translations

### ✅ 2. `/src/app/admin/services/page.tsx`
**Status:** COMPLETE
**Changes:**
- Added `useTranslations` imports for 'admin', 'adminUI', 'common'
- Localized:
  - "Add Service" → `ta('addService')`
  - "Active"/"Inactive" → `tc('active')`/`tc('inactive')`
  - "Edit" → `tc('edit')`
  - All action buttons

### ✅ 3. `/src/app/admin/users/page.tsx`
**Status:** COMPLETE
**Changes:**
- Added `useTranslations` imports for 'admin', 'adminUI', 'common'
- Localized:
  - "Add User" → `ta('addUser')`
  - "Search users..." → `tc('searchPlaceholder')`
  - "View Details" → `ta('viewDetails')`
  - "Edit Role" → `ta('editRole')`
  - "Save Changes" → `ta('saveChanges')`
  - All modal buttons and labels

## Remaining Updates Needed (12/15)

### 4. `/src/app/admin/services/[id]/page.tsx` - PENDING
**Priority:** HIGH
**Instructions:**
```tsx
// Add imports
import { useTranslations } from 'next-intl';

// Add hooks
const ta = useTranslations('adminUI');
const tc = useTranslations('common');

// Replace strings:
- "Add Service" | "Edit Service" → isNew ? ta('addService') : tc('edit')
- "Basic Information" → ta('basicInfo')
- "Features" → ta('features')
- "Images" → tc('images')
- "Save Service" → tc('save')
- "Cancel" → tc('cancel')
- "Saving..." → tc('saving')
```

### 5. `/src/app/admin/team/page.tsx` - PENDING
**Priority:** HIGH
**Instructions:**
```tsx
// Replace strings:
- "Add Team Member" → ta('addTeamMember')
- "All Teams" → ta('allTeams')
- "Production" → ta('production')
- "IT & Dev" → ta('itDev')
- "Creative" → ta('creative')
- "Active"/"Inactive" → tc('active')/tc('inactive')
- "Edit"/"Delete" → tc('edit')/tc('delete')
```

### 6. `/src/app/admin/team/[id]/page.tsx` - PENDING
**Priority:** MEDIUM

### 7. `/src/app/admin/blog/page.tsx` - PENDING
**Priority:** MEDIUM

### 8. `/src/app/admin/blog/[id]/page.tsx` - PENDING
**Priority:** MEDIUM

### 9. `/src/app/admin/portfolio/page.tsx` - PENDING
**Priority:** MEDIUM

### 10. `/src/app/admin/portfolio/[id]/page.tsx` - PENDING
**Priority:** MEDIUM

### 11. `/src/app/admin/projects/page.tsx` - PENDING
**Priority:** HIGH

### 12. `/src/app/admin/bookings/page.tsx` - PENDING
**Priority:** MEDIUM

### 13. `/src/app/admin/inquiries/page.tsx` - PENDING
**Priority:** MEDIUM

### 14. `/src/app/admin/approvals/page.tsx` - PENDING
**Priority:** LOW

### 15. `/src/app/admin/reports/payments/page.tsx` - PENDING
**Priority:** LOW

## Standard Pattern for All Pages

```tsx
import { useTranslations } from 'next-intl';

export default function AdminPage() {
  const ta = useTranslations('adminUI');  // Admin-specific UI
  const tc = useTranslations('common');    // Common elements
  const t = useTranslations('admin');      // Navigation items

  // Use in components:
  // - ta() for admin-specific labels (addUser, saveChanges, etc.)
  // - tc() for common actions (edit, delete, save, cancel, etc.)
  // - t() for navigation/section names (dashboard, services, users, etc.)
}
```

## Translation Keys Available

### adminUI namespace:
- `addService`, `addTeamMember`, `addUser`, `newProject`, `newPost`, `newPortfolioItem`
- `saveChanges`, `saveDraft`, `publish`, `unpublish`
- `viewDetails`, `editRole`, `markResponded`, `archive`
- `basicInfo`, `detailedContent`, `media`, `profileImage`, `coverImage`, `thumbnail`
- `features`, `skills`, `socialMedia`, `team`, `role`, `username`, `password`
- `allTeams`, `production`, `itDev`, `creative`
- `totalUsers`, `totalProjects`, `totalBookings`, `totalInquiries`
- And many more...

### common namespace:
- `save`, `edit`, `delete`, `cancel`, `create`, `update`, `view`, `back`
- `active`, `inactive`, `published`, `draft`, `pending`, `confirmed`, `cancelled`, `completed`
- `loading`, `saving`, `search`, `filter`, `all`
- `name`, `title`, `description`, `status`, `date`, `time`, `category`, `tags`
- And many more...

### admin namespace:
- `dashboard`, `services`, `team`, `users`, `projects`, `portfolio`, `blog`
- `bookings`, `inquiries`, `approvals`, `paymentReports`

## Quick Reference Script

Run this to see what needs to be done:
```bash
bash /home/karim/pmp/paxala-media/apply-admin-localizations.sh
```

## Testing Checklist

After completing all updates:
- [ ] Test all pages in English (default)
- [ ] Test all pages in Arabic (RTL)
- [ ] Test all pages in Hebrew (RTL)
- [ ] Verify no translation keys are displayed (should show actual translations)
- [ ] Check that all buttons, labels, and messages are translated
- [ ] Test CRUD operations (Create, Read, Update, Delete) on all pages
- [ ] Verify modal dialogs are fully localized
- [ ] Check form validation messages
- [ ] Test status badges and action buttons

## Additional Resources

- Main documentation: `LOCALIZATION_UPDATES_SUMMARY.md`
- Helper script: `apply-admin-localizations.sh`
- Translation files: `/src/messages/en.json`, `/src/messages/ar.json`, `/src/messages/he.json`
