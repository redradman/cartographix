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

        resend.Emails.send(
            {
                "from": "Cartographix <noreply@cartographix.app>",
                "to": [to_email],
                "subject": f"Your Cartographix poster of {city} is ready",
                "html": (
                    f"<h2>Your {city} poster is ready!</h2>"
                    f"<p>Your custom city map poster is attached as a PNG file.</p>"
                    f"<p>Thank you for using Cartographix!</p>"
                ),
                "attachments": [
                    {
                        "filename": f"{city.lower().replace(' ', '_')}_poster.png",
                        "content": list(file_content),
                    }
                ],
            }
        )
        logger.info("Email sent to %s for city %s", to_email, city)
        return True
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to_email, e)
        return False
