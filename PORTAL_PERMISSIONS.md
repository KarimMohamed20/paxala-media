# Client Portal - Projects Permissions

This document explains what **Admins** and **Clients** can see in the Client Portal Projects section.

---

## Projects List Page (`/portal/projects`)

### What Both See:
- **Search functionality** - Search by project title or description
- **Status filters** - Filter by: All, IN_PROGRESS, REVIEW, COMPLETED
- **Project cards** showing:
  - Project title
  - Description
  - Category
  - Status badge
  - Progress percentage (based on status)
  - File count
  - Comment count
  - Last updated date

### Admin vs Client Differences:

| Feature | Admin | Client |
|---------|-------|--------|
| **Projects Visible** | ✅ **ALL projects** (from all clients) | ✅ **Only their own projects** |
| **Fields Shown** | Same fields (title, description, category, status, file count, comment count) | Same fields |
| **Status Filtering** | Can see all statuses (DRAFT, IN_PROGRESS, REVIEW, COMPLETED, ARCHIVED) | Can filter by visible statuses |
| **UI/UX** | Identical interface | Identical interface |

**API Endpoint:** `/api/portal/projects`
- Admin: `where = {}` (no filter, gets all projects)
- Client: `where = { clientId: userId }` (only their projects)

---

## Project Detail Page (`/portal/projects/[slug]`)

### What Both See:
- **Project Information:**
  - Title, description, content
  - Category, tags
  - Status and progress
  - Start date, end date
  - Created date, last updated date
  
- **Associated Data:**
  - **Client information** (name, email)
  - **Service information** (name)
  - **Files** (all project files with download links)
  - **Comments** (all comments with author info)
  - **Milestones** (with tasks, progress, payment status)

### Admin vs Client Differences:

| Feature | Admin | Client |
|---------|-------|--------|
| **Projects Accessible** | ✅ **ALL projects** (published or unpublished) | ✅ **Own projects** (any status) + **Published projects** (if not owner) |
| **Staff Information** | ✅ **Full staff list** (all assigned staff with names, emails, roles) | ✅ **Staff list** (visible in project detail) |
| **Milestone Visibility** | ✅ **All milestones** (visible and hidden) | ✅ **Only visible milestones** (`isVisible: true`) |
| **Task Visibility** | ✅ **All tasks** (visible and hidden) | ✅ **Only visible tasks** (`isVisible: true`) |
| **Payment Information** | ✅ **Full payment details** (can see all milestone prices, payment statuses) | ✅ **Payment details** (can see prices, payment status for visible milestones) |
| **Files** | ✅ **All files** | ✅ **All files** (same access) |
| **Comments** | ✅ **All comments** | ✅ **All comments** (same access) |

**API Endpoint:** `/api/projects/[id]` (accepts ID or slug)
- Admin: Can access any project regardless of published status
- Client: Can access own projects OR published projects
- Returns: Full project data including client, service, staff, files, comments

**API Endpoint:** `/api/portal/projects/[slug]/milestones`
- Admin/Staff: No visibility filtering (`isVisible` is ignored)
- Client: Only milestones with `isVisible: true` are returned
- Both see the same financial summary (total price, paid amount, etc.)

---

## Key Differences Summary

### 1. **Project Scope**
- **Admin:** Sees ALL projects from ALL clients
- **Client:** Sees ONLY their own projects (projects where `clientId` matches their user ID)

### 2. **Milestone & Task Visibility**
- **Admin:** Sees all milestones and tasks (including hidden ones with `isVisible: false`)
- **Client:** Only sees milestones and tasks where `isVisible: true`

### 3. **Published Status**
- **Admin:** Can view unpublished projects
- **Client:** Can only view published projects (unless it's their own project, then they can see it regardless)

### 4. **Staff Information**
- **Admin:** Full staff details visible
- **Client:** Staff information is visible but they don't have admin controls

---

## Code Locations

### Projects List API
- **File:** `src/app/api/portal/projects/route.ts`
- **Logic:** Line 19 - `const where = userRole === "ADMIN" ? {} : { clientId: userId };`

### Project Detail API
- **File:** `src/app/api/projects/[id]/route.ts`
- **Logic:** Lines 65-73 - Access control based on admin/owner/published status

### Milestones API
- **File:** `src/app/api/portal/projects/[slug]/milestones/route.ts`
- **Logic:** Lines 34-76 - Visibility filtering for clients (`isVisible: true`)

### Frontend Pages
- **Projects List:** `src/app/portal/projects/page.tsx`
- **Project Detail:** `src/app/portal/projects/[slug]/page.tsx`

---

## Example Scenarios

### Scenario 1: Admin Views Projects
- Admin logs into portal → `/portal/projects`
- Sees 50 projects from 10 different clients
- Can click any project to view details
- Sees all milestones (including hidden ones)
- Sees all tasks (including hidden ones)

### Scenario 2: Client Views Projects
- Client "John" logs into portal → `/portal/projects`
- Sees only 3 projects (where `clientId = "john's-id"`)
- Can click their projects to view details
- Sees only milestones where `isVisible = true`
- Sees only tasks where `isVisible = true`
- Cannot access other clients' projects

### Scenario 3: Unpublished Project
- Admin creates project for Client "Jane" but doesn't publish it
- **Admin:** Can see and access the project
- **Jane (Client):** Can see and access the project (it's her project)
- **Other Clients:** Cannot see the project (not published and not theirs)


