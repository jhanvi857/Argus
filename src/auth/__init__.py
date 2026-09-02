"""Auth package for Argus email verification, OTP management, and user authentication."""
from .email_verification import (
    send_verification_otp,
    verify_otp_and_register,
    validate_email_format,
    is_disposable_domain,
)

__all__ = [
    "send_verification_otp",
    "verify_otp_and_register",
    "validate_email_format",
    "is_disposable_domain",
]
