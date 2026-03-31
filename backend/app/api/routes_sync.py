from fastapi import APIRouter, BackgroundTasks
from app.core.sync_engine import sync_from_discord

router = APIRouter(prefix="/sync", tags=["sync"])


@router.post("/")
async def trigger_sync(background_tasks: BackgroundTasks):
    """Manually trigger a full Discord sync in the background."""
    background_tasks.add_task(sync_from_discord)
    return {"status": "sync started in background"}
