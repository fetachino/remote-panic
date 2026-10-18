"""Generate the two required webOS launcher icons. Requires Pillow."""

from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets"
OUT.mkdir(exist_ok=True)


def icon(size: int) -> None:
    scale = 4
    s = size * scale
    im = Image.new("RGB", (s, s), "#0c1020")
    draw = ImageDraw.Draw(im)
    draw.rounded_rectangle((s * .07, s * .07, s * .93, s * .93), radius=s * .18,
                           fill="#16223a", outline="#d9ff42", width=round(s * .045))
    draw.polygon([(s * .24, s * .23), (s * .57, s * .23), (s * .45, s * .48),
                  (s * .7, s * .48), (s * .34, s * .82), (s * .42, s * .55),
                  (s * .22, s * .55)], fill="#d9ff42")
    draw.ellipse((s * .68, s * .17, s * .84, s * .33), fill="#ff6b63")
    im.resize((size, size), Image.Resampling.LANCZOS).save(OUT / f"icon-{size}.png")


if __name__ == "__main__":
    for dimension in (80, 130):
        icon(dimension)
