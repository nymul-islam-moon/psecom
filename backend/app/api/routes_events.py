from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.event_engine import process_event, DuplicateEventError
from app.modules.events.model import Event
from app.schemas.event import EventPayload, EventResponse

router = APIRouter(prefix="/events", tags=["events"])


@router.post("/", response_model=EventResponse)
async def create_event(payload: EventPayload, db: AsyncSession = Depends(get_db)):
    try:
        event = await process_event(payload, db)
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
        select(Event).order_by(Event.created_at.desc()).offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(event_id: str, db: AsyncSession = Depends(get_db)):
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event
