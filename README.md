# Feedo

Premium Restaurant Operating System SaaS — a multi-tenant platform with an owner
dashboard, customer ordering PWA, kitchen display system, and an internal super-admin
console. Built as a Turborepo monorepo.

## Stack

React · Vite · TypeScript · Tailwind · **Poppins** · shadcn-style UI · Framer Motion · Zustand ·
TanStack Query · Recharts · Node · Express · MongoDB · Mongoose · Socket.IO · Zod ·
Razorpay · JWT.

## What it does

- **Admin** — range-aware dashboard (revenue/orders/AOV scoped to Day/Week/Month), live orders
  with **Active / Pending-payment / All** tabs (count badges, mark-as-paid with method), inventory
  (image upload, stock, prep time, per-item loyalty points, **configurable sizes/variants**),
  Menu CMS (carousel/hero/grid sections), loyalty rewards catalog + **points-expiry** option,
  Analytics (revenue/table, table turnover, avg serve time, peak hours, top products), tables &
  downloadable QR codes, staff, customers, settings (branding/tax/go-live, with save confirmation),
  and downloadable invoices. Compact/minimal, full-width, borderless-input UI.
- **Customer (mobile)** — **dark, Zomato-style** QR/slug ordering: animated gradient header with the
  `feedo` wordmark, rotating search placeholder, a header **VEG mode** toggle, a full product
  **detail bottom-sheet** (sizes/add-ons), highlighted curated sections, cart, **mobile-OTP login
  (also enforced at guest checkout)**, **Razorpay checkout**, separate **Rewards** (wallet + in-app
  free-reward orders) and **Account** (details, order history, log out) pages, and animated
  order tracking with a downloadable ticket invoice. Dine-in only.
- **Kitchen** — real-time KDS (`feedo` Kitchen), veg/non-veg markers, status-colored cards, one-tap flow.
- **Super-admin** — cross-tenant console (`feedo` Platform): GMV/MRR, restaurants (+ detail), all
  orders, customers, users, subscription management, suspend/reactivate. Same minimal admin styling.
- **Realtime** — Socket.IO pushes new/updated orders to kitchen + admin instantly.
- **Multi-tenant + secure** — every resource scoped by `restaurantId`; rate limiting, NoSQL-injection
  sanitization, HPP, helmet/CSP, RBAC, bcrypt, JWT.

## Apps & ports

| App | Port | Description |
|-----|------|-------------|
| backend | 4000 | Express + MongoDB + Socket.IO API |
| admin-app | 5173 | Restaurant owner dashboard |
| customer-app | 5174 | QR ordering PWA (mobile-first) |
| kitchen-app | 5175 | Kitchen Display System |
| super-admin-app | 5176 | Internal SaaS console |

## Getting started

```bash
# 1. Install (root)
npm install

# 2. Configure env
cp .env.example .env      # set MONGODB_URI + JWT secrets (+ optional Razorpay keys)

# 3. Seed demo data (needs MongoDB running)
npm run seed
#   super@feedo.app   / password123   (super admin · :5176)
#   owner@feedo.app   / password123   (demo restaurant owner · :5173)
#   kitchen@feedo.app / password123   (kitchen staff · :5175)

# 4. Run — interactive launcher (pick what to start; backend is always included)
npm run dev
```

> **Customer app** has no password login — open `/r/the-copper-kitchen` (or scan a table QR
> from the admin Tables page), and sign in with any 10-digit mobile via OTP (the code is shown
> on screen + logged in dev, since no SMS provider is wired).

### Payments (Razorpay)

Set `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` (backend) and `VITE_RAZORPAY_KEY_ID` (customer app)
in `.env` for live test payments. Leave them blank to run in **demo mode** (checkout auto-confirms).
Free reward-only orders skip payment entirely (₹0).

Running `npm run dev` shows an arrow-key menu — use **↑/↓** to move, **enter** to run,
**q** to quit:

```
  Feedo  — what do you want to run?

  ❯ Run all apps
    Run admin + backend
    Run user (customer) + backend
    Run kitchen + backend
    Run company (super admin) + backend

  ↑/↓ to move · enter to run · q to quit
```

### Direct scripts (skip the menu)

| Command | Starts | URLs |
|---------|--------|------|
| `npm run dev:all` | backend + all 4 apps | :4000 · :5173 · :5174 · :5175 · :5176 |
| `npm run dev:admin` | backend + admin | :4000 · :5173 |
| `npm run dev:user` | backend + customer | :4000 · :5174 |
| `npm run dev:kitchen` | backend + kitchen | :4000 · :5175 |
| `npm run dev:company` | backend + super admin | :4000 · :5176 |
| `npm run dev:backend` | backend only | :4000 |

You can also pass the choice straight to the launcher:
`npm run dev -- admin` (aliases: `admin`/`owner`, `user`/`customer`, `kitchen`/`kds`,
`company`/`super`/`platform`, `all`).

## Docs

- [`architecture.md`](./architecture.md) — full system architecture
- [`todo.md`](./todo.md) — phase tracker & roadmap
