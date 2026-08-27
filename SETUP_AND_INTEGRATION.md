# Setup & Integration — Accountant/HOD Web App

> How this repo (`expense_app_web`) connects to the existing Flutter + FastAPI expense app,
> what was built, and how to pick this back up later. Companion to
> [`ACCOUNTANT_HOD_WEB_APP_PLAN.md`](../expense_app/assets/docs/ACCOUNTANT_HOD_WEB_APP_PLAN.md)
> in the main repo, which has the original findings/plan this was built from.

---

## 1) What this is

A standalone **React + TypeScript (Vite)** web app for the **accountant** and **hod** roles of
the expense-approval system. The Flutter app (`d:/expense_app`) already serves these roles on
mobile; this web app gives them a desk-friendly browser UI for the same workflow — nothing more.

- **Separate repo/folder** (`d:/expense_app_web`) — not a subfolder of the Flutter project.
- **Same backend, unchanged** — talks to the existing FastAPI backend directly. No backend code
  was modified to build this.
- **Two roles only** — `hod` and `accountant`. `finance_manager` and `admin` are deliberately out
  of scope (they keep using the Flutter app).

---

## 2) How it connects to the backend

- **Backend URL**: `https://expensetracker-api.app-brisigns.com` (same prod backend the Flutter
  app uses). Configured in `src/api/config.ts` via `resolveApiBase()`, which reads
  `VITE_API_BASE_URL` (set in `.env.development` / `.env.production`, or a Vercel env var) and
  falls back to the hardcoded prod URL if unset — mirrors the Flutter app's
  `lib/src/api/api_config.dart` priority order exactly.
- **CORS**: backend already allows all origins (`CORSMiddleware(allow_origins=settings
  .cors_origin_list)`, `cors_origins: str = "*"` in `backend/config.py` and `backend/.env`). No
  backend change was needed for the web app to call it from any `localhost` port or a Vercel
  domain. Tighten this to the real Vercel origin before treating this as production-only.
- **Auth tables**: login goes through `POST /api/auth/login` → `authenticate_user()` in
  `backend/auth/security.py`, which queries `ErpAuthExpenseUsers` (joined with
  `ErpMasterExpenseRole`) — the **same** table the Flutter app authenticates against. Any existing
  hod/accountant username+password works here unchanged; no separate user provisioning.
- **Endpoints used** (all under `/api`, exact field names verified against the backend source,
  not just the OpenAPI docs since many routes return plain `dict`/`list[dict]` with no
  `response_model`):
  - `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`, `POST /auth/logout`
  - `GET /approvals/queue?stage=`, `GET /approvals/{id}`, `POST /approvals/{id}/approve|dispute|reject`,
    `POST /approvals/bulk-approve`
  - `GET /admin/claims`, `GET /admin/claims/{id}`, `POST /admin/claims/{id}/mark-paid`
- **Explicitly not used / not available**: `/api/notifications` doesn't exist on the backend yet
  (the Flutter notifications screen is UI-only, not wired to a real endpoint), and
  `/resolve-vendor` isn't exposed as a route (only an internal, unrouted helper in
  `transaction_service.py`). Both are correctly absent from this web app — don't add UI for them
  without adding the backend route first.

---

## 3) Auth flow (how tokens work here)

Mirrors the Flutter app's JWT flow (`lib/src/api/api_client.dart`,
`lib/src/features/authentication/auth_controller.dart`), adapted for a browser:

- **Access token**: kept **in memory only** (`src/auth/tokenStorage.ts`), never persisted.
- **Refresh token**: kept in `localStorage`, so the session survives a page reload.
- **Bootstrap** (`src/auth/AuthContext.tsx`): on app load, if a refresh token exists, immediately
  exchange it for a fresh access token + user via `POST /api/auth/refresh` — no attempt to read a
  (nonexistent) stored access token first.
- **401 handling** (`src/api/client.ts`): any request that gets a 401 triggers one refresh-and-
  retry attempt; if that also fails, tokens are cleared and the app treats the session as expired.
- **Why this split, not both-in-localStorage**: a true httpOnly-cookie approach would need backend
  changes (out of scope). Keeping only the access token out of persistent storage shrinks the XSS
  exposure window while still giving a "stay logged in across reloads" UX like the Flutter app.
  This is a deliberate tradeoff, not full cookie-grade protection — see the plan doc for the full
  reasoning.
- **Demo user dropdown** (`src/features/login/demoUsers.ts`): mirrors the Flutter login screen's
  `_demoUsers` dropdown, scoped to just the hod/accountant seed accounts (`denny`, `sajeesh`,
  `anjana`) since that's all this app supports. Selecting one autofills username/password.

---

## 4) Folder structure (as built)

```
expense_app_web/
├── .env.development / .env.production   # VITE_API_BASE_URL, defaults to the prod backend
├── vercel.json                          # SPA rewrite for React Router on Vercel
├── vite.config.ts                       # dev server port 6001, Tailwind v4 plugin
└── src/
    ├── api/
    │   ├── config.ts        # resolveApiBase()
    │   ├── client.ts        # fetch wrapper: headers, 401-refresh-retry-once, error unwrap
    │   ├── types.ts         # TS interfaces matching backend field names exactly
    │   ├── auth.ts          # login, me, logout
    │   ├── approvals.ts     # queue, getTransaction, approve/dispute/reject, bulkApprove
    │   └── admin.ts         # listClaims, getClaim, markPaid
    ├── auth/
    │   ├── AuthContext.tsx  # user state, bootstrap, login(), logout()
    │   ├── tokenStorage.ts  # in-memory access token + localStorage refresh token
    │   └── useAuth.ts
    ├── routing/
    │   ├── router.tsx       # route tree
    │   ├── RequireAuth.tsx / RequireRole.tsx   # guards
    │   └── roleLanding.ts   # hod -> /queue/hod, accountant -> /queue/accountant
    ├── features/
    │   ├── login/            # LoginPage + demo user dropdown
    │   ├── approval-queue/   # queue list: search, status filter, sort, pagination, bulk-approve
    │   ├── claim-detail/     # two-column detail view: receipt left, info/actions/history right
    │   └── admin-claims/     # "All Claims" list + detail + mark-paid
    ├── components/           # AppShell, StatusChip, ErrorBanner, LoadingSpinner, SearchInput, Pagination
    └── lib/                  # money formatting, stage labels, search/sort/pagination helpers
```

---

## 5) Design system

Pulled directly from the Flutter app's `lib/src/theme/app_theme.dart` (`AppColors`) so the web
app matches the Blue Rhine brand, defined as Tailwind v4 `@theme` tokens in `src/index.css`:

| Token | Hex | Flutter source |
|---|---|---|
| `brand-orange` | `#F54900` | primary buttons |
| `brand-darkblue` | `#32568E` | header/nav, links |
| `brand-brightblue` | `#155DFC` | tertiary accents |
| `brand-lightblue` | `#E3F2FD` | soft highlights, chips |
| `brand-background` | `#F8F9FA` | page background |
| `brand-card` | `#FFFFFF` | card surfaces |
| `brand-text` / `brand-textmuted` | `#1A1C1E` / `#6C7278` | text |
| `brand-divider` | `#E0E0E0` | borders |
| `brand-success` / `brand-successsoft` | `#2E7D4F` / `#E8F5E9` | paid/approved states |
| `brand-danger` | `#C62828` | reject/error states |
| `brand-warningsoft` | `#FFF3E0` | duplicate/awaiting-action banners |

Font: **Inter** (Google Fonts), matching the Flutter app's `GoogleFonts.interTextTheme`.

**Note**: `:root { color-scheme: light }` is set deliberately (not `light dark`) — the app is
light-themed only. Setting `light dark` previously caused native `<select>` dropdown popups to
render with mismatched dark-mode UA colors (invisible option text) on dark-mode OSes. Don't
re-add `dark` to `color-scheme` without also building a real dark theme.

Logo: `public/brand/Br_fulllogo.png` (copied from `assets/brand/Br_fulllogo.png` in the Flutter
repo). Currently commented out in the header nav (`src/components/AppShell.tsx`) at the user's
request — still used on the login page.

---

## 6) Features implemented

- **Login**: username/password, demo-user dropdown, role-based redirect.
- **Approval queue** (`/queue/:stage`): search (employee/vendor/category/OP number/region/
  remarks), status filter chips (All/Submitted/Disputed), sorted newest-first by `submitted_at`,
  paginated 20/page with compact Previous/Next controls, bulk-approve with per-item skip reasons,
  whole-row click-to-view plus an explicit "View" button.
- **Claim detail** (`/queue/:stage/:id`): two-column layout — receipt image (sticky, bordered,
  with OCR fields) on the left, vendor/amount breakdown (excl. VAT / VAT / total), employee info,
  current stage, duplicate-warning message, "not awaiting your action" banner, and
  approve/dispute/reject actions (comment required for dispute/reject) on the right, with claim
  history below. Mirrors `lib/src/features/approvals/approval_detail_screen.dart` closely.
- **All Claims / mark-paid** (`/admin/claims`, `/admin/claims/:id`): same search/sort/pagination
  pattern, visible to both hod and accountant per project decision; mark-paid action once a claim
  is `approved`.

---

## 7) Running it locally

```
cd d:/expense_app_web
npm install
npm run dev      # http://localhost:6001 (port 6000 is Chrome-blocked as an X11 port, hence 6001)
```

No local backend needed — it talks straight to the deployed prod backend. `npm run build` /
`npm run preview` also use port 6001 (set in `vite.config.ts`, `strictPort: true`).

---

## 8) Deploying (Vercel)

1. Push this folder to its own GitHub repo.
2. Import it into Vercel as a new project.
3. Set `VITE_API_BASE_URL` as a Vercel env var (Production + Preview) — can point at the same
   prod backend URL since there's no separate staging backend.
4. `vercel.json` already has the SPA rewrite needed for React Router's client-side routes to
   survive direct loads/refreshes.
5. Before calling it production-ready: tighten `CORS_ORIGINS` in the backend's `.env` from `*` to
   the real Vercel domain.

---

## 9) Known gaps / things to verify next time

- **HOD stage string**: queue defaults to `stage=hod` (`src/routing/roleLanding.ts`). The Flutter
  code also references a `department_hod` *workflow stage* (resolved via
  `ErpExpenseHodAssignment`), separate from the `hod` role. Confirm with a real hod login whether
  `hod` is the correct/only stage string this org's queue needs, or whether `department_hod`
  should be used instead for some departments.
- **`finance_manager` scoping**: intentionally excluded from this web app's routing even though
  the backend permits that role on the same endpoints — it's a v1 scope decision, not a backend
  limitation. Revisit `roleLanding.ts` if finance managers ever need this web app.
- **Receipt image auth**: `ReceiptViewer.tsx` uses a plain `<img src>` for both `image_url`
  (presigned S3) and `image_proxy_url` (backend proxy) since browsers don't attach custom headers
  to `<img>` tags. If `image_proxy_url` ever starts requiring a bearer token, this needs a
  blob-fetch + `URL.createObjectURL` fallback instead.
- **Notifications / vendor-resolution**: no backend routes exist yet — don't build UI for these
  until the corresponding backend endpoints are added.
- **No automated tests** were added — verification so far has been manual (real login, real queue
  data, TypeScript compiler, production build) against the live prod backend.
