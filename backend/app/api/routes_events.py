from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.event_engine import process_event, DuplicateEventError
from app.modules.events.model import Event
from app.schemas.event import EventPayload, EventResponse
from app.discord_bot.poster import post_to_discord

router = APIRouter(prefix="/events", tags=["events"])


@router.post("", response_model=EventResponse)
@router.post("/", response_model=EventResponse, include_in_schema=False)
async def create_event(
    payload: EventPayload, db: AsyncSession = Depends(get_db)
):
    try:
        event = await process_event(payload, db)

        # Mirror every app event to Discord so it becomes part of
        # the permanent ledger and survives a full sync/rebuild.
        if payload.source == "app":
            await post_to_discord(
                event_id=payload.event_id,
                action=payload.action,
                entity=payload.entity,
                data=payload.data,
                target_id=payload.target_id,
            )

        return event
    except DuplicateEventError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=list[EventResponse])
async def list_events(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Event).order_by(Event.created_at.desc())
        .offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(event_id: str, db: AsyncSession = Depends(get_db)):
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event
