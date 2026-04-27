"""Shared Pydantic validators.

These guard request schemas against oversized payloads — pentest flagged
that 10MB strings and 1MB JSON dicts were accepted without rejection.
Pydantic's `Field(max_length=N)` covers strings and lists; JSON dicts
need a custom check on serialized size.
"""

import json
from typing import Annotated, Any

from pydantic import BeforeValidator


# 64 KB is enough for normal motivation_signals / property_data payloads
# while blocking obvious DoS attempts. The DB JSON columns are SQLite TEXT
# under the hood; refusing payloads larger than this keeps the DB sane.
MAX_JSON_BYTES = 64 * 1024


def _enforce_json_size(value: Any) -> Any:
    """Reject dict / list payloads whose JSON serialization exceeds the
    cap. Returns the value unchanged on success."""
    if value is None:
        return value
    try:
        serialized = json.dumps(value, default=str)
    except (TypeError, ValueError):
        # Let Pydantic's own type validation surface the error
        return value
    if len(serialized) > MAX_JSON_BYTES:
        raise ValueError(
            f"JSON payload too large: {len(serialized)} bytes (max {MAX_JSON_BYTES})"
        )
    return value


BoundedJSONDict = Annotated[dict, BeforeValidator(_enforce_json_size)]
BoundedJSONList = Annotated[list, BeforeValidator(_enforce_json_size)]
