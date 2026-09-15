# SNES art bible

The rules the SNES sprites follow, written from the Ward bake-off (item 1905): Spritesmith's Final
Notice model paints each pose, and each frame is cleaned by hand to the machine. Limits are
`docs/SNES-PLAN.md` section 2; this page is how the art meets them.

## Size and hardware

- Stage 1 characters stand **56-64 px** tall (Ward's idle is 61 with his outline) and cover with
  at most **10** 32x32 and 16x16 OAM entries a frame. Ward needs 5-9.
- Stage 2 characters are 40 px, at most 6 entries.
- A frame is text rows of `0-9A-F`, `0` transparent, `palette[i - 1]` for index `i`, in rgb15.
  `origin` is the centre of the feet on the bottom row.

## Palette: one per character, 15 colours, chosen by hand

Letting a clustering pick the colours failed: it spent five slots on near-blacks and left the face
mud. Ward's slots, in this order, are the template for every character:

| Index | Use |
| --- | --- |
| 1 | outline and eyes: a dark blue-grey, never black (3,3,5) |
| 2 | shoes and the deepest folds |
| 3-6 | the suit, dark to rim light (4 steps) |
| 7-8 | hair, dark and mid |
| 9-B | skin: shadow, base, light |
| C-D | shirt: shade and white |
| E-F | tie: base and light |

A foe changes these slots, never their order, so palette swaps line up.

## Cleaning a model pose

1. **Key the painting**: flood the white background from the corners; the floor shadow goes with
   it, and whatever of it survives in the bottom three rows is dropped.
2. **One scale for every pose**, taken from idle (crown to sole), so a raised fist makes the frame
   taller, never the man smaller.
3. **Shrink by area average** inside the figure only, keep the largest connected piece, and map
   each pixel to the nearest hand-picked colour.
4. **Lock the head.** The model draws a different head in every pose (item 1859's trap). One head,
   drawn by hand as an 11x9 grid, is pasted over every frame where the model's head is, found by
   matching the idle head; a pose where the match is wrong gets its position by hand.
5. **The face reads in 3 px**: two dark eyes under a hair-coloured brow, a two-pixel mouth, lighter
   skin on the upper left.
6. **No stray pixels**: an opaque pixel with at most one opaque neighbour goes, and a pixel unlike
   all four neighbours that agree takes their colour.
7. **Outline last**: a one-pixel ring of index 1 around the silhouette, outside it, so thin arms
   and fists keep their width.
8. **Judge on a plain canvas**, never the game viewer: a 1x strip and 3x frames on black, salmon and
   burgundy floors, with the model painting and the NES sprite beside them.

## What the model does not give

- **Walk cycles.** Its four walk paintings are near the same stride; a real cycle needs contact,
  passing and recoil poses asked for one at a time, or drawn by hand from one of them.
- **Faces.** At this size its faces shrink to noise; the head is always the hand-drawn one.
