import re
from app.core.config import settings

def is_email(value: str) -> bool:
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", value))


def get_college_email_domains() -> list[str]:
    return [
        domain.strip().lower()
        for domain in settings.COLLEGE_EMAIL_DOMAIN.split(",")
        if domain.strip()
    ]


def college_email_error_message() -> str:
    domains = get_college_email_domains()
    if not domains:
        return "Only college email addresses are allowed."

    if len(domains) == 1:
        return f"Use your college email ending with @{domains[0]}."

    formatted_domains = ", ".join(f"@{domain}" for domain in domains)
    return f"Use your college email ending with one of: {formatted_domains}."


def is_college_email(value: str) -> bool:
    if not is_email(value):
        return False

    value = value.lower()
    domains = get_college_email_domains()

    if domains:
        return any(value.endswith(f"@{domain}") for domain in domains)

    academic_patterns = [
        r".*\.edu$",
        r".*\.edu\.in$",
        r".*\.ac\.in$",
    ]

    return any(re.match(pattern, value) for pattern in academic_patterns)

def mask_destination(destination: str) -> str:
    if is_email(destination):
        local, domain = destination.split("@", 1)
        if len(local) <= 2:
            return f"{local[0]}***@{domain}" if local else f"***@{domain}"
        return f"{local[0]}***{local[-1]}@{domain}"
    if len(destination) <= 4:
        return "*" * len(destination)
    return f"{destination[:2]}{'*' * max(1, len(destination) - 4)}{destination[-2:]}"
