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
npm run seed -w @feedo/backend
#   super@feedo.app / password123   (super admin)
#   owner@feedo.app / password123   (demo restaurant owner)

# 4. Run everything
npm run dev               # turbo runs all apps
# or a single app:
npm run dev -w @feedo/admin-app
```

## Docs

- [`architecture.md`](./architecture.md) — full system architecture
- [`todo.md`](./todo.md) — phase tracker & roadmap
