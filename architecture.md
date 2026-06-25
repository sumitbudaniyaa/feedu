# Feedu — Architecture

> Premium Restaurant Operating System SaaS. This document is the single source of
> truth for how Feedu is structured. Update it whenever architecture, schema, APIs,
> packages, auth, sockets, or state management change.

---

## 1. Monorepo Structure

Feedu is a **Turborepo + npm workspaces** monorepo.

```
feedo/
├── apps/
│   ├── backend/          Express + MongoDB + Socket.IO API (:4000)
│   ├── admin-app/        Restaurant owner dashboard (:5173)
│   ├── customer-app/     QR-based mobile ordering PWA (:5174)
│   ├── kitchen-app/      Kitchen Display System / KDS (:5175)
│   ├── super-admin-app/  Internal SaaS console (:5176)
│   └── landing/          Public marketing site (:5177)
├── packages/
│   ├── config/           Tailwind preset, design tokens, shared tsconfig, postcss
│   ├── types/            Zod schemas + inferred TS types (shared contract)
│   ├── utils/            Framework-agnostic helpers (cn, format, pricing)
│   ├── ui/               Theme system + shadcn-style component library
│   └── api/              Typed fetch client, auth store, TanStack Query hooks, socket
├── scripts/dev.mjs       Arrow-key dev launcher (pick apps; backend always included)
├── turbo.json            Task pipeline
├── package.json          Workspaces + root scripts
└── tsconfig.base.json    Strict TS base config
```

### Running locally

`npm run dev` opens an arrow-key menu (↑/↓ + enter; all / admin / user / kitchen /
company / landing — each bundled with the backend, except **landing** which is a static
marketing site and runs standalone; falls back to a numbered prompt when stdin
isn't a TTY). Direct shortcuts skip the menu: `dev:all`, `dev:admin`,
`dev:user`, `dev:kitchen`, `dev:company`, `dev:landing`, `dev:backend`. Each maps to a
Turborepo `--filter` set so only the chosen workspaces start. `npm run seed` loads demo data.

### Dependency direction

```
config ◄── ui ◄── apps
types  ◄── utils ◄── ui
types  ◄── api ◄── apps
types  ◄── backend
utils  ◄── backend, ui, api
```

Packages never import from apps. `types` is the lowest-level shared package.

---

## 2. App Responsibilities

| App | Audience | Purpose | Default accent |
|-----|----------|---------|----------------|
| `admin-app` | Restaurant owner / manager / **branch manager** | Dashboard (incl. a live **seat-occupancy grid** with one-tap reserve/occupy/free + reservation details, synced via `table:updated`), orders, inventory, menu CMS, loyalty, analytics, settings. Multi-store owners default to a centralized **All-branches** view (combined dashboard + branch comparison), manage branches + branch-manager logins, and edit **brand** settings; branch managers are locked to one branch. Per-branch inventory availability/stock overrides. Toasts on every action. | violet |
| `customer-app` | Diners (mobile) | QR ordering, browsing, cart, optional **special instructions for the kitchen** at checkout, Razorpay checkout, mobile-OTP login (incl. at guest checkout, with a **"continue without verifying"** option that still places the order but forfeits reward points / member benefits), separate Rewards (wallet + in-app reward orders) & Account (history/logout) pages, live order tracking (**dark, Zomato-style**; dine-in only) | per-restaurant |
| `kitchen-app` | Kitchen staff | Live order queue, status transitions, timers, **customer special instructions in a highlighted band per order**, multi-select category filter (persisted across refresh, dark-optimized KDS) | emerald |
| `super-admin-app` | Feedu internal | One combined **Brands & Restaurants** page (search + type/status filters), single/multi-store onboarding, brand-level + per-branch suspend, combined SaaS plan editing, delete; platform analytics | blue |
| `landing` | Public / prospects | Marketing site — hero (mobile: CTAs stack, "How it works" under "Get started"), scroll-darkened value statement, feature bento, **MultiOutput** "One scan. Every app in sync." (admin/kitchen as fixed landscape shots, customer/waiter in matching phone frames), real-time flow, multi-branch, analytics, a **restaurant-benefit** section (turn tables faster, fewer wrong orders, bigger bills, regulars, get paid, know what sells — replaced the old enterprise/tech-infra cards), **use-cases** bento ("One platform. Every kind of restaurant." — single card, varied tile sizes, `restaurant` highlighted in the maroon accent). Routes: **/** (home), **/contact-sales** (form → POST `/public/leads` → company portal), **/about** (company page — "a product of TwentyEleven", links to twentyeleven.in), **/privacy** and **/terms** (app-specific legal pages); any unknown path redirects to `/`. SEO: full meta + Open Graph + Twitter cards + JSON-LD (SoftwareApplication + Organization), `robots.txt` + `sitemap.xml`, canonical/OG on the **feedu.in** domain. Theme inspired by trupeer.ai: **cream/ivory** canvas, **butter-yellow** primary buttons, maroon micro-accent, **Fraunces serif** hero + **Poppins** sans headings, **pastel-tinted** cards, big rounded corners. **Footer**: centered `feedu` wordmark + "here to help you feed", a paperclip clipped to the top edge, inline Instagram (@orderwithfeedu) + About/Privacy/Terms links, and "A product of TwentyEleven" (→ twentyeleven.in). Mockups render the real apps — staff apps in **light** mode (admin violet · kitchen status-colored), customer PWA in its real **dark** look | cream / butter-yellow |

---

## 3. Package Responsibilities

- **@feedo/config** — `tailwind.preset.cjs` (consumed via Tailwind `presets`), `tokens.ts`
  (raw palette/accents/chart colors), `postcss.config.cjs`, `tsconfig.base.json`.
- **@feedo/types** — All Zod schemas + inferred types and DTOs for every entity, plus
  auth contracts and Socket.IO event maps. Imported by backend (validation) and
  frontends (typing). Single source of truth for the data contract.
- **@feedo/utils** — `cn` (clsx + tailwind-merge), currency/date/number formatters,
  `pricing` (authoritative order math shared by backend + cart preview), misc helpers.
- **@feedo/ui** — `ThemeProvider`/`useTheme`/`ThemeToggle` + a shadcn-style component
  set (Button — incl. `accent`/`success` variants, Card, Input, Textarea, Select, Label,
  Badge, Skeleton, Spinner, Avatar, Separator, Switch, Dialog, Tabs, DropdownMenu, Tooltip,
  EmptyState, `useConfirm` confirm dialogs, and a dependency-free `Toaster` + `toast()`) and
  `styles/globals.css`.
- **@feedo/api** — `ApiClient` (fetch + auto refresh + multipart `upload`), `createAuthStore`
  (Zustand + persist, namespaced per app), and hook factories: `createAuthHooks`,
  `createDomainHooks` (restaurant/dashboard/orders/redemptions), `createResource` (generic
  CRUD), `createPublicHooks` (menu/checkout/account/OTP/redeem), `createPlatformHooks`,
  `createSocket`.

---

## 4. Frontend Architecture

- **React 18 + Vite + TypeScript**, strict mode.
- **Routing**: React Router (admin-app uses protected routes + dashboard layout).
- **Server state**: TanStack Query, configured per app in `main.tsx`.
- **Client/auth state**: Zustand store from `@feedo/api`, persisted to localStorage with
  an app-namespaced key (e.g. `feedo-admin-auth`). The admin app also keeps a tiny
  dependency-free **active-branch** store (`feedu-admin-branch`); empty = "All branches"
  (centralized), and `ApiClient` sends the selection as the `x-branch-id` header.
- **Toasts**: `@feedo/ui` exports a dependency-free `Toaster` + `toast()`. Admin and
  super-admin wire it into the TanStack Query **MutationCache**, reading each mutation's
  `meta`: it shows a per-action `successMessage` ("Product created", "Branch updated", …)
  or the API error message, and respects `meta.silent` (e.g. auth login/register show no
  toast — navigation + inline errors are the feedback).
- **Styling**: Tailwind via the shared preset; each app's `tailwind.config.cjs` also
  scans `@feedo/ui` source so shared class names survive purge.
- **Animation**: Framer Motion (subtle, premium — fades, slide-ups, layout).
- **Data flow**: component → query/mutation hook → `ApiClient` → backend `/api`.

---

## 5. Backend Architecture

Modular structure under `apps/backend/src/`:

```
config/       env (zod-validated), db (mongoose connect)
utils/        ApiError, http (asyncHandler/ok), jwt, logger
middleware/   auth (authenticate/authorize), tenant (resolveTenant/requireTenant),
              validate (zod), error (notFound/errorHandler)
models/       Mongoose models (one file per aggregate)
modules/      Feature modules: <name>/<name>.{routes,controller,service}.ts
sockets/      Socket.IO init + getIO accessor
routes/       Central /api router mounting modules
scripts/      seed.ts (dev data)
app.ts        Express app (helmet, cors, json, compression, morgan, routes, errors)
index.ts      Bootstrap: DB connect → http server → sockets → listen
```

### Request lifecycle
`route → validate(zod) → authenticate → resolveTenant/authorize → controller →
service (business logic + models) → ok() envelope`. Errors bubble to `errorHandler`.

### API surface (modules)
- `/auth` — register / login / refresh / me / change-password (verifies current; any signed-in account)
- `/restaurants` — branch profile, settings, onboarding state, go-live; `/me/subscription`
  (resolves the branch's own or the brand's combined plan), `/me/brand` GET (account type, branding,
  tax → drives the multi-branch UI) + PATCH (brand-wide: name/branding/tax — **propagated to every
  branch**). Branches: `GET/POST /branches`, `PATCH/DELETE /branches/:id` (edit / suspend / delete,
  brand-wide; never the last branch). Owners self-add up to `SELF_SERVE_BRANCH_LIMIT` (5)
  branches; beyond that only the super-admin (`/platform/brands/:id/branches`, uncapped) adds more.
  Branch managers: `GET/POST /branches/:id/managers` and
  `PATCH/DELETE /branches/:id/managers/:userId` — create a **branch-locked** `branch_manager` login,
  reset its password, or remove it.
- `/branch-menu` — effective menu for the active branch + per-product override upsert (price/
  availability/stock/exclusive)
- `/products`, `/categories`, `/sections`, `/loyalty`, `/rewards` — **brand-level** CRUD (shared
  catalog, scoped to `req.brandId` via `crud({ level: 'brand' })`); `/tables`, `/staff`,
  `/customers` — **branch-level** CRUD (scoped to `req.branchId`). `/rewards` also exposes
  `/redemptions` (list + fulfil/cancel). `/tables/:id/status` sets a table's live **seat
  occupancy** (`available | occupied | reserved` + reservation details) and emits
  `table:updated` to the branch + brand rooms for live grids.
  `/customers/:id` returns per-diner analytics (spend, AOV, most-ordered, reward claims, visits).
  `/staff` create + `:id` edit accept name/email/mobile/role/password (password optional on edit).
- `/orders` — list / create / `:id/status` (state-machine transitions, emits realtime;
  "served" auto-completes; unpaid online orders excluded from staff lists)
- `/support` — tenant: restaurants raise tickets + reply (chat); super-admin manages via `/platform/support`
- `/waiter/attend` — tenant: a staff member accepted a table call → emits `waiter:attending`
- `/analytics/dashboard` — range-scoped (day/week/month) revenue + orders (change % vs the
  previous window), AOV, repeat %, revenue series, top products, peak hours, channel mix, and
  table-efficiency metrics; `?scope=brand` returns the **combined "All branches"** view for
  brand-wide roles (else the active branch). `/analytics/branches` — brand-wide **branch
  comparison** (revenue/orders/AOV/share per branch). All from real aggregations.
- `/uploads` — authenticated image upload (multer in-memory → **Cloudinary** when
  `CLOUDINARY_*` is set, foldered by brand; falls back to local `/uploads` static in dev). Returns an absolute URL.
- `/platform/*` — super-admin, cross-tenant: `stats` (incl. Feedu SaaS MRR/ARR), `analytics`,
  `users` (Feedu employees + restaurant users), `users` POST (create employee) + `users/:id`
  PATCH (edit employee), `orders`, `customers` (+ `?restaurantId=`/`?search=`), `customers/:id`
  (per-diner analytics), `support` (list/update/reply), `account` (own credentials).
  **Accounts:** `restaurants` POST (onboard single, or a brand with `accountType:'multi'` +
  `branches:[]`), `restaurants/:id` (detail / suspend / DELETE one branch),
  `restaurants/:id/subscription`. **Brand-level:** `brands` (brand→branches rollup with combined
  subscription summary + account type), `brands/:id` PATCH (suspend/reactivate **all** branches),
  `brands/:id/subscription` PATCH (edit the **combined** plan: fee/cycle/duration/expiry/status),
  `brands/:id` DELETE (delete brand + all branches + data), `brands/:id/branches` POST (add a branch).
- **Subscription gating**: public menu/QR/checkout call `assertSubscriptionActive` — a restaurant
  whose subscription is `past_due`/`cancelled`/expired (or is suspended `isLive:false`) is blocked
  from the customer app; the admin app shows a full lock screen for that restaurant.
- `/public/*` — customer, no staff auth: `/r/:slug` (menu, case-insensitive), `/qr/:qrToken`,
  `r/:slug/table?name=` (validate a manually-typed table for non-QR entry — tolerant "5" ↔ "Table 5",
  404 if it doesn't exist or the restaurant has no tables configured; the diner's typed table
  lives in **sessionStorage**, not the persisted cart, so it survives refreshes but clears on
  tab close — it's never carried into a later visit when they may be seated elsewhere),
  `checkout` (optional manual `tableName`), `orders/:id/pay`, `orders/:id` (track),
  `auth/otp/request`, `auth/otp/verify`, `r/:slug/account` + `r/:slug/redeem` (OTP-token gated),
  `r/:slug/call-waiter` (rings staff; `reason: assistance | bill`),
  `orders/:id/razorpay` (start an online payment for an existing unpaid order — ongoing-order pill),
  `leads` (POST — capture a **Book-a-demo / Contact-sales** enquiry from the marketing site)
- `/platform/leads` — super-admin: list + update status (`new | contacted | converted | closed`)
  of marketing leads (the company portal's **Leads** page).

Pricing is server-authoritative: order totals are re-derived from DB product prices,
never trusted from the client.

### Customer auth (mobile OTP)
Diners sign in with a mobile OTP: `POST /public/auth/otp/request` generates a 6-digit code
(bcrypt-hashed, stored in the TTL-indexed `Otp` collection, rate-limited). No SMS provider is
wired, so in **demo/beta** mode (`env.demoOtp` — any non-prod run, or `BETA_MODE=true` in
production) the code is the fixed **123456**, returned in the response + logged, and the app
shows it to the diner ("Beta — use code 123456"). Codes are valid 5 min (`codeExpiresAt`,
checked on verify — the `Otp` doc itself lives longer to retain the per-phone rate counters,
then TTL-cleans). `POST /public/auth/otp/verify` checks the code (max 5 wrong attempts) and
issues a 30-day **customer JWT** (`{ sub: phone, kind: 'customer' }`, signed with
the access secret). `optionalCustomerAuth` reads that token on public routes → `req.customerPhone`;
`requireCustomer` gates the account + redeem endpoints so a diner can only ever see/spend their
own wallet. The customer app stores the token in its auth store; `ApiClient` sends it as a bearer.

### Platform (super-admin)
`/platform/*` is super-admin-only and cross-tenant: `stats` (GMV, MRR, live/total restaurants,
orders, customers), `analytics` (14-day GMV series + top restaurants), `users`, `orders`,
`customers`, `restaurants/:id` (full detail), and the `brands` rollup. The console is a sidebar
app (Overview / **Brands & Restaurants** / Orders / Customers / Employees / Support / Account):
one combined accounts page lists every brand with its branches (search + type/status filters),
onboards single- or multi-store accounts, and offers **brand-level** suspend / combined-plan
editing / delete **and** per-branch suspend / add-branch.

### Loyalty & rewards
Two layers: **earning** and **claiming/ordering**.

**Earning** — products may define `loyaltyPoints` (per unit), summed into
`order.loyaltyPointsEarned` at creation and credited to the guest's `Customer` record
(keyed `restaurantId + phone`) when the order is paid. A points `LoyaltyProgram` (pts per ₹)
is the fallback when items don't define their own points. The program is **brand-owned**
(stamped with `brandId`; `restaurantId` is legacy), so the earn lookup (`findPointsProgram`)
must resolve it **brand-aware** (`{ $or: [{ brandId }, { restaurantId }] }`) — a `restaurantId`-only
query misses every onboarded (brand-scoped) restaurant and silently awards 0 points. A program
can also set an optional **points expiry** (`expiryDays`) — configured in the admin loyalty form
via a "can expire" toggle + days input.

**Rewards are ordered in-app, never a counter code.** Admins manage a `LoyaltyReward`
catalog where each reward **must link a menu item** (enforced in the admin form + the
`/rewards` create schema). A diner (OTP-signed-in) adds a reward to their cart — it becomes a
**₹0 line** on the order:
- `POST /public/r/:slug/checkout` accepts an optional `rewardId`. It validates the signed-in
  wallet (`points ≥ cost`), appends the reward's product as a ₹0 item, and sets
  `loyaltyRewardApplied` + `rewardPointsSpent` on the order. Payable total excludes the ₹0 item.
- Points are spent **once**, atomically, when the order is confirmed: in `markPaid` after a
  Razorpay payment, or immediately for a ₹0 / reward-only order (no Razorpay step). A
  `rewardDeducted` flag guards against double-spend; points are refunded if placement fails.
- The free item flows to the kitchen/admin like any order (flagged `isReward`), and the diner
  tracks it normally.

`GET /public/r/:slug/account` (OTP-token gated) returns the wallet, past orders, the catalog,
and any legacy claims. `POST /public/r/:slug/redeem` still exists (direct claim / non-linked
fallback), but the primary UX is the cart flow above.

### Payment methods & sales channels
Checkout offers **online (Razorpay)** or **cash / pay-at-counter**. A cash order is
confirmed immediately (goes to the kitchen) but left `paymentStatus: unpaid` — it never
auto-pays. An admin records the payment via `PATCH /orders/:id/payment { method? , splits? }`, choosing
the method actually used (`cash | upi | card | zomato | swiggy | district`); this sets the
order paid, stamps the method, and writes a `Payment`. The mark-paid dropdown also offers
**Split payment** — selecting it reveals per-method amount rows (e.g. part cash + part UPI);
the request sends `splits: [{ method, amount }]`, the server validates the amounts sum to the
order total (₹1 tolerance), stamps `paymentMethod: 'split'` with a `paymentSplits` breakdown,
and writes one `Payment` per split. Online and ₹0/reward-only orders are
finalized as paid at checkout. `finalizeOrder()` centralizes confirm + loyalty accrual +
reward-spend; `markPaid` (online) and the cash path both call it. The admin Orders page has
three tabs (**Active / Pending payment / All**, with live count badges); each row shows a
Paid/Unpaid badge and opens a details dialog with customer info + the mark-paid control.
Orders are **dine-in only** — the customer app always sends `dine_in` and the backend defaults to it.

Every order records a **`channel`** (`app | counter | zomato | swiggy | district`): the
customer app sets `app`, staff orders `counter`, and the aggregator webhook sets the
provider. Admin Analytics + super-admin Overview show a **channel mix** (orders + revenue
share). Aggregators/middleware (Zomato/Swiggy/District, UrbanPiper, etc.) push pre-paid
orders into one kitchen/dashboard via `POST /api/integrations/:provider/orders`
(secret-gated by `x-integration-secret` = `INTEGRATION_SECRET`; items reference our product
ids). Note: these platforms are *channels*, not payment gateways — you can't embed a
"pay with Zomato" button; you ingest their orders and settlement happens on their side.

### Payments (Razorpay)
Customer checkout is pay-first: `POST /public/r/:slug/checkout` captures name + mobile and
an optional **`notes`** field (free-text special instructions the diner types in the checkout
drawer; persisted on `order.notes` and shown in a highlighted band on the kitchen KDS card) and
creates a **pending, silent** order (hidden from the kitchen until paid) plus a matching
Razorpay order. The client opens Razorpay Checkout; on success `POST /public/orders/:id/pay`
verifies the HMAC `sha256(order_id|payment_id, key_secret)` signature, marks the order paid +
confirmed, records a `Payment`, and emits it to the kitchen/admin. A **₹0 order** (reward-only
/ fully free) skips Razorpay and is confirmed immediately at checkout. With Razorpay keys unset
the backend runs in **demo mode** (signature check skipped) for local use; real test keys are
configured in `.env`. Keys: `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` (backend),
`VITE_RAZORPAY_KEY_ID` (customer app). Aggregations cast `restaurantId` to `ObjectId` explicitly
(aggregation does not auto-cast like `find`).

### Security (enterprise)
- **Rate limiting** (`express-rate-limit`, per IP): global ceiling (1000/15min), strict on
  `/auth` (20/15min, failures only), and on public order placement (30/min). **OTP requests**
  add a per-IP limiter (6/10min) **plus** per-phone guards in the handler — a 30s resend
  cooldown and a 5-codes-per-15-min rolling-window cap (counters live on the `Otp` doc) — so a
  single number can't be SMS-bombed once a real gateway is wired.
- **Input safety**: `express-mongo-sanitize` (strips `$`/`.` operators → blocks NoSQL
  injection), `hpp` (param pollution), Zod validation on every body, ObjectId param guard.
- **Headers**: `helmet` with a tight CSP (JSON-only API), `x-powered-by` disabled, `trust proxy`.
- **AuthN/Z**: JWT access+refresh, bcrypt cost 12, `authorize(...roles)` RBAC, tenant scoping
  on every protected route, password hash never serialized. Body size capped at 1 MB.
- **Error hygiene**: Mongoose CastError/ValidationError/duplicate-key, **ZodError** (incl. the
  `crud` create/update schema parse → 400 with the offending field), and JWT errors mapped to
  clean 4xx envelopes; internals never leaked.

### API response envelope
```ts
// success
{ "success": true, "data": T, "meta"?: {...} }
// error
{ "success": false, "error": { "code": string, "message": string, "details"?: unknown } }
```

---

## 6. Authentication Flow

- **JWT access + refresh** tokens. Access (15m) carries
  `{ sub, role, restaurantId, brandId, branchIds }` (`restaurantId` = the user's home branch;
  `branchIds` = every branch a brand-wide role may manage); refresh (7d) carries `{ sub }`.
- **Login**: verifies bcrypt hash, issues tokens. Checks the **`Employee`** collection first
  (Feedu staff / super admins), then `User` (restaurant accounts). Token brand context is
  recomputed on login/refresh, so newly added branches appear after the next refresh.
- **Refresh** / **me**: same dual lookup (Employee → User).
- **Onboarding is super-admin-only** — there is no owner self-signup. `/platform/restaurants`
  POST creates the owner `User` + a `Brand` (with `accountType`) + one or more branches
  (`Restaurant`) + a `Subscription` (per-branch for single, one combined for multi), rejecting
  duplicate slug/email. Feedu employees are created via `/platform/users` POST in the
  `Employee` collection. (A `register` service still exists for tests/seeding and creates a
  Brand + first branch + trial subscription, but is not exposed in the admin UI.)
- Passwords stored as bcrypt hashes (`passwordHash`, `select:false`, stripped from JSON).

### Roles (RBAC)
`super_admin · brand_owner · brand_admin · branch_manager · kitchen_staff · cashier`
plus the legacy `owner · manager · kitchen · waiter · customer` (kept for back-compat).
`BRAND_WIDE_ROLES` = `owner · brand_owner · brand_admin` (see every branch of their brand);
other roles are scoped to a single branch. `authorize(...roles)` guards routes; `resolveTenant`
scopes the request to a brand + active branch.

---

## 7. Multi-Tenant Strategy — Brand → Branch

Feedu is a **multi-branch** hierarchy: a **Brand** is the tenant, and each
**Restaurant document is a branch** of that brand (`restaurantId === branchId`).
A single-store account is simply a brand with one branch.

- **Brand (tenant)** owns the shared catalog/branding/loyalty/subscription. **Branch
  (`Restaurant`)** owns its own orders/tables/staff/customers and references its brand
  via `brandId`.
- **`accountType`** on `Brand` — `single` (one outlet, billed on its own) or `multi`
  (a chain billed **once** for the whole brand via one combined subscription). Adding a
  second branch auto-upgrades a brand to `multi`.
- **Per-branch menu overrides** — the brand owns the `Product`/`Category`/`Section`
  catalog; a branch may override price/availability/stock or flag an item branch-exclusive
  via `BranchMenu`. `resolveBranchMenu` / `resolveOrderProducts` merge brand catalog +
  branch overrides (`price = override ?? base`, `stock = override ?? product`,
  `available = (override ?? true) && product`).
- **`resolveTenant`** sets `req.brandId`, `req.branchId` and `req.branchIds` from the JWT.
  The active branch is chosen via the **`x-branch-id`** header; a brand-wide role may switch
  to any branch in its token snapshot **or** any branch belonging to its brand (verified with
  a cheap lookup, covering branches created after the token was issued). `super_admin` targets
  any brand/branch via `x-brand-id` / `x-branch-id`.
- Tenant-scoped collections still carry **`restaurantId`** (the branch FK) and most queries
  filter by `req.branchId`; brand-shared collections carry **`brandId`** and are scoped by
  `req.brandId`. The `crud()` factory takes `level: 'branch' | 'brand'` to pick the scope.
- **Subscription resolution** (`findEffectiveSubscription`): a branch resolves to its own
  subscription (single-store) or the brand's one combined subscription (multi-store).
- Backward-compatible by design: existing single-outlet restaurants were migrated to one
  brand each (`npm run migrate:brands`), so legacy data and single-branch flows are unchanged.

---

## 8. Database Overview

Collections: **Brand, User, Employee, Restaurant, Category, Product, BranchMenu, Table, Order,
LoyaltyProgram, CustomerLoyalty, LoyaltyReward, Redemption, Customer, Section, Payment,
Notification, Subscription, SupportTicket, Otp, Lead**.

- **`Brand`** is the **tenant** — `{ ownerId, name, slug (unique), accountType: single|multi,
  branding, tax, currency }`. `Restaurant` is a **branch** with `brandId`.
- **`BranchMenu`** — per-branch overrides on the brand catalog:
  `{ brandId, branchId, productId, priceOverride, isAvailable, stock, branchExclusive }`,
  unique on `{ branchId, productId }`.
- Brand-shared collections (`Product`/`Category`/`Section`/`LoyaltyProgram`/`LoyaltyReward`)
  carry `brandId`; `restaurantId` on them is optional/legacy (the brand's home branch).
- **`Employee`** is the **Feedu company staff** collection (super admins; name/email/phone) —
  deliberately separate from `User` and never tied to a restaurant. Auth (`login`/`refresh`/`me`)
  checks `Employee` first, then `User`. `/platform/users` create/edit + the portal Employees page use it.
- **`Subscription`** carries `brandId` + `price` + `billingCycle` (monthly/quarterly/yearly) +
  `currentPeriodEnd` (auto-derived expiry); MRR is normalised from price/cycle. A multi-store
  brand has **one** combined subscription covering all branches; single-store has one per branch.
- **`SupportTicket`** — `{ restaurantId, subject, message, category, priority, status, replies[] }`.

Key indexes:
- `User`: `{ email, restaurantId }` unique; `role`, `restaurantId`. `Employee`: `email` unique.
- `Order`: `{ restaurantId, status, placedAt }`, `{ restaurantId, createdAt }`,
  `{ restaurantId, orderNumber }` unique. Carries snapshots (`tableName`, item `isVeg` /
  `prepTimeMinutes` / `categoryId` for the kitchen category filter), `customerName/Phone`,
  `paymentMethod` (incl. `split`) + `paymentSplits[]`, and reward fields (`isReward`,
  `loyaltyRewardApplied`, `rewardPointsSpent`, `rewardDeducted`).
- `Product`: `{ restaurantId, categoryId }`, text index on `name`/`tags`; has
  `prepTimeMinutes` + `loyaltyPoints`.
- `Table`: `qrToken` unique; also carries live `status` (`available | occupied | reserved`) +
  an embedded `reservation` (name/phone/partySize/time) for the seat-occupancy grid.
  `Customer`: `{ restaurantId, phone }` unique (loyalty wallet).
- `Lead`: marketing enquiries from the landing site (`name/email/phone/restaurantName/city/
  message`, `type: demo|sales`, `status`); not tenant-scoped, surfaced in the company portal.
- `Redemption`: `{ restaurantId, code }` unique. `Otp`: TTL index on `expiresAt`
  (auto-expiry), code stored bcrypt-hashed.

Schemas mirror the Zod definitions in `@feedo/types`.

---

## 9. Socket.IO Architecture

- Initialized on the same HTTP server (`sockets/index.ts`), CORS-scoped to app origins.
- **Rooms**: `restaurant:<id>` (alias `branch:<id>`), `brand:<id>`, `kitchen:<id>`,
  `order:<id>` (helpers in `@feedo/types`). Order events fan out to both the branch room and
  the **brand room**, so brand-wide dashboards watch every branch live.
- Clients emit `join:restaurant` / `join:brand` / `join:order`; server emits `order:created`,
  `order:updated`, `order:status_changed`, `notification:new`, `dashboard:refresh`,
  `waiter:called` (diner rang a table), `waiter:attending` (a staff member accepted —
  customer app shows an "on the way" pill, and all staff devices clear that table's call),
  and `table:updated` (seat-occupancy/reservation changed — the admin seat grid re-syncs live).
- Event names + payload maps live in `@feedo/types` (`SOCKET_EVENTS`, `rooms`,
  `ServerToClientEvents`, `ClientToServerEvents`) so server and clients stay in sync.
- Redis adapter is the planned horizontal-scaling path (architecture is Redis-ready).

---

## 10. Theme System

- CSS variables (HSL) defined in `@feedo/ui/styles/globals.css`; Tailwind preset maps
  utilities to them. **Dark is primary** (#090909 / #111111 / #1A1A1A / #F5F5F5 / #9CA3AF).
- **Font: Poppins** across all apps (loaded from Google Fonts in each `index.html`; set as
  `fontFamily.sans` in the shared Tailwind preset). The brand mark is the lowercase italic
  `feedu` wordmark used in every app header (admin, super-admin, kitchen `feedu` Kitchen,
  customer hero) — rendered as text, not an image. The only logo image asset is
  `public/feedu_logo.png` (white italic wordmark on black), wired as the **favicon**
  (`<link rel="icon">`) in every app's `index.html`. The customer menu page also closes with an
  **engraved footer**: a big left-aligned `feedu` wordmark with the "here to feed you ♥"
  tagline on the right, both set in low-opacity white + `text-shadow` so they read as carved
  into the near-black background.
- `ThemeProvider` resolves `dark | light | system`, persists to localStorage, and sets
  `.dark` + `[data-accent]` on `<html>`. Six muted accents map to `[data-accent='…']`.
- Per-restaurant branding (accent + theme mode) is stored on `Restaurant.branding`. The
  **customer app is dark-only** (near-black `#0D0D0D`/`#171717`, Zomato-style) and applies the
  restaurant's accent as the animated gradient hero (floating glows, staggered entrance);
  buttons are green (`success`) while the accent stays decorative.
- **Admin + super-admin** run a compact/minimal density: a 14px root font (rem-scales everything
  down), tight `px-4 py-4` full-width content, and **filled, borderless, no-focus-ring** form
  controls (overridden in each app's `index.css`).

---

## 11. Deployment & Scalability (planned)

- Backend: containerized Node; MongoDB Atlas; Redis for Socket.IO adapter + caching.
- Frontends: static builds on Vercel/CDN, one project per app.
- Turborepo remote caching for CI build speed.
- Stateless API (JWT) → horizontal scale behind a load balancer; sockets via Redis
  pub/sub adapter. Indexed, tenant-scoped queries keep reads cheap at scale.

---

## 12. Conventions

- Strict TypeScript, no stray `any`. Shared types from `@feedo/types`.
- Backend uses ESM with `.js` import specifiers (NodeNext); dev via `tsx`.
- One aggregate per model file; feature logic in `modules/<name>/*.service.ts`.
- UI: generous spacing, soft borders, rounded-xl cards, subtle motion. Lucide icons only.
