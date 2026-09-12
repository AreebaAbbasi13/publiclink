# RBAC Platform — Task List

## Phase 1: Project Scaffold
- [/] Create Next.js 15 project with TypeScript
- [ ] Install all dependencies (Clerk, shadcn, TanStack, Recharts, etc.)
- [ ] Configure Tailwind CSS v4
- [ ] Initialize shadcn/ui
- [ ] Configure Clerk middleware
- [ ] Set up environment variable template

## Phase 2: Core Infrastructure
- [ ] Permission definitions (lib/auth/permissions.ts)
- [ ] Role definitions + defaults (lib/auth/roles.ts)
- [ ] can() authorization helper (lib/auth/can.ts)
- [ ] requirePermission() server guard
- [ ] TypeScript types (types/)
- [ ] Clerk server/client helpers
- [ ] Zustand store (sidebar, modals, activity)
- [ ] Theme provider (next-themes)
- [ ] TanStack Query provider

## Phase 3: Layout & Navigation
- [ ] Root layout with providers
- [ ] Auth layout (sign-in/sign-up wrapper)
- [ ] Dashboard layout (sidebar + topnav)
- [ ] Sidebar component (collapsible, permission-driven nav)
- [ ] TopNav component (org switcher, user menu, search)
- [ ] Mobile drawer navigation

## Phase 4: Auth Pages
- [ ] Sign In page
- [ ] Sign Up page
- [ ] Forgot password (Clerk handles)
- [ ] Unauthorized page (403)
- [ ] Not Found page (404)
- [ ] Error page

## Phase 5: Dashboard
- [ ] Dashboard overview page
- [ ] Stats cards component
- [ ] User growth chart (Recharts)
- [ ] Recent users widget
- [ ] Recent activity feed
- [ ] Pending invitations widget

## Phase 6: User Management
- [ ] Users list page (TanStack Table)
- [ ] User table columns, search, filter, sort, paginate
- [ ] User row actions (view, edit, change role, suspend, delete)
- [ ] Bulk selection + bulk actions
- [ ] User details page (tabs: Overview, Roles, Permissions, Orgs, Sessions, Security, Activity)
- [ ] Edit user dialog/drawer
- [ ] Change role dialog
- [ ] Suspend/delete confirmation dialogs
- [ ] Loading skeletons, empty states, error states

## Phase 7: Invitation Management
- [ ] Invitations page (pending invitations table)
- [ ] Send invitation form
- [ ] Resend/cancel invitation actions
- [ ] Invitation status badges

## Phase 8: Organization Management
- [ ] Organizations list page
- [ ] Create organization dialog
- [ ] Organization details page
- [ ] Organization members tab
- [ ] Organization settings
- [ ] Org switcher integration

## Phase 9: Role Management
- [ ] Roles list page (role cards)
- [ ] Create role dialog
- [ ] Edit role dialog
- [ ] Duplicate role action
- [ ] Delete role confirmation
- [ ] Role details with permission assignments
- [ ] Users assigned to role view

## Phase 10: Permission Management
- [ ] Permissions page with interactive matrix
- [ ] Toggle switches per role/permission
- [ ] Grouped by resource category
- [ ] Save with optimistic UI + server persist

## Phase 11: Activity / Audit Log
- [ ] Activity list page (timeline + table)
- [ ] Filter by actor, action, date range
- [ ] Activity detail drawer
- [ ] Pagination, search

## Phase 12: Settings Pages
- [ ] Account settings (Clerk UserProfile)
- [ ] Security settings (MFA, sessions)
- [ ] Organization settings
- [ ] Application settings (theme, notifications)

## Phase 13: Shared Components
- [ ] DataTable component (reusable)
- [ ] ConfirmDialog component
- [ ] EmptyState component
- [ ] ErrorState component
- [ ] LoadingSkeleton component
- [ ] PageHeader component
- [ ] StatusBadge component
- [ ] Avatar component
- [ ] SearchInput component

## Phase 14: Build & Verification
- [ ] npm run build (zero errors)
- [ ] All routes accessible
- [ ] Auth flow working
- [ ] Protected routes enforced
- [ ] Dark mode working
- [ ] Responsive layouts
