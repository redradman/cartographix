import os
import base64
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def send_poster_email(to_email: str, city: str, png_path: str) -> bool:
    """Send the generated poster PNG as an email attachment via Resend."""
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        logger.warning("RESEND_API_KEY not set, skipping email to %s", to_email)
        return False

    try:
        import resend

        resend.api_key = api_key

        file_path = Path(png_path)
        file_content = file_path.read_bytes()
        encoded_content = base64.b64encode(file_content).decode("utf-8")

        resend.Emails.send(
            {
                "from": "Cartographix <noreply@cartographix.app>",
                "to": [to_email],
                "subject": f"Your Cartographix poster of {city} is ready",
                "html": (
                    "<h2>Your poster is ready!</h2>"
                    f"<p>Your custom map poster of <strong>{city}</strong> is attached as a high-resolution PNG.</p>"
                    "<p>Thank you for using <a href='https://github.com/radman-x/cartographix'>Cartographix</a>!</p>"
                    "<p style='color: #9CA3AF; font-size: 12px;'>Cartographix is open source.</p>"
                ),
                "attachments": [
                    {
                        "filename": f"{city.lower().replace(' ', '_')}_poster.png",
                        "content": encoded_content,
                    }
                ],
            }
        )
        logger.info("Email sent to %s for city %s", to_email, city)
        return True
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to_email, e)
        return False
