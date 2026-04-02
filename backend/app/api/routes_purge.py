"""
Purge endpoint — deletes ALL messages from Discord channel and wipes the DB.
Used for year-end reset. Double-confirms via `confirm=true` query param.
"""
import logging
import asyncio

import discord
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete

from app.core.config import settings
from app.core.database import get_db
from app.modules.accounts.model import Account
from app.modules.transactions.model import Transaction
from app.modules.transfers.model import Transfer
from app.modules.events.model import Event

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/purge", tags=["purge"])


async def _delete_all_discord_messages():
    """Delete every non-bot message in the finance channel."""
    if not settings.DISCORD_TOKEN or settings.DISCORD_CHANNEL_ID == 0:
        return 0

    intents = discord.Intents.default()
    intents.message_content = True
    client = discord.Client(intents=intents)
    deleted = 0

    @client.event
    async def on_ready():
        nonlocal deleted
        try:
            channel = client.get_channel(settings.DISCORD_CHANNEL_ID)
            if channel is None:
                channel = await client.fetch_channel(settings.DISCORD_CHANNEL_ID)
            messages = [m async for m in channel.history(limit=None)]
            for msg in messages:
                try:
                    await msg.delete()
                    deleted += 1
                    await asyncio.sleep(0.3)  # respect rate limit
                except Exception:
                    pass
        except Exception as e:
            logger.error(f"Purge Discord error: {e}")
        finally:
            await client.close()

    try:
        await asyncio.wait_for(client.start(settings.DISCORD_TOKEN), timeout=120)
    except asyncio.TimeoutError:
        logger.error("Discord purge timed out")
    except Exception as e:
        logger.error(f"Discord purge error: {e}")

    return deleted


@router.post("/")
async def purge_all(
    confirm: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    """
    Wipe the entire database AND delete all Discord messages.
    Requires ?confirm=true query parameter.
    """
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="Pass ?confirm=true to confirm this destructive operation."
        )

    # Wipe DB
    await db.execute(delete(Transaction))
    await db.execute(delete(Transfer))
    await db.execute(delete(Account))
    await db.execute(delete(Event))
    await db.commit()

    # Delete Discord messages in background (fire-and-forget)
    asyncio.create_task(_delete_all_discord_messages())

    return {"status": "purge_started", "message": "Database wiped. Discord messages are being deleted in background."}
