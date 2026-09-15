# NES art bible

**Every NES art card under epic 1785 follows this page.** A sprite that breaks a rule here is not
done, whoever or whatever drew it (hand grids, a puppet script or Spritesmith). Tim, 00:58 EDT
2026-09-15: *"these NES graphics kinda really suck dude lmao"*; he chose a local pixel-art lead, no
paid services.

The reference is how real NES character sprites are built, studied from gameplay screenshots of
*Mega Man 2*, *Ninja Gaiden*, *River City Ransom* and *TMNT II* (the screenshots on each game's
Wikipedia article). *Double Dragon II* and *Kung-Fu Heroes* had no NES screenshot there and the
sprite archives refused downloads, so their points below are marked *(from memory, unverified)*.
Hardware limits are `docs/NES-PLAN.md` §1; game lessons L1-L20 are `docs/NES-CLASSICS.md`.

The first cast drawn to this page is `src/art/cast.mjs` (Ward, Mercer, Security Associate; see
`?art=cast`), made by a puppet script: limbs drawn as thick lines, each layer outlined on its own,
then stacked, which gives the separation lines of rule 3 for free.

## 1. Size: pick the game's scale, build it from 8x8 tiles

| Use | Size | Seen in |
| --- | --- | --- |
| Stage 1 brawler (auditors, staff) | **24 wide x 40 tall**, 3 tiles across, 5 down | TMNT II turtles are about this size |
| Stage 2 escape | **16 x 32** | Ninja Gaiden's Ryu is 16-ish wide, about 32 tall |
| Chibi / portrait-like | 16 x 24 with a big head | River City Ransom |
| Bosses | 32-48 wide, several palettes by splitting into stacked sprite groups | TMNT II's bosses |

- **Do** keep a character inside a fixed box (24x40) in every frame, feet on the same row (row 38),
  so tiles line up and the hit box never jumps.
- **Don't** let a punch or hair poke one pixel past the box into a fourth tile column: that is a 4th
  sprite on every scanline it touches, and two characters on a row start flickering.

## 2. Silhouette first

Fill the figure in one flat colour at 1x. If you cannot tell the pose (walking, punching, hurt), no
amount of shading will fix it.

- **Do** push poses: a punch arm straight out to the box edge, a stride with the feet 8-10 px apart,
  a hurt pose with the head thrown back and arms flung.
- **Don't** keep arms glued to the body in every frame (the "faint arms" of the old cast). At least
  one pixel of air between arm and torso in the walk's contact frames.

```
don't (arm lost in torso)    do (air gap + outline)
 .1222221.                    .1222221..
 .1222221.                    .12222211.
 .1222221.                    .1222221121
 .1222221.                    .122222.121
```

## 3. Outline: black, and between overlapping parts too

Sprite colour 1 is black (`0x0F`). Every part carries a 1-px black edge, **including where a front
limb crosses the body**: that line is what makes an arm read as an arm.

- **Do** outline each layer separately (back leg, back arm, front leg, torso, head, front arm) and
  stack them.
- **Do** break the outline for a lit edge only when the background behind is dark by design
  (Ninja Gaiden drops the outline and uses a dark blue ramp; that works on its busy backgrounds but
  not on our flat office floors).
- **Don't** draw hair in the outline colour as one solid mass: that is the "blob of hair". Give it
  a highlight streak in colour 2 or 3, or strand pixels.

## 4. Three colours: dark, mid, light

One sprite palette is 3 colours plus transparent. Spend them as a ramp, not as three unrelated
things.

| Slot | Job | Ward | Mercer | Associate |
| --- | --- | --- | --- | --- |
| 1 | outline, hair, shoes, creases, tie | `0x0F` | `0x0F` | `0x0F` |
| 2 | clothes (the character's colour) | `0x00` charcoal | `0x12` blue | `0x17` rust |
| 3 | skin, shirt, hands, highlights | `0x37` tan | `0x37` tan | `0x36` pink |

- **Do** pick slot 2 from rows `0x0_`-`0x1_` bright enough to stay visible against the `0x0F`
  backdrop (grey `0x00` passes, navy `0x02` does not), and different in hue from the floor it walks on.
- **Do** reuse slot 3 for everything light (skin, white shirt, badge, hair highlight). Mega Man 2 does
  exactly this: skin and his suit highlights share a slot.
- **Don't** mix a second sprite palette into one frame. Mega Man's face is an extra overlaid sprite
  with its own palette *(from memory, unverified)*; our engine forbids it (`frameOnePalette`), so
  design within three.
- **Colour means a job** (L3): a palette swap of the Associate is a new foe only if the colour always
  predicts what it does.

## 5. Faces in 2-4 pixels

At 24x40 the head is about 8 wide and 9 tall inside its outline.

- **Do** place the eye as a **2-px vertical dash** of colour 1, two pixels in from the facing edge;
  mouth one pixel below the nose; a one-pixel nose step on the facing edge.
- **Do** close the eye for hurt (a horizontal dash) and open the mouth a pixel wider.
- **Don't** give a 1-px eye directly under a 1-px brow: at 1x it merges into a bar (sunglasses).
- River City Ransom gets expression from a **big head** (about a third of the body). Our brawler
  keeps realistic proportions; if a face will not read, widen the head a pixel before adding detail.

```
eye, facing right    hurt
  1133333              1133333
  1131313   <- eye     1131113  <- shut
  1133313              1133333
  .133333              .133333
  ..13331   <- mouth   ..13111  <- open
```

## 6. Hands and feet

- **Do** end every arm in a 2x2 hand of colour 3; a punch ends in a **3x3 fist** with one dark
  knuckle pixel.
- **Do** make shoes 5 px long, 2 tall, colour 1 with one slot-2 toe highlight, pointing the way the
  character faces.
- **Don't** end a limb in the outline colour: a dark hand on a dark sleeve disappears.

## 7. Animation: few frames, held on the 60 Hz tick

| Animation | Frames | Timing | Notes |
| --- | --- | --- | --- |
| idle | 1-2 | hold | Double Dragon's heroes stand still *(from memory, unverified)* |
| walk | **4**: contact, pass, contact (other leg), pass | **8 fps** (7-8 ticks a cel) | body up 1 px on the pass frames; arms swing against the legs |
| punch | 2: chamber, extend | chamber 1 cel, extend held 3 (`[0,1,1,1]` at 10 fps) | extend reaches the box edge; torso leans 2 px into it |
| hurt | 1 | held while the hit freeze and knock-back play (L6) | head back, eye shut, one foot off the floor |
| knockdown / down | 2 / 2 | 6 fps / 3 fps | see `src/art/staff2.mjs` |

- **Do** move whole blocks between frames (head, torso) so tiles repeat; `add()` in the art module
  reuses identical 8x8 tiles, and fewer tiles is how real carts fit.
- **Don't** add in-betweens: an NES walk is 3-4 frames, and smoothness comes from steady timing,
  not frame count.

## 8. Contrast against the background

- **Do** check every sprite on the three floors it will walk on: black `0x0F`, salmon stone `0x26`,
  burgundy carpet `0x06` (Stage 1). The black outline carries it on light floors; slot 2 carries it on
  black.
- **Do** keep backgrounds one step darker or less saturated than the sprites standing on them
  (River City Ransom's grey pavement under saturated shirts).
- **Don't** give a character a slot-2 colour within a hue step of its floor (a burgundy suit on
  burgundy carpet).

## 9. The bar, as a checklist

A card's proof sheet shows each frame at 1x and 4x on the three floors, and passes when:

1. The pose reads from the flat silhouette at 1x.
2. Every part has a black edge, including where limbs cross the body.
3. Three colours used as a ramp; one palette per frame; no fourth tile column.
4. An eye and a mouth visible at 4x; hurt changes the face.
5. Hands and fists are light; shoes point forward.
6. Walk has 4 frames with a visible stride and a 1-px bob.
7. Nothing vanishes on black, salmon or burgundy.

## 10. Where the first cast stands against the bar

Comparison sheet (study only, gitignored, never shipped): `docs/refs/comparison.png`, built from
the four screenshots in `docs/refs/`.

- **Meets:** size and tiles, silhouette, black outline with separation lines, light hands and fists,
  4-frame walk with stride and bob, contrast on all three floors.
- **Closer after one pass:** knee, cuff and elbow creases now break up the flat suits.
- **Still short of the references:** River City Ransom and Mega Man 2 spend slot 3 on highlights
  (shoulders, shirt folds, helmet shine); ours spends it only on skin and shirt, so the suits read
  flatter. The faces are correct but small next to the references' big heads, and Mercer's hair
  still reads as a cap at 1x. Verdict: **clearly NES, a solid Double Dragon-tier cast, not yet River
  City Ransom-tier.** The next art cards (1804 Ward, 1843 Mercer, 1806 Associate) start from
  `src/art/cast.mjs`, widen the head a pixel, and add slot-3 highlights before new animations.
