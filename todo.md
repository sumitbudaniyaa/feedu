# Feedo — Development Tracker

> Update immediately after every task. Keep tasks granular. Track blockers.

**Current Phase:** Phases 1–5 core complete — every app runs on real API data (no mock/placeholder UI). Hardening + polish ongoing.

---

## Completed

### Phase 1 — Foundation
- [x] Turborepo + npm workspaces monorepo (`turbo.json`, root scripts)
- [x] Strict `tsconfig.base.json`, prettier, gitignore, `.env.example`
- [x] `@feedo/config` — Tailwind preset, design tokens, postcss, base tsconfig
- [x] `@feedo/types` — Zod schemas + types for all 12 entities, auth, sockets, common
- [x] `@feedo/utils` — cn, currency/date/number formatters, pricing math, helpers
- [x] `@feedo/ui` — theme system (provider/toggle/globals.css) + 15 components
- [x] `@feedo/api` — fetch client w/ auto-refresh, Zustand auth store, query hooks, socket factory
- [x] Backend — env (zod), Mongoose connection, logger, ApiError, JWT utils
- [x] Backend — all 12 Mongoose models with multi-tenant indexes
- [x] Backend — middleware: auth (authenticate/authorize), tenant, validate, error
- [x] Backend — auth module (register/login/refresh/me) + central router + health
- [x] Backend — Socket.IO init with typed events + rooms + getIO accessor
- [x] Backend — dev seed script (super admin + demo restaurant + menu)
- [x] admin-app — auth flow (login/register tabs), protected routes, dashboard layout (sidebar/topbar), dashboard page (stat cards + Recharts), placeholder module pages
- [x] customer-app — mobile-first home shell (search, loyalty widget, banner, categories, product cards, floating cart)
- [x] kitchen-app — KDS board with order cards, status transitions, waiting timers
- [x] super-admin-app — platform console shell (MRR/restaurants stats + list)
- [x] `architecture.md` + `todo.md`
- [x] Root dev launcher (`scripts/dev.mjs`) — arrow-key menu (↑/↓/enter, number fallback for non-TTY) + `dev:all`/`dev:admin`/`dev:user`/`dev:kitchen`/`dev:company`/`dev:backend` shortcuts (every option includes backend)

---

## In Progress
- [ ] (none — Phase 1 wrapped)

---

### Phase 2 — Customer app + ordering ✅
- [x] Restaurants module (profile, settings, onboarding, go-live) API
- [x] Categories + Products CRUD API (tenant-scoped, zod-validated, search)
- [x] QR resolve endpoint (qrToken → restaurant + table + menu)
- [x] Customer: live menu, light-mode only, 2-column grid, on-card quantity steppers
- [x] Customer: product sheet for variants/add-ons; persisted cart store
- [x] Customer: dedicated /cart page — name + mobile capture, Razorpay payment
- [x] Razorpay integration (create order, HMAC signature verify; demo mode when keys unset)
- [x] Sections (Menu CMS) API + customer homepage rendering

### Phase 3 — Kitchen + realtime ✅
- [x] Orders module API (create/list/status transitions with a state machine)
- [x] Socket emits on order create/status change; kitchen + admin live subscription
- [x] Customer order tracking page (auto-polling; join:order room available)

### Phase 4 — Admin depth ✅
- [x] Inventory (products CRUD, stock tracking, low-stock alerts, availability)
- [x] Dynamic Sections CMS (create, toggle, delete; reorder endpoint)
- [x] Loyalty engine (programs CRUD, points accrual on order)
- [x] Analytics (revenue series, top products, peak hours, AOV, repeat %)
- [x] Staff management (invite with role, list, deactivate, delete)
- [x] Settings (branding accent live-preview, tax/GST) + go-live
- [x] Tables & QR generation + downloadable QR (real QR encoding customer URL)

### Phase 5 — Super admin ✅
- [x] Platform stats (MRR, restaurants, staff, subscriptions)
- [x] Restaurant management list + suspend/reactivate + subscription update API

### Security (enterprise) ✅
- [x] Rate limiting (global + strict auth + order placement)
- [x] NoSQL-injection sanitization (express-mongo-sanitize), HPP guard
- [x] Helmet with tight CSP; x-powered-by off; trust proxy
- [x] ObjectId param validation; CastError/ValidationError/JWT error mapping
- [x] bcrypt cost 12; RBAC (authorize) + tenant scoping on every route
- [x] JSON body size limits; password hash never serialized

---

## Pending / Next
- [ ] Image upload pipeline (logos, banners, product images) — initials/placeholders today
- [ ] Sections drag-and-drop reorder UI (endpoint exists)
- [ ] Loyalty redemption flow + customer accounts (orders are guest checkout today)
- [ ] Onboarding wizard (8 guided steps) — backend onboarding state ready
- [ ] Kitchen sound notifications on new order
- [ ] Add real Razorpay keys to .env (RAZORPAY_KEY_ID/SECRET + VITE_RAZORPAY_KEY_ID) to
      switch from demo mode to live payments; Razorpay webhook for async capture

## Bugs
- (none open) — fixed during E2E: status state-machine blocked kitchen start; analytics
  aggregation needed an ObjectId cast; soldCount now increments for untracked products too.

## Refactor Notes
- Production backend build (`tsc`) imports shared packages by their `.ts` source; for a
  deployable build, either pre-build packages to JS or bundle the backend (e.g. tsup).
  Dev (`tsx`) works as-is.

## Technical Debt
- Auth refresh is access+refresh in body/localStorage; consider httpOnly cookies for
  the customer PWA before launch.

## Future Improvements
- AI recommendations & analytics, ONDC, Swiggy/Zomato sync, POS + printer integrations,
  franchise / multi-branch, native mobile apps, Redis Socket.IO adapter + caching.
