# RBAC User Management Platform — Implementation Plan

## Overview

A production-quality enterprise SaaS application for **User Management + Role-Based Access Control** powered by **Clerk** for auth/organizations/invitations, built on **Next.js 15 (App Router)** with **TypeScript**, **Tailwind CSS v4**, and **shadcn/ui** components.

The empty workspace will be bootstrapped from scratch.

---

## Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Framework | **Next.js 15** (App Router, RSC) | Best-in-class full-stack React framework; Server Actions for backend authorization |
| Language | **TypeScript** | Type-safety for auth contexts, permissions, roles |
| Auth | **Clerk** (latest) | Auth, organizations, invitations, sessions, MFA |
| UI Components | **shadcn/ui** | Unstyled-by-default, fully customizable, production-quality |
| Styling | **Tailwind CSS v4** | Utility-first, consistent design system |
| Icons | **Lucide React** | Maintained, consistent icon set |
| Data Fetching | **TanStack Query v5** | Client-side caching, loading/error states |
| Forms | **React Hook Form + Zod** | Type-safe validation |
| Charts | **Recharts** | Dashboard analytics |
| Notifications | **Sonner** | Beautiful toast system |
| Tables | **TanStack Table v8** | Headless, feature-rich data tables |
| Animations | **Framer Motion** | Micro-interactions |
| Date | **date-fns** | Lightweight date formatting |
| State | **Zustand** | Lightweight client state (sidebar, modals) |
| Package Manager | **npm** | Already available |

**No database needed** — Clerk's API is the source of truth for users, orgs, memberships, invitations, and sessions. Roles/permissions are stored in Clerk's public metadata. Activity logs are stored in Clerk's metadata or a local in-memory/localStorage store for demo (explained clearly in UI).

---

## Architecture

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Public auth routes
│   │   ├── sign-in/
│   │   ├── sign-up/
│   │   └── ...
│   ├── (dashboard)/              # Protected layout
│   │   ├── layout.tsx            # Sidebar + topnav
│   │   ├── page.tsx              # Dashboard overview
│   │   ├── users/
│   │   ├── invitations/
│   │   ├── organizations/
│   │   ├── roles/
│   │   ├── permissions/
│   │   ├── activity/
│   │   └── settings/
│   ├── api/                      # API route handlers
│   └── ...
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   ├── layout/                   # Sidebar, TopNav, etc.
│   ├── users/                    # User-domain components
│   ├── roles/                    # Role-domain components
│   ├── permissions/              # Permission matrix
│   ├── organizations/            # Org components
│   ├── dashboard/                # Dashboard widgets
│   ├── invitations/              # Invitation UI
│   └── shared/                   # Tables, forms, empty/error states
├── lib/
│   ├── auth/
│   │   ├── permissions.ts        # Permission definitions
│   │   ├── roles.ts              # Role definitions + defaults
│   │   ├── can.ts                # can() helper
│   │   └── require-permission.ts # Server-side guard
│   ├── clerk/
│   │   ├── server.ts             # Clerk server-side helpers
│   │   └── client.ts             # Clerk client helpers
│   └── utils.ts
├── hooks/
│   ├── use-permissions.ts        # Client permission hook
│   ├── use-organization.ts
│   └── ...
├── types/
│   ├── permissions.ts
│   ├── roles.ts
│   └── users.ts
└── middleware.ts                 # Clerk auth middleware
```

---

## Key Authorization Design

### Permission Definitions (centralized)
All permissions defined in one file. Grouped by resource:
```ts
export const PERMISSIONS = {
  users: ['users:view', 'users:create', 'users:edit', 'users:delete', 'users:manage'],
  roles: ['roles:view', 'roles:create', 'roles:edit', 'roles:delete', 'roles:manage'],
  content: ['content:view', 'content:create', 'content:edit', 'content:delete', 'content:publish'],
  organizations: ['organizations:view', 'organizations:create', 'organizations:edit', 'organizations:delete', 'organizations:manage'],
  settings: ['settings:view', 'settings:manage'],
} as const
```

### Role Storage
Roles stored in Clerk **organization metadata** (publicMetadata) as JSON. Default roles seeded on first org creation. Custom roles fully supported.

### Authorization Flow
- **Client**: `usePermissions()` hook reads from Clerk session claims → `can("users:delete")` 
- **Server**: `requirePermission("users:delete")` in Server Actions / API routes → throws if unauthorized

### Middleware
Clerk middleware protects all `/dashboard/*` routes. Organization routes require active org.

---

## Pages & Features

### Auth Pages
- `/sign-in` — Clerk `<SignIn />` component, custom styled
- `/sign-up` — Clerk `<SignUp />` component, custom styled
- Forgot/reset handled by Clerk components

### Dashboard `/`
- Stats cards: Total Users, Active Users, Pending Invitations, Total Roles, Total Orgs
- User growth chart (Recharts)
- Recent users list
- Recent activity feed
- Pending invitations list

### Users `/users`
- Full TanStack Table with: avatar, name, email, role, org, status, last active, created
- Search, filter by role/status/org, sort, paginate
- Bulk select + bulk actions (suspend, delete, change role)
- Row actions dropdown: view, edit, change role, suspend, activate, delete, view sessions
- Loading skeletons, empty state, error state

### User Details `/users/[id]`
- Header with avatar, name, email, status badge, role badge
- Tabs: Overview, Roles, Permissions, Organizations, Sessions, Security, Activity

### Invitations `/invitations`
- Pending invitations table
- Send invitation form (email, org, role)
- Resend / cancel actions
- Status badges

### Organizations `/organizations`
- Org cards/list view
- Create organization
- Org switcher (Clerk `<OrganizationSwitcher />`)
- Per-org details, members, settings

### Roles `/roles`
- Role cards with permission count, user count
- Create, edit, duplicate, delete roles
- Role details with permission assignments

### Permissions `/permissions`
- Interactive permission matrix
- Toggle switches per role/permission cell
- Grouped by resource category
- Save changes with optimistic UI

### Activity `/activity`
- Timeline + table hybrid
- Filter by: actor, action type, date range
- Pagination, search
- Detail view drawer

### Settings
- `/settings/account` — Name, email, profile photo (Clerk `<UserProfile />`)
- `/settings/security` — MFA, sessions, connected accounts (Clerk)
- `/settings/organization` — Org info, logo, members, billing
- `/settings/application` — General preferences, notifications, appearance

---

## Clerk Setup Requirements

> [!IMPORTANT]
> The following Clerk configuration is required before the app works:

1. **Clerk Application**: Create at [clerk.com](https://clerk.com), get `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
2. **Organizations**: Enable in Clerk Dashboard → Organizations
3. **Custom Roles & Permissions**: In Clerk Dashboard → Roles, define: `org:admin`, `org:manager`, `org:editor`, `org:viewer`
4. **Environment Variables**: Create `.env.local`:
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
   ```

---

## Verification Plan

### Build Verification
- `npm run build` — zero TypeScript/lint errors
- `npm run dev` — dev server starts cleanly

### Runtime Verification
All 26 checklist items from the spec will be manually verified in dev mode.

---

## Notes

- Activity log uses **Clerk's** event metadata + a client-side activity store (localStorage with clear "demo data" labeling) since Clerk's audit log requires Enterprise plan
- Permission matrix changes are persisted in **organization public metadata** via Clerk's API
- All destructive actions use confirmation dialogs
- Dark mode via `next-themes` + Tailwind CSS dark variant
