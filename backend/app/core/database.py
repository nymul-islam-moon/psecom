from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    pass


# Sync engine (for Alembic migrations)
engine = create_engine(settings.DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Async engine (for FastAPI endpoints)
async_engine = create_async_engine(settings.ASYNC_DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    async with async_engine.begin() as conn:
        # Create any tables that don't exist yet
        await conn.run_sync(Base.metadata.create_all)

        # --- Column-level migrations ---
        # Safely add columns that were added to models after the table was
        # first created.  Using IF NOT EXISTS (MySQL 8.0+) makes this
        # idempotent — safe to run on every startup.
        migrations = [
            # v1.9.0 — added updated_at to transfers table
            """ALTER TABLE transfers
               ADD COLUMN IF NOT EXISTS updated_at DATETIME
               DEFAULT CURRENT_TIMESTAMP
               ON UPDATE CURRENT_TIMESTAMP""",
        ]
        for sql in migrations:
            try:
                await conn.execute(text(sql))
            except Exception:
                # If the column already exists or the table doesn't exist yet,
                # just continue — create_all above handles the latter.
                pass
