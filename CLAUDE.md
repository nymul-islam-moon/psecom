# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal finance tracker using **event-sourced architecture**:
- **Discord** = immutable event log (source of truth / permanent financial ledger)
- **MySQL** = reconstructed state database (always rebuildable from Discord history)
- **FastAPI** = backend event processor + API layer
- **React** = frontend dashboard
- **Docker** = full containerized deployment

## Tech Stack

- Backend: Python 3.11, FastAPI, SQLAlchemy 2.0 (async), `uv` package manager
- Frontend: React 18, Vite, React Router, Recharts, Axios
- Database: MySQL 8.0
- Infra: Docker, Docker Compose

## Git Flow — MANDATORY (no exceptions)

Branches: `main` (production) → `develop` (integration) → `feature/*` / `fix/*`

**Every single change, no matter how small, MUST follow this flow:**
```bash
git checkout develop
git checkout -b feature/my-feature    # or fix/issue-name
# make changes
git add -A && git commit -m "feat: description"
git checkout develop && git merge --no-ff feature/my-feature
git branch -d feature/my-feature
# then merge develop → main and bump version
git checkout main && git merge --no-ff develop
git tag vX.Y.Z
git checkout develop
```

**Rules Claude must follow:**
1. NEVER commit directly to `main` or `develop`
2. EVERY task gets its own `feature/*` or `fix/*` branch
3. ALWAYS merge into `develop` first, then `main`
4. ALWAYS bump the version (see Versioning below) on every merge to `main`
5. Delete the feature/fix branch after merging

## Versioning — MANDATORY

Version format: `MAJOR.MINOR.PATCH`
- **PATCH** bump: bug fixes, typo corrections, minor UI tweaks
- **MINOR** bump: new features, new pages, new API endpoints
- **MAJOR** bump: breaking schema changes, architecture rewrites

Version is tracked in:
- `frontend/package.json` → `"version"` field
- `README.md` → version history table

**On every merge to `main`, Claude must:**
1. Update `frontend/package.json` version
2. Add a row to the README version history table
3. Commit as `chore: bump version to vX.Y.Z`

## Commands

### Start everything (from project root)
```bash
cp .env.example .env        # Fill in DISCORD_TOKEN and DISCORD_CHANNEL_ID
docker compose -f docker/docker-compose.yml up --build
```

Ports:
- Backend API: http://localhost:8100
- Frontend:    http://localhost:5173
- MySQL:       localhost:3307

### Backend only (local dev with uv)
```bash
cd backend
uv pip install -e .
uv run uvicorn app.main:app --reload --port 8100
```

### Frontend only (local dev)
```bash
cd frontend
npm install
npm run dev
```

## Architecture

### Event Flow
```
Discord / App → POST /api/events → event_engine.py → MySQL State Update → React Dashboard
```
On startup: `sync_engine.py` fetches all Discord channel history → sorts by time → replays each event through `event_engine.py` to rebuild database state.

### Core Rules
- **Idempotency**: duplicate `event_id` is silently ignored — safe to replay
- **Soft deletes only**: `transactions.deleted_at = NOW()` — never hard delete
- **Accounts delete**: accounts are removed from state but the event remains in `events` table
- Tables are auto-created by SQLAlchemy on backend startup (no manual migrations needed)

### Backend Structure (`backend/app/`)
| Path | Responsibility |
|------|---------------|
| `main.py` | FastAPI app, startup lifespan (init_db → sync → start bot) |
| `core/config.py` | All settings via `.env` (pydantic-settings) |
| `core/database.py` | SQLAlchemy sync+async engines, `Base`, `get_db` dependency |
| `core/event_engine.py` | `process_event()` — idempotency check, event storage, entity dispatch |
| `core/sync_engine.py` | `sync_from_discord()` — Discord history → replay events |
| `discord_bot/parser.py` | JSON validation of raw Discord messages → `EventPayload` |
| `discord_bot/handlers.py` | Handle Discord message: parse → process → reply |
| `discord_bot/bot.py` | `discord.Client` wired to finance channel only |
| `api/routes_*.py` | REST endpoints (read-only for accounts/transactions, write via events) |
| `modules/*/model.py` | SQLAlchemy ORM models |
| `schemas/*.py` | Pydantic request/response models |

### Discord Event Format
Post this JSON in your finance channel:
```json
{
  "event_id": "unique-uuid-here",
  "action": "insert",
  "entity": "transaction",
  "data": {
    "id": "txn-uuid",
    "type": "expense",
    "amount": 50.00,
    "currency": "USD",
    "account_id": "my-wallet",
    "category": "Food",
    "note": "Lunch"
  }
}
```
For `update`/`delete`, add `"target_id": "<existing-id>"`.

### Database Tables
- `accounts` — id (PK), name, type (cash/bank/card), parent_id, currency, meta (JSON), created_at
- `transactions` — id (PK), type (income/expense/transfer), amount, currency, account_id, category, note, created_at, updated_at, deleted_at
- `events` — event_id (PK), source (discord/app), action (insert/update/delete), entity, target_id, payload (JSON), created_at

### Frontend Pages
- `/` Dashboard — summary cards, recent transactions, accounts list, Discord sync button
- `/transactions` — filterable list (type, category)
- `/accounts` — account cards
- `/analytics` — income vs expense bar chart (last 30 days), expense pie by category
- `/deleted` — soft-deleted transaction audit trail

### Discord Setup
See `.env.example` for step-by-step bot creation and channel ID instructions.
