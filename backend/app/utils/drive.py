import re
import httpx
from fastapi import HTTPException

DRIVE_ID_REGEX = r"/d/([a-zA-Z0-9_-]+)"

async def is_drive_file_public(file_id: str) -> bool:
    test_url = f"https://drive.google.com/uc?export=download&id={file_id}"

    async with httpx.AsyncClient(follow_redirects=False, timeout=10) as client:
        response = await client.head(test_url)
        location = response.headers.get("location", "")
        if "accounts.google.com" in location:
            return False
        return response.status_code in (200, 302)

async def normalize_and_validate_drive_url(url: str) -> str:
    match = re.search(DRIVE_ID_REGEX, url)

    if not match:
        return url

    file_id = match.group(1)

    if not await is_drive_file_public(file_id):
        raise HTTPException(
            status_code=400,
            detail="Google Drive file is not public. Set access to 'Anyone with the link'."
        )

    return f"https://drive.google.com/uc?export=download&id={file_id}"
