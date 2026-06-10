# Feedo

Premium Restaurant Operating System SaaS — a multi-tenant platform with an owner
dashboard, customer ordering PWA, kitchen display system, and an internal super-admin
console. Built as a Turborepo monorepo.

## Stack

React · Vite · TypeScript · Tailwind · shadcn-style UI · Framer Motion · Zustand ·
TanStack Query · Recharts · Node · Express · MongoDB · Mongoose · Socket.IO · Zod.

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
cp .env.example .env      # set MONGODB_URI + JWT secrets

# 3. Seed demo data (needs MongoDB running)
npm run seed
#   super@feedo.app / password123   (super admin)
#   owner@feedo.app / password123   (demo restaurant owner)

# 4. Run — interactive launcher (pick what to start; backend is always included)
npm run dev
```

Running `npm run dev` shows a menu:

```
  Feedo  — what do you want to run?

  1  Run all apps
  2  Run admin + backend
  3  Run user (customer) + backend
  4  Run kitchen + backend
  5  Run company (super admin) + backend
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
