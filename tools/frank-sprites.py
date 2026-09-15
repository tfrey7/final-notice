"""Frank Mercer's idle and six-drawing punch as SNES sprites, painted pixel by pixel by rules.

The posed 3D Frank (spritesmith item 2252) is already rendered as native-size buffers: material id,
part id, normal and depth. spritesmith's rule-based pixel artist supplies the craft primitives
(silhouette, far-side lines, corner and band cleanup); the rules here are Final Notice's own:

1. palette: ramps built from the swatches on Astra's Frank sheet, jacket and trousers one suit colour;
2. shade: normals averaged within each body part before stepping, so a form reads as two or three
   big clusters instead of streaks, with the light from the upper left;
3. lines: a suit hem where jacket meets trousers, and a shadow under the hair on the brow;
4. outline: ink on the shadow side, the material's darkest step on the lit side;
5. cleanup: spritesmith's orphan and band pass, then any cluster under three pixels joins its
   neighbours. No image model and no hand-placed pixels: the same buffers always give the same bytes.

    py -3.10 tools/frank-sprites.py [--poses idle] [--compare <sheet.png> --compare-out <png>]
"""

import argparse
import hashlib
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPRITESMITH = os.environ.get("SPRITESMITH_DIR", os.path.join(os.path.dirname(ROOT), "spritesmith"))
OUT = os.path.join(ROOT, "assets", "sprites", "frank-mercer")
NAMES = ["idle", "ready", "anticipation", "extension", "contact", "follow-through", "recovery"]

JACKET, SHIRT, TIE, SKIN, HAIR, SHOE, TROUSERS, EYES = range(1, 9)
SUIT = ["#181b2a", "#283046", "#3a4464", "#546088"]
RAMPS = {
    JACKET: SUIT,
    SHIRT: ["#9894a4", "#e0dcd6"],
    TIE: ["#6a2220", "#a8402c"],
    SKIN: ["#a45c40", "#e09c6e", "#f8cc9c"],
    HAIR: ["#2c1810", "#5a3822"],
    SHOE: ["#0e0c12", "#3a3440"],
    TROUSERS: SUIT,
    EYES: ["#1c1414"],
}
INK = "#0c0c16"
# item 2252's normal buffer has z pointing away from the camera (a face turned to the viewer reads z < 0)
LIGHT = np.array([-0.55, 0.65, -0.52]) / np.linalg.norm([-0.55, 0.65, -0.52])
SHADE_LO, SHADE_HI = 0.35, 0.85
MIN_CLUSTER = 3
N4 = ((-1, 0), (1, 0), (0, -1), (0, 1))


def load_artist(path):
    sys.path.insert(0, path)
    from spritesmith import pixelartist
    return pixelartist


def part_smoothed(normal, part):
    """Each normal averaged with its 3x3 neighbours of the same body part, then renormalised."""
    h, w = part.shape
    out = normal.copy()
    for y in range(h):
        for x in range(w):
            if not part[y, x]:
                continue
            ys, xs = slice(max(0, y - 1), y + 2), slice(max(0, x - 1), x + 2)
            same = part[ys, xs] == part[y, x]
            out[y, x] = normal[ys, xs][same].sum(axis=0)
    return out / np.maximum(np.linalg.norm(out, axis=2, keepdims=True), 1e-6)


def shade_steps(mat, normal):
    value = np.clip((0.5 + 0.5 * (normal @ LIGHT) - SHADE_LO) / (SHADE_HI - SHADE_LO), 0, 0.999)
    step = np.zeros(mat.shape, int)
    for m, ramp in RAMPS.items():
        sel = mat == m
        step[sel] = (value[sel] * len(ramp)).astype(int)
    return step


def seam_lines(mat):
    """The suit hem (trousers just under the jacket) and the brow shadow (skin just under hair)."""
    line = np.zeros(mat.shape, bool)
    below = mat[1:, :]
    above = mat[:-1, :]
    line[1:, :] |= (below == TROUSERS) & (above == JACKET)
    line[1:, :] |= (below == SKIN) & (above == HAIR)
    return line


def merge_small_clusters(colour, fill, mat, index_mat):
    """A same-colour cluster under MIN_CLUSTER pixels takes the colour most of its same-material
    neighbours have; ties go to the lowest index, and the scan order is fixed."""
    h, w = colour.shape
    seen = np.zeros(colour.shape, bool)
    for y in range(h):
        for x in range(w):
            if not fill[y, x] or seen[y, x]:
                continue
            c, m = colour[y, x], mat[y, x]
            cluster, todo = [], [(y, x)]
            seen[y, x] = True
            while todo:
                cy, cx = todo.pop()
                cluster.append((cy, cx))
                for dy, dx in N4:
                    yy, xx = cy + dy, cx + dx
                    if (0 <= yy < h and 0 <= xx < w and not seen[yy, xx] and fill[yy, xx]
                            and colour[yy, xx] == c and mat[yy, xx] == m):
                        seen[yy, xx] = True
                        todo.append((yy, xx))
            if len(cluster) >= MIN_CLUSTER:
                continue
            votes = {}
            for cy, cx in cluster:
                for dy, dx in N4:
                    yy, xx = cy + dy, cx + dx
                    if (0 <= yy < h and 0 <= xx < w and fill[yy, xx] and mat[yy, xx] == m
                            and colour[yy, xx] != c and index_mat.get(colour[yy, xx]) == m):
                        votes[colour[yy, xx]] = votes.get(colour[yy, xx], 0) + 1
            if votes:
                pick = sorted(votes.items(), key=lambda kv: (-kv[1], kv[0]))[0][0]
                for cy, cx in cluster:
                    colour[cy, cx] = pick
    return colour


def paint(pa, buffers):
    mat, part, depth = buffers["mat"], buffers["part"], buffers["depth"]
    colours, index = pa.palette(RAMPS)
    colours[1] = INK
    index_mat = {i: m for (m, _), i in index.items()}
    step = shade_steps(mat, part_smoothed(buffers["normal"], part))
    edges = pa.edge_buffer(mat, part, depth)
    edge = edges == 1
    line = (edges == 2) | (seam_lines(mat) & ~edge)
    light2d = np.array([-LIGHT[1], LIGHT[0]])
    colour = np.zeros(mat.shape, int)
    h, w = mat.shape
    for y in range(h):
        for x in range(w):
            m = mat[y, x]
            if not m:
                continue
            if edge[y, x]:
                dy, dx = pa.outward(mat, y, x)
                facing = (dy * light2d[0] + dx * light2d[1]) / max(np.hypot(dy, dx), 1e-6)
                colour[y, x] = index[(m, 0)] if facing > 0.25 else 1
            elif line[y, x]:
                colour[y, x] = index[(m, 0)]
            else:
                colour[y, x] = index[(m, step[y, x])]
    fill = (mat > 0) & ~edge & ~line
    colour = pa.cleanup(colour, fill, mat)
    colour = merge_small_clusters(colour, fill, mat, index_mat)
    lut = np.array([(0, 0, 0, 0)] + [pa.hex_rgb(c) + (255,) for c in colours[1:]], np.uint8)
    return lut[colour]


def strip(sprites, zoom=1, gap=4, labels=False):
    """The frames side by side on one shared crop, feet on one line."""
    boxes = [np.asarray(s)[..., 3].nonzero() for _, s in sprites]
    top = min(int(b[0].min()) for b in boxes) - 1
    bottom = max(int(b[0].max()) for b in boxes) + 2
    widths = []
    for b in boxes:
        widths.append((int(b[1].min()) - 1, int(b[1].max()) + 2))
    label_h = 12 if labels else 0
    total = sum((r - l) * zoom + gap for l, r in widths) + gap
    out = Image.new("RGBA", (total, (bottom - top) * zoom + label_h + gap), (0, 0, 0, 0))
    draw = ImageDraw.Draw(out)
    x = gap
    for (name, sprite), (l, r) in zip(sprites, widths):
        cell = sprite.crop((l, top, r, bottom))
        cell = cell.resize((cell.width * zoom, cell.height * zoom), Image.NEAREST)
        if labels:
            draw.text((x, 0), name, fill=(236, 236, 236, 255))
        out.paste(cell, (x, label_h), cell)
        x += cell.width + gap
    return out


def compare(sheet_path, sprites, before, path):
    """Astra's sheet on top, this card's strip at 4x under it, item 2252's strip at 4x below that."""
    sheet = Image.open(sheet_path).convert("RGB")
    sheet = sheet.resize((sheet.width * 700 // sheet.height, 700), Image.LANCZOS)
    now = strip(sprites, zoom=4, labels=True)
    old = strip(before, zoom=4, labels=True)
    width = max(sheet.width, now.width, old.width) + 20
    bg, ink = (44, 46, 56), (236, 236, 236)
    out = Image.new("RGB", (width, sheet.height + now.height + old.height + 90), bg)
    draw = ImageDraw.Draw(out)
    out.paste(sheet, (10, 10))
    y = sheet.height + 20
    draw.text((10, y), "This card: tuned rules, 4x", fill=ink)
    out.paste(now, (10, y + 14), now)
    y += now.height + 30
    draw.text((10, y), "Item 2252's first pass, 4x", fill=ink)
    out.paste(old, (10, y + 14), old)
    out.save(path)
    return path


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--spritesmith", default=SPRITESMITH)
    ap.add_argument("--out", default=OUT)
    ap.add_argument("--poses", nargs="*", default=NAMES)
    ap.add_argument("--compare", help="Astra's Frank sheet, read in place")
    ap.add_argument("--compare-out", help="where the comparison goes, outside the repo")
    args = ap.parse_args(argv)
    pa = load_artist(args.spritesmith)
    buffers_dir = os.path.join(args.spritesmith, "characters", "frank-mercer", "poses")
    os.makedirs(args.out, exist_ok=True)
    sprites, before = [], []
    for name in [n for n in NAMES if n in args.poses]:
        buffers = pa.load({k: os.path.join(buffers_dir, "%s-%s.png" % (name, k)) for k in ("ids", "normal", "depth")})
        rgba = paint(pa, buffers)
        path = os.path.join(args.out, "%s.png" % name)
        Image.fromarray(rgba, "RGBA").save(path, optimize=False)
        with open(path, "rb") as fh:
            digest = hashlib.sha256(fh.read()).hexdigest()
        ys, _ = np.nonzero(rgba[..., 3])
        colours = len(np.unique(rgba[rgba[..., 3] > 0].reshape(-1, 4), axis=0))
        print("%s: %d colours, %d px tall, feet on row %d, sha256 %s" % (name, colours, ys.max() - ys.min() + 1,
                                                                        ys.max(), digest[:16]))
        sprites.append((name, Image.fromarray(rgba, "RGBA")))
        before.append((name, Image.open(os.path.join(buffers_dir, "%s-sprite.png" % name)).convert("RGBA")))
    all_rgba = np.concatenate([np.asarray(s).reshape(-1, 4) for _, s in sprites])
    print("set: %d colours" % len(np.unique(all_rgba[all_rgba[:, 3] > 0], axis=0)))
    if len(sprites) == len(NAMES):
        print(strip(sprites).save(os.path.join(args.out, "strip.png")) or os.path.join(args.out, "strip.png"))
    if args.compare and args.compare_out:
        print(compare(args.compare, sprites, before, args.compare_out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
