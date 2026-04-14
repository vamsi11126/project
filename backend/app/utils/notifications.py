import asyncio
import base64
import logging
import smtplib
from datetime import datetime, timezone
from email.message import EmailMessage
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


def gmail_api_configured() -> bool:
    return bool(
        settings.GMAIL_API_CLIENT_ID
        and settings.GMAIL_API_CLIENT_SECRET
        and settings.GMAIL_API_REFRESH_TOKEN
        and settings.GMAIL_API_FROM_EMAIL
    )


def smtp_configured() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_FROM_EMAIL)


def build_otp_content(otp_code: str, purpose: str, expires_in_minutes: int) -> tuple[str, str, str]:
    subject = f"Your Security Code - {purpose.replace('_', ' ').title()}"
    text = (
        f"Hello,\n\nYour OTP is {otp_code}. "
        f"It will expire in {expires_in_minutes} minutes.\n\n"
        "If you did not request this, please ignore this email."
    )
    html = (
        "<p>Hello,</p>"
        f"<p>Your OTP is <strong>{otp_code}</strong>.</p>"
        f"<p>It will expire in {expires_in_minutes} minutes.</p>"
        "<p>If you did not request this, please ignore this email.</p>"
    )
    return subject, text, html


def build_appointment_status_content(
    student_name: str,
    faculty_name: str,
    cabin_number: str,
    status: str,
    meeting_time: Optional[datetime] = None,
    faculty_message: Optional[str] = None,
) -> tuple[str, str, str]:
    formatted_time = (
        meeting_time.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        if meeting_time else "N/A"
    )

    if status == "accepted":
        subject = "Appointment Confirmed"
        text = (
            f"Hello {student_name},\n\n"
            f"Your appointment request has been confirmed by {faculty_name}.\n\n"
            f"Faculty: {faculty_name}\n"
            f"Cabin: {cabin_number}\n"
            f"Time: {formatted_time}\n"
            f"{f'Message from Faculty: {faculty_message}' if faculty_message else ''}\n\n"
            "Please ensure you are present at the venue on time.\n"
        )
        html = (
            f"<p>Hello {student_name},</p>"
            f"<p>Your appointment request has been <strong>confirmed</strong> by {faculty_name}.</p>"
            "<p>"
            f"Faculty: {faculty_name}<br>"
            f"Cabin: {cabin_number}<br>"
            f"Time: {formatted_time}"
            "</p>"
            f"{f'<p>Message from Faculty: {faculty_message}</p>' if faculty_message else ''}"
            "<p>Please ensure you are present at the venue on time.</p>"
        )
    else:
        reason = faculty_message or "No specific reason provided."
        subject = "Appointment Declined"
        text = (
            f"Hello {student_name},\n\n"
            f"Your appointment request with {faculty_name} has been declined.\n\n"
            f"Faculty: {faculty_name}\n"
            "Status: Declined\n"
            f"Reason: {reason}\n\n"
            "You are welcome to request another time slot from the directory.\n"
        )
        html = (
            f"<p>Hello {student_name},</p>"
            f"<p>Your appointment request with {faculty_name} has been <strong>declined</strong>.</p>"
            "<p>"
            f"Faculty: {faculty_name}<br>"
            "Status: Declined<br>"
            f"Reason: {reason}"
            "</p>"
            "<p>You are welcome to request another time slot from the directory.</p>"
        )

    return subject, text, html


async def get_gmail_api_access_token() -> str:
    data = {
        "client_id": settings.GMAIL_API_CLIENT_ID,
        "client_secret": settings.GMAIL_API_CLIENT_SECRET,
        "refresh_token": settings.GMAIL_API_REFRESH_TOKEN,
        "grant_type": "refresh_token",
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(
            settings.GMAIL_API_TOKEN_URL,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        response.raise_for_status()
        payload = response.json()

    access_token = payload.get("access_token")
    if not access_token:
        raise ValueError("Gmail OAuth token response did not include an access_token.")
    return access_token


async def send_with_gmail_api(
    destination: str,
    subject: str,
    text: str,
    html: Optional[str] = None,
) -> str:
    message = EmailMessage()
    message["To"] = destination
    message["From"] = settings.GMAIL_API_FROM_EMAIL
    message["Subject"] = subject
    message.set_content(text)
    if html:
        message.add_alternative(html, subtype="html")

    encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
    access_token = await get_gmail_api_access_token()

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(
            settings.GMAIL_API_SEND_URL,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json={"raw": encoded_message},
        )
        response.raise_for_status()

    return "email_sent"


def send_email_sync(destination: str, otp_code: str, purpose: str, expires_in_minutes: int):
    subject, text, _ = build_otp_content(otp_code, purpose, expires_in_minutes)
    message = EmailMessage()
    message["From"] = settings.SMTP_FROM_EMAIL
    message["To"] = destination
    message["Subject"] = subject
    message.set_content(text)

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
    faculty_message: Optional[str] = None,
):
    subject, text, _ = build_appointment_status_content(
        student_name,
        faculty_name,
        cabin_number,
        status,
        meeting_time,
        faculty_message,
    )
    message = EmailMessage()
    message["From"] = settings.SMTP_FROM_EMAIL
    message["To"] = destination
    message["Subject"] = subject
    message.set_content(text)

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
    faculty_message: Optional[str] = None,
) -> str:
    from app.utils.validation import is_email

    if not is_email(destination):
        return "logged"

    subject, text, html = build_appointment_status_content(
        student_name,
        faculty_name,
        cabin_number,
        status,
        meeting_time,
        faculty_message,
    )

    if gmail_api_configured():
        try:
            await send_with_gmail_api(destination, subject, text, html)
            return "email_sent"
        except Exception as exc:
            logger.exception("Appointment status email failed via Gmail API: %s", exc)

    if smtp_configured():
        try:
            await asyncio.to_thread(
                send_appointment_status_email_sync,
                destination,
                student_name,
                faculty_name,
                cabin_number,
                status,
                meeting_time,
                faculty_message,
            )
            return "email_sent"
        except Exception as exc:
            logger.exception("Appointment status email failed via SMTP: %s", exc)
            return "delivery_failed"

    return "logged"


async def deliver_otp(destination: str, otp_code: str, purpose: str, expires_in_minutes: int) -> str:
    from app.utils.validation import is_email

    if not is_email(destination):
        return "logged"

    subject, text, html = build_otp_content(otp_code, purpose, expires_in_minutes)

    if gmail_api_configured():
        try:
            await send_with_gmail_api(destination, subject, text, html)
            return "email_sent"
        except Exception as exc:
            logger.exception("OTP email delivery failed via Gmail API: %s", exc)

    if smtp_configured():
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
            logger.exception("OTP email delivery failed via SMTP: %s", exc)
            return "delivery_failed"

    return "logged"
