import random
import string
from datetime import datetime
from decimal import Decimal
from typing import Any


def generate_unique_id(prefix: str = "SV") -> str:
    timestamp = datetime.utcnow().strftime("%y%m%d%H%M%S")
    rand = "".join(random.choices(string.digits, k=4))
    return f"{prefix}{timestamp}{rand}"


def format_datetime(dt: datetime) -> str:
    return dt.isoformat()


def parse_datetime(date_str: str) -> datetime:
    return datetime.fromisoformat(date_str)


def truncate_text(text: str, max_length: int = 200) -> str:
    if len(text) <= max_length:
        return text
    return text[: max_length - 3].rsplit(" ", 1)[0] + "..."


def calculate_reading_time(text: str) -> int:
    words_per_minute = 200
    word_count = len(text.split())
    minutes = max(1, round(word_count / words_per_minute))
    return minutes


def json_serialize(obj: Any) -> Any:
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, bytes):
        return obj.decode("utf-8", errors="replace")
    try:
        from bson import ObjectId
        if isinstance(obj, ObjectId):
            return str(obj)
    except ImportError:
        pass
    return str(obj)
