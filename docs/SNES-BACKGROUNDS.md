# The best SNES backgrounds, and the rules Final Notice takes from them

*Generated from the knowledge base; edit through `kb_update`, not here.*

*`kb_get snes-backgrounds-introduction` · version 1*

Tim, 08:15 EDT 2026-09-15, on the first pass of the Reception and Service Floor backgrounds: *"do
some research on the best looking SNES backgrounds, FF6, chrono trigger, etc"*. Target: late-1995
SNES, grounded realism, the corporate-wave office at night. This studies eight games, then turns
them into a rulebook (section 3) and three small study crops drawn inside the machine's limits
(section 4). Hardware limits are `docs/SNES-PLAN.md` section 2; the working style the stage modules
already share is the header of `src/snes/bg/claims.mjs`. This page does not repeat either.

**How to read the marks.** *(verified: link)* means the linked page was read and says it.
*(search summary: link)* means a search engine's summary of that page said it; the page itself was
not opened. *(from memory, unverified)* means nobody checked. Several fan wikis and The Cutting
Room Floor refuse automatic reading, so per-room details carry more of the last mark than we would
like. Reference screenshots are found at [Background HQ][bghq] and [The Spriters Resource][tsr];
anything saved for study goes in the gitignored `docs/refs/`.

## 1. The machine, in the four facts that shape a background

*`kb_get snes-backgrounds-the-machine-in-the-four-facts-that-shape-a` · version 2*

- **Layers and colours per mode.** Mode 1, the mode almost every game below uses for play, gives
  BG1 and BG2 at 4 bits per pixel (15 colours plus clear per tile) and BG3 at 2 bits; Mode 3 is one
  8-bit layer; Mode 7 is one 8-bit layer with a 128x128 map and only **256** 8x8 tiles
  *(verified: [SNESdev, Backgrounds][sd-bg])*.
- **Colour math** blends the main screen with a sub screen or one fixed colour: *add* "can lighten
  colors, but not darken them", *subtract* "can darken colors, but not lighten them", and *add +
  half* is "a 50% blend"; windows switch it off where it is not wanted
  *(verified: [SNESdev, Color math][sd-cm])*. The named uses are exactly our needs: Secret of
  Mana's translucent water (add + half), Final Fantasy VI's and Demon's Crest's flying maps
  (an additive horizon with the fixed colour changed every line by HDMA), Super Mario World's
  Sunken Ghost Ship (additive fade-out), Yoshi's Island 1-6 (subtractive darkness underground) and
  Donkey Kong Country's Gorilla Glacier (subtractive darkness) *(verified: [SNESdev, Color math][sd-cm])*.
- **HDMA and raster tricks.** Any register can change between lines, so scroll, fixed colour, even
  the background mode can differ per line; Chrono Trigger's intro uses offset-per-tile when the
  Black Omen phases in *(search summary: [SNESdev, Color math][sd-cm] and [Backgrounds][sd-bg])*.
  Contra III shifts each line of a layer differently and slips sprites under a bridge with Mode 7's
  extra layer *(verified: [Fabien Sanglard, SNES PPUs][fs-ppu])*.
- **Sprites are not free scenery.** 128 on screen, but at most 32 on a line and 34 8x8 "slivers"
  of pixels *(verified: [Fabien Sanglard][fs-ppu])*. A prop drawn as sprites steals from the
  fighters; props belong in BG1.

## 2. The eight games

*`kb_get snes-backgrounds-the-eight-games` · version 2*

Each study gives what the game does with **materials**, **light and atmosphere**, **depth** and
**composition**, then what is known of its budget.

### Final Fantasy VI (Square, 1994)

*`kb_get snes-backgrounds-final-fantasy-vi` · version 2*

- **Materials.** Tiles are 16x16 metatiles of 8x8 tiles, and walls and floors are built from
  two- or three-step ramps with a single highlight row on the lit edge rather than per-pixel
  shading; the Magitek factory and Vector read as metal from one bright rivet row and one dark seam
  row per plate *(from memory, unverified)*.
- **Light and atmosphere.** The flying map's horizon is an additive fixed colour stepped per line
  by HDMA *(verified: [SNESdev, Color math][sd-cm])*. Narshe's falling snow and Zozo's rain are a
  translucent BG3 overlay scrolling over play; the Phantom Train and Zozo darken the whole palette
  rather than add black pixels *(from memory, unverified)*.
- **Depth.** Mostly a single top-down plane: FF6 sells depth by scale and overlap (a building's
  roof on BG1 priority over the party) more than by parallax *(from memory, unverified)*.
- **Composition.** Rooms are small and framed; the Opera House stage puts one lit set piece in a
  dark hall *(from memory, unverified)*.
- **Budget.** Memory was tight: Yusuke Naora, "in the FFVI development we really didn't have a lot
  of memory to work with, so compared with that, Chrono Trigger was much easier"
  *(verified: [shmuplations, Chrono Trigger 1995 interviews][ct-int])*. Kazuko Shibuya did the
  character and monster dots; the move to the Super Famicom took her from 3 colours to 16
  *(search summary: [Square Enix blog][shibuya-se])*.

### Chrono Trigger (Square, 1995)

*`kb_get snes-backgrounds-chrono-trigger` · version 2*

- **Materials.** Stone and wood carry soft two-step dithered transitions and hand-placed cracks and
  moss at edges, never an even scatter; the noise is at the joins, the faces are flat
  *(from memory, unverified)*.
- **Light and atmosphere.** Fog drifts over Guardia Forest and the Magus's castle approach as a
  translucent layer; water and lava cycle palettes rather than animate tiles
  *(from memory, unverified)*.
- **Depth.** Foreground canopies and pillars on a higher-priority layer pass in front of the party,
  and a slower layer behind them gives the forest and the End of Time depth
  *(from memory, unverified)*.
- **Composition.** Naora placed the sprites on his mock-ups while painting: "I would put the
  character sprites on the screen mock-ups while I worked, so my backgrounds matched the atmosphere
  and feel of Toriyama's character designs" *(verified: [shmuplations][ct-int])*. Akiyoshi Masuda
  drew the event rooms ("I got all the weird ones") *(verified: [shmuplations][ct-int])*. The trial
  was made as one seamless image at a large memory cost *(search summary: [shmuplations][ct-int])*.
- **Budget.** A 32-megabit cartridge: Tetsuya Takahashi, "the stress is gone!"
  *(verified: [shmuplations][ct-int])*.

### Seiken Densetsu 3 / Trials of Mana (Square, 1995)

*`kb_get snes-backgrounds-seiken-densetsu-3-trials-of-mana` · version 2*

- **Materials.** Pastel, painterly ramps; "Seiken Densetsu isn't meant to be 'realistic' like Final
  Fantasy" (Tanaka) *(verified: [shmuplations, SD3 1995 interview][sd3-int])*. Leaves and grass are
  clusters of 3-4 pixels in a repeating 16-32 px motif, dense but ordered *(from memory, unverified)*.
- **Light and atmosphere.** Shadows are never black: "we're using deep blues and purples instead
  of shades of black, to impart a sense of softness. If you use black for that there's a tendency
  for things to look cold and sterile" (Ishii) *(verified: [shmuplations][sd3-int])*. The world runs
  a day and night cycle by swapping palettes *(from memory, unverified)*.
- **Depth.** Sprite and background artists worked "in tandem ... communicating closely with each
  other" *(verified: [shmuplations][sd3-int])*, so props sit in the same light as the heroes.
- **Budget.** 32 megabits, and "we threw everything we had into this development" (Ishii)
  *(verified: [shmuplations][sd3-int])*.

### Terranigma (Quintet, 1995)

*`kb_get snes-backgrounds-terranigma` · version 2*

- **Light and atmosphere.** A sky faked by subtracting yellow from the map to leave blue
  *(search summary, source page not identified)*. Underworld and cave interiors lean on one dominant
  hue per area with a single warm light source *(from memory, unverified)*.
- **Depth.** Mode 7 for the world map, and the scrolling underworld ceiling is "one of the nicest
  effects seen on the system" *(search summary: [Mode 7, Nintendo Fandom][m7-fandom])*. Landscapes
  "blend pseudo-3D effects with vivid imagery and the power of Mode-7"
  *(verified: [Retro Game Resource][terra-rgr])*.
- **Composition.** Effects are saved for "a few key areas" and cutscenes
  *(verified: [Retro Game Resource][terra-rgr])*: spectacle is spent where the story peaks.

### Donkey Kong Country 2 (Rare, 1995)

*`kb_get snes-backgrounds-donkey-kong-country-2` · version 2*

- **Materials.** Pre-rendered on SGI machines: "pre-rendered images are modelled as 3D objects and
  then transformed into 2D sprites and background layers" *(verified: [Wikipedia, DKC2][dkc2-wp])*.
  The look of soft, lit surfaces comes from a render quantised to tile palettes, not from dithering
  by hand.
- **Light and atmosphere.** Levels use "fog, rain, and thunderstorms" *(verified: [Wikipedia][dkc2-wp])*.
  Gloomy Gulch's lightning is a whole-palette flash and the fog levels lay a translucent layer that
  thickens with distance *(from memory, unverified)*.
- **Depth.** Two or three parallax planes plus a translucent weather layer; far planes are lower
  contrast and bluer *(from memory, unverified)*.
- **Budget.** How it fits, from DKC1's programmer Chris Sutherland: "taking a single pre-rendered
  background screen and then cutting it up into squares with the correct colour palettes", then
  "find places where pieces of the image could be repeated elsewhere to save video [memory] space"
  *(verified: [Episodic Content, Making of DKC ch. 2][dkc-making])*. That is exactly our cut-and-dedupe
  pipeline.

### Super Metroid (Nintendo, 1994)

*`kb_get snes-backgrounds-super-metroid` · version 2*

- **Materials.** Rock and metal are 3-4 step ramps with hard dark outlines only where two
  surfaces meet; the backdrop rock is the same material at half contrast *(from memory, unverified)*.
- **Light and atmosphere.** Atmosphere is a menu of BG3 effects per room: lava, acid, water,
  spores, rain and scrolling fog; heat rooms wobble the background line by line; killing the
  Fireflea bugs darkens a room step by step *(search summary: [SMILE guide][smile])*. Crateria's
  surface flashes the palette for lightning *(from memory, unverified)*.
- **Depth.** One parallax backdrop behind the play layer in most rooms; the moodiest rooms cut the
  backdrop to near-black and let silhouettes carry depth *(from memory, unverified)*.
- **Composition.** The play layer is always the highest-contrast thing on screen; the backdrop
  never uses the play layer's outline colour *(from memory, unverified)*.

### Super Castlevania IV (Konami, 1991)

*`kb_get snes-backgrounds-super-castlevania-iv` · version 2*

- **Depth.** Mode 7 rotates whole rooms; because Mode 7 applies only to backgrounds, the platforms
  are sprites and the rotating boss Koranot is the background *(search summary: [Wikipedia, Mode 7][m7-wp])*.
  The 4-3 tunnel scrolls its lines at different rates to fake a cylinder
  *(search summary: [YouTube, "Castlevania IV 4-3 Tunnel Background"][sc4-tunnel])*.
- **Light and atmosphere.** Candle-lit halls use a warm near colour against cold blue distance, and
  the Treasury's gold is a cycling highlight *(from memory, unverified)*.
- **Budget.** An early (1991) cartridge; it earns its look from layering and raster effects more
  than tile count *(from memory, unverified)*.

### Street Fighter Alpha 2 (Capcom, SNES 1996)

*`kb_get snes-backgrounds-street-fighter-alpha-2` · version 2*

- **Materials and scale.** The stages are the arcade's, "slightly downscaled for the resolution of
  the SNES" *(search summary: [GameFAQs review][sfa2-gf])*.
- **Budget.** Graphics are compressed and the S-DD1 chip decompresses them as the game asks for
  them; only SFA2 and Star Ocean used it *(search summary: [SNES Central, S-DD1][sdd1])*; the port's
  producer redrew sprites to fit *(verified: [Retroware][sfa2-rw])*.
- **Composition.** Every stage keeps the fighters' band clear: busy crowds and signs sit above head
  height, the floor is a calm per-line-scrolled plane *(from memory, unverified)*. It is the model
  for a fight in a detailed room.

### What the eight agree on

*`kb_get snes-backgrounds-what-the-eight-agree-on` · version 2*

1. **Flat faces, detail at the joins.** Texture lives where two materials meet; broad faces are
   calm ramps. (FF6, Chrono Trigger, Super Metroid.)
2. **No black.** Shadows are deep blue or purple; outlines are dark hue, not `0,0,0`. (SD3's own
   words.)
3. **Light is a layer, not paint.** Fog, horizon glow, darkness and weather are colour math or BG3,
   so they move and the tiles stay few. (FF6, DKC, Super Metroid, Yoshi's Island.)
4. **Distance loses contrast and warms to the sky's hue.** (DKC2, Super Metroid, Castlevania IV.)
5. **Spectacle is rationed** to a few rooms and moments. (Terranigma.)
6. **The play band is the calmest, highest-contrast band.** (SFA2, Super Metroid.)
7. **Paint with the sprites on the canvas.** (Chrono Trigger, SD3.)

## 3. Final Notice SNES backgrounds

*`kb_get snes-backgrounds-final-notice-snes-backgrounds` · version 2*

The rulebook. Numbers are for Mode 1 at 298x224, 8x8 tiles, one 15-colour palette a tile, and the
384-unique-tiles-an-area test already in `test/snes-layers.test.mjs`. Ramps are dark to light, lit
from the upper left, as `claims.mjs` sets out.

### 3.1 Materials

*`kb_get snes-backgrounds-materials` · version 2*

| Material | Ramp | How it reads | Never |
| --- | --- | --- | --- |
| **Carpet** | 3 steps of one hue + 1 shadow; a lane or border colour | A **24 px** repeating motif (a 2x2 checker at most) so it dedupes; lanes and borders are the detail, the field is almost flat. Wear is a lighter patch along walking lines, not noise. | Per-pixel speckle (lesson 361: a tile a cell) |
| **Stone** (salmon, marble) | 3 steps + grout + vein + polish | Slabs on a **48 or 96 px** grid; one vein per slab, running diagonal; the **polish** colour only as vertical streaks under a light or window, as a reflection would fall. | Veins on every slab, polish scattered |
| **Glass** | none of its own | The view behind (BG2) under an **add + half** of a cool fixed colour on the window lines; one or two diagonal specular strokes in BG1 on the frame's lit side. | Painting glass as a blue fill |
| **Wood** (mahogany, veneer) | 3 steps + outline | Grain as long horizontal runs 1 px high, broken every 16-32 px; a 1 px lit edge on top faces, a 2 px dark edge underneath. | Wavy grain, grain on end faces |
| **Fabric** (cubicle panels, chairs) | 3 steps | A 2x2 checker between the mid and dark step for the woven look, held to a **16 px** period; seams and trim carry the shape. | Dither across the whole panel at full contrast |
| **Metal** (cart, shelving, brass) | 3 steps + highlight | One bright highlight row on the upper edge, one dark seam row; brass warms the highlight to yellow. | Gradient banding across a flat plate |

Shadows and outlines use the area's deep blue or purple (SD3), never pure black, and **the
darkest colour of BG2 is lighter than the darkest of BG1**.

### 3.2 Lighting

*`kb_get snes-backgrounds-lighting` · version 2*

- **One key light per area**, named at the top of the module: Reception's midnight windows, the
  Service Floor's desk lamps, the archive's reading lamps. Every highlight on a prop agrees with it.
- **Lamp pools** are a stepped **colour-math add** of a warm fixed colour on the lines the pool
  covers, masked by a window to the lamp's width. Two lamps on one line with different colours
  cannot share a fixed colour: dither the second onto BG1 instead (as `claims.mjs` already does).
- **Window light** falls as parallelograms on the floor, one ramp step lighter, edges dithered one
  2x2 checker wide; the same window's reflection is the stone's polish streaks.
- **Darkness toward the back** by a stepped colour-math **subtract** per floor line (Yoshi's Island,
  DKC), not by darker tiles.
- **Fog, haze, dust** go on BG3 or as colour math, never baked into BG1.
- **Animated palettes** for anything that flickers or glows: a failing fluorescent tube, a
  monitor, the wax front's sheen, the lit windows of the skyline. Cycling 2-4 slots costs no tiles.
- **Flashes** (lightning, the Great Seal's stamp) are a whole-palette or master-brightness change
  for 2-4 frames.

### 3.3 Depth

*`kb_get snes-backgrounds-depth` · version 2*

- **Stage 1: three planes.** BG2 far wall or skyline at half speed, BG1 play layer, and a colour-math
  haze or glass band between them. **Stage 2: four.** Far shelving (BG2, a quarter speed via HDMA
  bands), mid shelving (BG2 lower band, half speed), play (BG1), wax/fog tint (colour math).
- **Each plane back loses one ramp step of contrast** and shifts toward the key light's hue; the
  farthest plane may be a **two-colour silhouette** (Super Metroid, Castlevania IV).
- **Floors get the HDMA perspective** of lesson 347 (seams 32 px or more apart, bottom multiplier
  near 1.5); nothing that stands (a prop, a pillar) sits on the sheared lines.
- **Scale cues**: a doorway is 64-72 px for a 56-64 px character; ceiling tiles and carpet lanes
  shrink toward the horizon line, not only the floor.

### 3.4 Composition

*`kb_get snes-backgrounds-composition` · version 2*

- **The fighters' band is calm.** From the floor top (`FLOOR` = 152) to 72 px above it, BG1 keeps to
  its two middle ramp steps; high contrast, signs and clutter go above head height or at the floor's
  edge (SFA2).
- **One focal point a screen**: the reception desk, a lit door, the clock. Place it off-centre at
  about a third of the width, and give it the brightest colour on screen.
- **Break repetition with props on a rhythm of 96-128 px**: a cart, a plant, a water cooler, a
  bin. A prop covers a tile seam; the same prop never appears twice in one screen width.
- **Spectacle is rationed**: at most one special effect per area beyond the standard glass,
  lamps and floor darkness (Terranigma). Save the Mode 7 and big flashes for the bosses.
- **Paint with the sprites in place**: judge a background with Ward and a foe standing on it,
  as Naora did.

## 4. Study crops

*`kb_get snes-backgrounds-study-crops` · version 2*

Three crops, each 64x48 (8x6 tiles), one BG palette of 15 colours or fewer, every texture keyed to a
period that dedupes, and colour math applied as the SNES would at output. A throwaway script
drew them, checked each crop's palette and counted its unique tiles; the counts are on the
annotated sheet, `docs/shots/item-1977/studies.png`.

- **A. Carpet under a desk lamp** (Service Floor): burgundy field on a 24 px motif, a gold lane,
  a lamp pool by stepped additive colour math with a one-checker dithered rim.
- **B. Stone under a window** (Reception): salmon slabs on a 48 px grid with one vein each, a window
  light parallelogram one step lighter, polish streaks only beneath the window.
- **C. Glass over the skyline** (Reception's far layer): a two-colour tower silhouette under a
  four-band HDMA haze, a mahogany frame, the glass as add + half of a cool colour with one specular
  stroke.

What the counts teach: the stone crop needs **6 colours and 32 of 48 tiles** and would dedupe
further over a whole floor, since its grid repeats; the carpet is **6 colours**, but the lamp pool
lifts it to 14 on screen and 31 unique tiles, which is why the pool is colour math rather than
painted tiles; the skyline is **48 of 48** unique, so the far layer is the budget's big spender and
its towers should repeat on a 96-128 px period across a whole screen.

## 5. Sources

*`kb_get snes-backgrounds-sources` · version 1*

[bghq]: https://bghq.com/bgs.php?c=1a
[tsr]: https://www.spriters-resource.com/snes/dkc/
[sd-bg]: https://snes.nesdev.org/wiki/Backgrounds
[sd-cm]: https://snes.nesdev.org/wiki/Color_math
[fs-ppu]: https://fabiensanglard.net/snes_ppus_why/
[ct-int]: https://shmuplations.com/chronotrigger2/
[shibuya-se]: https://www.square-enix-games.com/en_GB/news/final-fantasy-pixel-remaster-kazuko-shibuya
[sd3-int]: https://shmuplations.com/seikendensetsu3/
[m7-fandom]: https://nintendo.fandom.com/wiki/Mode_7
[terra-rgr]: http://retrogameresource.com/index.php/2018/05/10/europes-chrono-trigger-terranigma-snes-resource/
[dkc2-wp]: https://en.wikipedia.org/wiki/Donkey_Kong_Country_2
[dkc-making]: https://episodiccontentmag.com/2016/02/19/dkcountry1_chapter2/
[smile]: https://www.metroidconstruction.com/SMMM/smile_2.5_guide.txt
[m7-wp]: https://en.wikipedia.org/wiki/Mode_7
[sc4-tunnel]: https://www.youtube.com/watch?v=pafOj9IrtuY
[sfa2-gf]: https://gamefaqs.gamespot.com/snes/588699-street-fighter-alpha-2/reviews/170642
[sdd1]: https://snescentral.com/chips.php?chiptype=S-DD1
[sfa2-rw]: https://articles.retroware.com/2021/03/08/the-curious-case-of-street-fighter-alpha-2-on-the-snes/

- [SNESdev Wiki, Backgrounds][sd-bg] and [Color math][sd-cm]
- [Fabien Sanglard, SNES: sprites and backgrounds rendering][fs-ppu]
- [shmuplations, Chrono Trigger 1995 developer interviews][ct-int]
- [shmuplations, Seiken Densetsu 3 1995 developer interview][sd3-int]
- [Square Enix blog, Kazuko Shibuya on the Pixel Remaster][shibuya-se]
- [Episodic Content, Kings of the Jungle: the making of Donkey Kong Country, chapter 2][dkc-making]
- [Wikipedia, Donkey Kong Country 2][dkc2-wp]; [Wikipedia, Mode 7][m7-wp]
- [Retro Game Resource, Terranigma][terra-rgr]; [Nintendo Fandom, Mode 7][m7-fandom]
- [Metroid Construction, SMILE 2.5 guide][smile]
- [YouTube, Castlevania IV 4-3 tunnel background][sc4-tunnel]
- [SNES Central, S-DD1][sdd1]; [Retroware, The curious case of SFA2 on the SNES][sfa2-rw];
  [GameFAQs, SFA2 review][sfa2-gf]
- Screens to study: [Background HQ, DKC2][bghq]; [The Spriters Resource][tsr]
