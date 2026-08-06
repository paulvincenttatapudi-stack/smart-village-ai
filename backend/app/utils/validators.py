import os
import re

from loguru import logger


def validate_indian_phone(phone: str) -> bool:
    pattern = r"^(\+91|0)?[6-9]\d{9}$"
    return bool(re.match(pattern, phone.strip()))


def validate_pincode(pincode: str) -> bool:
    pattern = r"^\d{6}$"
    return bool(re.match(pattern, pincode.strip()))


def validate_file_extension(
    filename: str, allowed_extensions: set
) -> bool:
    ext = os.path.splitext(filename)[1].lower()
    return ext in allowed_extensions


def sanitize_filename(filename: str) -> str:
    safe = re.sub(r'[^\w\s.-]', '', filename)
    safe = re.sub(r'[-\s]+', '-', safe).strip().lower()
    safe = safe or "untitled"
    return safe
