
import logging
import os
import smtplib
from email.message import EmailMessage
from pathlib import Path

from dotenv import load_dotenv

# Load backend/.env explicitly, regardless of the working directory.
BACKEND_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_DIR / ".env")

logger = logging.getLogger(__name__)


def send_email(to_email: str, subject: str, body: str) -> bool:
    """Send a plain-text email. Return False if sending fails."""
    if not to_email or not to_email.strip():
        logger.error("Email not sent: recipient address is missing.")
        return False

    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()
    smtp_username = os.getenv("SMTP_USERNAME", "").strip()
    smtp_password = os.getenv("SMTP_PASSWORD", "").strip()
    from_email = os.getenv("SMTP_FROM_EMAIL", smtp_username).strip()

    try:
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
    except ValueError:
        logger.error("Email not sent: SMTP_PORT must be a valid integer.")
        return False

    use_tls = os.getenv("SMTP_USE_TLS", "true").strip().lower() in {
        "true", "1", "yes"
    }

    if not all([smtp_host, smtp_username, smtp_password, from_email]):
        logger.error(
            "Email not sent: SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD "
            "and SMTP_FROM_EMAIL configuration must be valid."
        )
        return False

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = from_email
    message["To"] = to_email.strip()
    message.set_content(body)

    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
            server.ehlo()

            if use_tls:
                server.starttls()
                server.ehlo()

            server.login(smtp_username, smtp_password)
            server.send_message(message)

        logger.info("Email accepted by SMTP server.")
        return True

    except (smtplib.SMTPException, OSError, ValueError):
        # Do not log credentials or email contents.
        logger.exception("Email delivery failed.")
        return False


def notify_manager_order_pending(
    manager_email: str,
    order_id: int,
    total_amount: float,
) -> bool:
    """Notify the manager that an order requires approval."""
    subject = f"Approval required: Sales Order #{order_id}"

    body = (
        f"Sales Order #{order_id} requires your approval.\n\n"
        f"Order total: {total_amount:,.2f}\n\n"
        "Please log in to the Sales & Inventory Management System "
        "to approve or reject this order."
    )

    return send_email(manager_email, subject, body)


def notify_order_decision(
    creator_email: str,
    order_id: int,
    decision: str,
    total_amount: float,
) -> bool:
    """Notify the order creator after a manager decision."""
    normalized_decision = decision.strip().lower()

    if normalized_decision not in {"approved", "rejected"}:
        logger.error("Email not sent: unsupported order decision.")
        return False

    subject = (
        f"Sales Order #{order_id} {normalized_decision.title()}"
    )

    body = (
        f"Your Sales Order #{order_id} has been "
        f"{normalized_decision}.\n\n"
        f"Order total: {total_amount:,.2f}\n"
    )

    if normalized_decision == "approved":
        body += (
            "\nThe order has been approved and inventory has been updated."
        )
    else:
        body += (
            "\nThe order was rejected and its reserved inventory was released."
        )

    return send_email(creator_email, subject, body)
