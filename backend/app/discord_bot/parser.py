"""
Parses and validates raw Discord message content into EventPayload.
"""
import json
from app.schemas.event import EventPayload

REQUIRED_FIELDS = {"event_id", "action", "entity", "data"}
VALID_ACTIONS = {"insert", "update", "delete"}
VALID_ENTITIES = {"transaction", "account", "transfer"}


class ParseError(Exception):
    pass


def parse_message(content: str) -> EventPayload:
    try:
        raw = json.loads(content)
    except json.JSONDecodeError:
        raise ParseError("Message is not valid JSON")

    missing = REQUIRED_FIELDS - set(raw.keys())
    if missing:
        raise ParseError(f"Missing required fields: {missing}")

    if raw["action"] not in VALID_ACTIONS:
        raise ParseError(f"Invalid action: {raw['action']}. Must be one of {VALID_ACTIONS}")

    if raw["entity"] not in VALID_ENTITIES:
        raise ParseError(f"Invalid entity: {raw['entity']}. Must be one of {VALID_ENTITIES}")

    if raw["action"] in ("update", "delete") and not raw.get("target_id"):
        raise ParseError(f"target_id is required for action: {raw['action']}")

    return EventPayload(
        event_id=raw["event_id"],
        action=raw["action"],
        entity=raw["entity"],
        target_id=raw.get("target_id"),
        data=raw.get("data", {}),
        source="discord",
    )
