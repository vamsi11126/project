import os
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent.parent
load_dotenv(ROOT_DIR / ".env")


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


class Settings:
    MONGO_URI = os.getenv("MONGO_URI")
    DB_NAME = os.getenv("DB_NAME", "toolkit_db")
    JWT_SECRET = os.getenv("JWT_SECRET", "supersecret-donotusetransportlayer")
    FRONTEND_ORIGINS = _split_csv(
        os.getenv(
            "FRONTEND_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000",
        )
    )

    OTP_DEBUG_MODE = os.getenv("OTP_DEBUG_MODE", "true").lower() == "true"
    OTP_TTL_MINUTES = int(os.getenv("OTP_TTL_MINUTES", "10"))
    COLLEGE_EMAIL_DOMAIN = os.getenv("COLLEGE_EMAIL_DOMAIN", "").strip().lower()
    APPOINTMENT_OTP_TTL_MINUTES = 5
    OTP_RATE_LIMIT_WINDOW_MINUTES = int(os.getenv("OTP_RATE_LIMIT_WINDOW_MINUTES", "15"))
    OTP_RATE_LIMIT_MAX_REQUESTS = int(os.getenv("OTP_RATE_LIMIT_MAX_REQUESTS", "3"))

    SMTP_HOST = os.getenv("SMTP_HOST", "").strip()
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME = os.getenv("SMTP_USERNAME", "").strip()
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "").strip()
    SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", SMTP_USERNAME).strip()
    SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() == "true"

    ADMIN_SESSION_COOKIE_NAME = os.getenv("ADMIN_SESSION_COOKIE_NAME", "admin_session")
    ADMIN_SESSION_COOKIE_SECURE = os.getenv("ADMIN_SESSION_COOKIE_SECURE", "false").lower() == "true"
    ADMIN_SESSION_COOKIE_SAMESITE = os.getenv("ADMIN_SESSION_COOKIE_SAMESITE", "lax").strip().lower()
    ADMIN_SESSION_DURATION_HOURS = int(os.getenv("ADMIN_SESSION_DURATION_HOURS", "8"))
    ADMIN_LOGIN_RATE_LIMIT_WINDOW_MINUTES = int(
        os.getenv("ADMIN_LOGIN_RATE_LIMIT_WINDOW_MINUTES", "15")
    )
    ADMIN_LOGIN_RATE_LIMIT_MAX_ATTEMPTS = int(
        os.getenv("ADMIN_LOGIN_RATE_LIMIT_MAX_ATTEMPTS", "5")
    )


settings = Settings()
