import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent.parent
load_dotenv(ROOT_DIR / ".env")

class Settings:
    ADMIN_PASSCODE = os.getenv("ADMIN_PASSCODE")
    MONGO_URI = os.getenv("MONGO_URI")
    DB_NAME = os.getenv("DB_NAME", "toolkit_db")
    
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

settings = Settings()
