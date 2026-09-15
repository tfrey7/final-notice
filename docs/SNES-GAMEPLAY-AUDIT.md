# SNES gameplay audit (item 2113)

The SNES build (`?snes`) judged against Final Fight and Streets of Rage 2 for Stage 1 and a tight SNES
action game for Stage 2. Each finding is backed by the stage code; the numbers marked *bot* come from a
headless run of the pure stage modules with the same tune the SNES scene builds (walk toward the nearest
foe, punch every 8 frames). Worst first.

| # | Problem | Where | Backed by |
|---|---|---|---|
| 1 | The Stage 1 staff still fight at NES size and speed: their reach, spacing and walk were never grown 1.5x with the bodies, and the Final Fight slowdown of item 2016 weighs an older foe table they don't read, so an Associate stands 16 px from you, inside your sprite, and swings on his old timings. | Stage 1, every area | `stage1/staff.mjs` `KINDS` vs `snes/weight.mjs` `FOES_WEIGHT` and `snes/stage1/finisher.mjs` `SCALED` |
| 2 | The Account Manager can't be pinned: his spot is always behind whichever way you face, and he walks faster than you (1.25 vs 1.125 px/frame), so turning round just sends him round again. | Stage 1, Service Floor's second lock and Waiting | `spot()` flank; *bot* stalemated on him for 28,000 frames |
| 3 | Foes stack: every foe that squares up picks the same point beside you, so two Associates (or an Associate and a Supervisor) merge into one sprite, and with no attack tokens all three on screen can swing at once. | Stage 1, Service Floor, Internal Review, Waiting | `spot()`, no token in `thinkStaff`; *bot* 459 stacked foe-frames in one area |
| 4 | Vellum's fight is mostly waiting: he guards for 80 frames between attacks, is armoured through each wind-up, and only a thrown Associate (which he summons late) breaks the guard; his speed and reach were never scaled or weighed either. | Stage 1, Vellum's office | `stage1/vellum.mjs` `VELLUM`; *bot* 457 of 1,338 frames facing his guard, 15 blocked punches |
| 5 | Vellum's office is wider than the screen: its floor runs to x 282 on a 256-px screen, so you, his rush (which stops at 274) and summoned Associates can leave the right edge of the view. | Stage 1, Vellum's office | `VELLUM ARENA.right: 282`, `snes/screen.mjs` `WIDTH = 256` |
| 6 | Stage 1 is thin: 13 foes over eight screens, never more than three at once, and the first area feeds single Associates one at a time behind PUNCH/STEP/THROW prompts; Final Fight's first stage throws several times that. | Stage 1, all areas | `stage1/areas.mjs` `AREAS` |
| 7 | Foes pop into view: a wave appears 96 px in front of you inside the locked screen instead of walking on from the screen's edges. | Stage 1, every wave | `fillSeats()` spawn x |
| 8 | There is no run on the SNES pad: the double-tap dash is NES-only and L/R are the evasive step, so the eight screens are walked at 67 px a second. | Stage 1 | `input.mjs` SNES `dash: null` |
| 9 | Stage 2 hits have no weight: a cast into an Associate or the Custodian only flashes it; no hit-stop, no knockback, no stagger, and a winding-up Associate still fires. | Stage 2, every area | `stage2/casting.mjs` `strike()`, `stage2/foes.mjs` |
| 10 | Stage 2's Associates barely fight back: they amble at 0.34 px/frame and send one slow glyph (about 1 px/frame) every two and a half seconds, so nothing threatens an auditor who keeps moving. | Stage 2, Archive Access, Original Copy | `ASSOCIATE` with `ASSOCIATE_WEIGHT` |
| 11 | The Records Custodian stands still for two and a half seconds every cycle while his Associates cast, then makes one straight lunge; the fight is waiting for the lunge. | Stage 2, Original Copy | `stage2/custodian.mjs` `CUSTODIAN.direct: 150` |
| 12 | The Great Seal ends in dead air: two seconds of him lying down, then a flat 40-tile walk with one step and nothing in it before the stage clears. | Stage 2, after the Great Seal | `stage2/greatseal.mjs` `EXIT_MAP`, `downFrames: 120` |
| 13 | A late second punch on a staggered foe grabs him instead: after a punch's recovery the next press tries a grab first, which breaks the combo. From the code, not seen in play. | Stage 1, the punch combo | `stage1/moves.mjs` `controlFree()` |

Every fix is gameplay only, with grey-box placeholders: no new art, music or cutscenes.

## Cards filed (epic 1898)

| Problem | Card |
|---|---|
| 1 | 2115 staff foes at SNES size and Final Fight weight |
| 2 | 2116 the Account Manager can be pinned and hit |
| 3 | 2117 foes spread out and take turns to attack |
| 4 | 2118 Vellum: a fight you play, not wait through |
| 5 | 2119 Vellum's office fits the screen |
| 6, 7 | 2120 fuller waves that walk on from the edges |
| 8 | 2122 a run on the SNES pad |
| 9 | 2123 casts that hit hard |
| 10, 11 | 2124 Associates and Custodian that press you |
| 12 | 2125 cut the dead air after the Great Seal |

Problem 13 is left unfiled until someone sees it in play.
