"""
Discord bot that listens on the configured finance channel.
Only processes messages in DISCORD_CHANNEL_ID — ignores all others.
"""
import logging
import discord

from app.core.config import settings
from app.discord_bot.handlers import handle_message

logger = logging.getLogger(__name__)

intents = discord.Intents.default()
intents.message_content = True

bot = discord.Client(intents=intents)


@bot.event
async def on_ready():
    logger.info(f"Discord bot connected as {bot.user} — monitoring channel {settings.DISCORD_CHANNEL_ID}")


@bot.event
async def on_message(message: discord.Message):
    # Ignore own messages
    if message.author == bot.user:
        return

    # Only process messages in the configured finance channel
    if message.channel.id != settings.DISCORD_CHANNEL_ID:
        return

    await handle_message(message)


async def start_bot():
    if not settings.DISCORD_TOKEN:
        logger.warning("DISCORD_TOKEN not set — Discord bot will not start.")
        return
    await bot.start(settings.DISCORD_TOKEN)
