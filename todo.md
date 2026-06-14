# Feedo — Development Tracker

> Update immediately after every task. Keep tasks granular. Track blockers.

**Current Phase:** Phases 1–5 complete — every app runs on real API data (no mock/placeholder UI),
with customer OTP login, live Razorpay payments, an in-app loyalty-reward order flow, and a full
super-admin console. Hardening + polish ongoing.

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

## Recently added
- [x] Customer mobile OTP login (request/verify, 6-digit, bcrypt-hashed, TTL, rate-limited);
      account + reward redemption now require the verified customer token (no more spoofing
      by typing someone's phone). Dev returns the code in the response + server log.
- [x] Live Razorpay (test keys in .env) — checkout creates real Razorpay orders, signature
      verified on confirm; verified end-to-end (real order id, not demo mode).
- [x] Animated "preparing" page after checkout: cooking animation, live ETA from per-item
      prep times, progress bar, ready/served states.
- [x] Super-admin = full enterprise console: sidebar layout + Overview (GMV chart, top
      restaurants, platform KPIs), Restaurants list + detail (revenue/staff/orders/products,
      subscription editor, suspend/reactivate), Users, Orders (all-restaurant feed + details),
      Customers — all backed by new /platform endpoints.
- [x] Admin order details: downloadable business invoice (PNG); per-item prep time snapshot.
- [x] Loyalty rewards system end-to-end: admin rewards catalog, per-product loyalty points,
      customer Rewards page (wallet + eligibility progress), atomic point deduction
- [x] Rewards are ordered IN-APP as a free ₹0 line (no counter code): a reward must be linked
      to a menu item (admin form + backend enforce it); "Add to order" applies it to the cart,
      checkout adds the ₹0 item and spends points at payment (markPaid) — or confirms
      immediately for a ₹0/reward-only order. Points refunded if the order can't be placed.
- [x] Customer mobile OTP login wired into Rewards/account/redeem (verified token gates the wallet)
- [x] Live Razorpay payments (real test keys in `.env`) — real order create + HMAC verify
- [x] Animated "preparing"/tracking page (ETA from per-item prep times); vintage bus-ticket
      invoice with PNG download; admin downloadable business invoice
- [x] Customer past orders by mobile number (auto-remembered from checkout)
- [x] Super-admin = full enterprise console (Overview/Restaurants+detail/Orders/Customers/Users)
- [x] Orders auto-complete on "served"; unpaid online orders hidden from staff until paid
- [x] Menu CMS fixed + redesigned: sections now actually render in the customer app
      (carousel / hero / grid); admin page got edit, up/down reorder, product chips
- [x] Customer UI polish: spring micro-interactions, animated cart pill, count pops,
      prep-time/points chips on cards, animated claim-success dialog
- [x] Product image upload (multer + local static serving, ApiClient.upload); shown in
      admin inventory + customer cards/sheet
- [x] Kitchen cards: veg/non-veg marker per item; status-colored cards (new=black,
      preparing=yellow, ready=green); isVeg snapshotted onto order items
- [x] Customer tracking: Customer model (by phone), loyalty points accrued on paid orders;
      admin Customers page (spend ranking + points); points surfaced on diner track page
- [x] Branding accent reflected on customer CTAs (cart pill, pay, add)
- [x] Strict 10-digit phone validation everywhere; staff "Password" (not temp)

- [x] Kitchen sound on new order (Web Audio chime, primed on login) + mute toggle
- [x] Confirmation dialogs for destructive actions (shared `ConfirmProvider`/`useConfirm`):
      admin deletes (product/category/section/reward/program/table/staff) + order cancel,
      super-admin suspend/reactivate
- [x] Customer "Veg only" filter toggle in the menu

## Pending / Next
- [ ] Logo/banner upload in Settings (product images done; reuse the `/uploads` endpoint)
- [ ] Sections drag-and-drop reorder UI (reorder endpoint + up/down buttons exist)
- [ ] Onboarding wizard (8 guided steps) — backend onboarding state ready
- [ ] Razorpay webhook for async capture/refunds (server-verified callback works today)
- [ ] Real SMS provider for OTP (dev returns the code in the response + logs)

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
