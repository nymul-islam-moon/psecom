"""
Handles Discord messages: parse → process event → reply with result.
"""
import logging
import discord

from app.core.database import AsyncSessionLocal
from app.core.event_engine import process_event, DuplicateEventError
from app.discord_bot.parser import parse_message, ParseError

logger = logging.getLogger(__name__)


async def handle_message(message: discord.Message):
    """Process a Discord message as a financial event."""
    try:
        payload = parse_message(message.content)
    except ParseError as e:
        await message.reply(f"❌ Parse error: {e}")
        return

    try:
        async with AsyncSessionLocal() as db:
            event = await process_event(payload, db)
        await message.reply(
            f"✅ Event recorded\n"
            f"```\nevent_id: {event.event_id}\n"
            f"action:   {event.action}\n"
            f"entity:   {event.entity}\n"
            f"```"
        )
    except DuplicateEventError:
        await message.reply(f"⚠️ Duplicate event_id `{payload.event_id}` — ignored.")
    except Exception as e:
        logger.error(f"Error processing Discord event: {e}")
        await message.reply(f"❌ Server error: {e}")
