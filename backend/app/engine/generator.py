import logging
import os
import signal
import time
import uuid
from pathlib import Path
from typing import Callable, List, Optional

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import osmnx as ox

from app.models.themes import get_theme_colors

logger = logging.getLogger(__name__)

OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

RESOLUTION_PRESETS = {
    "instagram": {"name": "Instagram Post", "figsize": (3.6, 3.6), "dpi": 300, "pixels": "1080×1080"},
    "mobile_wallpaper": {"name": "Mobile Wallpaper", "figsize": (3.6, 6.4), "dpi": 300, "pixels": "1080×1920"},
    "hd_wallpaper": {"name": "HD Wallpaper", "figsize": (6.4, 3.6), "dpi": 300, "pixels": "1920×1080"},
    "4k_wallpaper": {"name": "4K Wallpaper", "figsize": (12.8, 7.2), "dpi": 300, "pixels": "3840×2160"},
    "a4_print": {"name": "A4 Print", "figsize": (8.3, 11.7), "dpi": 300, "pixels": "2480×3508"},
}

# Configure OSMnx settings for reliability
ox.settings.timeout = 60
ox.settings.use_cache = True
ox.settings.log_console = True

# Module-level geocoding cache: query string -> (lat, lng)
_geocode_cache: dict[str, tuple[float, float]] = {}


def generate_poster(
    city: str,
    country: str,
    theme: str = "default",
    distance: int = 3000,
    output_format: str = "instagram",
    custom_title: str = "",
    on_stage: Optional[Callable[[str], None]] = None,
) -> str:
    """Generate a styled city map poster and return the path to the PNG file.

    Uses OSMnx to fetch the street network via Nominatim geocoding,
    then renders it with matplotlib using theme colors.
    """
    def _set_stage(stage: str) -> None:
        if on_stage:
            on_stage(stage)
        logger.info("Stage: %s", stage)

    if distance > 30000:
        logger.warning("Large distance requested (%d m) for %s — may be slow or fail", distance, city)

    colors = get_theme_colors(theme)
    bg_color, primary_color, secondary_color, accent_color = colors

    # Geocode the location (with cache for repeat cities)
    query = f"{city}, {country}" if country else city
    logger.info("Geocoding: %s", query)
    _set_stage("geocoding")
    t0 = time.monotonic()
    if query in _geocode_cache:
        lat, lng = _geocode_cache[query]
        logger.info("Geocode cache hit for '%s' → (%f, %f)", query, lat, lng)
    else:
        try:
            point = ox.geocode(query)
        except Exception as e:
            logger.error("Geocoding failed for '%s': %s", query, e)
            raise ValueError("City not found — check the spelling or try adding a country")
        lat, lng = point
        _geocode_cache[query] = (lat, lng)
        logger.info("Geocoded %s to (%f, %f)", query, lat, lng)
    logger.info("Geocoding took %.2fs", time.monotonic() - t0)

    # Fetch street network using a bounding box that matches the output format's aspect ratio.
    # This ensures non-square formats (story, landscape, etc.) get actual map data filling
    # the entire poster instead of a square map with whitespace padding.
    effective_distance = min(distance, 20000)
    network_type = "drive" if effective_distance > 5000 else "all"

    preset = RESOLUTION_PRESETS.get(output_format, RESOLUTION_PRESETS["instagram"])
    figsize = preset["figsize"]
    fig_w, fig_h = figsize
    aspect_ratio = fig_w / fig_h  # width / height

    # Convert distance to approximate degrees (1 degree latitude ≈ 111,320 meters)
    lat_offset = effective_distance / 111320
    # Longitude degrees shrink with latitude (cosine correction)
    lng_offset = effective_distance / (111320 * max(abs(np.cos(np.radians(lat))), 0.01))

    # Scale offsets to match the desired aspect ratio
    if aspect_ratio >= 1.0:
        # Wider than tall — expand longitude, keep latitude as-is
        lng_offset *= aspect_ratio
    else:
        # Taller than wide — expand latitude, keep longitude as-is
        lat_offset /= aspect_ratio

    north = lat + lat_offset
    south = lat - lat_offset
    east = lng + lng_offset
    west = lng - lng_offset

    logger.info(
        "Fetching street network for %s (dist=%d, type=%s, format=%s, bbox=[%.4f,%.4f,%.4f,%.4f])",
        query, effective_distance, network_type, output_format, north, south, east, west,
    )
    _set_stage("fetching_streets")
    t1 = time.monotonic()
    try:
        graph = ox.graph_from_bbox(
            bbox=(west, south, east, north),
            network_type=network_type,
            simplify=True,
            truncate_by_edge=True,
        )
    except MemoryError:
        raise ValueError("Area too large — try a smaller distance")
    except Exception as e:
        logger.error("Street fetch failed: %s", e)
        raise ValueError("Could not fetch street data — try a smaller distance or different city")
    logger.info("Street fetch took %.2fs", time.monotonic() - t1)

    # Render poster
    _set_stage("rendering")
    t2 = time.monotonic()
    try:
        # Classify edges by road type for styling (vectorized)
        _, edges = ox.graph_to_gdfs(graph)

        fig, ax = plt.subplots(figsize=figsize, facecolor=bg_color)
        ax.set_facecolor(bg_color)

        # Vectorized edge classification — extract highway column and normalize lists
        highway_col = edges["highway"].apply(
            lambda h: h[0] if isinstance(h, list) else (h if h else "")
        )

        # Map highway types to colors and widths
        major = highway_col.isin(("motorway", "trunk", "primary"))
        mid = highway_col.isin(("secondary", "tertiary"))

        edge_colors = np.where(major, accent_color, np.where(mid, primary_color, secondary_color)).tolist()
        edge_widths = np.where(major, 2.5, np.where(mid, 1.5, 0.8)).tolist()

        ox.plot_graph(
            graph,
            ax=ax,
            node_size=0,
            edge_color=edge_colors,
            edge_linewidth=edge_widths,
            bgcolor=bg_color,
            show=False,
            close=False,
        )

        ax.margins(0)
        ax.axis("off")

        # Enforce the desired aspect ratio by adjusting axis limits
        fig_w, fig_h = figsize
        target_ratio = fig_w / fig_h  # width / height
        x_min, x_max = ax.get_xlim()
        y_min, y_max = ax.get_ylim()
        data_w = x_max - x_min
        data_h = y_max - y_min
        data_ratio = data_w / data_h

        if data_ratio < target_ratio:
            new_w = data_h * target_ratio
            x_center = (x_min + x_max) / 2
            ax.set_xlim(x_center - new_w / 2, x_center + new_w / 2)
        else:
            new_h = data_w / target_ratio
            y_center = (y_min + y_max) / 2
            ax.set_ylim(y_center - new_h / 2, y_center + new_h / 2)

        # Override equal aspect set by ox.plot_graph — since we already
        # fetch street data matching the output format's aspect ratio and
        # enforce axis limits above, 'auto' lets the map fill the axes
        # without matplotlib letterboxing it (which causes excess whitespace).
        ax.set_aspect("auto")

        fig.subplots_adjust(left=0, right=1, bottom=0.18, top=1)

        # Text rendering — MapToPoster style (bottom of poster)
        scale_factor = min(fig_w, fig_h) / 12.0
        base_main = 60
        base_sub = 22
        base_coords = 14
        base_attr = 8

        title_text = custom_title if custom_title else city.upper()
        # Letter-space Latin text
        if all(ord(c) < 256 for c in title_text):
            spaced_title = "  ".join(title_text)
        else:
            spaced_title = title_text

        # Dynamic size adjustment for long names
        char_count = len(title_text)
        adjusted_main = base_main * scale_factor
        if char_count > 10:
            length_factor = 10 / char_count
            adjusted_main = max(adjusted_main * length_factor, 10 * scale_factor)

        ax.text(0.5, 0.14, spaced_title, transform=ax.transAxes,
                color=primary_color, ha="center", va="center",
                fontsize=adjusted_main, fontweight="bold", fontfamily="monospace", zorder=11)

        country_text = country.upper() if country else ""
        if country_text:
            ax.text(0.5, 0.10, country_text, transform=ax.transAxes,
                    color=primary_color, ha="center", va="center",
                    fontsize=base_sub * scale_factor, fontfamily="monospace", zorder=11)

        # Coordinates
        lat_dir = "N" if lat >= 0 else "S"
        lng_dir = "E" if lng >= 0 else "W"
        coords_text = f"{abs(lat):.4f}° {lat_dir}, {abs(lng):.4f}° {lng_dir}"
        ax.text(0.5, 0.07, coords_text, transform=ax.transAxes,
                color=primary_color, alpha=0.7, ha="center", va="center",
                fontsize=base_coords * scale_factor, fontfamily="monospace", zorder=11)

        # Attribution
        ax.text(0.98, 0.02, "© OpenStreetMap contributors", transform=ax.transAxes,
                color=primary_color, alpha=0.5, ha="right", va="bottom",
                fontsize=base_attr * scale_factor, fontfamily="monospace", zorder=11)

        # Save to file
        filename = f"{city.lower().replace(' ', '_')}_{theme}_{uuid.uuid4().hex[:8]}.png"
        output_path = OUTPUT_DIR / filename
        fig.savefig(
            str(output_path),
            dpi=preset["dpi"],
            facecolor=bg_color,
        )
        plt.close(fig)
    except ValueError:
        raise
    except MemoryError:
        raise ValueError("Area too large — try a smaller distance")
    except Exception:
        raise ValueError("Poster rendering failed — please try again")
    logger.info("Rendering took %.2fs", time.monotonic() - t2)

    logger.info("Poster saved to %s", output_path)
    return str(output_path)
