from datetime import datetime, timezone
import uuid
from app.models.schemas import AppNotification
from app.db.mongodb import get_database

async def create_app_notification(
    db,
    appointment_id: str,
    student_email: str,
    student_name: str,
    faculty_id: str,
    faculty_name: str,
    cabin_number: str,
    meeting_time: datetime,
) -> str:
    title = "Appointment Confirmed"
    message = (
        f"Your appointment with {faculty_name} is confirmed for "
        f"{meeting_time.astimezone(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')} "
        f"at cabin {cabin_number}."
    )

    notification = AppNotification(
        id=str(uuid.uuid4()),
        appointment_id=appointment_id,
        student_email=student_email,
        student_name=student_name,
        faculty_id=faculty_id,
        faculty_name=faculty_name,
        cabin_number=cabin_number,
        meeting_time=meeting_time,
        title=title,
        message=message,
    )
    await db.notifications.insert_one(notification.model_dump())
    return "created"
