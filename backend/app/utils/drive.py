import re
from urllib.parse import parse_qs, urlparse

import httpx
from fastapi import HTTPException

DRIVE_ID_PATTERNS = (
    r"/d/([a-zA-Z0-9_-]+)",
    r"[?&]id=([a-zA-Z0-9_-]+)",
)
DRIVE_HOSTS = {"drive.google.com", "docs.google.com"}


def _extract_drive_file_id(url: str) -> str | None:
    for pattern in DRIVE_ID_PATTERNS:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def _is_drive_url(url: str) -> bool:
    parsed = urlparse(url.strip())
    hostname = (parsed.hostname or "").lower()
    return hostname in DRIVE_HOSTS or hostname.endswith(".drive.google.com")

async def is_drive_file_public(file_id: str) -> bool:
    test_url = f"https://drive.google.com/uc?export=download&id={file_id}"

    async with httpx.AsyncClient(follow_redirects=False, timeout=10) as client:
        response = await client.head(test_url)
        location = response.headers.get("location", "")
        if "accounts.google.com" in location:
            return False
        return response.status_code in (200, 302)

async def normalize_and_validate_drive_url(url: str) -> str:
    normalized_url = url.strip()

    if not _is_drive_url(normalized_url):
        raise HTTPException(status_code=400, detail="PDF link must be a Google Drive URL.")

    file_id = _extract_drive_file_id(normalized_url)
    if not file_id:
        parsed = urlparse(normalized_url)
        file_id = parse_qs(parsed.query).get("id", [None])[0]

    if not file_id:
        raise HTTPException(status_code=400, detail="Enter a valid Google Drive file URL.")

    if not await is_drive_file_public(file_id):
        raise HTTPException(
            status_code=400,
            detail="Google Drive file is not public. Set access to 'Anyone with the link'."
        )

    return f"https://drive.google.com/uc?export=download&id={file_id}"
