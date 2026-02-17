#!/usr/bin/env python3
"""Generate theme preview posters for all cities × all themes.

Submits jobs to the running backend API, polls for completion,
and downloads the resulting PNGs to frontend/public/previews/{city_slug}/{theme}.png

Usage:
    python scripts/generate_previews.py [--concurrency 2] [--base-url http://localhost:8000]
"""

import argparse
import json
import shutil
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

CITIES = [
    ("New York", "United States"),
    ("London", "United Kingdom"),
    ("Paris", "France"),
    ("Tokyo", "Japan"),
    ("Madrid", "Spain"),
    ("Dubai", "United Arab Emirates"),
    ("Singapore", "Singapore"),
    ("Berlin", "Germany"),
    ("Barcelona", "Spain"),
    ("Sydney", "Australia"),
    ("Beijing", "China"),
]

THEMES = [
    "default", "classic", "midnight", "ocean", "forest", "sunset", "neon",
    "pastel", "monochrome", "vintage", "arctic", "desert", "cyberpunk",
    "watercolor", "blueprint", "autumn", "minimal",
]

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = SCRIPT_DIR.parent
OUTPUT_DIR = PROJECT_DIR / "frontend" / "public" / "previews"


def city_slug(city: str) -> str:
    return city.lower().replace(" ", "_")


def api_post(url: str, data: dict, timeout: int = 30) -> dict:
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read())


def api_get(url: str, timeout: int = 10) -> dict:
    with urllib.request.urlopen(url, timeout=timeout) as resp:
        return json.loads(resp.read())


def download_file(url: str, dest: Path, timeout: int = 60) -> None:
    with urllib.request.urlopen(url, timeout=timeout) as resp:
        with open(dest, "wb") as f:
            shutil.copyfileobj(resp, f)


def generate_and_download(
    base_url: str, city: str, country: str, theme: str, out_dir: Path
) -> str:
    """Submit a job, poll until done, download the poster. Returns status message."""
    slug = city_slug(city)
    dest = out_dir / slug / f"{theme}.png"

    if dest.exists():
        return f"SKIP  {city} / {theme} (already exists)"

    # Submit job
    try:
        result = api_post(
            f"{base_url}/api/generate",
            {
                "city": city,
                "country": country,
                "theme": theme,
                "distance": 10000,
                "email": "",
                "output_format": "instagram",
                "custom_title": "",
                "landmarks": [],
            },
        )
    except Exception as e:
        return f"FAIL  {city} / {theme} — submit error: {e}"

    job_id = result["job_id"]

    # Poll for completion (up to 3 minutes)
    for _ in range(180):
        time.sleep(1)
        try:
            data = api_get(f"{base_url}/api/status/{job_id}")
        except Exception:
            continue

        status = data["status"]

        if status == "completed":
            poster_url = data.get("poster_url")
            if not poster_url:
                return f"FAIL  {city} / {theme} — completed but no poster URL"

            dest.parent.mkdir(parents=True, exist_ok=True)
            try:
                download_file(f"{base_url}{poster_url}", dest)
            except Exception as e:
                return f"FAIL  {city} / {theme} — download error: {e}"

            size_kb = dest.stat().st_size / 1024
            return f"OK    {city} / {theme} ({size_kb:.0f} KB)"

        if status == "failed":
            err = data.get("error_message", "unknown error")
            return f"FAIL  {city} / {theme} — {err}"

    return f"TIMEOUT {city} / {theme}"


def main():
    parser = argparse.ArgumentParser(description="Generate theme preview posters")
    parser.add_argument("--concurrency", type=int, default=2, help="Max concurrent jobs")
    parser.add_argument("--base-url", default="http://localhost:8000", help="Backend URL")
    args = parser.parse_args()

    total = len(CITIES) * len(THEMES)
    print(f"Generating {total} previews ({len(CITIES)} cities × {len(THEMES)} themes)")
    print(f"Concurrency: {args.concurrency}")
    print(f"Output: {OUTPUT_DIR}")
    print(flush=True)

    # Check backend is up
    try:
        api_get(f"{args.base_url}/api/health", timeout=5)
    except Exception as e:
        print(f"ERROR: Backend not reachable at {args.base_url} — {e}")
        return

    completed = 0
    failed = 0
    skipped = 0
    start = time.monotonic()

    # Process city by city so OSMnx caching helps within each city
    for city, country in CITIES:
        print(f"\n--- {city}, {country} ---", flush=True)
        with ThreadPoolExecutor(max_workers=args.concurrency) as pool:
            futures = {
                pool.submit(
                    generate_and_download, args.base_url, city, country, theme, OUTPUT_DIR
                ): theme
                for theme in THEMES
            }
            for future in as_completed(futures):
                result = future.result()
                print(f"  {result}", flush=True)
                if result.startswith("OK"):
                    completed += 1
                elif result.startswith("SKIP"):
                    skipped += 1
                else:
                    failed += 1

    elapsed = time.monotonic() - start
    print(f"\nDone in {elapsed / 60:.1f} minutes")
    print(f"  Completed: {completed}")
    print(f"  Skipped:   {skipped}")
    print(f"  Failed:    {failed}")


if __name__ == "__main__":
    main()
