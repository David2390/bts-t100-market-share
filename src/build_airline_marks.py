"""Build static airline PNG marks and chart colors for the dashboard.

Run manually after installing Pillow and the main project requirements. The
third-party logo source is pinned; generic source placeholders become clearly
labelled operator-code badges. Airline marks remain their owners' trademarks.
"""

from collections import Counter
from colorsys import rgb_to_hsv
from io import BytesIO
from pathlib import Path
import hashlib
import json
import urllib.error
import urllib.request

from PIL import Image, ImageDraw, ImageFont
import pandas as pd


SOURCE_REV = "8c5f1ae3d25538bd1b649a7ad85b902528c612b6"
SOURCE = "https://cdn.jsdelivr.net/gh/spydogenesis/airlines-logo@" + SOURCE_REV + "/airlines-logo/200x200_v2/"
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "dashboard/assets/airlines"

# Recognizable primary brand hues, adjusted to stay legible against white.
COLORS = {
    "AA": "#0D65A8", "AC": "#C51B31", "AF": "#17489A", "AM": "#09235A",
    "AS": "#07537B", "AV": "#D51B36", "B6": "#123C75", "BA": "#274878",
    "DL": "#C41230", "F9": "#007C5B", "G4": "#E87B13", "HA": "#5B2A80",
    "LA": "#562580", "LH": "#082D6A", "MQ": "#1A5B9B", "MX": "#153653",
    "NK": "#B89A00", "OO": "#1E5A91", "QF": "#C3182D", "QX": "#0D547D",
    "SY": "#D5660B", "UA": "#0755A2", "VB": "#4B9B1B", "VS": "#C51738",
    "WN": "#304BA0", "WS": "#008C92", "XP": "#5F239B", "YX": "#375F7A",
    "9E": "#B51D3A", "9K": "#0A65A2", "G7": "#225A85", "OH": "#245B93",
    "PT": "#285E91", "ZW": "#24547B",
}


def fetch(code):
    if len(code) != 2:
        return None
    try:
        with urllib.request.urlopen(SOURCE + code + ".png", timeout=20) as response:
            payload = response.read()
        if not payload.startswith(b"\x89PNG\r\n\x1a\n"):
            return None
        return payload
    except (urllib.error.URLError, TimeoutError):
        return None


def fallback(code, color):
    im = Image.new("RGBA", (200, 200), (255, 255, 255, 0))
    draw = ImageDraw.Draw(im)
    draw.rounded_rectangle((7, 7, 193, 193), radius=42, fill=color)
    font_path = Path("C:/Windows/Fonts/arialbd.ttf")
    font = ImageFont.truetype(str(font_path), 76 if len(code) < 3 else 58) if font_path.exists() else ImageFont.load_default()
    draw.text((100, 96), code, anchor="mm", font=font, fill="white")
    return im


def image_color(im):
    # Pick the most prevalent saturated hue from the logo, then use a
    # consistent dark tone so bars remain visible against the white canvas.
    rgba = im.convert("RGBA")
    rgba.thumbnail((100, 100))
    hues = Counter()
    for r, g, b, a in rgba.getdata():
        h, s, v = rgb_to_hsv(r / 255, g / 255, b / 255)
        if a > 170 and s > 0.3 and 0.18 < v < 0.98:
            hues[round(h * 24) % 24] += s * a / 255
    if not hues:
        return "#46536A"
    # HSL-like bright pigments are darkened with black for accessible charts.
    from colorsys import hsv_to_rgb
    h = hues.most_common(1)[0][0] / 24
    r, g, b = hsv_to_rgb(h, 0.74, 0.66)
    return "#%02X%02X%02X" % (round(r * 255), round(g * 255), round(b * 255))


def main():
    airlines = pd.read_parquet(ROOT / "data/parquet/gold/dim_airline.parquet")
    OUT.mkdir(parents=True, exist_ok=True)
    source_marks = {code: fetch(code) for code in airlines.airline_code.astype(str)}
    # This exact repeated gray tail is the upstream library's missing-logo mark.
    placeholder = hashlib.sha256(source_marks["OO"]).hexdigest() if source_marks.get("OO") else None
    brands = {}
    for code in sorted(airlines.airline_code.astype(str)):
        payload = source_marks[code]
        real = bool(payload) and hashlib.sha256(payload).hexdigest() != placeholder
        source_image = Image.open(BytesIO(payload)).convert("RGBA") if real else None
        color = COLORS.get(code) or (image_color(source_image) if real else "#46536A")
        im = source_image if real else fallback(code, color)
        im.save(OUT / (code + ".png"), optimize=True)
        brands[code] = {"color": color, "kind": "logo" if real else "operator badge"}
    (ROOT / "dashboard/brands.js").write_text(
        "// Curated or logo-derived airline hues. See docs/design-and-marks.md.\n"
        + "const AIRLINE_BRANDS = " + json.dumps(brands, sort_keys=True, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    print("Built", len(brands), "PNG marks;", sum(v["kind"] == "logo" for v in brands.values()), "logos.")


if __name__ == "__main__":
    main()
