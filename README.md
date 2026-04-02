# Personal Economy — v1.9.0

A personal finance tracker built on an **event-sourced architecture** — Discord is the permanent ledger, MySQL is the queryable state, React is the dashboard.

---

## Version History

| Version | Description |
|---------|-------------|
| v1.0.0  | Initial build — event-sourced architecture, Discord bot, MySQL, FastAPI, React |
| v1.1.0  | Frontend CRUD — dashboard, transactions, accounts, analytics, deleted pages |
| v1.2.0  | Bangladesh economy support — bKash, Nagad, Rocket, Upay, Tap account types |
| v1.3.0  | Modern UI redesign — dark theme, sidebar, modals, toasts |
| v1.4.0  | Account balance & overspend validation |
| v1.5.0  | Database purge / year reset |
| v1.6.0  | Multi-currency support (BDT + USD) |
| v1.7.0  | Currency conversion with charge support |
| v1.8.0  | Light/dark theme toggle with localStorage persistence |
| v1.9.0  | **Critical fix** — transfer sync data integrity: transfers now survive sync/rebuild, atomic sync with rollback on failure, deterministic transaction IDs |

---

## Features

### Core Architecture
- **Discord as the source of truth** — every financial event is posted to a Discord channel and lives there permanently
- **Event-sourced design** — MySQL database is fully rebuildable by replaying Discord history at any time
- **Idempotency** — duplicate events (same `event_id`) are silently ignored, making sync safe to run repeatedly
- **Soft deletes only** — transactions are never hard-deleted; they move to a "Deleted" audit trail and can be restored
- **Atomic sync** — if a sync fails mid-replay, the database rolls back to its previous state (never left partially-rebuilt)

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

### Transfer Management
- Transfer money between two accounts
- Optional charge/fee (recorded alongside the transfer)
- Creates debit + credit transactions automatically
- Transfers survive sync/rebuild correctly (deterministic transaction IDs)

### Multi-Currency Support
- BDT (Taka ৳) and USD ($) are fully supported with correct symbols
- Dashboard totals are grouped **per currency** — BDT and USD shown separately so numbers are never mixed
- All amounts display with the correct currency symbol dynamically

### Currency Conversion
- Dedicated **Convert** page to convert BDT ↔ USD
- Enter amount, exchange rate, and optional conversion charge
- Live **preview** shows: amount sent, charge, total deducted, amount received
- Overspend protection — conversion is blocked if balance is insufficient

### Dashboard
- Summary cards grouped by currency (separate BDT and USD rows)
- Area chart of the last 14 days of cash flow (BDT)
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
- **Sync Discord button** — triggers a full atomic rebuild: wipes MySQL state and replays all Discord messages from history
- All app-side actions (create/edit/delete) are automatically mirrored to Discord so they survive a sync
- If sync fails, database rolls back — you never lose existing data

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

## Database Schema

### `accounts`
| Column      | Type           | Description                                      |
|-------------|----------------|--------------------------------------------------|
| id          | VARCHAR(64) PK | Unique account ID (user-defined UUID)            |
| name        | VARCHAR(255)   | Display name                                     |
| type        | ENUM           | cash / bank / card / bkash / nagad / rocket / upay / tap |
| parent_id   | VARCHAR(64)    | Parent account ID (for sub-accounts), nullable   |
| currency    | VARCHAR(10)    | Default: BDT                                     |
| meta        | JSON           | Extra metadata (nullable)                        |
| created_at  | DATETIME       | Creation timestamp                               |
| deleted_at  | DATETIME       | Soft delete timestamp (NULL = active)            |

### `transactions`
| Column      | Type           | Description                                      |
|-------------|----------------|--------------------------------------------------|
| id          | VARCHAR(64) PK | Unique transaction ID                            |
| type        | ENUM           | income / expense / transfer                      |
| sub_type    | ENUM           | initial / borrow / lent / sent_to (nullable)     |
| to_recipient| VARCHAR(255)   | Used with sent_to sub_type (nullable)            |
| amount      | DECIMAL(12,2)  | Transaction amount                               |
| currency    | VARCHAR(10)    | BDT / USD etc.                                   |
| account_id  | VARCHAR(64)    | Which account this belongs to                    |
| category    | VARCHAR(100)   | Category label (nullable)                        |
| note        | TEXT           | Free-text note (nullable)                        |
| created_at  | DATETIME       | Creation timestamp                               |
| updated_at  | DATETIME       | Last updated timestamp                           |
| deleted_at  | DATETIME       | Soft delete timestamp (NULL = active)            |

### `transfers`
| Column          | Type           | Description                                  |
|-----------------|----------------|----------------------------------------------|
| id              | VARCHAR(64) PK | Unique transfer ID                           |
| from_account_id | VARCHAR(64)    | Source account                               |
| to_account_id   | VARCHAR(64)    | Destination account                          |
| from_amount     | DECIMAL(12,2)  | Amount debited from source                   |
| from_currency   | VARCHAR(10)    | Source currency                              |
| to_amount       | DECIMAL(12,2)  | Amount credited to destination               |
| to_currency     | VARCHAR(10)    | Destination currency                         |
| charge          | DECIMAL(12,2)  | Transfer fee (default 0)                     |
| note            | TEXT           | Free-text note (nullable)                    |
| debit_txn_id    | VARCHAR(64)    | ID of auto-created debit transaction         |
| credit_txn_id   | VARCHAR(64)    | ID of auto-created credit transaction        |
| created_at      | DATETIME       | Creation timestamp                           |
| updated_at      | DATETIME       | Last updated timestamp                       |
| deleted_at      | DATETIME       | Soft delete timestamp (NULL = active)        |

### `events`
| Column     | Type           | Description                                       |
|------------|----------------|---------------------------------------------------|
| event_id   | VARCHAR(64) PK | Unique event ID (user-defined UUID)               |
| source     | ENUM           | discord / app                                     |
| action     | ENUM           | insert / update / delete                          |
| entity     | ENUM           | transaction / account / transfer                  |
| target_id  | VARCHAR(64)    | ID of the record being updated/deleted (nullable) |
| payload    | JSON           | Full event data as JSON                           |
| created_at | DATETIME       | When this event was processed                     |

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

---

## Docker Usage

All services (Frontend, Backend, MySQL) are managed together using Docker Compose.

The `docker-compose.yml` file is located inside the `docker/` directory.

### Start the system (Development Mode)

```bash
cd docker
docker compose up --build
```

### Start the system (Background / Demo Mode)

```bash
cd docker
docker compose up --build -d
```

### Stop the system

```bash
cd docker
docker compose down
```

### Full reset (including volumes)

```bash
cd docker
docker compose down -v
```

> Always use `--build` when code changes to ensure updates are applied.

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

1. Go to [https://discord.com/developers/applications](https://discord.com/developers/applications)
2. Click **New Application** → give it a name
3. Go to **Bot** tab → click **Add Bot** → copy the **Token** → paste as `DISCORD_TOKEN`
4. Enable **Message Content Intent**
5. Go to **OAuth2 → URL Generator**
   - Scope: `bot`
   - Permissions: Read Messages, Send Messages, Read Message History
6. Invite the bot to your server
7. Copy channel ID and set as `DISCORD_CHANNEL_ID`

---

## How to Post Events via Discord

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

### Create a transfer between accounts

```json
{
  "event_id": "unique-uuid-here",
  "action": "insert",
  "entity": "transfer",
  "data": {
    "id": "transfer-uuid",
    "from_account_id": "source-account-id",
    "to_account_id": "dest-account-id",
    "from_amount": 500.00,
    "to_amount": 500.00,
    "from_currency": "BDT",
    "to_currency": "BDT",
    "charge": 5.00,
    "note": "Wallet top-up"
  }
}
```

> **Note:** `charge` is optional (default 0). Total debited from source = `from_amount + charge`.

---

## Setting an Opening Balance

Create an **income** transaction:

- Type: `income`
- Category: `Opening Balance`
- Amount: current balance
- Note: `Initial balance`

---

## API Reference

Available at: [http://localhost:8100/docs](http://localhost:8100/docs)

| Method | Endpoint                     | Description          |
| ------ | ---------------------------- | -------------------- |
| GET    | `/api/accounts/`             | List accounts        |
| GET    | `/api/accounts/{id}`         | Get account          |
| GET    | `/api/accounts/{id}/balance` | Get balance          |
| GET    | `/api/transactions/`         | List transactions    |
| GET    | `/api/transactions/deleted`  | Deleted transactions |
| GET    | `/api/transfers/`            | List transfers       |
| POST   | `/api/events/`               | Submit event         |
| POST   | `/api/sync/`                 | Full sync            |
| POST   | `/api/purge/?confirm=true`   | Year reset / purge   |

---

## Project Structure

```
personaleconomy/
├── backend/
│   └── app/
│       ├── core/           # event_engine, sync_engine, database, config
│       ├── modules/        # SQLAlchemy models (accounts, transactions, transfers, events)
│       ├── schemas/        # Pydantic request/response models
│       ├── api/            # FastAPI route handlers
│       └── discord_bot/    # Discord bot, parser, poster
├── frontend/
│   └── src/
│       └── pages/          # Dashboard, Transactions, Accounts, Analytics, Deleted, Convert
├── docker/
├── TASKS.md
├── CLAUDE.md
└── .env.example
```

---

## Git Flow

```
main
 └── develop
      ├── feature/*
      └── fix/*
```

All work is done via branches and merged into `develop`. `main` receives only stable, tested merges from `develop`.

---

```
Author: Nymul Islam Moon
E-mail: nymulislalm.dev@gmail.com
Phone: 01339315497
```
