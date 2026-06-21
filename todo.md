# Feedu — Development Tracker

> Update immediately after every task. Keep tasks granular. Track blockers.

**Current Phase:** Phases 1–5 complete — every app runs on real API data (no mock/placeholder UI),
with customer OTP login, live Razorpay payments, an in-app loyalty-reward order flow, and a full
super-admin (Feedu company) portal. Rebranded to **feedu**. Hardening + polish ongoing.

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
- [x] Customer: live menu, 2-column grid, on-card quantity steppers (later redesigned dark, see below)
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

## Multi-branch evolution (Brand → Branches)
Evolving "1 restaurant = 1 tenant" into "Brand (tenant) → Branches" without a rewrite.
Key decision: **`restaurantId` = branchId** (a Restaurant doc *is* a branch); add `Brand` on top.

- [x] **Phase 0/1 — schema + backfill (done, additive, back-compat):**
  - New `Brand` (tenant: name/slug/branding/tax) and `BranchMenu` (per-branch price/availability/
    stock/exclusive overrides) collections.
  - Additive nullable `brandId` on Restaurant(=branch), Product, Category, Section, Loyalty*,
    Order, Customer, Subscription. No behaviour change.
  - `npm run migrate:brands` — idempotent backfill: one brand per restaurant, stamps `brandId`,
    seeds BranchMenu from current products. Verified on dev DB; re-run is a no-op.
- [x] **Phase 2 — auth (done, back-compat):** `JwtPayload` gains `brandId`/`branchIds`; tokens carry
  brand context (brand-wide roles get all brand branches); `register()` creates a Brand + first branch.
  `resolveTenant` sets `req.brandId`/`branchId`/`branchIds`, keeps `req.restaurantId` alias, supports
  branch-switch via `x-branch-id`; added `requireBrand`. `crud()` gains `level: 'brand' | 'branch'`
  (default branch = unchanged). Verified: owner/super login, branch-scoped reads still work.
- [x] **Phase 3 — brand menu + overrides (done, back-compat):** `resolveBranchMenu(brandId, branchId)`
  merges the brand catalog with the branch's `BranchMenu` (price/availability/stock + exclusivity);
  public menu uses it. Products/categories/sections/loyalty/rewards moved to `crud level:'brand'`.
  New `/branch-menu` module (effective menu + per-product override PATCH). RBAC enum extended with
  brand/branch roles (legacy kept). Verified single-brand behaviour is unchanged; overrides work.
- [x] **Phase 4 — portals (done):** admin branch switcher + Branches page (`store/branch.ts`,
  `BranchSwitcher`, `BranchesPage`, `GET/POST /restaurants/branches`; `resolveTenant` lets brand-wide
  roles switch to any branch in their brand). Super-admin **Brand→Branches hierarchy** (`/platform/brands`
  rollup + `POST /platform/brands/:id/branches`, `BrandsPage`); platform onboarding now creates a Brand,
  delete drops the brand only when its last branch goes. Verified end-to-end via the API.
- [x] **Phase 5 — analytics + sockets (done):** `rooms.brand`/`rooms.branch` + `join:brand`; orders are
  stamped with `brandId` and order events fan out to the brand room (brand-wide dashboards watch every
  branch live). `GET /analytics/branches` brand comparison (revenue/orders/AOV/share per branch, zero-order
  branches included); admin `useBranchComparison` + Branch-comparison card on Analytics (brand roles, >1
  branch). `useLiveSync` now joins the active branch + brand room. Verified: brand room received a live
  `order:updated`; comparison lists both branches. Dashboard authorize widened to brand/branch roles.
- [x] **Phase 5b — multi-branch order pipeline (done):** `resolveOrderProducts({brandId, branchId}, ids)`
  resolves the order's products against the **brand** catalog with the branch's `BranchMenu`
  price/availability/stock overrides (exclusive-elsewhere items omitted). `createOrder` +
  `createRewardOrder` use it; stock decrements `BranchMenu` when the branch tracks its own, else the
  product (home/legacy); `soldCount` stays brand-level. Fixes ordering at non-home branches (previously
  `Product.find({restaurantId})` returned nothing). Verified: placed an order at branch 2 (Koramangala),
  isolated per branch, reflected in the comparison.
- [x] **Phase 6 — cleanup (done):** dropped the legacy aliases.
  - **6a:** ApiClient sends `x-branch-id` (option `getRestaurantId`→`getBranchId`); `resolveTenant` no
    longer honours `x-restaurant-id`.
  - **6b:** removed the `req.restaurantId` request alias — every handler reads `req.branchId`. (The Mongo
    `restaurantId` **field** stays = the branch FK; renaming it would be a data migration.)
  - **6c:** brand-level entity reads moved to `brandId` (public rewards, platform product-count + delete
    scoping, analytics low-stock); brand-level `crud` create no longer stamps `restaurantId`; `restaurantId`
    is now optional on Product/Category/Section/LoyaltyProgram/LoyaltyReward. Branch delete only drops the
    brand catalog/loyalty when removing the brand's last branch. Verified: new brand product persists
    `brandId` only, is shared to all branches, and all read paths still work.
- [x] **Account type (single vs multi-store):** `Brand.accountType`. Super-admin onboarding offers
  single/multi; **multi bills once** (one combined brand subscription covers every branch). Adding a 2nd
  branch auto-upgrades a brand to multi. `findEffectiveSubscription(branch, brand)` resolves a branch to
  its own sub (single) or the brand's combined sub (multi); subscription PATCH targets the brand sub for
  multi. Admin gates branch features (switcher, Branches page, combined "All branches" analytics) on
  `GET /restaurants/me/brand` → `accountType === 'multi'`. Brands page shows the type + combined fee.
  Verified: multi onboarding, single→multi conversion, combined-sub resolution from a sub-less branch.
- [x] **Multi-store onboarding with branches:** the super-admin onboard dialog asks single vs multi;
  single keeps the one-outlet flow, multi collects brand details + inline branch list and creates the
  brand + all branches + one combined subscription in a step (`POST /platform/restaurants` accepts
  `branches: string[]`).
- [x] **Super-admin combined "Brands & Restaurants" page:** Brands + Restaurants merged into one page
  (brand → branches, single-store reads as one outlet) with an Onboard button and filters (search,
  account type, status). `/brands` redirects to `/restaurants`; nav collapsed to one entry.
- [x] **Brand-level controls:** per-brand **suspend/reactivate all branches** (`PATCH /platform/brands/:id`),
  **edit combined SaaS plan** — fee/cycle/duration/expiry/status (`PATCH /platform/brands/:id/subscription`),
  **delete brand + all branches + data** (`DELETE /platform/brands/:id`); brands rollup includes the
  combined subscription summary. Per-branch suspend + add-branch stay inline.
- [x] **Admin auth: removed self-signup** — onboarding is super-admin-only. The admin login page is
  sign-in only (no "Create account" tab); `useRegister` dropped from the admin app.
- [x] **Branch managers:** brand-wide owners create branch-locked `branch_manager` logins per branch
  (`/restaurants/branches/:id/managers` CRUD + reset password). The manager's portal is scoped to its
  one branch (no switcher/Branches/combined). Fixed the User model role enum (was missing the
  multi-branch roles + `brandId`, which broke creating any such user).
- [x] **Centralized vs per-branch inventory:** the branch switcher defaults to **All branches**
  (centralized); Dashboard/Analytics derive scope from it. Inventory in a branch writes `BranchMenu`
  availability/stock **overrides** — marking an item off at one branch no longer affects others.
- [x] **Admin branch management:** edit / suspend / delete branches and manage managers from the
  Branches page (`PATCH/DELETE /restaurants/branches/:id`).
- [x] **Brand Settings:** brand-wide owners edit **brand** name/branding/tax (`GET/PATCH
  /restaurants/me/brand`); branding/tax/currency propagate to every branch.
- [x] **Toasts everywhere:** `@feedo/ui` `Toaster`/`toast()` wired via the MutationCache in admin +
  super-admin. Each mutation carries `meta.successMessage` for a **meaningful per-action toast**
  ("Product created", "Branch updated", …) or the API error; `meta.silent` suppresses noise (auth
  login/register show no toast).
- [x] **Cloudinary image hosting:** `/uploads` streams to Cloudinary (foldered by brand) when
  `CLOUDINARY_*` is set; local `/uploads` fallback in dev.
- [x] **Customer header:** brand name big, branch name small (`📍 Branch`) on multi-store.
- [x] **Single-store stays simple:** no Add-branch in super-admin and no centralized/branch
  inventory UI for single-store accounts (gated on `accountType === 'multi'`).
- [x] **Self-serve branch cap:** owners add up to `SELF_SERVE_BRANCH_LIMIT` (5) branches themselves
  (`POST /restaurants/branches` 403s beyond); the super-admin endpoint is uncapped for the Feedu team.
- [x] **Dialogs** capped at 90dvh with internal scroll (tall dialogs stay on screen).
- [~] **Dynamic feature-based pricing** was built then **removed on request** — onboarding is back to
  the simple single/multi-store flat combined fee.
- [x] **Table validation (non-QR entry):** the customer table prompt validates the typed number against
  the restaurant's real tables (`GET /public/r/:slug/table?name=`, tolerant "5" ↔ "Table 5") and rejects
  unknown tables; a restaurant with **no tables configured rejects** any number (must scan the QR / set up tables).
- [x] **Product-create 500 fix:** `crud` schema `ZodError` → 400 (errorHandler) and the Inventory dialog
  re-inits on open + falls back to the first category, so a stale-empty `categoryId` can't slip through.
- [x] **Settings:** dropped the vestigial "Seats" row from the admin subscription card (schema default,
  not configured/enforced).

## Recently added

### Latest session — kitchen category filter, split payments, session-scoped table
**Kitchen**
- [x] **Filter the board by category** — a header filter button opens a dropdown checklist for
      **multi-select** (tap to toggle, badge shows active count, Clear resets); the board and active
      count narrow to orders containing an item in **any** selected category (none = all). Orders now
      snapshot `categoryId` per item (model + zod + createOrder/reward builds) — backfills on NEW orders only.
      Selection **persists across refresh** via `localStorage` (`feedo-kitchen-cat-filter`).

**Admin (restaurant)**
- [x] **Split payment** as an option in the mark-paid dropdown — per-method amount rows (e.g. part
      cash + part UPI), running total vs. order total, validated to sum (₹1 tolerance). Sends
      `splits: [{ method, amount }]`; server stamps `paymentMethod: 'split'` + `paymentSplits[]`
      and writes one `Payment` per split. `Order.paymentMethod` enum + `Payment.method` widened.

**Customer**
- [x] **Manually-typed table is session-scoped** — stored in sessionStorage (excluded from the
      persisted cart via `partialize`), so it survives refreshes but clears on tab close and is never
      carried into a later visit when the diner may be seated elsewhere.
- [x] **Ongoing-order pill shows all active orders** (not just the latest); each card self-removes
      when done. Online-paid orders hide the "Request bill" action in the expanded pill.
- [x] Non-QR table entry **validates against real tables** (`/public/r/:slug/table?name=`); rejects
      unknown tables and restaurants with zero tables configured.
- [x] **Invoice download works on mobile** — renders the ticket to a Blob and opens the native share
      sheet (`navigator.share` with files, e.g. iOS Safari/Android) to save to Photos/Files; falls back
      to an object-URL download on desktop. Replaces the data-URL `<a download>` that iOS ignored.
- [x] **Invoice no longer misaligned in the PNG** — capture root is a fixed `w-[320px]` (was
      `mx-auto w-full max-w-[340px]`, which html-to-image rendered off-center); centered on-screen via a
      wrapper, and the capture passes the node's exact width/height + `margin:0`.
- [x] **OTP login is full-screen, boxless** — removed the `Card` wrapper from `OtpLogin` so the
      sign-in (Account + Rewards) reads as a native mobile screen: larger icon/heading, h-12 inputs
      and buttons, roomier spacing.

**Backend / hosting**
- [x] **Beta OTP mode** — `BETA_MODE=true` (and any non-prod run) sets `env.demoOtp`: the customer
      OTP is the fixed code **123456**, returned in the request response and shown to the diner
      ("Beta — use code 123456"). No SMS provider needed for the beta. Documented in `.env.example`.
- [x] **Per-phone OTP throttling** (on top of the per-IP 6/10min limiter) — a **30s resend cooldown**
      and a **5-codes-per-15-min** rolling-window cap, returning `429` with a precise message. Counters
      (`resendAt`/`sentCount`/`windowStartAt`) live on the `Otp` doc; code validity moved to its own
      `codeExpiresAt` (checked on verify) so the doc can outlive the code to retain the counters.

### Earlier this session — employees collection, customer analytics, call-waiter UX, inventory filters
**Company portal (Feedu owner)**
- [x] **Feedu employees in a separate `employees` Mongo collection** (not `users`); auth
      login/refresh/me check employees first; existing super-admin migrated (id preserved)
- [x] **Employees** nav/page shows only the Feedu team (+ add member); restaurant users removed
      from the portal (managed inside each restaurant)
- [x] **Customers grouped by restaurant cards** → drill into a restaurant's diners (searchable)
- [x] Per-diner **analytics** dialog (spend, AOV, most-ordered, reward claims, first/last visit,
      peak hour, recent orders) — redesigned with profile header, stat tiles, sectioned cards
- [x] Support tickets open into a **chat/conversation view** on click (portal + admin)

**Admin (restaurant)**
- [x] Per-customer **analytics** on click (same shared insight dialog)
- [x] **Inventory filter bar** (search + category + status) — also in the waiter app
- [x] **Inventory shown as cards** (image-forward grid); product form gains an **add-ons editor**
      (e.g. Extra gravy / Cheese) alongside sizes — drives the customer product sheet (no more hard-coding)
- [x] Staff creation captures a **mobile number**; removed the prefilled login email/password
- [x] **Edit staff** (name / email / mobile / role / password) — admin; **edit employees**
      (name / email / mobile / password) — company portal. Employee model gained `phone`.
- [x] **Change owner password** from admin Settings (Security card → dialog; verifies current
      password). Backend `POST /auth/change-password` works for any signed-in account.
- [x] **Admin Settings** sections (details / branding / tax) are now read-only cards with an
      **Edit → dialog**; super-admin restaurant **subscription** is a summary with an Edit dialog too.
- [x] **Subscription/live gating**: a restaurant whose subscription is past_due/cancelled/expired
      — or that's suspended (not live) — has its **customer app blocked** (menu/QR/checkout) and the
      **admin app fully locked** behind a lock screen. (`assertSubscriptionActive` on public routes.)
- [x] Inventory product cards made smaller; product dialog scrolls (pinned footer) + wider (max-w-2xl)

**Waiter**
- [x] Dedicated **mobile waiter app** (Orders + Inventory tabs, floating pill nav)
- [x] **Call-waiter** end-to-end: diner rings from the table → staff get a ringing notification
      (admin = top non-blocking toast with **Attend** button; waiter = bottom **slide-to-attend**
      drawer), accepting **clears it on every device** and shows the diner a green
      **"waiter is on the way"** pill for 5s (WAITER_CALLED / WAITER_ATTENDING sockets)

**Customer**
- [x] **Ongoing-order pill** on the menu (animated, expandable): shows live status + ETA, expands to
      items/total/payment; **Pay now** + **Request bill** show **only for unpaid orders** (a paid/online
      order is settled — neither button appears). Request bill rings the waiter + admin (call-waiter
      `reason: 'bill'`). Auto-clears when the order is done + paid.
      Backend: `POST /public/orders/:id/razorpay` (pay an existing order); call-waiter takes a `reason`.
- [x] Order page banner is **status-driven**: in-progress orders (even from history) show the live
      tracking hero; finished orders show a plain summary. Order History links open via `?view=details`
- [x] Reward **claim history** on the Rewards page (in-app ₹0 reward orders + legacy claims)

### Latest session — landing polish, legal/about pages, SEO, contact-form fix
**Landing / marketing site**
- [x] **Value statement** section: swapped the broken logo for the `feedu` wordmark; lengthened the
      scroll pin so scroll visibly stops and the line darkens word-by-word before releasing
- [x] **MultiOutput** ("One scan. Every app in sync."): admin + kitchen as fixed-size landscape shots
      (now a touch larger); customer + waiter share a matching phone frame (no more mismatched sizes)
- [x] **Enterprise → restaurant benefits**: replaced tech/infra cards (hardened API, JWT, tenant
      isolation…) with outcome cards — turn tables faster, fewer wrong orders, bigger bills, regulars,
      get paid, know what sells
- [x] **Use-cases** ("One platform. Every kind of **restaurant**." — `restaurant` in maroon accent,
      matching the Hero/Bento highlights):
      now a single card with a bento grid of varied tile sizes (cloud kitchens removed); not separate cards
- [x] Removed the **How-it-works** section entirely
- [x] **Footer**: centered wordmark + "here to help you feed", a paperclip clipped to the top edge,
      inline Instagram (@orderwithfeedu) + About/Privacy/Terms links, link columns removed,
      "A product of TwentyEleven" (→ twentyeleven.in)
- [x] **/about** page (company, "a product of TwentyEleven") + **/privacy** & **/terms** app-specific
      legal pages; reachable from the footer; contact = sumit.k.budaniya@gmail.com / +91 82093 33127
- [x] **SEO**: full title/description/keywords, canonical, robots, Open Graph + Twitter cards, JSON-LD
      (SoftwareApplication + Organization) on **feedu.in**; `robots.txt` + `sitemap.xml`; favicon +
      `feedu_logo.png` used as the OG image
- [x] **Contact-sales "Failed to fetch" fixed** — landing runs on **:5177**, which wasn't in
      `CORS_ORIGINS`; added it (`.env` + `.env.example`) and friendlier network-error copy
- [x] Cleanup: removed unused `dot` prop in MultiOutput, deleted unused `sky.png`

### Prior session — roles, SaaS ops, support, call-waiter, rebrand to "feedu"
**Customer**
- [x] Landing screen uses the brand wordmark; entry field **slugifies** input so the
      restaurant name resolves (fixes most "Restaurant not found"); backend menu lookup
      is now case/whitespace-tolerant and returns a clear "offline" message when suspended
- [x] **Order confirmation vs history** are now distinct — the post-checkout track page shows
      a success banner ("Order confirmation"); opening the same order from history shows "Order details"
- [x] **Claim history** shows full date + time
- [x] **Direct (non-QR) entry asks for the table number** — stored in the cart and sent through
      checkout + call-waiter; orders accept a manual `tableName`
- [x] **Call waiter** button on the dine-in table badge ("on the way" confirmation state)
- [x] **Log out** button restyled red

**Admin (restaurant client)**
- [x] **Waiter role** is limited to Orders + Inventory (nav filtered + route guard)
- [x] **Table number** shown large/prominent on each order (admin rows + kitchen cards)
- [x] **Subscription card** in Settings (plan/status/price/cycle/expiry, read-only)
- [x] **Support page**: raise a ticket; click a ticket to open a **chat** with Feedu's replies
- [x] Auth page redesigned (split brand banner + form, logo, show/hide password)

**Super-admin = the Feedu company portal (not a restaurant)**
- [x] **Feedu employees live in a separate `employees` Mongo collection** (no `restaurantId`);
      auth login/refresh/me check employees first; existing super-admin migrated (id preserved)
- [x] Overview splits **Feedu SaaS revenue** (MRR/ARR/paying restaurants) from marketplace GMV;
      **Order-channels card removed**
- [x] **Onboard restaurants** (owner+restaurant+subscription, unique slug/email, mobile number);
      manage **subscription/suspend/delete on the restaurant detail page** (price + cycle, with
      **auto-derived expiry**); list is navigation-only
- [x] **Users** page split into **Feedu team** (+ add employee) and **Restaurant users**
- [x] **Support tickets**: list → click to **chat**, set status, reply as "Feedu Support"
- [x] **Account** page to change the super-admin's own credentials; auth redesign + show-password

**Kitchen**
- [x] `feedu` Kitchen lockup; prominent table number per ticket

**Platform-wide**
- [x] **Rebrand feedo → feedu** across all user-facing text (wordmarks, titles, copy, seed names).
      Technical identifiers unchanged: `@feedo/*` packages, localStorage keys, Mongo DB name,
      internal socket data values.
- [x] **No duplicate restaurants** — onboarding rejects a taken slug/owner email (slug is DB-unique)

### Prior session — dark customer redesign, branding, admin minimalism
- [x] **Customer app → dark, Zomato-style** (whole app dark-only; near-black palette, theme-color meta)
- [x] Animated gradient hero: `feedo` wordmark, floating glow blobs, staggered entrance,
      frosted-glass search with a **rotating placeholder** (cycles real dish names)
- [x] **VEG mode** toggle moved into the header (stacked VEG/MODE label + switch)
- [x] Every product opens a full **detail bottom-sheet** (image, description, prep/points,
      sizes, add-ons, qty + add) — taps anywhere on the card
- [x] Curated admin sections highlighted (accent sparkle header) and still shown in VEG mode
      (filtered to veg-eligible items; empty sections drop out)
- [x] **Rewards** and **Account** split into separate pages (header buttons + cross-links);
      Account = details + order history + red **Log out**; Rewards = wallet + claim + claims
- [x] **OTP enforced at guest checkout** (name + phone → 6-digit verify before placing the order)
- [x] Order-confirm/track page uses a back button (not Home/Menu)
- [x] Receipt cleaned up: removed the perforation circles → rounded card (blended badly on dark)
- [x] **Font → Poppins** across all apps; `feedo` italic wordmark logo in admin / super-admin
      (`Platform`) / kitchen (`Kitchen`) / customer
- [x] **Admin dashboard stats follow the selected range** (Day/Week/Month) with change %
- [x] **Analytics page** gains revenue/table, table turnover, avg serve time (channel + service-type
      cards dropped — single dine-in service type); dashboard reverted to its 4 core cards
- [x] **Orders: Pending-payment tab** + live count badges on Active/Pending (count mirrors the
      server's active filter exactly — fixed a phantom "served" count)
- [x] Mark-as-paid closes the dialog so the list reflects payment immediately
- [x] **Inventory: configurable sizes/variants** editor (label + price rows) → drives the customer
      "Choose size" options (previously empty/hardcoded)
- [x] **Loyalty points expiry** option (can-expire toggle + days) in the admin program form
- [x] Settings save shows a green **"Saved ✓"** confirmation (+ inline error on failure)
- [x] **Orders are dine-in only** (customer always sends `dine_in`; backend defaults to it)
- [x] **Admin + super-admin minimal density**: 14px root font, tight full-width content,
      filled borderless no-focus-ring inputs/selects

### Earlier
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
- [x] Payment methods: online (Razorpay) OR cash/pay-at-counter at checkout; cash orders
      confirm to the kitchen unpaid, admin "Mark cash collected"
- [x] Order `channel` (app/counter/zomato/swiggy/district) + channel-mix analytics in admin
      & super-admin; secret-gated `/integrations/:provider/orders` ingestion webhook for
      aggregators/middleware (orders land in one kitchen/dashboard, pre-paid on platform)

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
