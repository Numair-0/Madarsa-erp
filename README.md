# Madarsa Management ERP

One-institution ERP: student registry, academics/exams, fees, accounting, library, hostel, kitchen, inventory, donations, reports, dashboard.

> **Status: partial build.** The backend covers every module (see `PROGRESS.md`), but the automated tests have **never been executed** in the build environment (no MongoDB binary available) and the client only has pages for login, dashboard, students, fee collection/receipt and settings. Run `npm test` yourself first.

## Architecture
Browser → Next.js (App Router, proxies `/api/*`) → Express REST API → Mongoose → MongoDB (replica set `rs0`).
The Express API is the authorization authority. JWT lives in an httpOnly cookie that browser JavaScript never reads.

## Prerequisites
Node.js 20 LTS, MongoDB 7 as a single-node replica set `rs0`, npm.

## MongoDB (transactions need a replica set)
- Docker: `docker compose up -d` (waits for the healthcheck to initiate `rs0`)
- Local: `mongod --replSet rs0 --dbpath ./data &` then `./scripts/mongo-rs-init.sh`

## Setup
```bash
cp .env.example server/.env          # set JWT_SECRET to a long random string
cd server && npm install && npm run seed && npm run dev   # API on :4000
cd client && npm install && npm run dev                   # UI on :3000 (API_URL defaults to http://localhost:4000)
```

## Environment
Server: `NODE_ENV, PORT, MONGODB_URI, JWT_SECRET, CLIENT_URL`. Client: `API_URL` (server-side proxy target). Production refuses the default JWT secret.

## Demo credentials (after `npm run seed`)
Password for all: `Demo@12345` — users: `admin`, `principal`, `accountant`, `librarian`, `hostel`, `mess`, `store`, `teacher`. **Change before any real use.**

## Tests and builds
```bash
cd server && npm test && npm run typecheck && npm run build
cd client && npm run typecheck && npm run build
```
Tests use `mongodb-memory-server` (MongoMemoryReplSet); the first run downloads a mongod binary, so it needs internet access.

## Deployment
Run `server` (`npm run build && node dist/src/server.js`) and `client` (`npm run build && npm start`). Set `NODE_ENV=production`, a strong `JWT_SECRET`, `CLIENT_URL` to the public UI URL, and `API_URL` for the client. Serve over HTTPS (cookies are `Secure` in production). The permission cache is per-process: restart other instances after changing role permissions.

## Troubleshooting
- `Transaction numbers are only allowed on a replica set member` → MongoDB is not running with `--replSet rs0` or `rs.initiate` was not run.
- Login works but UI redirects to `/login` → API not reachable through the Next proxy; check `API_URL`.
- Tests hang on first run → mongod binary download blocked; set `MONGOMS_SYSTEM_BINARY` to a local mongod.

## Known limitations
No fee concessions/scholarships/late fees/advance payments; no CSV/PDF export; stock and marks are whole numbers; no users/roles/audit/academics/library/hostel/kitchen/inventory/donation/report screens yet; no file/photo upload; counters are per calendar year.
