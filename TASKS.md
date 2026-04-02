# TASKS.md — Personal Economy Project Tracker

This file tracks every task ever requested. Checked = done & committed. Unchecked = pending.

---

## Phase 1 — Initial Build
- [x] Project scaffolding (FastAPI + React + MySQL + Docker)
- [x] Event-sourced architecture (Discord = source of truth)
- [x] Discord bot integration (read events from channel)
- [x] MySQL database with SQLAlchemy async ORM
- [x] FastAPI event engine with idempotency (duplicate event_id ignored)
- [x] Sync engine: wipe DB + replay Discord history on sync
- [x] App events posted back to Discord (poster.py) so sync survives
- [x] Soft deletes on transactions (deleted_at column)
- [x] Soft deletes on accounts (deleted_at column)
- [x] Re-insert soft-deleted record restores instead of duplicate PK error
- [x] Docker Compose with non-conflicting ports (8100/5173/3307)
- [x] Git flow setup (main → develop → feature/* / fix/*)

## Phase 2 — Frontend CRUD
- [x] Dashboard with summary cards + recent transactions
- [x] Transactions page with create/edit/delete modals
- [x] Accounts page with create/edit/delete modals
- [x] Analytics page with bar chart + pie chart
- [x] Deleted page (soft-deleted audit trail with Restore)
- [x] Discord Schema page (JSON template helper)
- [x] Toast notifications on every action (success/error)
- [x] Sync Discord button on Dashboard

## Phase 3 — Bangladesh Economy Support
- [x] Add bKash, Nagad, Rocket, Upay, Tap account types
- [x] Default currency changed to BDT across all forms
- [x] Badge colors for each MFS type
- [x] Discord Schema templates for Bangladesh account types

## Phase 4 — Modern UI Redesign (2026)
- [x] New dark theme design system (CSS variables, Inter font)
- [x] Modern Sidebar with logo, active states, status indicator
- [x] Modern Modal with backdrop blur + Escape key support
- [x] Modern Toast with styled icon badge
- [x] Rewrite Dashboard — modern stat cards + improved charts
- [x] Rewrite Transactions page — modern table + View/Edit/Delete buttons
- [x] Rewrite Accounts page — card layout with per-account balance display
- [x] Rewrite Analytics page — modern Recharts layout
- [x] Rewrite Deleted page — modern table + View/Restore buttons

## Phase 5 — Account Balance & Validation
- [x] Backend: per-account balance calculation endpoint (GET /accounts/{id}/balance)
- [x] Backend: overspend validation — reject expense if amount > account balance
- [x] Frontend: show current balance on each account card
- [x] Frontend: show balance in transaction form account selector

## Phase 6 — Database Purge / Year Reset
- [x] Backend: truncate endpoint — deletes all Discord messages + wipes DB
- [x] Frontend: "Purge / Year Reset" button with double-confirm dialog
- [x] Accessible from Dashboard or Settings area

---

## Ongoing Rules
- Every fix/feature → new branch off develop → commit → merge → delete branch
- Always show toast on success/error
- Discord is source of truth — all app actions must post to Discord

## Phase 7 — Multi-Currency & Conversion
- [x] Dashboard: per-currency totals (BDT and USD shown separately)
- [x] Currency conversion page (BDT ↔ USD) with live preview
- [x] Conversion charge support — fee recorded as separate expense transaction
- [x] Overspend check on conversion (total deduct = amount + charge must fit balance)
- [x] Dynamic currency symbol: ৳ for BDT, $ for USD

## Phase 8 — Theme
- [x] Light mode (off-white/lavender tint, modern and readable)
- [x] Dark/light toggle button in Sidebar footer
- [x] Theme persisted in localStorage (survives page refresh)
- [x] No flash on reload (theme applied before React mounts in index.html)
- [x] All CSS variables updated for both modes (badges, buttons, inputs, tables, scrollbar)

## Phase 9 — Data Integrity & Transfer Sync Fix (v1.9.0)
- [x] Fix: add "transfer" to VALID_ENTITIES in parser.py — transfers were silently rejected during Discord sync (root cause of amount mismatch / missing data after sync)
- [x] Fix: deterministic uuid5 transaction IDs for transfer debit/credit — previously random uuid4 caused duplicate phantom transactions on every sync replay
- [x] Fix: atomic sync engine — wipe + replay in single DB transaction; rollback on fatal error so DB is never left in a partially-rebuilt state
- [x] Fix: handle DuplicateEventError gracefully during sync replay (same event posted twice to Discord is safe to skip)
- [x] Fix: add delete(Transfer) to purge route — transfers were orphaned after purge
- [x] Fix: add updated_at column to Transfer model for consistency with Transaction model
- [x] Docs: update README with full database schema table, transfer event format, version history (v1.0–v1.9)
- [x] Docs: update TASKS.md with Phase 9
