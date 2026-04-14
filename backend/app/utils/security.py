import hashlib

def hash_otp(otp_code: str, salt: str) -> str:
    return hashlib.sha256(f"{salt}:{otp_code}".encode("utf-8")).hexdigest()
