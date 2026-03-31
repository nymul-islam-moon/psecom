"""
Sync Engine: fetches all messages from the Discord finance channel,
sorts them chronologically, and replays events to rebuild the database.
"""
import json
import logging
from datetime import datetime

import discord
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.event_engine import process_event, DuplicateEventError
from app.schemas.event import EventPayload

logger = logging.getLogger(__name__)


async def sync_from_discord():
    """
    Called on application startup. Reads all messages from the Discord channel
    and replays them in order to reconstruct the database state.
    """
    if not settings.DISCORD_TOKEN or not settings.DISCORD_CHANNEL_ID:
        logger.warning("Discord credentials not set — skipping startup sync.")
        return

    intents = discord.Intents.default()
    intents.message_content = True
    client = discord.Client(intents=intents)

    messages = []

    @client.event
    async def on_ready():
        try:
            channel = client.get_channel(settings.DISCORD_CHANNEL_ID)
            if channel is None:
                channel = await client.fetch_channel(settings.DISCORD_CHANNEL_ID)

            async for message in channel.history(limit=None, oldest_first=True):
                if message.author.bot:
                    continue
                try:
                    payload = json.loads(message.content)
                    messages.append((message.created_at, payload))
                except (json.JSONDecodeError, KeyError):
                    pass  # Skip non-JSON messages

        finally:
            await client.close()

    await client.start(settings.DISCORD_TOKEN)

    # Sort by creation time (should already be ordered, but be safe)
    messages.sort(key=lambda m: m[0])

    async with AsyncSessionLocal() as db:
        replayed = 0
        skipped = 0
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
            except DuplicateEventError:
                skipped += 1
            except Exception as e:
                logger.error(f"Failed to replay event {raw.get('event_id')}: {e}")

        logger.info(f"Sync complete: {replayed} replayed, {skipped} skipped (already in DB)")
