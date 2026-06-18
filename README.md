# Feedu

Premium Restaurant Operating System SaaS — a multi-tenant platform with an owner
dashboard, customer ordering PWA, kitchen display system, and an internal super-admin
console. Built as a Turborepo monorepo.

## Stack

React · Vite · TypeScript · Tailwind · **Poppins** · shadcn-style UI · Framer Motion · Zustand ·
TanStack Query · Recharts · Node · Express · MongoDB · Mongoose · Socket.IO · Zod ·
Razorpay · JWT.

## What it does

- **Admin (restaurant owner — your client)** — range-aware dashboard (revenue/orders/AOV scoped to
  Day/Week/Month), live orders with **Active / Pending-payment / All** tabs (count badges, prominent
  table number, mark-as-paid with method), inventory (image upload, stock, prep time, per-item loyalty
  points, **configurable sizes/variants**, **Cloudinary** image hosting), Menu CMS, loyalty rewards +
  **points-expiry**, Analytics (revenue/table, table turnover, avg serve time, peak hours, top products),
  tables & QR codes, **staff (with mobile number)**, **customer analytics** (click a diner → spend,
  most-ordered, reward claims, visits), settings (branding/tax/go-live + **subscription details**),
  **support tickets** (chat), downloadable invoices. **Waiter role** is limited to a **dedicated mobile
  waiter app** (live table **calls ring** with sound/vibrate + **slide-to-attend**, plus orders).
  - **Multi-store owner**: a default **"All branches"** (centralized) view — combined dashboard +
    branch comparison — or drill into one branch via the switcher; a **Branches** page to add / edit /
    suspend / delete branches and **create branch-manager logins**; **brand-level Settings** (name /
    branding / tax apply to every branch). Inventory is centralized by default; per branch you can
    override **availability/stock without affecting other branches**.
  - **Branch manager**: a branch-locked login — every tab (orders, tables, inventory, staff, customers,
    analytics) shows only their branch; no switcher or brand-wide views.
  - Every action raises a **toast**; onboarding is super-admin-only (no self-signup).
- **Customer (mobile)** — **dark, Zomato-style** QR/slug ordering: animated gradient header with the
  `feedu` wordmark, rotating search placeholder, a header **VEG mode** toggle, a full product
  **detail bottom-sheet** (sizes/add-ons), highlighted curated sections, **call-waiter** from the
  table, cart, **mobile-OTP login (also enforced at guest checkout)**, **Razorpay checkout**, separate
  **Rewards** (wallet + in-app free-reward orders + **claim history**) and **Account** (details, order
  history, log out) pages, order confirmation + tracking with a downloadable ticket invoice. Dine-in
  only; direct (non-QR) entry asks for the table number.
- **Kitchen** — real-time KDS (`feedu` Kitchen), prominent table number, veg/non-veg markers,
  status-colored cards, one-tap flow.
- **Super-admin = the feedu company portal (you, the SaaS owner)** — separate **feedu SaaS revenue**
  (MRR/ARR/paying restaurants) vs marketplace GMV; one combined **Brands & Restaurants** page (search +
  account-type/status filters) that **onboards single-store or multi-store accounts** (a multi-store
  brand is created with its branches inline and billed once for the whole brand); **brand-level**
  controls (suspend/reactivate *all* branches, edit the combined SaaS plan — fee/cycle/duration/expiry/
  status, delete the whole brand) **and** per-branch suspend / add-branch; **Users** split into a
  **feedu team** (own `employees` collection, no tenant) + restaurant users, with **add-employee**;
  **support tickets** chat; **customers grouped by restaurant** → drill in → per-diner analytics; change
  own credentials.
- **Multi-branch (Brand → Branches)** — a **Brand** is the tenant; each restaurant is a **branch**.
  Brand-shared: menu, branding, loyalty, subscription. Branch-scoped: orders, tables, staff, inventory,
  customers — with a per-branch **menu override** layer (price/availability/stock/exclusive). Brand-wide
  owners get a **branch switcher**, a **Branches** page, a **combined "All branches" dashboard** + a
  **branch comparison**. Single-store accounts stay simple (no branch UI). Fully backward-compatible
  (`restaurantId` = branch id).
- **Realtime** — Socket.IO pushes new/updated orders to kitchen + admin (fanned out to both the
  **branch** and **brand** rooms), and **waiter calls** to staff.
- **Multi-tenant + secure** — brand/branch scoping (`brandId` / `restaurantId`) via the `x-branch-id`
  header; onboarding is super-admin-only (no public sign-up); feedu staff isolated in a separate
  `employees` collection; rate limiting, NoSQL-injection sanitization, HPP, helmet/CSP, RBAC, bcrypt, JWT.

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
  Feedu  — what do you want to run?

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
