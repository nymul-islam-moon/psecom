"""
Sync Engine: fetches ALL messages from Discord, wipes the state tables,
then replays from scratch. Discord is the single source of truth.
"""
import json
import logging
import asyncio

import discord
from sqlalchemy import delete

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.event_engine import process_event
from app.modules.accounts.model import Account
from app.modules.transactions.model import Transaction
from app.modules.events.model import Event
from app.schemas.event import EventPayload

logger = logging.getLogger(__name__)


async def _fetch_discord_messages() -> list:
    """Connect to Discord, fetch all messages, return sorted list."""
    if not settings.DISCORD_TOKEN or settings.DISCORD_CHANNEL_ID == 0:
        logger.warning(
            "Discord credentials not configured — skipping sync. "
            "Set DISCORD_TOKEN and DISCORD_CHANNEL_ID in .env."
        )
        return []

    intents = discord.Intents.default()
    intents.message_content = True
    client = discord.Client(intents=intents)
    messages = []

    @client.event
    async def on_ready():
        try:
            channel = client.get_channel(settings.DISCORD_CHANNEL_ID)
            if channel is None:
                channel = await client.fetch_channel(
                    settings.DISCORD_CHANNEL_ID
                )
            async for message in channel.history(
                limit=None, oldest_first=True
            ):
                try:
                    payload = json.loads(message.content)
                    # Only process messages that look like valid events
                    if "event_id" not in payload or "action" not in payload:
                        continue
                    messages.append((message.created_at, payload))
                except (json.JSONDecodeError, KeyError):
                    pass
        except Exception as e:
            logger.error(f"Discord fetch error: {e}")
        finally:
            await client.close()

    try:
        await asyncio.wait_for(
            client.start(settings.DISCORD_TOKEN), timeout=60
        )
    except asyncio.TimeoutError:
        logger.error("Discord sync timed out after 60s")
        return []
    except Exception as e:
        logger.error(f"Discord client error during sync: {e}")
        return []

    messages.sort(key=lambda m: m[0])
    return messages


async def sync_from_discord():
    """
    Full rebuild:
    1. Fetch all messages from Discord channel
    2. Wipe accounts, transactions, events tables
    3. Replay every Discord event in order

    This guarantees Discord = source of truth.
    Any app-side changes NOT posted to Discord will be overwritten.
    """
    messages = await _fetch_discord_messages()
    if not messages and settings.DISCORD_CHANNEL_ID != 0:
        logger.info("No messages in Discord channel — DB stays empty.")
        return

    async with AsyncSessionLocal() as db:
        # Wipe all state — rebuild from Discord scratch
        await db.execute(delete(Transaction))
        await db.execute(delete(Account))
        await db.execute(delete(Event))
        await db.commit()
        logger.info(
            f"Wiped DB state. Replaying {len(messages)} Discord events..."
        )

        replayed = 0
        errors = 0
        for _, raw in messages:
            try:
                event = EventPayload(
                    event_id=raw["event_id"],
                    action=raw["action"],
                    entity=raw["entity"],
                    target_id=raw.get("target_id"),
                    data=raw.get("data", {}),
                    source="discord",
                )
                await process_event(event, db)
                replayed += 1
            except Exception as e:
                errors += 1
                logger.error(
                    f"Failed to replay {raw.get('event_id')}: {e}"
                )

        logger.info(
            f"Sync complete: {replayed} replayed, {errors} errors"
        )
