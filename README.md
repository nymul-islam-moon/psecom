# Personal Economy

A personal finance tracker built on an **event-sourced architecture** — Discord is the permanent ledger, MySQL is the queryable state, React is the dashboard.

---

## Features

### Core Architecture
- **Discord as the source of truth** — every financial event is posted to a Discord channel and lives there permanently
- **Event-sourced design** — MySQL database is fully rebuildable by replaying Discord history at any time
- **Idempotency** — duplicate events (same `event_id`) are silently ignored, making sync safe to run repeatedly
- **Soft deletes only** — transactions are never hard-deleted; they move to a "Deleted" audit trail and can be restored

### Account Management
- Create, edit, view, and delete accounts
- Supported account types: **Cash**, **Bank**, **Card**, **bKash**, **Nagad**, **Rocket**, **Upay**, **Tap**
- Default currency: **BDT** (Bangladeshi Taka)
- Each account card shows live **current balance**, total income, and total expense
- Sub-account support (parent/child accounts)

### Transaction Management
- Create, edit, view, and soft-delete transactions
- Transaction types: **income**, **expense**, **transfer**
- Filter by type and category
- **Overspend protection** — the system rejects an expense if the account does not have sufficient balance
- Opening balance support — use an `income` transaction with category `Opening Balance`

### Dashboard
- Summary cards: total income, total expenses, net balance
- Area chart of the last 14 days of cash flow
- Recent transactions table
- Account list with quick navigation

### Analytics
- Cash flow area chart (last 30 days)
- Monthly income vs expense bar chart (last 6 months)
- Expense breakdown donut pie chart by category
- Savings rate KPI

### Deleted Records
- Full audit trail of soft-deleted transactions
- One-click restore — sends a restore event back through the system

### Discord Schema Helper
- Built-in JSON template generator for posting events to Discord manually
- Templates for all account types including Bangladesh MFS accounts
- "New IDs" button regenerates `event_id` and `data.id` without wiping your edits
- Copy-to-clipboard button

### Year Reset / Purge
- **Year Reset button** on the Dashboard — wipes the entire database AND deletes all Discord messages
- Double-confirmed before execution (two prompts)
- Use this at the start of each year to start fresh

### Sync
- **Sync Discord button** — triggers a full rebuild: wipes MySQL state and replays all Discord messages from history
- All app-side actions (create/edit/delete) are automatically mirrored to Discord so they survive a sync

---

## Tech Stack

| Layer     | Technology                                      |
|-----------|-------------------------------------------------|
| Backend   | Python 3.11, FastAPI, SQLAlchemy 2.0 (async)   |
| Database  | MySQL 8.0                                       |
| Frontend  | React 18, Vite, React Router, Recharts, Axios  |
| Discord   | discord.py                                      |
| Infra     | Docker, Docker Compose                          |
| Pkg mgr   | `uv` (Python), `npm` (Node)                    |

---

## Ports

| Service  | Host Port |
|----------|-----------|
| Frontend | 5173      |
| Backend  | 8100      |
| MySQL    | 3307      |

---

## Getting Started

### 1. Prerequisites
- Docker and Docker Compose installed
- A Discord bot token and channel ID (see Discord Setup below)

### 2. Clone and configure

```bash
git clone <repo-url>
cd personaleconomy
cp .env.example .env
```

Open `.env` and fill in:
```
DISCORD_TOKEN=your_bot_token_here
DISCORD_CHANNEL_ID=your_channel_id_here
```

### 3. Run with Docker (recommended)

```bash
docker compose -f docker/docker-compose.yml up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8100
- API docs: http://localhost:8100/docs

### 4. Stop

```bash
docker compose -f docker/docker-compose.yml down
```

### 5. Full reset (wipe database volumes)

```bash
docker compose -f docker/docker-compose.yml down -v
```

---

## Local Development (without Docker)

### Backend

```bash
cd backend
uv pip install -e .
uv run uvicorn app.main:app --reload --port 8100
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Discord Setup

1. Go to https://discord.com/developers/applications
2. Click **New Application** → give it a name
3. Go to **Bot** tab → click **Add Bot** → copy the **Token** → paste as `DISCORD_TOKEN`
4. Under **Privileged Gateway Intents** enable **Message Content Intent**
5. Go to **OAuth2 → URL Generator** → select scopes: `bot` → permissions: `Read Messages`, `Send Messages`, `Read Message History`
6. Open the generated URL in your browser to invite the bot to your server
7. In Discord, right-click the channel you want to use → **Copy Channel ID** → paste as `DISCORD_CHANNEL_ID`
   - (Enable Developer Mode first: User Settings → Advanced → Developer Mode)

---

## How to Post Events via Discord

Paste this JSON in your finance channel. The bot will parse it and update the database automatically.

### Create a transaction

```json
{
  "event_id": "unique-uuid-here",
  "action": "insert",
  "entity": "transaction",
  "data": {
    "id": "txn-uuid",
    "type": "expense",
    "amount": 150.00,
    "currency": "BDT",
    "account_id": "your-account-id",
    "category": "Food",
    "note": "Lunch"
  }
}
```

### Create an account

```json
{
  "event_id": "unique-uuid-here",
  "action": "insert",
  "entity": "account",
  "data": {
    "id": "account-uuid",
    "name": "My bKash",
    "type": "bkash",
    "currency": "BDT"
  }
}
```

For `update` and `delete`, add `"target_id": "<existing-id>"` and set `"action"` accordingly.

Use the **Discord Schema** page in the app for a guided template builder.

---

## Setting an Opening Balance

Since you likely had money before you started tracking, create an **income** transaction for each account:

- **Type**: `income`
- **Category**: `Opening Balance`
- **Amount**: whatever you currently have
- **Note**: `Initial balance as of [date]`

This is how every professional accounting tool handles this.

---

## API Reference

Full interactive docs available at http://localhost:8100/docs when the backend is running.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/accounts/` | List all active accounts |
| GET | `/api/accounts/{id}` | Get account by ID |
| GET | `/api/accounts/{id}/balance` | Get account balance (income, expense, net) |
| GET | `/api/transactions/` | List transactions (supports `?type=` and `?category=` filters) |
| GET | `/api/transactions/deleted` | List soft-deleted transactions |
| POST | `/api/events/` | Submit an event (insert/update/delete) |
| POST | `/api/sync/` | Trigger full Discord sync (wipe + rebuild) |
| POST | `/api/purge/?confirm=true` | Year reset — wipe DB + delete all Discord messages |

---

## Project Structure

```
personaleconomy/
├── backend/
│   └── app/
│       ├── api/            # FastAPI route handlers
│       ├── core/           # event_engine, sync_engine, database, config
│       ├── discord_bot/    # bot, parser, handlers, poster
│       ├── modules/        # SQLAlchemy ORM models (accounts, transactions, events)
│       └── schemas/        # Pydantic request/response models
├── frontend/
│   └── src/
│       ├── components/     # Modal, Sidebar, Toast
│       ├── pages/          # Dashboard, Transactions, Accounts, Analytics, Deleted, DiscordSchema
│       ├── services/       # api.js (Axios client)
│       └── utils/          # format.js, uuid.js
├── docker/
│   ├── docker-compose.yml
│   └── mysql/init.sql
├── TASKS.md                # Full feature/issue progress tracker
├── CLAUDE.md               # Architecture guide for AI sessions
└── .env.example
```

---

## Git Flow

All changes follow this branching strategy:

```
main (production)
 └── develop (integration)
      ├── feature/feature-name
      └── fix/issue-name
```

Every task — no matter how small — gets its own branch, is fixed/built, then merged back into `develop`.
