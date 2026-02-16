from typing import Dict, List

THEMES: Dict[str, Dict] = {
    "default": {
        "name": "Default",
        "description": "Clean and modern with a pop of coral red",
        "preview_colors": ["#FFFFFF", "#333333", "#999999", "#FF6B6B"],
    },
    "classic": {
        "name": "Classic",
        "description": "Warm beige tones with earthy accents",
        "preview_colors": ["#F5F5DC", "#2F2F2F", "#8B8B83", "#CD853F"],
    },
    "midnight": {
        "name": "Midnight",
        "description": "Deep dark blues for a nighttime feel",
        "preview_colors": ["#0D1117", "#1A1A2E", "#16213E", "#0F3460"],
    },
    "ocean": {
        "name": "Ocean",
        "description": "Deep sea blues with teal highlights",
        "preview_colors": ["#001529", "#003566", "#006D77", "#83C5BE"],
    },
    "forest": {
        "name": "Forest",
        "description": "Rich greens inspired by dense woodlands",
        "preview_colors": ["#1A1C16", "#2D3A25", "#4A6741", "#8FBC8F"],
    },
    "sunset": {
        "name": "Sunset",
        "description": "Warm oranges and yellows over a purple sky",
        "preview_colors": ["#1A0A2E", "#FF6B35", "#FF9F1C", "#FCE762"],
    },
    "neon": {
        "name": "Neon",
        "description": "Electric neon colors on a dark background",
        "preview_colors": ["#0A0A0A", "#FF00FF", "#00FFFF", "#39FF14"],
    },
    "pastel": {
        "name": "Pastel",
        "description": "Soft pastel pinks and lavenders",
        "preview_colors": ["#FFF0F5", "#FFB6C1", "#DDA0DD", "#B0E0E6"],
    },
    "monochrome": {
        "name": "Monochrome",
        "description": "Timeless black and white with grey tones",
        "preview_colors": ["#FFFFFF", "#000000", "#404040", "#808080"],
    },
    "vintage": {
        "name": "Vintage",
        "description": "Aged parchment with warm brown tones",
        "preview_colors": ["#F4E4C1", "#5C4033", "#8B6914", "#CD9B1D"],
    },
    "arctic": {
        "name": "Arctic",
        "description": "Icy blues and cool steel tones",
        "preview_colors": ["#F0F8FF", "#B0C4DE", "#87CEEB", "#4682B4"],
    },
    "desert": {
        "name": "Desert",
        "description": "Sandy warmth with terracotta accents",
        "preview_colors": ["#F5DEB3", "#D2691E", "#DEB887", "#CD853F"],
    },
    "cyberpunk": {
        "name": "Cyberpunk",
        "description": "Futuristic neon pink and cyan on dark violet",
        "preview_colors": ["#0D0221", "#FF2A6D", "#05D9E8", "#D1F7FF"],
    },
    "watercolor": {
        "name": "Watercolor",
        "description": "Soft muted greens on linen",
        "preview_colors": ["#FAF0E6", "#6B8E8E", "#9DB5B2", "#C4D7D1"],
    },
    "blueprint": {
        "name": "Blueprint",
        "description": "Technical blue with white line work",
        "preview_colors": ["#003082", "#4A90D9", "#7EC8E3", "#FFFFFF"],
    },
    "autumn": {
        "name": "Autumn",
        "description": "Rich fall colors with golden highlights",
        "preview_colors": ["#2D1B00", "#D2691E", "#FF8C00", "#FFD700"],
    },
    "minimal": {
        "name": "Minimal",
        "description": "Subtle greys for an understated look",
        "preview_colors": ["#FAFAFA", "#E0E0E0", "#BDBDBD", "#9E9E9E"],
    },
}


def get_theme_colors(theme_id: str) -> List[str]:
    """Return [background, primary_street, secondary_street, accent] for a theme."""
    theme = THEMES.get(theme_id)
    if not theme:
        raise ValueError(f"Unknown theme: {theme_id}")
    return theme["preview_colors"]
