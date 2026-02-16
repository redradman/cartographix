import os
import base64
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def _build_email_html(city: str, theme: str) -> str:
    """Build a clean, branded HTML email body."""
    theme_display = theme.replace("_", " ").title() if theme else "Default"
    return f"""\
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:8px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="padding:32px 32px 24px;border-bottom:1px solid #e4e4e7;">
          <h1 style="margin:0;font-size:22px;font-weight:600;color:#18181b;letter-spacing:-0.02em;">Cartographix</h1>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#18181b;">Your poster is ready</h2>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#3f3f46;">
            Here's your custom map poster of <strong>{city}</strong> in the <strong>{theme_display}</strong> theme.
          </p>
          <p style="margin:0;font-size:15px;line-height:1.6;color:#3f3f46;">
            Your poster is attached as a high-resolution PNG.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:24px 32px;background-color:#fafafa;border-top:1px solid #e4e4e7;">
          <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#71717a;">
            No tracking, no marketing &mdash; just your poster.
          </p>
          <p style="margin:0;font-size:13px;line-height:1.5;color:#a1a1aa;">
            <a href="https://github.com/radman-x/cartographix" style="color:#71717a;text-decoration:underline;">Cartographix</a> is free and open source.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def send_poster_email(
    to_email: str, city: str, png_path: str, theme: str = "", distance: int = 0
) -> bool:
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

        city_slug = city.lower().replace(" ", "_")
        theme_slug = theme.lower().replace(" ", "_") if theme else "default"
        filename = f"{city_slug}_{theme_slug}_poster.png"

        resend.Emails.send(
            {
                "from": "Cartographix <noreply@cartographix.app>",
                "to": [to_email],
                "subject": f"Your Cartographix poster of {city} is ready",
                "html": _build_email_html(city, theme),
                "attachments": [
                    {
                        "filename": filename,
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
