import re
from app.core.config import settings

def is_email(value: str) -> bool:
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", value))

def is_college_email(value: str) -> bool:
    if not is_email(value):
        return False
    
    value = value.lower()
    
    # 1. Check against the manually configured domain in .env
    if settings.COLLEGE_EMAIL_DOMAIN:
        # Split by comma to support multiple domains
        domains = [d.strip().lower() for d in settings.COLLEGE_EMAIL_DOMAIN.split(",")]
        if any(value.endswith(f"@{domain}") for domain in domains):
            return True

    # 2. Flexible match for common academic and trusted test domains
    # Allowed: .edu, .ac.in, .edu.in, and gmail.com (for dev/production testing)
    academic_patterns = [
        r".*\.edu$",
        r".*\.edu\.in$",
        r".*\.ac\.in$",
        r".*@gmail\.com$"
    ]
    
    for pattern in academic_patterns:
        if re.match(pattern, value):
            return True
            
    return False

def mask_destination(destination: str) -> str:
    if is_email(destination):
        local, domain = destination.split("@", 1)
        if len(local) <= 2:
            return f"{local[0]}***@{domain}" if local else f"***@{domain}"
        return f"{local[0]}***{local[-1]}@{domain}"
    if len(destination) <= 4:
        return "*" * len(destination)
    return f"{destination[:2]}{'*' * max(1, len(destination) - 4)}{destination[-2:]}"
