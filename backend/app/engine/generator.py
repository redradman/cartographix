import logging
import os
import uuid
from pathlib import Path
from typing import List

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import osmnx as ox

from app.models.themes import get_theme_colors

logger = logging.getLogger(__name__)

OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)


def generate_poster(
    city: str,
    country: str,
    theme: str = "default",
    distance: int = 3000,
) -> str:
    """Generate a styled city map poster and return the path to the PNG file.

    Uses OSMnx to fetch the street network via Nominatim geocoding,
    then renders it with matplotlib using theme colors.
    """
    colors = get_theme_colors(theme)
    bg_color, primary_color, secondary_color, accent_color = colors

    # Geocode the location
    query = f"{city}, {country}"
    logger.info("Geocoding: %s", query)
    point = ox.geocode(query)
    lat, lng = point

    # Fetch street network
    logger.info("Fetching street network for %s (dist=%d)", query, distance)
    graph = ox.graph_from_point(
        (lat, lng),
        dist=distance,
        network_type="drive",
        simplify=True,
    )

    # Classify edges by road type for styling
    _, edges = ox.graph_to_gdfs(graph)

    fig, ax = plt.subplots(figsize=(12, 12), facecolor=bg_color)
    ax.set_facecolor(bg_color)

    # Determine line widths and colors based on highway type
    edge_colors = []
    edge_widths = []
    for _, row in edges.iterrows():
        highway = row.get("highway", "")
        if isinstance(highway, list):
            highway = highway[0] if highway else ""

        if highway in ("motorway", "trunk", "primary"):
            edge_colors.append(accent_color)
            edge_widths.append(2.5)
        elif highway in ("secondary", "tertiary"):
            edge_colors.append(primary_color)
            edge_widths.append(1.5)
        else:
            edge_colors.append(secondary_color)
            edge_widths.append(0.8)

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
    ax.set_title(
        city.upper(),
        fontsize=28,
        fontweight="bold",
        color=primary_color,
        pad=20,
        fontfamily="sans-serif",
    )

    ax.margins(0.02)
    ax.axis("off")

    # Save to file
    filename = f"{city.lower().replace(' ', '_')}_{theme}_{uuid.uuid4().hex[:8]}.png"
    output_path = OUTPUT_DIR / filename
    fig.savefig(
        str(output_path),
        dpi=200,
        bbox_inches="tight",
        facecolor=bg_color,
        pad_inches=0.5,
    )
    plt.close(fig)

    logger.info("Poster saved to %s", output_path)
    return str(output_path)
