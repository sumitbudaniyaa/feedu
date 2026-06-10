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
├── scripts/dev.mjs       Interactive dev launcher (pick apps; backend always included)
├── turbo.json            Task pipeline
├── package.json          Workspaces + root scripts
└── tsconfig.base.json    Strict TS base config
```

### Running locally

`npm run dev` opens an interactive menu (all / admin / user / kitchen / company — each
bundled with the backend). Direct shortcuts skip the menu: `dev:all`, `dev:admin`,
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
| `customer-app` | Diners (mobile) | QR ordering, browsing, cart, checkout, loyalty, order tracking | violet |
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
  set (Button, Card, Input, Label, Badge, Skeleton, Spinner, Avatar, Separator, Switch,
  Dialog, Tabs, DropdownMenu, Tooltip, EmptyState) and `styles/globals.css`.
- **@feedo/api** — `ApiClient` (fetch + auto refresh), `createAuthStore` (Zustand +
  persist, namespaced per app), `createAuthHooks` (TanStack Query), `createSocket`.

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
CustomerLoyalty, Section, Payment, Notification, Subscription**.

Key indexes:
- `User`: `{ email, restaurantId }` unique; `role`, `restaurantId`.
- `Order`: `{ restaurantId, status, placedAt }`, `{ restaurantId, createdAt }`,
  `{ restaurantId, orderNumber }` unique.
- `Product`: `{ restaurantId, categoryId }`, text index on `name`/`tags`.
- `Table`: `qrToken` unique. `CustomerLoyalty`: `{ restaurantId, customerId }` unique.

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
- `ThemeProvider` resolves `dark | light | system`, persists to localStorage, and sets
  `.dark` + `[data-accent]` on `<html>`. Six muted accents map to `[data-accent='…']`.
- Per-restaurant branding (accent + theme mode) is stored on `Restaurant.branding`.

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
