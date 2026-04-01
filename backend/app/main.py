import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import init_db
from app.core.sync_engine import sync_from_discord
from app.api.routes_accounts import router as accounts_router
from app.api.routes_transactions import router as transactions_router
from app.api.routes_events import router as events_router
from app.api.routes_sync import router as sync_router
from app.api.routes_purge import router as purge_router
from app.api.routes_transfers import router as transfers_router
from app.api.routes_yearend import router as yearend_router
from app.discord_bot.bot import start_bot
# Import models so SQLAlchemy registers them before init_db
from app.modules.transfers.model import Transfer  # noqa: F401

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing database tables...")
    await init_db()

    logger.info("Starting Discord sync from history...")
    await sync_from_discord()

    # Start Discord bot in background
    asyncio.create_task(start_bot())
    logger.info("Discord bot started in background.")

    yield

    # Shutdown (nothing to clean up)


app = FastAPI(
    title="Personal Economy API",
    description="Event-sourced personal finance tracker",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(accounts_router, prefix="/api")
app.include_router(transactions_router, prefix="/api")
app.include_router(events_router, prefix="/api")
app.include_router(sync_router, prefix="/api")
app.include_router(purge_router, prefix="/api")
app.include_router(transfers_router, prefix="/api")
app.include_router(yearend_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
