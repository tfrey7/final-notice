"""Digitize a photo into an SNES cutscene still, the way Flashback or a Sega CD scene would have it.

The picture is sampled down to the cinema band (256x144), snapped to 15-bit colour, and split into
8x8 tiles that each pick one of a few 16-colour BG palettes (colour 0 shared by all). Palettes and
tile choices are fitted together, then every pixel is mapped into its tile's palette through a 4x4
Bayer ordered dither. Writes the reduced PNG, a 4x preview and src/snes/stills.mjs.

    py -3.10 tools/digitize.py name=photo.png [name=photo.png ...] --out docs/shots/<branch>
"""
import argparse
import json
import os

import numpy as np
from PIL import Image

W, H, TILE = 256, 144, 8
PALETTES, COLOURS = 7, 15
DITHER = 1.1
BAYER = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) + 0.5) / 16 - 0.5
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def sample(path):
    img = Image.open(path).convert("RGB")
    scale = max(W / img.width, H / img.height)
    size = (round(img.width * scale), round(img.height * scale))
    img = img.resize(size, Image.LANCZOS)
    left, top = (size[0] - W) // 2, (size[1] - H) // 2
    return np.asarray(img.crop((left, top, left + W, top + H)), dtype=np.float64) * 31 / 255


def kmeans(points, k, rng, iters=12):
    k = min(k, len(np.unique(points.round(), axis=0)))
    centres = points[rng.choice(len(points), k, replace=False)]
    for _ in range(iters):
        label = ((points[:, None] - centres[None]) ** 2).sum(-1).argmin(1)
        for c in range(k):
            if (label == c).any():
                centres[c] = points[label == c].mean(0)
    return centres


def fit(rgb, rng):
    """(palettes [P, 16, 3] in 0..31 ints, tile palette choice [ty, tx])."""
    ty, tx = H // TILE, W // TILE
    tiles = rgb.reshape(ty, TILE, tx, TILE, 3).transpose(0, 2, 1, 3, 4).reshape(ty * tx, TILE * TILE, 3)
    black = np.array([[rgb.reshape(-1, 3).sum(1).min() / 3] * 3]).round()
    feature = np.concatenate([tiles.mean(1), tiles.std(1)], 1)
    choice = ((feature[:, None] - kmeans(feature, PALETTES, rng)[None]) ** 2).sum(-1).argmin(1)
    for _ in range(6):
        palettes = []
        for p in range(PALETTES):
            px = tiles[choice == p].reshape(-1, 3)
            if len(px) == 0:
                px = tiles.reshape(-1, 3)
            cols = np.clip(kmeans(px, COLOURS, rng).round(), 0, 31)
            pad = np.repeat(cols[-1:], COLOURS - len(cols), 0)
            palettes.append(np.concatenate([black, cols, pad]))
        palettes = np.array(palettes)
        err = np.array([(((tiles[:, :, None] - pal[None, None]) ** 2).sum(-1).min(-1)).sum(1) for pal in palettes])
        choice = err.argmin(0)
    return palettes.astype(int), choice.reshape(ty, tx)


def reduce(rgb, palettes, choice):
    yy, xx = np.mgrid[0:H, 0:W]
    dithered = rgb + BAYER[yy % 4, xx % 4][..., None] * DITHER * 2
    pal = palettes[choice[yy // TILE, xx // TILE]]
    index = ((dithered[:, :, None] - pal) ** 2).sum(-1).argmin(-1)
    return index, np.take_along_axis(pal, index[..., None, None].repeat(3, -1), 2)[:, :, 0]


def digitize(name, path, out, seed=2052):
    rgb = sample(path)
    palettes, choice = fit(rgb, np.random.default_rng(seed))
    index, colour = reduce(rgb, palettes, choice)
    img = Image.fromarray((colour * 255 / 31).round().astype("uint8"), "RGB")
    img.save(os.path.join(out, "%s-snes.png" % name))
    img.resize((W * 4, H * 4), Image.NEAREST).save(os.path.join(out, "%s-snes-4x.png" % name))
    return {"w": W, "h": H, "palettes": palettes.tolist(),
            "tiles": "".join("%x" % v for v in choice.ravel()),
            "pixels": ["".join("%x" % v for v in row) for row in index]}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("stills", nargs="+", help="name=photo.png")
    ap.add_argument("--out", required=True)
    ap.add_argument("--module", default=os.path.join(HERE, "src", "snes", "stills.mjs"))
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    stills = {}
    for spec in args.stills:
        name, path = spec.split("=", 1)
        stills[name] = digitize(name, path, args.out)
        print(name, "->", os.path.join(args.out, name + "-snes.png"))
    with open(args.module, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("// Digitized cutscene stills, written by tools/digitize.py: palettes are [r, g, b] 5-bit\n"
                 "// colours (index 0 shared), `tiles` one hex palette choice per 8x8 tile, `pixels` hex rows.\n")
        fh.write("export const STILLS = %s;\n" % json.dumps(stills, separators=(",", ":")))


if __name__ == "__main__":
    main()
