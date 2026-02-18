import html
import os
import base64
import logging
from pathlib import Path
from typing import List, Optional

logger = logging.getLogger(__name__)

# Resolve the pre-rendered React Email template once at import time.
# In production (Docker), the template lives at /app/emails/poster-ready.html.
# In local dev, it's at ../emails/dist/poster-ready.html relative to the repo root.
_TEMPLATE_PATHS = [
    Path("/app/emails/poster-ready.html"),
    Path(__file__).resolve().parents[3] / "emails" / "dist" / "poster-ready.html",
]
_template_html: str | None = None
for _p in _TEMPLATE_PATHS:
    if _p.exists():
        _template_html = _p.read_text("utf-8")
        logger.info("Loaded email template from %s", _p)
        break

if _template_html is None:
    logger.warning("React Email template not found, email will use fallback")

# Inline styles matching the React Email template's detail rows
_ROW_LABEL_STYLE = "font-size:13px;color:#a1a1aa;"
_ROW_VALUE_STYLE = "font-size:13px;color:#18181b;font-weight:500;text-align:right;"
_ROW_STYLE = "width:100%;"

# Human-readable output format names
_FORMAT_LABELS = {
    "instagram": "Instagram (1080\u00d71080)",
    "mobile_wallpaper": "Mobile Wallpaper (1080\u00d71920)",
    "hd_wallpaper": "HD Wallpaper (1920\u00d71080)",
    "4k_wallpaper": "4K Wallpaper (3840\u00d72160)",
    "a4_print": "A4 Print (2480\u00d73508)",
}


def _detail_row(label: str, value: str, first: bool = False) -> str:
    """Build one table-row for the details card."""
    pad = "" if first else 'style="padding-top:8px;"'
    safe_val = html.escape(value)
    return (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" {pad}>'
        f'<tr style="{_ROW_STYLE}">'
        f'<td style="{_ROW_LABEL_STYLE}">{label}</td>'
        f'<td style="{_ROW_VALUE_STYLE}">{safe_val}</td>'
        f"</tr></table>"
    )


def _build_details_rows(
    city: str,
    theme_display: str,
    custom_title: str = "",
    output_format: str = "",
    distance: int = 0,
    landmarks: Optional[List[dict]] = None,
) -> str:
    """Build the HTML for all detail rows, only including non-empty fields."""
    rows: list[str] = []
    rows.append(_detail_row("City", city, first=True))
    rows.append(_detail_row("Theme", theme_display))

    if custom_title:
        rows.append(_detail_row("Title", custom_title))

    rows.append(_detail_row("Distance", f"{distance / 1000:.0f} km" if distance else "10 km"))

    format_label = _FORMAT_LABELS.get(output_format or "instagram", output_format.replace("_", " ").title() if output_format else "Instagram (1080×1080)")
    rows.append(_detail_row("Format", format_label))

    if landmarks:
        names = [lm.get("name", "") for lm in landmarks if lm.get("name")]
        if names:
            rows.append(_detail_row("Landmarks", ", ".join(names)))

    return "\n".join(rows)


def _build_email_plain(
    city: str,
    theme: str,
    custom_title: str = "",
    output_format: str = "",
    distance: int = 0,
    landmarks: Optional[List[dict]] = None,
) -> str:
    """Build a plain-text version of the email for multipart/alternative."""
    theme_display = theme.replace("_", " ").title() if theme else "Default"
    lines = [
        "Your poster is ready",
        "",
        f"Your custom map poster of {city} has been generated and is attached "
        "to this email as a high-resolution PNG.",
        "",
        f"City: {city}",
        f"Theme: {theme_display}",
    ]
    if custom_title:
        lines.append(f"Title: {custom_title}")
    lines.append(f"Distance: {distance / 1000:.0f} km" if distance else "Distance: 10 km")
    format_label = _FORMAT_LABELS.get(output_format or "instagram", output_format.replace("_", " ").title() if output_format else "Instagram (1080×1080)")
    lines.append(f"Format: {format_label}")
    if landmarks:
        names = [lm.get("name", "") for lm in landmarks if lm.get("name")]
        if names:
            lines.append(f"Landmarks: {', '.join(names)}")
    lines += [
        "",
        "Make another poster: https://cartographix.radman.dev",
        "",
        "No tracking, no marketing — just your poster.",
        "",
        "Made by Radman — https://radman.dev",
    ]
    return "\n".join(lines)


def _build_email_html(
    city: str,
    theme: str,
    custom_title: str = "",
    output_format: str = "",
    distance: int = 0,
    landmarks: Optional[List[dict]] = None,
) -> str:
    """Render the email HTML by replacing placeholders in the React Email template."""
    theme_display = theme.replace("_", " ").title() if theme else "Default"
    details_html = _build_details_rows(
        city, theme_display, custom_title, output_format, distance, landmarks
    )

    if _template_html is not None:
        return (
            _template_html
            .replace("{{city}}", html.escape(city))
            .replace("{{theme}}", html.escape(theme_display))
            .replace("{{details_rows}}", details_html)
        )

    # Minimal fallback if template file is missing
    safe_city = html.escape(city)
    return f"""\
<html><body style="font-family:sans-serif;padding:40px;background:#f0f0f0;">
<div style="max-width:500px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;">
<h1 style="color:#18181b;">Your poster is ready</h1>
<p>Your map poster of <strong>{safe_city}</strong> ({html.escape(theme_display)} theme) is attached.</p>
<hr/>
<p style="font-size:12px;color:#aaa;">Made by <a href="https://radman.dev">Radman</a></p>
</div></body></html>"""


def send_poster_email(
    to_email: str,
    city: str,
    png_path: str,
    theme: str = "",
    distance: int = 0,
    custom_title: str = "",
    output_format: str = "",
    landmarks: Optional[List[dict]] = None,
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
                "from": "Cartographix By Radman <Cartographix@mail.radman.dev>",
                "reply_to": "rad@radman.dev",
                "to": [to_email],
                "subject": "Your Cartographix map poster is ready",
                "html": _build_email_html(
                    city, theme, custom_title, output_format, distance, landmarks
                ),
                "text": _build_email_plain(
                    city, theme, custom_title, output_format, distance, landmarks
                ),
                "headers": {
                    "X-Entity-Ref-ID": filename,
                },
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
