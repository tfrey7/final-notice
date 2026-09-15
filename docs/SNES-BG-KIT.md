# The SNES background kit

Tim, 10:47 EDT 2026-09-15: "our existing backgrounds are so primitive. they need to be composable
with props, etc, so we can reuse assets".

A room is no longer painted from scratch. It is **data**: a band's tileset, window positions, and
props placed on anchors, composed into a Mode 1 scene. The same description builds at any descent,
so the arc of `SNES-DESCENT.md` is a number, not a repaint. This doc is the rulebook an artist
follows when adding tiles, props or rooms. `SNES-BACKGROUNDS.md` §3 (materials, lighting, depth,
composition) still holds; this doc says how the kit enforces it.

| File | What it holds |
| --- | --- |
| `src/snes/kit/palettes.mjs` | the eight palettes per band, their slot layout, the descent lerp, material names |
| `src/snes/kit/paint.mjs` | the material painter and the tile cutter |
| `src/snes/kit/tilesets.mjs` | architecture per band (ceiling, cornice, wall, windows, rail, wainscot, base, floor) and the skyline |
| `src/snes/kit/props.mjs` | the prop library, three band variants each |
| `src/snes/kit/area.mjs` | the scene description format and `buildArea()` |
| `src/snes/bg/reception.mjs` | Stage 1-1 built from the kit (the proof) |
| `tools/snes-bgshot.mjs` | contact sheets of areas as PNG, no browser |

Look at a room: `?snes&art=reception&x=0`. Sheet it from node:
`node tools/snes-bgshot.mjs out.png claims:0@0 reception@0 --cols 2`, or the same room at three
descents: `node tools/snes-bgshot.mjs out.png --descents reception 3,52,90 --cols 3`.

## 1. A room is a description

```js
export const RECEPTION = {
  name: 'Reception',
  descent: 3,                        // band and palettes come from this
  cols: 64,                          // near layer width in 8 px tiles; the map wraps
  windows: [24, 120],                // left edges of 64 px openings
  fixtures: [192, 288, 384],         // ceiling props
  overlay: { beams: 128 },           // BG3 foreground soffit
  props: [{ prop: 'desk', x: 192 }, { prop: 'art', x: 304, y: 40 }, { prop: 'cooler', x: 320 }],
};
export default buildArea(RECEPTION);
```

A placement may carry `band` to force one prop's variant (a single gothic cooler in a Backrooms
room is how a seam is foreshadowed) and `y` to move a wall prop. A new room is a new description;
a new look is a new tileset function or prop variant that every room then gets.

## 2. Layers and palettes

| Plane | Hardware | Speed | Content |
| --- | --- | --- | --- |
| Far | BG2, lines 0-87 | 0.25 | sky ramp, stars, moon, far tower silhouettes |
| Mid | BG2, lines 88-151 | 0.5 | near towers with lit windows |
| Near | BG1 | 1, floor bent by HDMA | architecture and props |
| Overlay | BG3, 3 colours | 1.25 | foreground soffit and brackets, **above head height only** |

Far and mid are one layer split by an HDMA scroll table, as Stage 2's shelving already plans. HDMA
budget: BG2 speeds 1, floor 1, colour math 2, so four of eight channels stay free for the descent
drift (`SNES-DESCENT.md` §3.1). BG3 is composed under the sprites in this engine, so nothing on it
may sit where a fighter's head goes; it is a ceiling-band plane.

Palettes, in the same slots in every band:

| # | Palette | Own slots (6-15) |
| --- | --- | --- |
| 0 | sky (BG2) | slots 1-14: sky 3, haze, star, moon 2, far 2, near 2, lit 2, beacon |
| 1 | floor | slab 3, grout, vein, polish, reflect, rug 3 |
| 2 | trim | panel 3, cornice, ceiling 2, glow 3, spec |
| 3 | wood | wood 3, wood lit, brass 3, paper 2, stamp |
| 4 | metal | steel 3, steel lit, water 3, plastic 2, led |
| 5 | plant | leaf 3, frond, pot 3, fabric 3 |
| 6 | door | door 3, gilt 3, canvas 4 |
| 7 | overlay (BG3) | silhouette 3 |

**Slots 1-5 of palettes 1-6 are COMMON:** outline, shadow, and the three-step wall ramp. They are
identical inside a band, so a tile may mix common pixels with one material palette. That is what
makes props composable: any prop can stand in front of any wall.

The painter paints **by material name** (`p.rect(x, y, w, h, 'brass', 2)`), never by slot number.
The cutter picks each tile's palette from the materials in it and throws, naming the tile, when two
material palettes meet in one 8x8 cell. The fix is always spacing (keep props of different
palettes 8 px apart on the tile grid) or moving a detail into a common slot, never a new palette.

## 3. Rules an artist follows

### Light

- **Key light from the upper left**, everywhere, in every band. Top and left faces take the
  lightest step, right and underside faces the darkest; `box()` does this for any material.
- Each room names its key light at the top of its module (Reception: the midnight windows).
- Glass is colour math on BG2 through the openings (half blend of the band's glass colour), never
  a blue fill. Window light reaches the floor as two soft reflection streaks under each opening.
- Darkness toward the back is a stepped subtract on the floor lines, not darker tiles.
- Anything that glows or flickers (tubes, the LED, lit windows) is a palette slot, so it can cycle.

### Material ramps

Three steps dark to light, plus at most one accent: marble 3 + grout + vein + polish; wood 3 + a
lit edge; metal 3 + one highlight row; fabric 3; brass 3 warming to yellow. Outlines and cast
shadows use the band's deep blue (corporate), olive (Backrooms) or void violet (gothic) from the
common slots, never black.

### Dithering

- **Only the 2x2 checker**, only on backgrounds, only at a ramp boundary or to fade a light
  (reflection streaks, a lamp's spill). Never across a whole surface at full contrast.
- No per-pixel noise: every texture repeats on 8, 16, 24, 48 or 96 px so it dedupes.
- **Tile budget: under 384 unique tiles an area.** Reception is 361. `test/snes-kit.test.mjs`
  checks it at three descents. Props are the expensive part (the desk alone is about 90 tiles):
  reuse a prop rather than draw a near-copy, and place repeats on the same x modulo the wall's
  period so their tiles dedupe too.

### Prop anchoring

| Anchor | Placement `x, y` | Rule |
| --- | --- | --- |
| `floor` | left edge; y is the floor line (152) | feet at y-1, never on the HDMA-sheared lines; a flat contact shadow falls down-right onto the floor in the common shadow slot |
| `wall` | left and top edge; y defaults to 40 | above the chair rail, clear of window frames |
| `ceiling` | left edge; y is the cornice (24) | hangs down from it |

Place props on the 8 px grid, 96-128 px apart, the same prop never twice in a screen width, and the
focal prop (Reception's desk) at about a third of the first screen with the brightest colour on it.
Keep the fighters' band (72 px above the floor) to middle ramp steps; high contrast goes on the
ceiling, the wall above head height, or the floor edge.

### Band variants

Every prop draws three variants, following `SNES-DESCENT.md` §3.2: nothing replaced, only worn
through. The cooler goes full → half full with a cup on the floor → dark water with something
turning; the palm glossy → dusty plastic with a dead frond → a bare stick on a stone plinth; the
nameplate becomes an idol; the portrait's face goes washed out, then waxen; the door comes up 8 px
short in the Backrooms and pointed in gothic. Architecture follows the same arc: coffered ceiling
→ stained dropped tiles → vault ribs; salmon marble → striped wallpaper with lifting seams → black
marble veined red; glass → walled-up windows → lancets on wax-red sky; marble floor → damp carpet →
black marble.

## 4. What the kit does not do yet

- Only Reception is rebuilt; the other Stage 1 areas, Vellum's office, the archive and the Great
  Seal still use their hand-painted modules (follow-up cards under epic 1898).
- Props have three variants, not the five states of `SNES-DESCENT.md` §3.2; the clock and cable
  tray are not in the library yet.
- Spatial palette drift inside an area (HDMA rewriting slots per band of scanlines) is item 2059's.
