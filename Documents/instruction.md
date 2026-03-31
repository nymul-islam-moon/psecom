# Personal Finance System — Build Progress Tracker

Use this file to track what has been built, tested, and committed.
If a Claude session expires, start a new session and check this file to resume.

---

## Build Status

### Phase 1 — Backend Foundation
- [x] Git repository initialized
- [x] Project directory structure created
- [x] `backend/pyproject.toml` — dependencies (FastAPI, SQLAlchemy, discord.py, uv)
- [x] `backend/app/core/config.py` — pydantic-settings, all env vars
- [x] `backend/app/core/database.py` — sync + async SQLAlchemy engines, Base, get_db
- [x] `backend/app/core/event_engine.py` — idempotency, insert/update/delete dispatch
- [x] `backend/app/core/sync_engine.py` — Discord history replay on startup
- [x] `backend/app/modules/accounts/model.py` — Account ORM model
- [x] `backend/app/modules/transactions/model.py` — Transaction ORM model (soft delete)
- [x] `backend/app/modules/events/model.py` — Event ORM model
- [x] `backend/app/schemas/account.py` — Pydantic account schemas
- [x] `backend/app/schemas/transaction.py` — Pydantic transaction schemas
- [x] `backend/app/schemas/event.py` — Pydantic event schemas
- [x] `backend/app/api/routes_events.py` — POST /api/events, GET /api/events
- [x] `backend/app/api/routes_accounts.py` — GET /api/accounts
- [x] `backend/app/api/routes_transactions.py` — GET /api/transactions (with filters + deleted)
- [x] `backend/app/api/routes_sync.py` — POST /api/sync (manual Discord re-sync)
- [x] `backend/app/discord_bot/parser.py` — JSON validation → EventPayload
- [x] `backend/app/discord_bot/handlers.py` — Discord message → process → reply
- [x] `backend/app/discord_bot/bot.py` — discord.Client, only listens on finance channel
- [x] `backend/app/main.py` — FastAPI app, lifespan (init_db → sync → start bot), CORS
- [x] `backend/Dockerfile`

### Phase 2 — Frontend
- [x] `frontend/package.json` — React 18, Vite, React Router, Recharts, Axios
- [x] `frontend/vite.config.js` — dev server port 5173, /api proxy to backend
- [x] `frontend/index.html`
- [x] `frontend/src/main.jsx` — React root, BrowserRouter
- [x] `frontend/src/App.jsx` — Routes to all pages
- [x] `frontend/src/index.css` — dark theme global styles
- [x] `frontend/src/services/api.js` — Axios API client
- [x] `frontend/src/utils/format.js` — formatCurrency, formatDate
- [x] `frontend/src/components/Sidebar.jsx` — navigation
- [x] `frontend/src/pages/Dashboard.jsx` — summary cards, recent txns, accounts, sync button
- [x] `frontend/src/pages/Transactions.jsx` — filterable transaction list
- [x] `frontend/src/pages/Accounts.jsx` — account cards
- [x] `frontend/src/pages/Analytics.jsx` — bar chart + pie chart (Recharts)
- [x] `frontend/src/pages/Deleted.jsx` — soft-deleted records audit
- [x] `frontend/Dockerfile` — multi-stage build (Node → nginx)
- [x] `frontend/nginx.conf` — serves on port 5173, proxies /api to backend

### Phase 3 — Infrastructure
- [x] `docker/docker-compose.yml` — mysql:3307, backend:8100, frontend:5173
- [x] `docker/mysql/init.sql` — creates personal_economy database
- [x] `.env.example` — all env vars + Discord bot setup guide
- [x] `.gitignore`
- [x] `CLAUDE.md` — full project guide for future Claude sessions

### Phase 4 — Testing & Validation
- [ ] End-to-end Docker Compose boot test
- [ ] Backend health check (`GET /health`)
- [ ] Post a test event via API
- [ ] Discord bot receives message and processes it

---

## Pending / Future Work
- [ ] Alembic migrations (currently auto-created by SQLAlchemy on startup)
- [ ] Frontend: form to post events directly from the UI (without Discord)
- [ ] Frontend: account balance calculation (sum of transactions per account)
- [ ] Multi-currency conversion support
- [ ] Export to CSV

---

## Ports (do not conflict with other projects)
| Service  | Host Port |
|----------|-----------|
| MySQL    | 3307      |
| Backend  | 8100      |
| Frontend | 5173      |

---

## How to Resume After Token Expiry
1. Open this file — check which items are `[x]` done and which are `[ ]` pending
2. Read `CLAUDE.md` for full architecture context
3. Continue from the first unchecked item
