<p align="center">
  <h1 align="center">🕌 Madarsa ERP</h1>
  <p align="center">
    A full-stack, open-source Enterprise Resource Planning system purpose-built for Madarsa (Islamic educational institution) management.
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?logo=next.js" alt="Next.js 14" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Express-4-000000?logo=express" alt="Express 4" />
  <img src="https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb&logoColor=white" alt="MongoDB 7" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white" alt="Docker" />
</p>

---

## ✨ Features

| Module | Capabilities |
|--------|-------------|
| **👨‍🎓 Students** | Admission workflow, student registry, search & pagination |
| **📚 Academics** | Courses, classes, sections, subjects, enrollments |
| **📝 Examinations** | Exam creation, bulk marks entry, grade rules, results, marksheets, correction workflow |
| **💰 Fees & Accounting** | Fee structures, due generation, collection with receipt, double-entry vouchers, payment reversal |
| **🏠 Hostel** | Rooms, beds, allocation/transfer/release, occupancy tracking |
| **📖 Library** | Book catalog, accession copies, issue/return, overdue fines |
| **🍳 Kitchen** | Demands (draft → approved → fulfilled), daily menus, stock-linked fulfilment |
| **📦 Inventory** | Items, stock movements (in/out/adjust), no-negative-stock guard |
| **🤲 Donations** | Donor registry, categorized donations, receipt counters, accounting vouchers |
| **📊 Reports** | Fee collection, defaulters, student fee ledger, daybook, trial balance, donation reports |
| **🖥️ Dashboard** | Role-aware live stats — students, fees, hostel, library, inventory, kitchen, donations |
| **🔐 Auth & RBAC** | JWT cookie auth, 8 default roles, granular `resource:action` permissions, audit logging |
| **⚙️ Settings** | Institution profile, receipt/report headers & footers, academic session |

## 🏗️ Architecture

```
Browser → Next.js 14 (App Router, proxies /api/*) → Express REST API → Mongoose ODM → MongoDB 7 (replica set)
```

```
┌─────────────────────────────────────────────────┐
│                    CLIENT                       │
│  Next.js 14 · React 18 · Tailwind · Recharts   │
│  React Hook Form + Zod · App Router             │
│  /api/* rewrite proxy → Express                 │
├─────────────────────────────────────────────────┤
│                    SERVER                       │
│  Express 4 · TypeScript · Mongoose 8            │
│  Routes → Services → Models (layered)           │
│  Zod validation · RBAC middleware · Helmet       │
├─────────────────────────────────────────────────┤
│                   DATABASE                      │
│  MongoDB 7 (replica set rs0 for transactions)   │
│  Integer-paise money · Atomic counters           │
│  Partial unique indexes · Audit logs             │
└─────────────────────────────────────────────────┘
```

- **Auth**: bcrypt password hashing; JWT (8h) in `httpOnly`, `SameSite=Lax` cookie (`Secure` in production); login rate-limited.
- **Money**: All financial values stored as **integer paise** — no floating-point rounding errors.
- **Transactions**: All multi-document writes use `session.withTransaction` (requires replica set).
- **Sequences**: Admission numbers, receipt numbers, voucher numbers, etc. use atomic `findOneAndUpdate + $inc` inside the same transaction.

## 🛠️ Tech Stack

### Frontend (`client/`)

| Technology | Version | Purpose |
|-----------|---------|---------|
| [Next.js](https://nextjs.org) | 14.2 | React framework, App Router, API proxy |
| [React](https://react.dev) | 18.3 | UI library |
| [TypeScript](https://typescriptlang.org) | 5.5 | Type safety |
| [Tailwind CSS](https://tailwindcss.com) | 3.4 | Utility-first styling |
| [React Hook Form](https://react-hook-form.com) | 7.53 | Performant form handling |
| [Zod](https://zod.dev) | 3.23 | Schema validation (shared with server) |
| [Recharts](https://recharts.org) | 2.12 | Dashboard charts |

### Backend (`server/`)

| Technology | Version | Purpose |
|-----------|---------|---------|
| [Express](https://expressjs.com) | 4.19 | HTTP framework |
| [TypeScript](https://typescriptlang.org) | 5.5 | Type safety |
| [Mongoose](https://mongoosejs.com) | 8.5 | MongoDB ODM with transaction support |
| [Zod](https://zod.dev) | 3.23 | Request validation |
| [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) | 9.0 | JWT authentication |
| [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | 2.4 | Password hashing |
| [Helmet](https://helmetjs.github.io) | 7.1 | Security headers |
| [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) | 7.4 | Brute-force protection |

### Infrastructure

| Technology | Version | Purpose |
|-----------|---------|---------|
| [MongoDB](https://mongodb.com) | 7.x | Database (replica set for transactions) |
| [Docker Compose](https://docs.docker.com/compose) | — | One-command MongoDB setup |
| [Node.js](https://nodejs.org) | 20 LTS | Runtime |

### Testing

| Technology | Version | Purpose |
|-----------|---------|---------|
| [Vitest](https://vitest.dev) | 2.0 | Test runner |
| [Supertest](https://github.com/ladjs/supertest) | 7.0 | HTTP assertions |
| [mongodb-memory-server](https://github.com/nodkz/mongodb-memory-server) | 10.0 | In-memory MongoDB for tests |

## 📂 Project Structure

```
madarsa-erp/
├── client/                    # Next.js 14 frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── login/         # Login page
│   │   │   └── (app)/         # Authenticated shell
│   │   │       ├── dashboard/ # Role-aware dashboard
│   │   │       ├── students/  # Student list + admission
│   │   │       ├── fees/      # Fee collection + receipt
│   │   │       └── settings/  # Institution settings
│   │   └── lib/               # API client, utilities
│   └── tailwind.config.ts
├── server/                    # Express REST API
│   ├── src/
│   │   ├── config/            # Permissions catalog, constants
│   │   ├── middleware/        # Auth, RBAC, error handler
│   │   ├── models/            # Mongoose schemas (14 models)
│   │   ├── routes/            # Route handlers with Zod validation
│   │   ├── services/          # Business logic & transactions
│   │   ├── utils/             # Money, counters, helpers
│   │   ├── seed.ts            # Database seeder
│   │   └── server.ts          # Entry point
│   └── tests/                 # Vitest test suites
├── scripts/
│   └── mongo-rs-init.sh       # MongoDB replica set init
├── docker-compose.yml         # MongoDB 7 (single-node rs0)
└── .env.example               # Environment template
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20 LTS
- **MongoDB 7** running as a replica set (`rs0`)
- **npm** (comes with Node.js)

### 1. Start MongoDB

**Option A — Docker (recommended):**
```bash
docker compose up -d
# Healthcheck auto-initiates the replica set
```

**Option B — Local:**
```bash
mongod --replSet rs0 --dbpath ./data &
./scripts/mongo-rs-init.sh
```

### 2. Start the Server

```bash
cp .env.example server/.env    # ⚠ Set JWT_SECRET to a long random string
cd server
npm install
npm run seed                   # Creates default users & settings
npm run dev                    # API on http://localhost:4000
```

### 3. Start the Client

```bash
cd client
npm install
npm run dev                    # UI on http://localhost:3000
```

### 4. Sign in

After seeding, the following users are available (password for all: `Demo@12345`):

| Username | Role | Access |
|----------|------|--------|
| `admin` | Admin | Full access |
| `principal` | Principal | Academics, results approval |
| `accountant` | Accountant | Fees, accounting |
| `librarian` | Librarian | Library |
| `hostel` | Hostel Warden | Hostel |
| `mess` | Mess In-charge | Kitchen |
| `store` | Storekeeper | Inventory |
| `teacher` | Teacher | Marks entry |

> ⚠️ **Change these passwords before any real use.**

## ⚙️ Environment Variables

### Server (`server/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | `production` enforces strong JWT secret |
| `PORT` | `4000` | Express server port |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/madarsa_erp?replicaSet=rs0` | MongoDB connection string |
| `JWT_SECRET` | — | **Required.** Long random string for signing tokens |
| `CLIENT_URL` | `http://localhost:3000` | CORS allowed origin |

### Client (`client/.env.local`)

| Variable | Default | Description |
|----------|---------|-------------|
| `API_URL` | `http://localhost:4000` | Server-side proxy target |

## 🧪 Tests & Type Checking

```bash
# Server
cd server
npm test                       # Vitest + MongoMemoryReplSet
npm run typecheck               # tsc --noEmit

# Client
cd client
npm run typecheck               # tsc --noEmit
npm run build                   # Production build
```

> **Note:** The first test run downloads a `mongod` binary (~100 MB) and requires internet access. Set `MONGOMS_SYSTEM_BINARY` to skip the download if you have a local `mongod`.

## 🚢 Deployment

```bash
# Server
cd server && npm run build && node dist/src/server.js

# Client
cd client && npm run build && npm start
```

**Production checklist:**
- [ ] Set `NODE_ENV=production`
- [ ] Use a strong, random `JWT_SECRET` (the app refuses the default in production)
- [ ] Set `CLIENT_URL` to the public UI URL
- [ ] Set `API_URL` for the client
- [ ] Serve over HTTPS (cookies set `Secure` flag in production)
- [ ] Restart all instances after changing role permissions (permission cache is per-process)

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| `Transaction numbers are only allowed on a replica set member` | MongoDB is not running with `--replSet rs0`, or `rs.initiate()` was never called |
| Login works but UI keeps redirecting to `/login` | API not reachable through the Next.js proxy — check `API_URL` |
| Tests hang on first run | `mongod` binary download is blocked — set `MONGOMS_SYSTEM_BINARY` to a local `mongod` path |

## 📋 Known Limitations

- No fee concessions, scholarships, late fees, or advance payments
- No CSV / PDF export
- Stock quantities and marks are whole integers
- Missing client pages: users/roles management, audit logs, academics, library, hostel, kitchen, inventory, donations, reports
- No file or photo uploads
- Admission/receipt counters are per calendar year
- Permission cache is per-process (no cross-instance invalidation)

## 📄 License

This project is for educational and institutional use. See the repository for license details.
