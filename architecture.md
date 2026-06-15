# Feedo — Architecture

> Premium Restaurant Operating System SaaS. This document is the single source of
> truth for how Feedo is structured. Update it whenever architecture, schema, APIs,
> packages, auth, sockets, or state management change.

---

## 1. Monorepo Structure

Feedo is a **Turborepo + npm workspaces** monorepo.

```
feedo/
├── apps/
│   ├── backend/          Express + MongoDB + Socket.IO API (:4000)
│   ├── admin-app/        Restaurant owner dashboard (:5173)
│   ├── customer-app/     QR-based mobile ordering PWA (:5174)
│   ├── kitchen-app/      Kitchen Display System / KDS (:5175)
│   └── super-admin-app/  Internal SaaS console (:5176)
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
company — each bundled with the backend; falls back to a numbered prompt when stdin
isn't a TTY). Direct shortcuts skip the menu: `dev:all`, `dev:admin`,
`dev:user`, `dev:kitchen`, `dev:company`, `dev:backend`. Each maps to a Turborepo
`--filter` set so only the chosen workspaces start. `npm run seed` loads demo data.

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
| `admin-app` | Restaurant owner / manager | Dashboard, orders, inventory, menu CMS, loyalty, analytics, settings, onboarding | violet |
| `customer-app` | Diners (mobile) | QR ordering, browsing, cart, Razorpay checkout, mobile-OTP login (incl. at guest checkout), separate Rewards (wallet + in-app reward orders) & Account (history/logout) pages, live order tracking (**dark, Zomato-style**; dine-in only) | per-restaurant |
| `kitchen-app` | Kitchen staff | Live order queue, status transitions, timers (dark-optimized KDS) | emerald |
| `super-admin-app` | Feedo internal | Restaurant management, subscriptions, platform analytics, feature toggles | blue |

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
  EmptyState) and `styles/globals.css`.
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
  an app-namespaced key (e.g. `feedo-admin-auth`).
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
- `/auth` — register / login / refresh / me
- `/restaurants` — profile, settings, onboarding state, go-live (tenant)
- `/categories`, `/products`, `/sections`, `/loyalty`, `/rewards`, `/tables`, `/staff`,
  `/customers` — tenant-scoped CRUD/lists (most via a shared `crud()` factory that auto-scopes
  every query to `req.restaurantId`). `/rewards` also exposes `/redemptions` (list + fulfil/cancel).
- `/orders` — list / create / `:id/status` (state-machine transitions, emits realtime;
  "served" auto-completes; unpaid online orders excluded from staff lists)
- `/analytics/dashboard` — range-scoped (day/week/month) revenue + orders (with change % vs the
  previous equivalent window), AOV, repeat %, revenue series, top products, peak hours, channel mix,
  and table-efficiency metrics: **revenue/table, table turnover, avg serve time** (placed→completed),
  plus `tableCount` and order-type split (all from real aggregations; cast `restaurantId` to ObjectId)
- `/uploads` — authenticated image upload (multer → local `/uploads` static, CORP cross-origin)
- `/platform/*` — super-admin, cross-tenant: `stats`, `analytics`, `users`, `orders`,
  `customers`, `restaurants`, `restaurants/:id` (detail), subscription + suspend/reactivate
- `/public/*` — customer, no staff auth: `/r/:slug` (menu), `/qr/:qrToken`, `checkout`,
  `orders/:id/pay`, `orders/:id` (track), `auth/otp/request`, `auth/otp/verify`,
  `r/:slug/account` + `r/:slug/redeem` (OTP-token gated)

Pricing is server-authoritative: order totals are re-derived from DB product prices,
never trusted from the client.

### Customer auth (mobile OTP)
Diners sign in with a mobile OTP: `POST /public/auth/otp/request` generates a 6-digit code
(bcrypt-hashed, stored in the TTL-indexed `Otp` collection, rate-limited; dev also returns it
in the response + logs it — no SMS provider is wired). `POST /public/auth/otp/verify` checks
the code and issues a 30-day **customer JWT** (`{ sub: phone, kind: 'customer' }`, signed with
the access secret). `optionalCustomerAuth` reads that token on public routes → `req.customerPhone`;
`requireCustomer` gates the account + redeem endpoints so a diner can only ever see/spend their
own wallet. The customer app stores the token in its auth store; `ApiClient` sends it as a bearer.

### Platform (super-admin)
`/platform/*` is super-admin-only and cross-tenant: `stats` (GMV, MRR, live/total restaurants,
orders, customers), `analytics` (14-day GMV series + top restaurants), `users`, `orders`,
`customers`, and `restaurants/:id` (full detail: revenue, staff, products, recent orders).
The console is a sidebar app (Overview / Restaurants / Orders / Customers / Users) and can edit
subscriptions and suspend/reactivate restaurants.

### Loyalty & rewards
Two layers: **earning** and **claiming/ordering**.

**Earning** — products may define `loyaltyPoints` (per unit), summed into
`order.loyaltyPointsEarned` at creation and credited to the guest's `Customer` record
(keyed `restaurantId + phone`) when the order is paid. A points `LoyaltyProgram` (pts per ₹)
is the fallback when items don't define their own points. A program can also set an optional
**points expiry** (`expiryDays`) — configured in the admin loyalty form via a "can expire"
toggle + days input.

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
auto-pays. An admin records the payment via `PATCH /orders/:id/payment { method }`, choosing
the method actually used (`cash | upi | card | zomato | swiggy | district`); this sets the
order paid, stamps the method, and writes a `Payment`. Online and ₹0/reward-only orders are
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
- **Rate limiting** (`express-rate-limit`): global ceiling, strict on `/auth`, and on public
  order placement.
- **Input safety**: `express-mongo-sanitize` (strips `$`/`.` operators → blocks NoSQL
  injection), `hpp` (param pollution), Zod validation on every body, ObjectId param guard.
- **Headers**: `helmet` with a tight CSP (JSON-only API), `x-powered-by` disabled, `trust proxy`.
- **AuthN/Z**: JWT access+refresh, bcrypt cost 12, `authorize(...roles)` RBAC, tenant scoping
  on every protected route, password hash never serialized. Body size capped at 1 MB.
- **Error hygiene**: Mongoose CastError/ValidationError/duplicate-key and JWT errors mapped to
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

- **JWT access + refresh** tokens. Access (15m) carries `{ sub, role, restaurantId }`;
  refresh (7d) carries `{ sub }`.
- **Register** (owner self-signup): creates `User(role=owner)` + `Restaurant` shell +
  trial `Subscription`, starts onboarding, returns session.
- **Login**: verifies bcrypt hash, issues tokens.
- **Refresh**: client `ApiClient` auto-calls `/auth/refresh` once on a 401, retries the
  original request, or logs out on failure.
- Passwords stored as bcrypt hashes (`passwordHash`, `select:false`, stripped from JSON).

### Roles (RBAC)
`super_admin · owner · manager · kitchen · waiter · customer`.
`authorize(...roles)` guards routes; `resolveTenant` scopes the request to a restaurant.

---

## 7. Multi-Tenant Strategy

- Single database, **`restaurantId` on every tenant-scoped collection** (indexed).
- `resolveTenant` middleware sets `req.restaurantId` from the token; `super_admin` may
  target any tenant via the `x-restaurant-id` header.
- Services must always filter queries by `req.restaurantId`. Unique constraints are
  scoped per tenant where relevant (e.g. user email, order number).

---

## 8. Database Overview

Collections: **User, Restaurant, Category, Product, Table, Order, LoyaltyProgram,
CustomerLoyalty, LoyaltyReward, Redemption, Customer, Section, Payment, Notification,
Subscription, Otp**.

Key indexes:
- `User`: `{ email, restaurantId }` unique; `role`, `restaurantId`.
- `Order`: `{ restaurantId, status, placedAt }`, `{ restaurantId, createdAt }`,
  `{ restaurantId, orderNumber }` unique. Carries snapshots (`tableName`, item `isVeg` /
  `prepTimeMinutes`), `customerName/Phone`, and reward fields (`isReward`,
  `loyaltyRewardApplied`, `rewardPointsSpent`, `rewardDeducted`).
- `Product`: `{ restaurantId, categoryId }`, text index on `name`/`tags`; has
  `prepTimeMinutes` + `loyaltyPoints`.
- `Table`: `qrToken` unique. `Customer`: `{ restaurantId, phone }` unique (loyalty wallet).
- `Redemption`: `{ restaurantId, code }` unique. `Otp`: TTL index on `expiresAt`
  (auto-expiry), code stored bcrypt-hashed.

Schemas mirror the Zod definitions in `@feedo/types`.

---

## 9. Socket.IO Architecture

- Initialized on the same HTTP server (`sockets/index.ts`), CORS-scoped to app origins.
- **Rooms**: `restaurant:<id>`, `kitchen:<id>`, `order:<id>` (helpers in `@feedo/types`).
- Clients emit `join:restaurant` / `join:order`; server emits `order:created`,
  `order:updated`, `order:status_changed`, `notification:new`, `dashboard:refresh`.
- Event names + payload maps live in `@feedo/types` (`SOCKET_EVENTS`, `rooms`,
  `ServerToClientEvents`, `ClientToServerEvents`) so server and clients stay in sync.
- Redis adapter is the planned horizontal-scaling path (architecture is Redis-ready).

---

## 10. Theme System

- CSS variables (HSL) defined in `@feedo/ui/styles/globals.css`; Tailwind preset maps
  utilities to them. **Dark is primary** (#090909 / #111111 / #1A1A1A / #F5F5F5 / #9CA3AF).
- **Font: Poppins** across all apps (loaded from Google Fonts in each `index.html`; set as
  `fontFamily.sans` in the shared Tailwind preset). The brand mark is the lowercase italic
  `feedo` wordmark used in every app header (admin, super-admin, kitchen `feedo` Kitchen,
  customer hero) — text-only, no image asset.
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
