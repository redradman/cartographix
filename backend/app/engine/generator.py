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

OUTPUT_FORMATS = {
    "square": (12, 12),
    "landscape": (16, 9),
    "portrait": (8, 12),
    "phone": (6, 13),
    "story": (9, 16),
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
    output_format: str = "square",
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

    # Fetch street network — use "drive" for large areas (faster), "all" for small areas (more detail)
    effective_distance = min(distance, 20000)
    network_type = "drive" if effective_distance > 5000 else "all"
    logger.info("Fetching street network for %s (dist=%d, type=%s)", query, effective_distance, network_type)
    _set_stage("fetching_streets")
    t1 = time.monotonic()
    try:
        graph = ox.graph_from_point(
            (lat, lng),
            dist=effective_distance,
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

        figsize = OUTPUT_FORMATS.get(output_format, OUTPUT_FORMATS["square"])
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

        # Add city name label
        title_text = custom_title if custom_title else city.upper()
        ax.set_title(
            title_text,
            fontsize=28,
            fontweight="bold",
            color=primary_color,
            pad=20,
            fontfamily="sans-serif",
        )

        ax.margins(0.02)
        ax.axis("off")

        # Enforce the desired aspect ratio by adjusting axis limits
        # Without this, bbox_inches="tight" would crop to the graph's
        # natural (roughly square) extent, ignoring the figsize.
        fig_w, fig_h = figsize
        target_ratio = fig_w / fig_h  # width / height
        x_min, x_max = ax.get_xlim()
        y_min, y_max = ax.get_ylim()
        data_w = x_max - x_min
        data_h = y_max - y_min
        data_ratio = data_w / data_h

        if data_ratio < target_ratio:
            # Need wider x — expand x limits
            new_w = data_h * target_ratio
            x_center = (x_min + x_max) / 2
            ax.set_xlim(x_center - new_w / 2, x_center + new_w / 2)
        else:
            # Need taller y — expand y limits
            new_h = data_w / target_ratio
            y_center = (y_min + y_max) / 2
            ax.set_ylim(y_center - new_h / 2, y_center + new_h / 2)

        # Make axes fill the figure, leaving only top space for the title
        fig.subplots_adjust(left=0.02, right=0.98, bottom=0.02, top=0.92)

        # Save to file
        filename = f"{city.lower().replace(' ', '_')}_{theme}_{uuid.uuid4().hex[:8]}.png"
        output_path = OUTPUT_DIR / filename
        fig.savefig(
            str(output_path),
            dpi=250 if output_format in ("portrait", "phone", "story") else 200,
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
