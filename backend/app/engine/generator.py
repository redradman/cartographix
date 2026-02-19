import logging
import re
import time
import uuid
from pathlib import Path
from typing import Callable, List, Optional

from collections import OrderedDict

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
import matplotlib.font_manager as fm
import numpy as np
import osmnx as ox
from shapely.geometry import Point

from app.models.themes import get_render_colors

logger = logging.getLogger(__name__)

OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

FONTS_DIR = Path(__file__).resolve().parent.parent.parent / "fonts"

RESOLUTION_PRESETS = {
    "instagram": {"name": "Instagram Post", "figsize": (12, 12), "dpi": 300, "pixels": "1080×1080"},
    "mobile_wallpaper": {"name": "Mobile Wallpaper", "figsize": (10, 16), "dpi": 300, "pixels": "1080×1920"},
    "hd_wallpaper": {"name": "HD Wallpaper", "figsize": (16, 10), "dpi": 300, "pixels": "1920×1080"},
    "4k_wallpaper": {"name": "4K Wallpaper", "figsize": (16, 9), "dpi": 300, "pixels": "3840×2160"},
    "a4_print": {"name": "A4 Print", "figsize": (12, 16), "dpi": 300, "pixels": "2480×3508"},
}

# Configure OSMnx settings for reliability
ox.settings.timeout = 180
ox.settings.use_cache = True
ox.settings.log_console = True
ox.settings.max_query_area_size = 50 * 1000 * 50 * 1000  # 50km × 50km
ox.settings.overpass_rate_limit = False

# Overpass mirrors — tried in order; fall back on 504/timeout
_OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]

def _call_with_overpass_fallback(fn, *args, **kwargs):
    """Try fn() across multiple Overpass endpoints, falling back on failure."""
    last_error = None
    for endpoint in _OVERPASS_ENDPOINTS:
        ox.settings.overpass_url = endpoint
        try:
            return fn(*args, **kwargs)
        except Exception as e:
            last_error = e
            logger.warning("Overpass endpoint %s failed: %s — trying next", endpoint, e)
    # All endpoints failed — raise the last error
    raise last_error  # type: ignore[misc]


# Module-level geocoding cache: query string -> (lat, lng), LRU via OrderedDict
_GEOCODE_CACHE_MAX = 1024
_geocode_cache: OrderedDict[str, tuple[float, float]] = OrderedDict()


def _load_font(name: str) -> Optional[fm.FontProperties]:
    """Load a Roboto font variant, returning None if not found."""
    path = FONTS_DIR / name
    if path.exists():
        return fm.FontProperties(fname=str(path))
    return None


# Pre-load fonts at module level
_font_bold = _load_font("Roboto-Bold.ttf")
_font_regular = _load_font("Roboto-Regular.ttf")
_font_light = _load_font("Roboto-Light.ttf")

if not _font_bold:
    logger.warning("Roboto fonts not found at %s — falling back to monospace", FONTS_DIR)


def _make_font(font_file: Optional[fm.FontProperties], size: float) -> fm.FontProperties:
    """Create a sized FontProperties from a base font, falling back to monospace."""
    if font_file:
        return fm.FontProperties(fname=font_file.get_file(), size=size)
    return fm.FontProperties(family="monospace", size=size)


def _is_latin(text: str) -> bool:
    """Check if text is predominantly Latin script."""
    if not text:
        return True
    return all(ord(c) < 0x250 or not c.isalpha() for c in text)


def _get_edge_colors(g, theme_colors: dict) -> list:
    """Get per-edge colors based on road classification."""
    colors = []
    for _u, _v, data in g.edges(data=True):
        highway = data.get("highway", "unclassified")
        if isinstance(highway, list):
            highway = highway[0] if highway else "unclassified"
        if highway in ("motorway", "motorway_link"):
            colors.append(theme_colors["road_motorway"])
        elif highway in ("trunk", "trunk_link", "primary", "primary_link"):
            colors.append(theme_colors["road_primary"])
        elif highway in ("secondary", "secondary_link"):
            colors.append(theme_colors["road_secondary"])
        elif highway in ("tertiary", "tertiary_link"):
            colors.append(theme_colors["road_tertiary"])
        elif highway in ("residential", "living_street", "unclassified"):
            colors.append(theme_colors["road_residential"])
        else:
            colors.append(theme_colors["road_default"])
    return colors


def _get_edge_widths(g) -> list:
    """Get per-edge widths based on road classification."""
    widths = []
    for _u, _v, data in g.edges(data=True):
        highway = data.get("highway", "unclassified")
        if isinstance(highway, list):
            highway = highway[0] if highway else "unclassified"
        if highway in ("motorway", "motorway_link"):
            widths.append(1.2)
        elif highway in ("trunk", "trunk_link", "primary", "primary_link"):
            widths.append(1.0)
        elif highway in ("secondary", "secondary_link"):
            widths.append(0.8)
        elif highway in ("tertiary", "tertiary_link"):
            widths.append(0.6)
        else:
            widths.append(0.4)
    return widths


def _create_gradient_fade(ax: plt.Axes, color: str, location: str = "bottom", zorder: int = 10) -> None:
    """Render gradient fade using data coordinates (MapToPoster approach)."""
    vals = np.linspace(0, 1, 256).reshape(-1, 1)
    gradient = np.hstack((vals, vals))

    rgb = mcolors.to_rgb(color)
    my_colors = np.zeros((256, 4))
    my_colors[:, 0] = rgb[0]
    my_colors[:, 1] = rgb[1]
    my_colors[:, 2] = rgb[2]

    if location == "bottom":
        my_colors[:, 3] = np.linspace(1, 0, 256)
        extent_y_start = 0.0
        extent_y_end = 0.25
    else:
        my_colors[:, 3] = np.linspace(0, 1, 256)
        extent_y_start = 0.75
        extent_y_end = 1.0

    custom_cmap = mcolors.ListedColormap(my_colors)

    xlim = ax.get_xlim()
    ylim = ax.get_ylim()
    y_range = ylim[1] - ylim[0]

    y_bottom = ylim[0] + y_range * extent_y_start
    y_top = ylim[0] + y_range * extent_y_end

    ax.imshow(
        gradient,
        extent=[xlim[0], xlim[1], y_bottom, y_top],
        aspect="auto",
        cmap=custom_cmap,
        zorder=zorder,
        origin="lower",
    )


def _get_crop_limits(g_proj, center_lat_lon: tuple, fig, dist: int) -> tuple:
    """Compute crop limits in projected coordinates, centered on the city."""
    lat, lon = center_lat_lon
    center = ox.projection.project_geometry(
        Point(lon, lat),
        crs="EPSG:4326",
        to_crs=g_proj.graph["crs"],
    )[0]
    center_x, center_y = center.x, center.y

    fig_width, fig_height = fig.get_size_inches()
    aspect = fig_width / fig_height

    half_x = dist
    half_y = dist
    if aspect > 1:
        half_y = half_x / aspect
    else:
        half_x = half_y * aspect

    return (
        (center_x - half_x, center_x + half_x),
        (center_y - half_y, center_y + half_y),
    )


def generate_poster(
    city: str,
    country: str,
    theme: str = "default",
    distance: int = 3000,
    output_format: str = "instagram",
    custom_title: str = "",
    landmarks: Optional[List[dict]] = None,
    on_stage: Optional[Callable[[str], None]] = None,
) -> str:
    """Generate a styled city map poster and return the path to the PNG file."""
    def _set_stage(stage: str) -> None:
        if on_stage:
            on_stage(stage)
        logger.info("Stage: %s", stage)

    if distance > 30000:
        logger.warning("Large distance requested (%d m) for %s — may be slow or fail", distance, city)

    rc = get_render_colors(theme)

    # Geocode the location (with cache for repeat cities)
    query = f"{city}, {country}" if country else city
    logger.info("Geocoding: %s", query)
    _set_stage("geocoding")
    t0 = time.monotonic()
    if query in _geocode_cache:
        _geocode_cache.move_to_end(query)
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
        if len(_geocode_cache) > _GEOCODE_CACHE_MAX:
            _geocode_cache.popitem(last=False)
        logger.info("Geocoded %s to (%f, %f)", query, lat, lng)
    logger.info("Geocoding took %.2fs", time.monotonic() - t0)

    # Fetch data — use from_point with compensated distance (like MapToPoster)
    preset = RESOLUTION_PRESETS.get(output_format, RESOLUTION_PRESETS["instagram"])
    figsize = preset["figsize"]
    fig_w, fig_h = figsize

    effective_distance = min(distance, 35000)
    compensated_dist = int(effective_distance * (max(fig_h, fig_w) / min(fig_h, fig_w)) / 4)

    center_point = (lat, lng)

    logger.info(
        "Fetching street network for %s (dist=%d, compensated=%d, format=%s)",
        query, effective_distance, compensated_dist, output_format,
    )
    _set_stage("fetching_streets")
    t1 = time.monotonic()
    try:
        graph = _call_with_overpass_fallback(
            ox.graph_from_point,
            center_point,
            dist=compensated_dist,
            dist_type="bbox",
            network_type="all",
            truncate_by_edge=True,
        )
    except MemoryError:
        raise ValueError("Area too large — try a smaller distance")
    except Exception as e:
        logger.error("Street fetch failed: %s", e)
        raise ValueError("Could not fetch street data — try a smaller distance or different city")
    logger.info("Street fetch took %.2fs", time.monotonic() - t1)

    # Fetch water and parks layers
    _set_stage("fetching_features")
    t_feat = time.monotonic()

    water_gdf = None
    parks_gdf = None
    try:
        water_gdf = _call_with_overpass_fallback(
            ox.features_from_point,
            center_point,
            tags={"natural": ["water", "bay", "strait"], "waterway": "riverbank"},
            dist=compensated_dist,
        )
        water_gdf = water_gdf[water_gdf.geometry.type.isin(["Polygon", "MultiPolygon"])]
        logger.info("Fetched %d water features", len(water_gdf))
    except Exception as e:
        logger.warning("Water fetch failed (non-fatal): %s", e)

    try:
        parks_gdf = _call_with_overpass_fallback(
            ox.features_from_point,
            center_point,
            tags={"leisure": "park", "landuse": "grass"},
            dist=compensated_dist,
        )
        parks_gdf = parks_gdf[parks_gdf.geometry.type.isin(["Polygon", "MultiPolygon"])]
        logger.info("Fetched %d park features", len(parks_gdf))
    except Exception as e:
        logger.warning("Parks fetch failed (non-fatal): %s", e)

    logger.info("Feature fetch took %.2fs", time.monotonic() - t_feat)

    # Render poster
    _set_stage("rendering")
    t2 = time.monotonic()
    try:
        fig, ax = plt.subplots(figsize=figsize, facecolor=rc["bg"])
        ax.set_facecolor(rc["bg"])
        ax.set_position((0.0, 0.0, 1.0, 1.0))

        # Project graph to metric CRS
        g_proj = ox.project_graph(graph)

        # Layer 1: Water polygons (projected to match graph CRS)
        if water_gdf is not None and len(water_gdf) > 0:
            try:
                water_proj = ox.projection.project_gdf(water_gdf)
            except Exception:
                water_proj = water_gdf.to_crs(g_proj.graph["crs"])
            water_proj.plot(ax=ax, facecolor=rc["water"], edgecolor="none", zorder=0.5)

        # Layer 1b: Park polygons (projected)
        if parks_gdf is not None and len(parks_gdf) > 0:
            try:
                parks_proj = ox.projection.project_gdf(parks_gdf)
            except Exception:
                parks_proj = parks_gdf.to_crs(g_proj.graph["crs"])
            parks_proj.plot(ax=ax, facecolor=rc["parks"], edgecolor="none", zorder=0.8)

        # Layer 2: Roads via ox.plot_graph (projected)
        edge_colors = _get_edge_colors(g_proj, rc)
        edge_widths = _get_edge_widths(g_proj)

        crop_xlim, crop_ylim = _get_crop_limits(g_proj, center_point, fig, compensated_dist)

        ox.plot_graph(
            g_proj,
            ax=ax,
            bgcolor=rc["bg"],
            node_size=0,
            edge_color=edge_colors,
            edge_linewidth=edge_widths,
            show=False,
            close=False,
        )

        ax.set_aspect("equal", adjustable="box")
        ax.set_xlim(crop_xlim)
        ax.set_ylim(crop_ylim)

        # Layer 3: Gradient fades (uses data coordinates, not transAxes)
        _create_gradient_fade(ax, rc["gradient_color"], location="bottom", zorder=10)
        _create_gradient_fade(ax, rc["gradient_color"], location="top", zorder=10)

        # Render landmark pins — project lat/lng to the graph's CRS
        if landmarks:
            for lm in landmarks:
                proj_point = ox.projection.project_geometry(
                    Point(lm["lon"], lm["lat"]),
                    crs="EPSG:4326",
                    to_crs=g_proj.graph["crs"],
                )[0]
                ax.plot(
                    proj_point.x, proj_point.y, "o",
                    color=rc["road_motorway"],
                    markersize=8,
                    markeredgecolor=rc["bg"],
                    markeredgewidth=1.5,
                    zorder=10,
                    clip_on=True,
                )

        # Typography
        scale_factor = min(fig_w, fig_h) / 12.0
        text_color = rc["text"]
        base_main = 60
        base_sub = 22
        base_coords = 14
        base_attr = 8

        font_sub = _make_font(_font_light, base_sub * scale_factor)
        font_coords = _make_font(_font_regular, base_coords * scale_factor)
        font_attr = _make_font(_font_light, base_attr * scale_factor)

        # City name formatting
        display_city = custom_title if custom_title else city
        if _is_latin(display_city):
            spaced_city = "  ".join(list(display_city.upper()))
        else:
            spaced_city = display_city

        # Dynamic font size for long names
        adjusted_main = base_main * scale_factor
        char_count = len(display_city)
        if char_count > 10:
            length_factor = 10 / char_count
            adjusted_main = max(adjusted_main * length_factor, 10 * scale_factor)

        font_main = _make_font(_font_bold, adjusted_main)

        # City name at y=0.14
        ax.text(0.5, 0.14, spaced_city, transform=ax.transAxes,
                color=text_color, ha="center", fontproperties=font_main, zorder=11)

        # Separator line
        ax.plot([0.4, 0.6], [0.125, 0.125], transform=ax.transAxes,
                color=text_color, linewidth=1 * scale_factor, zorder=11)

        # Country name at y=0.10
        country_text = country.upper() if country else ""
        if country_text:
            ax.text(0.5, 0.10, country_text, transform=ax.transAxes,
                    color=text_color, ha="center", fontproperties=font_sub, zorder=11)

        # Coordinates at y=0.07
        coords = f"{lat:.4f}° N / {lng:.4f}° E" if lat >= 0 else f"{abs(lat):.4f}° S / {lng:.4f}° E"
        if lng < 0:
            coords = coords.replace("E", "W")
        ax.text(0.5, 0.07, coords, transform=ax.transAxes,
                color=text_color, alpha=0.7, ha="center", fontproperties=font_coords, zorder=11)

        # Attribution
        ax.text(0.98, 0.02, "© OpenStreetMap contributors", transform=ax.transAxes,
                color=text_color, alpha=0.5, ha="right", va="bottom",
                fontproperties=font_attr, zorder=11)

        # Save to file
        safe_city = re.sub(r"[^a-zA-Z0-9_-]", "_", city.lower().strip())[:80]
        filename = f"{safe_city}_{theme}_{uuid.uuid4().hex[:8]}.png"
        output_path = OUTPUT_DIR / filename
        fig.savefig(
            str(output_path),
            dpi=preset["dpi"],
            facecolor=rc["bg"],
            bbox_inches="tight",
            pad_inches=0.05,
        )
        plt.close(fig)
    except ValueError:
        raise
    except MemoryError:
        raise ValueError("Area too large — try a smaller distance")
    except Exception as e:
        logger.exception("Rendering failed: %s", e)
        raise ValueError("Poster rendering failed — please try again")
    logger.info("Rendering took %.2fs", time.monotonic() - t2)

    logger.info("Poster saved to %s", output_path)
    return str(output_path)
