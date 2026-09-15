"""Build the SNES title's layers (src/snes/titleart.mjs) from the live-action title still.

The still comes from the local generator and stays private, as does everything short of the SNES art:

  frame     the still with its night sky carried up into a band for the logo, and the partners' mask
            drawn from the hand-placed outlines below
  digitize  spritesmith's house recipe, the one every Final Notice still goes through
  build     the recipe's layers as the title's: back is BG1, with the palettes the tower crown's tiles
            use copied so its glow breathes by palette writes alone; front is the partners as OBJ

    py -3.10 tools/titleart.py frame <still.png> <dir>
    py -3.10 -m spritesmith digitize <dir>/title.png --recipe final-notice --mask <dir>/title-mask.png --out <dir>/snes
    py -3.10 tools/titleart.py build <dir>/snes/title.digitize.json
"""
import argparse
import json
import os
from collections import Counter

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

W, H, TILE = 256, 224, 8
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BAND = 250
# The still's top rows that are sky from edge to edge, folded back and forth to fill the band.
SKY_ROWS = 140
# Outlines in framed-still pixels (band included): Ward with the notice, then Mercer. Both stop above
# the bottom two tile rows, which stay on BG1 so the sprite layer keeps under the recipe's 256 tiles.
FIGURES = [
    [(275, 440), (300, 405), (355, 397), (400, 420), (408, 460), (398, 510), (385, 545), (420, 590), (445, 650),
     (455, 740), (462, 850), (530, 845), (560, 852), (552, 878), (515, 885), (495, 912), (468, 915), (445, 905),
     (435, 936), (119, 936), (118, 900), (125, 700), (145, 600), (210, 552), (272, 535), (285, 505), (272, 470)],
    [(730, 555), (745, 520), (800, 495), (870, 505), (900, 560), (895, 615), (880, 645), (960, 665), (1010, 700),
     (1040, 780), (1052, 880), (1051, 936), (740, 936), (735, 900), (640, 897), (598, 897),
     (555, 872), (548, 845), (590, 833), (635, 838), (725, 808), (788, 702), (790, 662), (765, 630), (740, 600)],
]
SKY_LEVEL = 30
CUT_ROW = 200
# The tower crown on screen.
CROWN = (112, 94, 144, 124)


def frame(still_path, out):
    still = np.asarray(Image.open(still_path).convert("RGB"))
    h, w = still.shape[:2]
    j = (BAND - 1 - np.arange(BAND)) % (2 * SKY_ROWS)
    band = still[np.where(j < SKY_ROWS, j, 2 * SKY_ROWS - 1 - j)]
    os.makedirs(out, exist_ok=True)
    framed = np.concatenate([band, still])[:h]
    Image.fromarray(framed).save(os.path.join(out, "title.png"))
    outline = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(outline)
    for poly in FIGURES:
        draw.polygon(poly, fill=255)
    # The outlines are loose; the night sky showing inside them is darker than any suit, so it is dropped.
    lit = Image.fromarray(((framed.max(-1) > SKY_LEVEL) * 255).astype("uint8"))
    lit = np.asarray(lit.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(9))) > 0
    Image.fromarray(((np.asarray(outline) > 0) & lit).astype("uint8") * 255).save(os.path.join(out, "title-mask.png"))


def hexrows(a):
    return ["".join("%x" % v for v in row) for row in a]


def build(record_path):
    with open(record_path, encoding="utf-8") as fh:
        record = json.load(fh)
    back, sprite = record["layers"]["background"], record["layers"]["sprite"]
    cols = W // TILE
    choice = [int(c, 16) for c in back["tiles"]]
    palettes = [p[1:] for p in back["palettes"]]
    x0, y0, x1, y1 = CROWN
    crown = [ty * cols + tx for ty in range(y0 // TILE, -(-y1 // TILE)) for tx in range(x0 // TILE, -(-x1 // TILE))]
    glow = []
    for p, _ in Counter(choice[i] for i in crown).most_common(8 - len(palettes)):
        copy = len(palettes)
        glow.append(copy)
        palettes.append(list(palettes[p]))
        for i in crown:
            if choice[i] == p:
                choice[i] = copy

    name = os.path.splitext(record["source"])[0]
    alpha = np.asarray(Image.open(os.path.join(os.path.dirname(record_path), name + "-sprite.png")))[..., 3] > 0
    table = np.array(sprite["palettes"][0])
    idx = np.array([[int(c, 16) for c in row] for row in sprite["pixels"]])
    # Slot 0 is clear on OBJ, so a pixel the recipe drew in it takes the nearest other slot.
    stand_in = 1 + int(((table[1:] - table[0]) ** 2).sum(1).argmin())
    idx = np.where(alpha, np.where(idx == 0, stand_in, idx), 0)
    # Where the partners are cut off above the legs, the recipe's outline would draw a line across them:
    # that row takes the colour of the leg below it instead.
    below = np.round(np.asarray(Image.open(os.path.join(os.path.dirname(record_path), name + ".png")).convert("RGB"),
                                dtype=np.float64) * 31 / 255)
    cut = alpha[:-1] & ~alpha[1:]
    cut[:CUT_ROW] = False
    for y, x in zip(*np.nonzero(cut)):
        idx[y, x] = 1 + int(((table[1:] - below[y + 1, x]) ** 2).sum(1).argmin())
    live = alpha.reshape(H // TILE, TILE, cols, TILE).any((1, 3)).ravel()
    return {
        "w": W, "h": H, "crown": CROWN, "glow": glow, "backdrop": back["palettes"][0][0],
        "back": {"palettes": palettes, "tiles": "".join("%x" % v for v in choice), "pixels": back["pixels"]},
        "front": {"palettes": [table[1:].tolist()], "tiles": "".join("0" if v else "." for v in live),
                  "pixels": hexrows(idx)},
    }


def main():
    ap = argparse.ArgumentParser()
    acts = ap.add_subparsers(dest="act", required=True)
    f = acts.add_parser("frame")
    f.add_argument("still")
    f.add_argument("out")
    b = acts.add_parser("build")
    b.add_argument("record")
    b.add_argument("--module", default=os.path.join(HERE, "src", "snes", "titleart.mjs"))
    args = ap.parse_args()
    if args.act == "frame":
        frame(args.still, args.out)
        return
    art = build(args.record)
    with open(args.module, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("// The SNES title's art, a live-action still digitized under the Final Notice recipe, built by\n"
                 "// tools/titleart.py: palettes are [r, g, b] 5-bit colours, `tiles` one hex palette choice per 8x8\n"
                 "// tile ('.' no sprite), `pixels` hex rows (0 the backdrop on BG1, clear on OBJ). back is BG1 with\n"
                 "// the crown's `glow` palettes, front the partners as OBJ.\n")
        fh.write("export const TITLE_ART = %s;\n" % json.dumps(art, separators=(",", ":")))
    print(args.module)


if __name__ == "__main__":
    main()
