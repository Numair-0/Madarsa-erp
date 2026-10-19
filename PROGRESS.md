# PROGRESS
## Phase 1-4 (partial) — server foundation
Done: env config, integer-paise money utils, atomic counters, User/Student/AuditLog models, JWT httpOnly-cookie auth, RBAC middleware (static role map), centralized errors, admission workflow (transaction + counter + audit), student search, seed script.
Checks: `tsc --noEmit` passed. Vitest suite (tests/core.test.ts) written but NOT executed: sandbox blocks the mongod binary download (fastdl.mongodb.org -> 403). Money tests are unverified too, since they share the suite.
Not started: client, dynamic roles/permissions, settings, academics, exams, fees, accounting, library, hostel, kitchen, inventory, donations, reports, dashboard, docs, zip.

## Phase 8-9 (partial) — fees + accounting
Done: Account/Voucher models, balanced-voucher posting (integer paise, counter numbers), mirror-voucher reversal; FeeStructure/FeeObligation (unique student+structure+period)/Payment; idempotent due generation; transactional payment collection (conditional no-overpay update, receipt counter, voucher, audit); atomic payment reversal; REST routes under /api/fees and /api/payments.
Checks: see tsc result below. tests/fees.test.ts written, NOT executed (no mongod binary available in sandbox).
Not done: concessions/scholarships, late fees, advance payments, class-level structures, ledger/daybook reports.

## Phase 10-11 — library + hostel
Done: Hostel/Room/Bed/Allocation with partial unique indexes (active bed, active student); transactional allocate/transfer/release; occupancy summary. BookTitle/BookCopy (unique accession)/Issue with partial unique index on active issue; atomic availability claim; return with integer-paise late/lost fines (500/day, 14-day loan, constants); overdue list. Routes under /api/hostel and /api/library, all permission-gated.
Checks: tsc result in last run; tests/hostelLibrary.test.ts written, NOT executed (no mongod in sandbox).
Not done: library fines are not posted to accounting; no hostel/library reports beyond occupancy and overdue; lost/damaged and history reports; no UI.

## Phase 12-13 — inventory, kitchen, donations
Done: Item/StockMovement ledger; single moveStock() guarded atomic update (no negative stock, signed-delta checks, balanceAfter, audit); kitchen demands with guarded transitions (draft→submitted→approved/rejected→partially_fulfilled/fulfilled/closed), fulfilment issues stock in one transaction; daily menu upsert; donors/donations with counter receipts and balanced accounting voucher. Routes in routes/ops.ts.
Checks: tsc --noEmit passes after fixing one type error; tests/ops.test.ts written, NOT executed (no mongod in sandbox).
Limitations: stock quantities are integers only (use smaller units for fractions); no purchase-to-accounting link; donation reports (daily/monthly/donor-wise) not built yet; no UI.

## Phase 14-15 (API only) — reports + dashboard
Done: aggregation reports — fee collection (day/month, IST), defaulters (paginated), student fee ledger, daybook, account ledger with running balance, trial balance (balanced flag), donation reports (day/month/year/donor/category/mode), library fines; role-aware /api/dashboard (sections included only if role has view permission; all values from live queries). Routes in routes/reports.ts, gated by reports:view.
Checks: tsc --noEmit passes after fixing one typing error; tests/reports.test.ts written, NOT executed (no mongod in sandbox).
Not done: student/academic/hostel/inventory/kitchen-status reports, CSV/PDF export, print views, charts/UI. Dashboard month/day boundaries use server-local time while collection report uses IST.

## Phase 16 (partial) — client core
Done: Next.js 14 App Router + TypeScript + Tailwind (navy/gold theme); same-origin /api proxy to Express (next.config rewrites); httpOnly cookie never read by JS; middleware redirect (UX only) + /auth/me guard; pages: login (RHF+Zod), dashboard (live role-aware stats + Recharts bar), student list (debounced server search, pagination, loading/empty/error states), admission form (RHF+Zod, server errors surfaced). Responsive sidebar/topbar shell.
Checks: client `tsc --noEmit` passes; `next build` succeeds (7 routes + middleware). Not exercised against a running API or in a browser.
Not done: shadcn/ui (plain Tailwind components used instead), pages for fees/payments, accounting, library, hostel, kitchen, inventory, donations, reports, users/roles; print/export UI.

## Phase 16 (cont.) — fee collection UI
Done: GET /api/payments/:id (receipt with student + allocation detail); dues now include fee-structure name; /fees collection screen (student search → dues → per-due partial amounts parsed to integer paise → mode → collect) and printable receipt page (/fees/receipt/[id], print CSS hides shell).
Checks: server + client tsc --noEmit pass; client next build run (see final report). Not exercised against a live API/browser; server tests still unexecuted.
Not done: UI to create fee structures / generate dues (API only), payment history & reversal UI, concessions/late fees.

## Phase 4-5 (partial) — settings, users, roles, audit API
Done: Settings singleton (GET any user, PUT settings:manage, before/after audit); user create/update/reset-password with bcrypt, password policy, strict schemas, escalation guards (only super_admin touches super_admin; no self role/status change); DB-backed role permissions (RolePermission, validated against resource/action catalog, in-memory cache loaded at startup, super_admin fixed); GET /api/audit-logs (audit:view). Client: /settings page (admins only in nav); receipt now uses institution name/address/footer.
Checks: server + client tsc --noEmit pass; next build run. tests/admin.test.ts written, NOT executed (no mongod).
Known: permission cache is per-process (multi-instance needs restart or shared cache); no users/roles/audit UI; academic session in settings is a free-text label, not the academic structure.
Not done: academics/exams/results, academic structure (course/class/section/subject), enrollments, concessions/late fees, remaining client pages, export/PDF, README, BUILD_SPEC, zip.

## Phase 5-7 — academics, exams, results (API)
Done: AcademicSession/Course/ClassLevel/Section/Subject (unique per parent); Enrollment (partial unique: one active per student+session; section must belong to class); Exam with per-subject max/pass marks; marks entry (integer, 0..max, absent flag, enrolled students only, bulk upsert on unique exam+student+subject); results computed with integer basis points and configurable grade bands (GET/PUT /api/exams/grade-rules); pass/fail (all subjects ≥ pass marks, no absence, complete); finalize (requires complete marks; atomic draft→finalized; locks marks); post-finalization correction workflow (request → different user approves/rejects; guarded against stale marks; before/after audited); marksheet endpoint. Permissions: academics:view/manage added; results:approve for principal.
Checks: server tsc --noEmit passes after fixing one typing error. tests/academics.test.ts written, NOT executed (no mongod).
Limitations: marks are integers only; report card = per-exam marksheet (no multi-exam progress report yet); no client pages for academics; class/section filters on reports not built.
