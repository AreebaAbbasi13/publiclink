# Targeted Fixes Implementation Plan

This plan details the exact targeted fixes for the four identified problems without rebuilding or removing existing functionality.

---

## 1. Real Email Notifications Delivery

### Root Cause
1. Currently, the reminder engine calculates in-app reminders (`evaluateUserReminders`), but there was no backend email delivery service (`emailService.js`), background email scheduler, or SMTP/provider integration configured to transmit real emails to registered user email addresses.
2. There was no database tracking (`email_notifications` table) to prevent duplicate spam while ensuring every reminder threshold (15d, 10d, 7d, 4d, 3d, 1d, hours left, overdue, pantry low, budget alert) triggers a real email.

### Proposed Changes
- **Install `nodemailer`** in backend dependencies.
- **`server/services/emailService.js`**:
  - Transporter configuration supporting SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `SMTP_FROM`), Gmail, SendGrid, Resend, or local fallback test accounts.
  - Branded, professional HTML email templates for:
    * Bill Due Reminders (15d, 10d, 7d, 4d, 3d, 1d, hours left / due today, and overdue)
    * Low-Stock Pantry Alerts
    * Budget & Saving Alerts
  - Real transmission to `user.email`.
- **`server/db/database.js`**:
  - Add `email_notifications` table with unique constraint `(user_id, reminder_key)` to track sent emails per reminder window.
- **`server/services/emailScheduler.js`**:
  - Background scheduler running periodically (and triggerable upon ledger mutations) to evaluate all users and deliver real reminder emails automatically.
- **`server/routes/notifications.js`**:
  - Add `POST /api/notifications/test-email` to verify delivery to user's registered email.
  - Add `GET /api/notifications/email-logs` to inspect delivery history.

---

## 2. Instant UI Updates Without Manual Refresh

### Root Cause
1. **HTTP Caching**: Express backend API responses lacked `Cache-Control: no-store, no-cache, must-revalidate` headers. Modern browsers cache GET requests (`/api/bills`, `/api/expenses`, `/api/pantry`, `/api/budget`, `/api/summary`), causing repeated `fetch()` calls after a POST/PUT/DELETE to return stale cached 304/disk responses until a hard page reload.
2. **Cross-Component Sync**: When mutations occur on one screen (e.g. Bills or Pantry), other components and the top navigation notification badge were not signaled to refresh.

### Proposed Changes
- **Backend**:
  - Add global middleware in `server/index.js` setting `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate` and `Pragma: no-cache` for all `/api/*` endpoints.
- **Frontend**:
  - Add a lightweight global Data Sync Event (`window.dispatchEvent(new CustomEvent('hs-data-changed'))`) triggered after every mutation (add bill, edit bill, delete bill, pay bill, add expense, edit expense, delete expense, adjust pantry quantity, market purchase, delete pantry item, set budget).
  - All components (`Dashboard`, `BillsRent`, `Expenses`, `Pantry`, `Budget`, `AIFeatures`, `ExpenseSummary`, `Navbar`, `App`) listen to the sync event and re-fetch immediately.
  - Add optimistic UI updates for instant 0ms visual feedback on deletes, quantity increments/decrements, and status toggles.

---

## 3. Public Internet Accessibility & Production Deployment

### Root Cause
1. The server was running strictly on `localhost:5000` without a public internet URL accessible from other devices (phones, external PCs).
2. Production deployment configuration (CORS, dynamic host binding, cloud deployment configs) was needed.

### Proposed Changes
- Ensure `server/index.js` listens on `0.0.0.0` with `process.env.PORT || 5000` and robust CORS handling all hostnames and devices.
- Configure public internet accessibility via an automated tunnel / deployment setup (localtunnel / ngrok / cloudflared) so the app can be opened immediately on mobile phones and external devices.
- Provide full production cloud deployment manifests (`render.yaml`, `Dockerfile`, `.env.example`, `railway.json`).

---

## 4. Pakistani Rupee (PKR) as Default Currency

### Proposed Changes
- Add **Pakistani Rupee (PKR)** with symbol **`Rs.` / `₨`** to the currency system.
- Set **PKR (`Rs.`)** as the default currency in:
  - Database schema (`currency TEXT DEFAULT 'PKR'`)
  - User registration endpoint default
  - Welcome page signup currency selector (selected by default)
  - Currency formatting helper across all components (Bills, Expenses, Pantry, Budget, Dashboard, AI, Summaries, Pie Charts)
- Preserve all existing currencies (`$`, `€`, `£`, `₹`, `C$`, `A$`, `¥`, `CHF`) in the selector.

---

## Verification Plan

### Automated & Manual Verification
1. **Email Service**:
   - Trigger reminder evaluation and test email sending to user email.
   - Verify `email_notifications` records delivery.
   - Verify background scheduler runs and catches pending notifications.
2. **Instant UI Updates**:
   - Perform Add Bill -> verify it appears immediately in bills list & summary without page reload.
   - Delete Bill -> verify it disappears immediately and totals update.
   - Adjust Pantry Quantity (+ / -) -> verify quantity updates instantly.
   - Market Purchase -> verify quantity increases and spending updates instantly.
   - Add/Delete Expense -> verify expense list, dashboard totals, and pie charts update immediately.
   - Update Budget -> verify budget card and progress bar update immediately.
3. **PKR Currency**:
   - Register a new user -> confirm currency defaults to `PKR (Rs.)`.
   - Verify all totals, tables, cards, modal forms, and pie charts display `Rs.` / `PKR`.
   - Verify switching to another currency (e.g. `$`, `€`, `£`) still works as expected.
4. **Internet Accessibility**:
   - Verify public internet URL access from another device / phone.
