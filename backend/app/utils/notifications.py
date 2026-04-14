import smtplib
import logging
import asyncio
from email.message import EmailMessage
from datetime import datetime, timezone
from typing import Optional
from app.core.config import settings

def smtp_configured() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_FROM_EMAIL)

def send_email_sync(destination: str, otp_code: str, purpose: str, expires_in_minutes: int):
    message = EmailMessage()
    message["From"] = settings.SMTP_FROM_EMAIL
    message["To"] = destination
    message["Subject"] = f"Your Security Code - {purpose.replace('_', ' ').title()}"
    message.set_content(
        f"Hello,\n\nYour OTP is {otp_code}. "
        f"It will expire in {expires_in_minutes} minutes.\n\n"
        "If you did not request this, please ignore this email."
    )

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as smtp:
        if settings.SMTP_USE_TLS:
            smtp.starttls()
        if settings.SMTP_USERNAME:
            smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        smtp.send_message(message)

def send_appointment_status_email_sync(
    destination: str,
    student_name: str,
    faculty_name: str,
    cabin_number: str,
    status: str,
    meeting_time: Optional[datetime] = None,
    faculty_message: Optional[str] = None
):
    message = EmailMessage()
    message["From"] = settings.SMTP_FROM_EMAIL
    message["To"] = destination
    
    if status == "accepted":
        message["Subject"] = "✅ Appointment Confirmed"
        content = (
            f"Hello {student_name},\n\n"
            f"Your appointment request has been CONFIRMED by {faculty_name}.\n\n"
            f"--- MEETING DETAILS ---\n"
            f"Faculty: {faculty_name}\n"
            f"Cabin: {cabin_number}\n"
            f"Time: {meeting_time.astimezone(timezone.utc).strftime('%Y-%m-%d %H:%M UTC') if meeting_time else 'N/A'}\n"
            f"{f'Message from Faculty: {faculty_message}' if faculty_message else ''}\n\n"
            "Please ensure you are present at the venue on time.\n"
        )
    else:
        message["Subject"] = "❌ Appointment Declined"
        content = (
            f"Hello {student_name},\n\n"
            f"Your appointment request with {faculty_name} has been DECLINED.\n\n"
            f"--- DETAILS ---\n"
            f"Faculty: {faculty_name}\n"
            f"Status: Declined\n"
            f"{f'Reason: {faculty_message}' if faculty_message else 'No specific reason provided.'}\n\n"
            "You are welcome to request another time slot from the directory.\n"
        )
        
    message.set_content(content)

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as smtp:
        if settings.SMTP_USE_TLS:
            smtp.starttls()
        if settings.SMTP_USERNAME:
            smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        smtp.send_message(message)

async def deliver_appointment_status(
    destination: str,
    student_name: str,
    faculty_name: str,
    cabin_number: str,
    status: str,
    meeting_time: Optional[datetime] = None,
    faculty_message: Optional[str] = None
) -> str:
    from app.utils.validation import is_email
    if smtp_configured() and is_email(destination):
        try:
            await asyncio.to_thread(
                send_appointment_status_email_sync,
                destination,
                student_name,
                faculty_name,
                cabin_number,
                status,
                meeting_time,
                faculty_message
            )
            return "email_sent"
        except Exception as exc:
            logging.exception("Appointment status email failed: %s", exc)
            return "delivery_failed"

    return "logged"

async def deliver_otp(destination: str, otp_code: str, purpose: str, expires_in_minutes: int) -> str:
    from app.utils.validation import is_email
    if smtp_configured() and is_email(destination):
        try:
            await asyncio.to_thread(
                send_email_sync,
                destination,
                otp_code,
                purpose,
                expires_in_minutes,
            )
            return "email_sent"
        except Exception as exc:
            logging.exception("OTP email delivery failed: %s", exc)
            return "delivery_failed"

    return "logged"
