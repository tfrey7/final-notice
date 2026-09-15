# SNES cutscenes

*Generated from the knowledge base; edit through `kb_update`, not here.*

## how the SNES told stories between play

### In-engine acting: the game's own sprites on the game's own maps

*`kb_get snes-cutscenes-in-engine-acting-the-game-s-own-sprites-on-the` · version 1*

**Final Fantasy VI (Square, 1994), the opera.** The best-known SNES scene is not a cutscene you watch:
the player walks Celes around Draco's sprite "as the music swells", picks the right lyric from memory
of the script, and carries roses to the balcony, so "nailing the performance results in a blissful
synchronization between scripted sequence and player control". Draco's aria first "acts as a tutorial
of sorts" before the player takes Maria's part. The pixel art's limits help: the reader fills the
gaps, and circles walked round a sprite read as a tango [1]. The sprites themselves are the everyday
field sprites, one static frame for Celes facing down reused for her chained pose [2]. Afterwards the
scene turns straight into a timed rafters run and a boss fight [2].

*Takes:* staging with the play sprites instead of new art; the music carries the emotion; a scene
can end by handing the pad over mid-tension.

**Chrono Trigger (Square, 1995).** Its designers built "Active Time Event Logic", "where you can move
your character around during scenes, even when an NPC is talking to you", and battles happen on the
field map rather than a separate screen, with the programmer fighting to load them "without
slow-downs or a brief, black loading screen" [3]. The anime films came only with the 1999 PlayStation
port and play *before* the in-engine version of the same event, which is still shown [4][5].

*Takes:* no black cut between scene and play; the stage's own room is the scene's set.

**EarthBound (Ape/HAL, 1994/95).** Scenes are acted by the overworld sprites with dedicated frames
(Ness and Paula jump at the naming screen; Jeff jumps the boarding school fence) [6]. The sepia-tinted
flashbacks and the photographer's snapshots are *from memory, unverified* here.

### Wordless and near-wordless openings

*`kb_get snes-cutscenes-wordless-and-near-wordless-openings` · version 1*

**Super Metroid (Nintendo R&D1/Intelligent Systems, 1994).** Backstory is a few white-on-black
screens read in "a flat, monotone voice"; Samus's log is typed with keyboard sounds; the music "seems
to rise and fall" with the narration, then stops dead for "CERES STATION IS UNDER ATTACK!!" and the
player walks the dark station among dead scientists to an unwinnable Ridley and a 60-second escape
[7]. The whole game has under 100 words of text and the eleven-word spoken line is its only dialogue
[8][9].

*Takes:* a silence before the hit; the environment tells the crime (the bodies, the broken jar); give
the pad back within a minute.

**Super Castlevania IV (Konami, 1991).** One of the first SNES showcases for layering and Mode 7 [10];
its tone came from "dark, earthy colors; ominous, almost subliminal sound effects" and a sense of
"impending doom" (Entertainment Weekly), and director Masahiro Ueno was proud of how sound and music
built the atmosphere [11]. The opening's exact Mode 7 staging (Simon walking to the gates) is
*unverified* in text sources; watch it before copying it.

*Takes:* mood from low ambient sound more than from words; Mode 7 as a rare set piece.

**Terranigma (Quintet, Japan October 1995).** The prologue is a slow text crawl about a planet with two
souls, Lightside and Darkside [12], opening on "Origins": solo clarinet against a ticking clock,
building to strings and choir [13]. Mode 7 maps and graphical effects were praised [14].

*Takes:* a ticking pulse under a few typed lines is enough for an opening; the clock is our office.

### Full-screen illustrated scenes

*`kb_get snes-cutscenes-full-screen-illustrated-scenes` · version 1*

**Flashback (Delphine, 1992; SNES 1993).** Hand-drawn backdrops and rotoscoped play animation, from
filming a man and drawing over the frames — "more than 1,000 [sprites] for the main character
himself" (Paul Cuisset); the cutscenes themselves were built frame by frame from flat polygons
[15][16]. North American SNES boxes carried a Marvel comic to explain the story [16].

*Takes:* realistic, grounded motion reads as serious; but full-screen polygon film is slow on a
Super FX-less SNES, so we use it for one short shot at most.

**Tales of Phantasia (Namco/Wolf Team, Japan 1995).** The intro sings: a vocal track that could never
fit the SPC700's 64 KB was cut into tiny samples swapped into sound RAM on the fly by a custom driver
[17][18].

*Takes:* one sampled voice line per boss is feasible if it is short; a sung intro is not our scope.

**Street Fighter Alpha 2 (Capcom, SNES 1996).** Its large portraits and endings survived a 32 Mbit
cartridge because the S-DD1 chip decompresses graphics as the game asks for them [19][20]; "a couple
bits are removed or altered from character endings" [21].

*Takes:* big illustrated portraits cost ROM; we keep one 64x96 portrait per speaker, as the cinema
already does, and no special chip.

### Brawler story beats

*`kb_get snes-cutscenes-brawler-story-beats` · version 1*

**Final Fight (Capcom, SNES 1991).** A short opening: Haggar takes a call from Mad Gear, who have
kidnapped Jessica to make him let them run the city; then straight to the streets [22][23].

*Takes:* the whole premise in one phone call and one picture, then play.

**Batman Returns (Konami, SNES 1993).** Cutscenes between stages from the film [24][25] that "won't
make a lot of sense unless you've seen the movie" [25]; large sprites and "dark, moody colors" [25]; a
skip that needed Start on pad 1, A+B on pad 2 and Select [26]; and a Mode 7 Batmobile stage as a
change of pace [25].

*Takes:* dark palettes suit a grounded story; skipping must be one button, never a code; a scene must
stand alone for someone who did not read the design.

**Donkey Kong Country 2 (Rare, December 1995).** The story is barely a scene: DK captured at the beach,
and a ransom note from Kaptain K. Rool left in his broken chair, read as text [27].

*Takes:* a prop carries the plot — our ledger page, the EVIDENCE file.

### The effects, and what late-1995 hardware allowed

*`kb_get snes-cutscenes-the-effects-and-what-late-1995-hardware-allowed` · version 1*

- **Colour math** adds, subtracts or half-blends the main screen with the sub screen or one fixed
  colour (COLDATA); a colour window limits where it applies; sprites in palettes 0-3 never blend and
  sprites cannot blend with each other. Its uses are shadows, ghost fade-outs, translucent text boxes
  and darkness filters [28]. Because the registers can change per scanline by HDMA, a fixed colour can
  paint a gradient [28][29].
- **Mosaic** samples the top-left pixel of each block, 1x1 to 16x16, per BG layer, applied before
  windows and colour math [30]; it does not touch sprites (*unverified* in [30], standard SNES
  behaviour).
- **Master brightness** (INIDISP) fades in 16 steps; already `brightness()` in `src/snes/fx.mjs`.
- **Mode 7** is one 256-colour affine layer with no BG2 or BG3 beside it, so a Mode 7 shot has sprites
  over it but no text box; the game already spends it on the title zoom, the Scene 2 alarm spin and
  the Great Seal press (`docs/SNES-PLAN.md`).
- **Sound:** 8 voices and 64 KB of sound RAM shared by every sample (`docs/SNES-PLAN.md`), so a scene
  cue is the same bank as play, and a voice line is a short sample.

### What held true across all of them

*`kb_get snes-cutscenes-what-held-true-across-all-of-them` · version 1*

| Lesson | Where it came from | Final Notice rule |
| --- | --- | --- |
| Stage with the play sprites and rooms | FF6, Chrono Trigger, EarthBound | scenes after a boss play in that boss's room, sprites acting, before any portrait |
| Music carries the feeling; stop it for the hit | FF6, Super Metroid | each scene has one cue and one hard silence |
| A prop tells the plot | DKC2, Final Fight's phone | the bill, the ledger page, the EVIDENCE file |
| Short, then give the pad back | Super Metroid, Final Fight | opening under 45 s, a between-stage scene under 60 s |
| Skipping is one button | Batman Returns (the counter-example) | Start skips any scene; A/B/Y turns a page |
| Dark, grounded palettes read as serious | Batman Returns, Castlevania IV, Flashback | no bright sky, no cartoon takes; acting is small: a turn, a pause, a hand |
| Mode 7 is an event, not a style | Castlevania IV, Batman Returns | three uses in the whole game, no more |

## Final Notice's scenes, board by board

*`kb_get snes-cutscenes-final-notice-s-scenes-board-by-board` · version 1*

Every board is drawn at 256x224 by `docs/boards/cutscenes.html`, which paints with the game's own
SNES code: the cinema's backdrops and portraits (`src/snes/cinema.mjs`), the BG3 text box
(`src/snes/text.mjs`, card 1911) and the effect passes (`src/snes/fx.mjs`, card 1909) — mosaic,
brightness, colour math, windows and Mode 7 — so each board is a frame the build can reproduce, not
a painting. People and props are stand-in shapes until the sprite and portrait cards land. Serve the
worktree and open `/docs/boards/cutscenes.html` to read each board's camera, sound and SNES notes;
the contact sheets below are those pages shot.

### The rules every scene follows

*`kb_get snes-cutscenes-the-rules-every-scene-follows` · version 1*

- **Start skips, always.** A, B or Y turns a page. A scene seen once is skipped by Start without
  confirmation; there is no second button.
- **Lengths:** opening 40 s, Scenes 1-3 45-55 s, a boss introduction 4-8 s, ending 25 s plus credits.
  The pad returns on the last frame of a boss introduction, never after a fade.
- **Play first, portraits second.** Scenes 1 and 2 open with the play sprites acting in the room for
  3-4 s before any text box (FF6, Chrono Trigger). Scene 2 has no cut from the fight at all.
- **One cue and one silence per scene.** Cues are the existing names (`title`, `scene`, `boss`,
  `ending`, jingles, effects); each scene stops its music once, just before its hit: the stamp in the
  opening, "What incident?" in Scene 2, the speaker in Scene 3.
- **Props carry the plot.** The bill (47 lifetimes) appears in the opening and again on Bellwether's
  desk; APPROVED stamped in the opening is answered by EVIDENCE stamped in the ending; the clerk
  working late in the opening is the last lit window of the credits.
- **Transitions have meanings.** Mosaic changes place; a hard cut stays inside a conversation;
  brightness fades end a scene; Mode 7 is spent only on the stamp, the alarm spin, the press and the
  EVIDENCE stamp — and a Mode 7 frame never carries a text box (Mode 7 has no BG3).
- **Grounded acting:** turns, pauses, a hand on a button, a tie straightened. No jumps, sweat drops
  or emotes.

### Opening (wordless, before the title)

*`kb_get snes-cutscenes-opening` · version 1*

![Opening boards O1-O8](shots/item-1976/opening.png)

Night skyline, a clock tick, a tilt up a tower to its one lit floor; the bill printing
LIFETIMES BILLED: 47; APPROVED stamped and the music cut; a lift climbing from B3 to the lobby; doors
parting on two auditors, backlit; the title melody begins and the logo takes over (card 1926's zoom).
It shows who the auditors are (they come up from below) without a word of dialogue.

### Scene 1: the assignment

*`kb_get snes-cutscenes-scene-1-the-assignment` · version 1 · **superseded by** `kb_get final-notice-story`*

![Scene 1 boards S1-1 to S1-6](shots/item-1976/scene1.png)

### Boss introductions

*`kb_get snes-cutscenes-boss-introductions` · version 1*

![Boss boards B1-B3](shots/item-1976/bosses.png)

Vellum's memo card, FILED stamp and "You're overdue." already exist (card 1931) and the Great Seal's
card exists (card 1932); these boards add the camera pan into the office, Vellum standing from the
desk, the Custodian's shorter slip, and the press lowering by Mode 7 before its card.

### Scene 2: the incident

*`kb_get snes-cutscenes-scene-2-the-incident` · version 1 · **superseded by** `kb_get final-notice-story`*

![Scene 2 boards S2-1 to S2-7](shots/item-1976/scene2.png)

### Scene 3: original documents

*`kb_get snes-cutscenes-scene-3-original-documents` · version 1 · **superseded by** `kb_get final-notice-story`*

![Scene 3 boards S3-1 to S3-6](shots/item-1976/scene3.png)

### Ending

*`kb_get snes-cutscenes-ending` · version 1*

![Ending boards E1-E5](shots/item-1976/ending.png)
