"""Send a test email using the React Email template via Resend.

Usage:
    RESEND_API_KEY=re_xxx python scripts/test_email.py your@email.com
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.services.email import _build_email_html, _build_email_plain  # noqa: E402
import resend  # noqa: E402


def main():
    if len(sys.argv) < 2:
        print("Usage: RESEND_API_KEY=re_xxx python scripts/test_email.py your@email.com")
        sys.exit(1)

    to_email = sys.argv[1]
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        print("Error: Set RESEND_API_KEY environment variable")
        sys.exit(1)

    # Build email with sample data including optional fields
    sample_args = dict(
        city="San Francisco",
        theme="midnight",
        custom_title="The City by the Bay",
        output_format="hd_wallpaper",
        landmarks=[
            {"name": "Golden Gate Bridge", "lat": 37.8199, "lon": -122.4783},
            {"name": "Alcatraz Island", "lat": 37.8267, "lon": -122.4233},
        ],
    )
    email_html = _build_email_html(**sample_args)
    email_text = _build_email_plain(**sample_args)

    resend.api_key = api_key
    result = resend.Emails.send({
        "from": "Cartographix <Cartographix@mail.radman.dev>",
        "reply_to": "rad@radman.dev",
        "to": [to_email],
        "subject": "Your Cartographix map poster is ready",
        "html": email_html,
        "text": email_text,
        "headers": {
            "X-Entity-Ref-ID": "test-email-preview",
        },
    })

    print(f"Sent! ID: {result['id']}")
    print(f"Check {to_email} inbox (and spam folder)")


if __name__ == "__main__":
    main()
