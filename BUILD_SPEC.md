# Build Specification (as implemented)

## Architecture
`client/` Next.js 14 + Tailwind + RHF/Zod + Recharts. `server/` Express + TypeScript + Mongoose. Layers: routes (Zod validation, permission check) → services (business rules, transactions) → models.

## Authentication
bcryptjs (bcrypt algorithm) hashes; JWT (8h) in httpOnly, SameSite=Lax cookie (`Secure` in production); login rate-limited (10/15min); unknown-user path still runs a hash compare; inactive users rejected on every request.

## RBAC
Permissions are `resource:action` strings; `*:*` is a wildcard; `resource:manage` grants all actions on that resource. Defaults in `config/permissions.ts`, overridable per role in the DB (`RolePermission`), validated against a catalog; `super_admin` is fixed. Guards: no self role/status change; only super_admin touches super_admin.

## Money & counters
All money is integer paise (`utils/money.ts`). Sequences (`admission:YYYY`, `receipt:YYYY`, `voucher:YYYY`, `donation:YYYY`, `demand:YYYY`) use `findOneAndUpdate + $inc` in the same transaction as the document.

## Models and key indexes
- Student: unique `admissionNumber`; (name, fatherName, dob) for duplicate check.
- FeeObligation: **unique (student, feeStructure, period)**; Payment: unique `receiptNumber`.
- Voucher: unique `number`; entries integer debit/credit; balanced check in service.
- Allocation (hostel): **partial unique `bed` and `student` where status=active**.
- Issue (library): **partial unique `copy` where status=issued**; BookCopy unique `accessionNumber`.
- Enrollment: partial unique (student, session) where active. Mark: unique (exam, student, subject).
- Others: Account.code, Item.name, Demand.number, Donation.receiptNumber, Class/Section/Subject unique within parent.

## Transactions (all via `session.withTransaction`)
Admission; fee collection (conditional no-overpay update + receipt + voucher + payment + audit); payment reversal (atomic status flip + mirror voucher); hostel allocate/transfer/release; library issue/return; stock movement; kitchen fulfilment; donation (+voucher); correction approval.

## Workflows
Admission → student → enrollment → dues → payment → receipt → voucher. Demand: draft→submitted→approved/rejected→partially_fulfilled→fulfilled/closed (guarded atomic transitions; fulfilment writes stock-out movements). Exam: draft→finalized (needs complete marks); later changes only via correction request approved by a different user. Financial records are never deleted; reversal posts mirror vouchers.

## API (all under /api)
auth, students, enrollments, academics/*, exams/*, corrections, fees/*, payments/*, hostel/*, library/*, inventory/*, kitchen/*, donations/*, reports/*, dashboard, settings, users, roles, audit-logs.

## Testing
Vitest + supertest + MongoMemoryReplSet. Suites: core (money, auth, RBAC, admission), fees, hostelLibrary, ops (inventory/kitchen/donations), reports, admin, academics. **Written but not executed in the build sandbox.**

## Deployment
See README. Requires a MongoDB replica set, HTTPS, strong JWT secret.
