"""
Posts event messages to the Discord finance channel.
Used when the app creates/updates/deletes records so Discord
remains the permanent source of truth.
"""
import json
import logging

from app.core.config import settings
from app.discord_bot.bot import bot

logger = logging.getLogger(__name__)


async def post_to_discord(event_id: str, action: str, entity: str,
                          data: dict, target_id: str = None) -> bool:
    """
    Post a financial event as a JSON message to the Discord channel.
    Returns True if posted successfully, False otherwise.
    """
    if not settings.DISCORD_TOKEN or settings.DISCORD_CHANNEL_ID == 0:
        logger.warning("Discord not configured — event not posted to Discord.")
        return False

    payload = {
        "event_id": event_id,
        "action": action,
        "entity": entity,
        "data": data,
    }
    if target_id:
        payload["target_id"] = target_id

    message = json.dumps(payload)

    try:
        channel = bot.get_channel(settings.DISCORD_CHANNEL_ID)
        if channel is None:
            channel = await bot.fetch_channel(settings.DISCORD_CHANNEL_ID)
        await channel.send(message)
        logger.info(f"Posted {action} {entity} to Discord: {event_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to post to Discord: {e}")
        return False
