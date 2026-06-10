# Feedo — Development Tracker

> Update immediately after every task. Keep tasks granular. Track blockers.

**Current Phase:** Phase 1 — Foundation (complete) → Phase 2 next.

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
- [x] Root dev launcher (`scripts/dev.mjs`) — interactive menu + `dev:all`/`dev:admin`/`dev:user`/`dev:kitchen`/`dev:company`/`dev:backend` shortcuts (every option includes backend)

---

## In Progress
- [ ] (none — Phase 1 wrapped)

---

## Pending

### Phase 2 — Customer app + ordering
- [ ] Restaurants module (profile, onboarding state, branding) API
- [ ] Categories + Products CRUD API (tenant-scoped, zod-validated)
- [ ] QR resolve endpoint (qrToken → restaurant + table)
- [ ] Customer: live menu fetch, product detail, variants/addons selection
- [ ] Customer: cart store + checkout → create order
- [ ] Sections (Menu CMS) read API + customer homepage rendering
- [ ] Image upload pipeline (logos, banners, product images)

### Phase 3 — Kitchen + realtime
- [ ] Orders module API (create/list/status transitions)
- [ ] Socket emits on order create/status change; kitchen live subscription
- [ ] Order status sound notification + admin live order feed
- [ ] Customer order tracking page (join:order room)

### Phase 4 — Admin depth
- [ ] Inventory management (stock, low-stock alerts) UI + API
- [ ] Dynamic Sections CMS (drag-and-drop reorder, layouts, scheduling)
- [ ] Loyalty engine (programs CRUD, accrual on order, redemption)
- [ ] Analytics module (revenue series, top products, peak hours, AOV, retention)
- [ ] Staff management (invite, roles, permissions)
- [ ] Settings (branding, tax/GST, timings) + onboarding wizard (8 steps)
- [ ] Tables & QR generation + downloadable QR

### Phase 5 — Super admin
- [ ] Subscriptions + plan management API
- [ ] Restaurant management, feature toggles, platform analytics
- [ ] Support tools, admin management

---

## Bugs
- (none reported)

## Refactor Notes
- Production backend build (`tsc`) imports shared packages by their `.ts` source; for a
  deployable build, either pre-build packages to JS or bundle the backend (e.g. tsup).
  Dev (`tsx`) works as-is. Revisit before Phase 5 deploy.

## Technical Debt
- Auth refresh is access+refresh in body/localStorage; consider httpOnly cookies for
  the customer PWA before launch.
- No rate limiting / request logging persistence yet.

## Future Improvements
- AI recommendations & analytics, ONDC, Swiggy/Zomato sync, POS + printer integrations,
  franchise / multi-branch, native mobile apps, Redis Socket.IO adapter + caching.
