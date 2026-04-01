````md
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

### Multi-Currency Support
- BDT (Taka ৳) and USD ($) are fully supported with correct symbols
- Dashboard totals are grouped **per currency** — BDT and USD shown separately so numbers are never mixed
- All amounts display with the correct currency symbol dynamically

### Currency Conversion
- Dedicated **Convert** page to convert BDT ↔ USD
- Enter amount, exchange rate, and optional conversion charge
- Live **preview** shows: amount sent, charge, total deducted, amount received
- Overspend protection — conversion is blocked if balance is insufficient
- Conversion records **3 transactions** automatically:
  1. Expense on source account (amount)
  2. Income on destination account (converted amount)
  3. Expense on source account (charge, if any)
- All 3 are posted to Discord and survive sync

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
````

Open `.env` and fill in:

```
DISCORD_TOKEN=your_bot_token_here
DISCORD_CHANNEL_ID=your_channel_id_here
```

---

## Docker Usage

All services (Frontend, Backend, MySQL) are managed together using Docker Compose.

The `docker-compose.yml` file is located inside the `docker/` directory.

---

### Start the system (Development Mode)

```bash
cd docker
docker compose up --build
```

* Runs in foreground (shows logs)
* Recommended while actively developing and debugging
* Rebuilds images to apply latest code changes

---

### Start the system (Background / Demo Mode)

```bash
cd docker
docker compose up --build -d
```

* Runs in background (detached mode)
* Recommended when showcasing the project or running normally
* Terminal remains free

---

### Stop the system

```bash
cd docker
docker compose down
```

* Stops and removes all containers
* Resets the running environment cleanly

---

### Stop without removing (optional)

```bash
cd docker
docker compose stop
```

* Stops containers but keeps them available for quick restart

Restart later with:

```bash
cd docker
docker compose start
```

---

### Full reset (including volumes)

```bash
cd docker
docker compose down -v
```

* Removes containers and database data (MySQL)
* Use only when you want a completely fresh start

---

### Notes

* Always use `--build` when code changes to ensure updates are applied
* All services (React, FastAPI, MySQL) run together — no need to start them separately
* Use `docker ps` to verify running containers and ports

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

   * Scope: `bot`
   * Permissions: Read Messages, Send Messages, Read Message History
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

---

## Setting an Opening Balance

Create an **income** transaction:

* Type: `income`
* Category: `Opening Balance`
* Amount: current balance
* Note: `Initial balance`

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
| POST   | `/api/events/`               | Submit event         |
| POST   | `/api/sync/`                 | Full sync            |
| POST   | `/api/purge/?confirm=true`   | Year reset           |

---

## Project Structure

```
personaleconomy/
├── backend/
├── frontend/
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

All work is done via branches and merged into `develop`.

```
Author: Nymul Islam Moon
E-mail: nymulislalm.dev@gmail.com
Phone: 01339315497
```
