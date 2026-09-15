"""Translate Astra's title painting into the SNES title's layers (src/snes/titleart.mjs).

The painting stays where it is (it is private); only the reduced SNES art is written. It is cut to
the 256-wide frame with its storm sky carried up into a band for the logo, then split three ways:

  back   BG1: sky, city, tower and plaza, 8x8 tiles each picking one of 7 palettes, plus an eighth
         palette kept for the tower crown so its glow can breathe by palette writes alone
  front  OBJ: Ward and Mercer and the notice, cut by hand-placed outlines, 4 sprite palettes,
         colour 0 clear, despeckled
  logo   the painted FINAL NOTICE lifted off the sky as one 15-colour Mode 7 texture

    py -3.10 tools/titleart.py <title-screen.png> [--preview <dir>]
"""
import argparse
import json
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from digitize import BAYER, kmeans

W, H, TILE = 256, 224, 8
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# The painting's columns kept, and where its top lands on screen: the band above is carried sky.
CROP_X0, CROP_X1 = 220, 1620
SCALE = W / (CROP_X1 - CROP_X0)
TOP = H - round(941 * SCALE)
CROWN = (92, TOP - 24, 148, TOP + 56)
# Outlines in painting pixels: Ward (left), the notice, Mercer (right).
FIGURES = [
    [(566, 22), (640, 6), (700, 28), (706, 110), (690, 160), (738, 192), (772, 300), (800, 430), (812, 474),
     (790, 520), (748, 540), (726, 640), (722, 780), (660, 941), (320, 941), (318, 780), (330, 600),
     (370, 400), (420, 262), (520, 176), (548, 130), (540, 70)],
    [(744, 452), (832, 424), (960, 462), (948, 492), (900, 530), (802, 518), (756, 506)],
    [(1040, 150), (1110, 118), (1196, 138), (1222, 200), (1210, 250), (1300, 236), (1392, 298), (1446, 392),
     (1480, 540), (1440, 640), (1470, 720), (1520, 941), (1112, 941), (1140, 760), (1140, 610), (1100, 560),
     (1010, 540), (938, 520), (924, 486), (1004, 460), (1060, 420), (1086, 330), (1060, 262), (1040, 210)],
]
LOGO_BOX = (18, 18, 545, 305)
LOGO_W = 112


def to5(img):
    return np.asarray(img, dtype=np.float64) * 31 / 255


def logo_mask(a):
    lum = a.mean(-1)
    return (lum > 105) | ((a[..., 0] > 110) & (a[..., 0] > a[..., 2] + 25))


def without_logo(painting):
    """The painting with its logo lifted: those pixels refilled from the sky around them."""
    x0, y0, x1, y1 = LOGO_BOX
    a = np.asarray(painting, dtype=np.float64).copy()
    box = a[y0:y1, x0:x1]
    hole = np.asarray(Image.fromarray((logo_mask(box) * 255).astype("uint8")).filter(ImageFilter.MaxFilter(9))) > 0
    fill = box.copy()
    known = ~hole
    for _ in range(60):
        if known.all():
            break
        acc = np.zeros_like(fill)
        cnt = np.zeros(hole.shape)
        for s, ax in ((3, 0), (-3, 0), (3, 1), (-3, 1)):
            acc += np.roll(fill * known[..., None], s, ax)
            cnt += np.roll(known, s, ax)
        grow = ~known & (cnt > 0)
        fill[grow] = acc[grow] / cnt[grow][:, None]
        known = known | grow
    a[y0:y1, x0:x1] = fill
    return Image.fromarray(a.astype("uint8"), "RGB")


def frame(painting):
    crop = without_logo(painting).crop((CROP_X0, 0, CROP_X1, 941)).resize((W, H - TOP), Image.LANCZOS)
    body = to5(crop)
    band = np.zeros((TOP, W, 3))
    edge = body[:6].mean(0)
    yy, xx = np.mgrid[0:TOP, 0:W]
    fall = 0.35 + 0.65 * (yy / TOP)
    cloud = 0.85 + 0.15 * np.sin(xx / 9.0 + np.sin(yy / 5.0) * 1.7) * np.cos(yy / 7.0 - xx / 23.0)
    band = edge[None] * (fall * cloud)[..., None]
    d = np.hypot(xx - 120, (yy - TOP) * 1.4)
    band += np.clip(1 - d / 26, 0, 1)[..., None] ** 2 * np.array([14, 11, 5])
    rgb = np.clip(np.concatenate([band, body]), 0, 31)
    mask = Image.new("L", (W, H), 0)
    draw = ImageDraw.Draw(mask)
    for poly in FIGURES:
        draw.polygon([((x - CROP_X0) * SCALE, TOP + y * SCALE) for x, y in poly], fill=255)
    return rgb, np.asarray(mask) > 127


def tiles_of(a):
    ty, tx = a.shape[0] // TILE, a.shape[1] // TILE
    return a.reshape(ty, TILE, tx, TILE, -1).transpose(0, 2, 1, 3, 4).reshape(ty * tx, TILE * TILE, -1)


def fit(rgb, weight, count, rng, fixed=None):
    """Palettes [count, 15, 3] and one choice a tile, fitted to the pixels whose weight is set."""
    tiles, wt = tiles_of(rgb), tiles_of(weight[..., None].astype(float))[..., 0]
    live = wt.sum(1) > 0
    feature = np.concatenate([tiles.mean(1), tiles.std(1)], 1)
    choice = ((feature[:, None] - kmeans(feature[live], count, rng)[None]) ** 2).sum(-1).argmin(1)
    for _ in range(6):
        palettes = []
        for p in range(count):
            sel = (choice == p) & live
            px = tiles[sel].reshape(-1, 3)[wt[sel].reshape(-1) > 0] if sel.any() else tiles[live].reshape(-1, 3)
            cols = np.clip(kmeans(px, 15, rng).round(), 0, 31)
            palettes.append(np.concatenate([cols, np.repeat(cols[-1:], 15 - len(cols), 0)]))
        palettes = np.array(palettes)
        err = np.array([((((tiles[:, :, None] - pal[None, None]) ** 2).sum(-1).min(-1)) * wt).sum(1) for pal in palettes])
        choice = err.argmin(0)
    return palettes.astype(int), choice


def index(rgb, palettes, choice, dither):
    yy, xx = np.mgrid[0:H, 0:W]
    lit = rgb + BAYER[yy % 4, xx % 4][..., None] * dither * 2
    pal = palettes[choice.reshape(H // TILE, W // TILE)[yy // TILE, xx // TILE]]
    return ((lit[:, :, None] - pal) ** 2).sum(-1).argmin(-1) + 1, pal


def despeckle(idx, mask):
    out = idx.copy()
    n = [np.roll(idx, s, a) for s, a in ((1, 0), (-1, 0), (1, 1), (-1, 1))]
    lone = (n[0] == n[1]) & (n[1] == n[2]) & (n[2] == n[3]) & (idx != n[0])
    out[lone & mask] = n[0][lone & mask]
    return out


def logo(painting, rng):
    box = painting.crop(LOGO_BOX)
    keep = logo_mask(np.asarray(box, dtype=np.float64))
    h = round(LOGO_W * box.height / box.width)
    small = to5(box.resize((LOGO_W, h), Image.LANCZOS))
    alpha = np.asarray(Image.fromarray((keep * 255).astype("uint8")).resize((LOGO_W, h), Image.BOX)) > 110
    ring = alpha.copy()
    for s, ax in ((1, 0), (-1, 0), (1, 1), (-1, 1)):
        ring |= np.roll(alpha, s, ax)
    cols = np.clip(kmeans(small[alpha], 14, rng).round(), 0, 31).astype(int)
    cols = cols[np.argsort(-cols.sum(1))]
    lit = small + BAYER[np.mgrid[0:h, 0:LOGO_W][0] % 4, np.mgrid[0:h, 0:LOGO_W][1] % 4][..., None] * 1.2
    v = ((lit[:, :, None] - cols[None, None]) ** 2).sum(-1).argmin(-1) + 1
    v = np.where(alpha, v, np.where(ring, 15, 0))
    palette = cols.tolist() + [[1, 1, 4]]
    return {"w": LOGO_W, "h": h, "palette": palette, "pixels": ["".join("%x" % c for c in row) for row in v]}


def hexrows(a):
    return ["".join("%x" % c for c in row) for row in a]


def build(path, seed=2208):
    rng = np.random.default_rng(seed)
    painting = Image.open(path).convert("RGB")
    rgb, figures = frame(painting)
    crown = np.zeros((H, W), bool)
    x0, y0, x1, y1 = CROWN
    crown[max(0, y0):y1, x0:x1] = True
    crown_tiles = tiles_of(crown[..., None].astype(float))[..., 0].sum(1) > 0

    back_p, back_c = fit(rgb, ~np.repeat(crown_tiles, TILE * TILE).reshape(H // TILE, W // TILE, TILE, TILE).transpose(0, 2, 1, 3).reshape(H, W), 7, rng)
    glow_p, _ = fit(rgb, crown, 1, rng)
    back_c = np.where(crown_tiles, 7, back_c)
    back_all = np.concatenate([back_p, glow_p])
    back_i, _ = index(rgb, back_all, back_c, 1.0)

    front_p, front_c = fit(rgb, figures, 4, rng)
    front_i, _ = index(rgb, front_p, front_c, 0.55)
    front_i = despeckle(front_i, figures)
    front_i = np.where(figures, front_i, 0)
    live = tiles_of(figures[..., None].astype(float))[..., 0].sum(1) > 0

    return {
        "w": W, "h": H, "crown": CROWN,
        "back": {"palettes": back_all.tolist(), "tiles": "".join("%x" % v for v in back_c), "pixels": hexrows(back_i)},
        "front": {"palettes": front_p.tolist(), "tiles": "".join("%x" % v if live[i] else "." for i, v in enumerate(front_c)),
                  "pixels": hexrows(front_i)},
        "logo": logo(painting, rng),
    }


def flatten(art):
    out = np.zeros((H, W, 3), int)
    for name in ("back", "front"):
        layer = art[name]
        pals = np.array(layer["palettes"])
        for y, row in enumerate(layer["pixels"]):
            for x, ch in enumerate(row):
                v = int(ch, 16)
                if v:
                    t = layer["tiles"][(y // TILE) * (W // TILE) + x // TILE]
                    out[y, x] = pals[int(t, 16)][v - 1]
    lg = art["logo"]
    for y, row in enumerate(lg["pixels"]):
        for x, ch in enumerate(row):
            v = int(ch, 16)
            if v:
                out[y + 4, x + 4] = lg["palette"][v - 1]
    return Image.fromarray((out * 255 // 31).astype("uint8"), "RGB")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("painting")
    ap.add_argument("--preview")
    ap.add_argument("--module", default=os.path.join(HERE, "src", "snes", "titleart.mjs"))
    args = ap.parse_args()
    art = build(args.painting)
    with open(args.module, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("// The SNES title's art, translated from Astra's title painting by tools/titleart.py: palettes are\n"
                 "// [r, g, b] 5-bit colours, `tiles` one hex palette choice per 8x8 tile ('.' no sprite), `pixels`\n"
                 "// hex rows with 0 clear. back is BG1 (palette 7 the tower crown), front the partners as OBJ.\n")
        fh.write("export const TITLE_ART = %s;\n" % json.dumps(art, separators=(",", ":")))
    if args.preview:
        os.makedirs(args.preview, exist_ok=True)
        flat = flatten(art)
        flat.save(os.path.join(args.preview, "titleart.png"))
        side = Image.new("RGB", (W * 3 + 16 + round(1672 * H * 3 / 941), H * 3), (8, 8, 16))
        side.paste(Image.open(args.painting).convert("RGB").resize((round(1672 * H * 3 / 941), H * 3), Image.LANCZOS), (0, 0))
        side.paste(flat.resize((W * 3, H * 3), Image.NEAREST), (round(1672 * H * 3 / 941) + 16, 0))
        side.save(os.path.join(args.preview, "side-by-side.png"))
    print(args.module)


if __name__ == "__main__":
    main()
