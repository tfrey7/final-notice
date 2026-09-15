# Final Notice on the Super Nintendo — the plan, and the cards that build it

*Generated from the knowledge base; edit through `kb_update`, not here.*

*`kb_get snes-plan-introduction` · version 1*

Tim, 07:30 EDT 2026-09-15: *"Final Notice work: let's try for an SNES version now, and all that
entails"*. The NES version (epic 1785, `docs/NES-PLAN.md`) is frozen, playable and kept. Every card
under epic **1898** builds one piece of what follows. Where the NES plan filled a gap the SNES no
longer needs to, this plan says so (**back:**); where the SNES still cannot do what the design pack
asks, it says **gap:**.

## 1. One game, two machines

*`kb_get snes-plan-one-game-two-machines` · version 2*

The SNES version is a sibling build of the same game, not a new game. It reuses, unchanged:
`src/flow.mjs` (scene order, lives, continues, checkpoints), `src/story/script.mjs`, the stage logic
(`src/stage1/{moves,waves,foes,areas,tuning}.mjs`, `src/stage2/{core,physics,casting,areas,escape,conveyor,greatseal}.mjs`),
`src/injunction.mjs`, `src/tune.mjs` (`?tune`) and `src/fast.mjs` (`?fast`). What differs is how a
machine draws and sounds: screen, colour, art, backgrounds, effects, synth, songs, CRT look.

- **`?snes` picks the SNES build.** Every existing flag works beside it (`?snes&go=stage2`,
  `?snes&art=ward`, `?snes&who=mercer`). Without it the page is the NES game, as today.
- **The closer flips the default** once the SNES build plays start to finish and Tim has seen it:
  then the plain link is the SNES game and `?famicom` keeps the NES one. Until then nothing about the
  live NES game changes.
- **`src/platform.mjs`** (engine card) is the one switch: it answers a profile —
  `{ name, WIDTH, HEIGHT, colour(), bakeArt(), synth, songs, crtLook }` — and scenes ask it, never
  `src/nes/*` directly. A stage scene that still imports `src/nes/` is ported by its SNES card.
- Gameplay numbers are in world units. The SNES draws characters about 1.5x taller, so each stage
  keeps its logic and scales its reach, hitboxes and speeds through one factor in its tuning table
  (`stage1.scale`, `stage2.scale`), tuned by feel with `?tune`, never by rewriting moves.

## 2. What "SNES game" means here

*`kb_get snes-plan-what-snes-game-means-here` · version 3*

Held to the real machine, checked by `src/snes/limits.mjs` in tests, drawn by Phaser 4.2.1 as now.

| Limit | Rule in this game |
| --- | --- |
| Screen | 256x224, scaled by a whole number, crisp; the CRT card adds the 8:7 pixel aspect the TV showed. (**back:** no overscan strip to leave empty.) |
| Colour | 15-bit BGR555: each channel one of 32 steps; `rgb15(r,g,b)` with 0-31 values, never a free hex. |
| Palettes | 8 background palettes and 8 sprite palettes, 15 colours plus transparent each (colour 0). A sprite uses one palette; a background tile uses one. |
| Sprites | 128 OAM entries on screen; each entry 8x8, 16x16, 32x32 or 64x64 (one size pair per screen, this game uses **16x16 and 32x32**). At most **32 entries on one scanline** and **34 8x8 tiles' worth** (time over); past 32 the highest OAM indexes vanish, past 34 tiles the lowest do — the SNES drops, it does not flicker (**back:** no NES rotation flicker). Checked in `docs/SNES-CLASSICS.md`. |
| Backgrounds | Mode 1: BG1 and BG2 in 16 colours per tile, BG3 in 4 colours (HUD and text), 8x8 tiles, each layer scrolls on its own; per-scanline scroll changes (HDMA) for floor perspective and heat shimmer. |
| Effects | Colour math (add, subtract, half) between the main and sub screen for glass, glows and shadows; master brightness 0-15 for fades; mosaic 1-16 px for transitions; windows to mask; Mode 7 (one 256-colour affine layer, scale and rotate) for set pieces only. |
| Sound | SPC700 + S-DSP: 8 voices of BRR sample playback (9 bytes per 16 4-bit samples, about 3.6:1 against 16-bit PCM), 32 kHz output, 4-point Gaussian interpolation (the soft, warm top end), per-voice ADSR or GAIN, pitch modulation from the previous voice, one shared noise source, an echo with an 8-tap FIR filter and a delay of 16-240 ms; 64 KiB of sound RAM shared by driver, songs, samples and the echo buffer (2,048 bytes per 16 ms of delay, so a 240 ms echo takes 30 KB), so samples are short loops. A sound effect takes a voice (voice 8, then 7) from the music and gives it back. |
| Pad | D-pad, B, A, Y, X, L, R, Select, Start. |
| Slowdown | **No emulated slowdown** (Tim, 09-15, item 2172): a crowded scene runs at the same speed as an empty one. The SNES profile's `slowdownBudget` is Infinity; the NES keeps its slowdown. |

Out of scope, as for the NES: a real ROM (a later epic could feed the same data to a ca65/WLA build).

## 3. What made the references great, and what we take

*`kb_get snes-plan-what-made-the-references-great-and-what-we-take` · version 3*

Checked against sources in `docs/SNES-CLASSICS.md` (lessons S1-S10, a source for every claim);
what could not be confirmed is marked *unverified* below and is our choice, not a quote.

| Game | What it did | Final Notice takes |
| --- | --- | --- |
| Final Fight (Capcom, arcade 1989, SNES 1991) | Big, readable characters (Haggar's "near 100 px" *unverified*); hitstop that pauses the attacker as well as the foe; the SNES shows 2-3 foes (arcade 9-10) and adds stopping points to make up for it; a distinct silhouette and name per foe type; Haggar's throws the heavy damage. Deep belt floors *unverified* | Stage 1 scale and 2-3 foes in more, smaller waves; hit-stop on Ward and the foe, longer on a multi-hit; a one-colour HDMA floor gradient is our own choice |
| Sunset Riders (Konami, SNES 1993) | A wanted poster of the stage's boss at the start of each stage; bosses speak voiced lines, **subtitled on the SNES** (the text bubbles are the Genesis port); most-damage bonus. "Cartoon clarity" *unverified* | a boss title card at the start of the boss's area (name + department, a filed-memo look) and one sampled voice line per boss with its subtitle on BG3 |
| TMNT IV: Turtles in Time (Konami, 1992) | Throwing foes at the screen, on a button (random in the arcade) — **drawn frames, not Mode 7**, which cannot scale sprites; Mode 7 is the into-the-screen Neon Night-Riders ride; arcade score arranged for SNES; variety by time-period stages. Sampled drums and palette-swapped foes *unverified* for IV | the "throw into the camera" finisher on the last foe of an area, drawn as 3-4 growing frames; palette-swapped foes (sourced to River City Ransom and TMNT II in `docs/NES-CLASSICS.md`) |
| Super Castlevania IV (Konami, 1991) | Mode 7 rotating rooms (Stage 4) in several set pieces, the player still in control; eight-way whip and swinging from rings; mood from Adachi and Kudo's score and near-subliminal sound effects; parallax. Chandeliers are platforms, Mode 7 *unverified*; "sampled orchestra" *unverified* | Mode 7 reserved for three moments: the Great Seal press, the Retention alarm spin in Scene 2, the title logo zoom; the pad stays live during the spin; low office effects for mood |
| Donkey Kong Country (Rare, 1994) | SGI-rendered models compressed into 16-colour sprite palettes and background tiles; praised parallax (layer count *unverified*); David Wise's tiny single-cycle Wavestation/U-110 samples, filtered and clipped to fit 64 KiB; rhythmic environmental sounds; echo in the cave music | model-painted art cleaned to one SNES palette per character; 2-3 parallax layers per area (our number); a short-loop bank; echo on Stage 2 kept short (the buffer shares the 64 KiB); office ambience written on the beat |
| Chrono Trigger (Square, 1995) | Mitsuda built the score on leitmotifs of the main theme, quoted whole, in fragments and reshaped; 64 tracks. "Small instrument set" and "melody first" *unverified* | **not the leitmotif method** (Tim, 14:40 EDT 09-15: "each track stands alone (while still being consistent with the entire project)"). Every cue is its own song with its own melody, harmony and groove; the soundtrack holds together through one instrument set, era and mood. The main theme (`docs/THEME.md`) plays on the title and in story scenes, and anywhere else at most as a brief nod (a bar on one instrument) |

Tim's pillars applied: **freshness through remixing few assets** (palette swaps, colour math and
parallax re-use tiles; in music the few assets are the sample bank, never one melody: every track is
its own song); **late-era corporate wave audio** (DX-style
electric piano, slap bass, gated snare, warm pads, sax/brass lead, all through the S-DSP echo);
**hide until needed** (debug views and the sound test only behind flags; HUD appears in play, fades
out when idle in scenes); **controls and feel first** (input and tuning land before any art).

## 4. Controls

*`kb_get snes-plan-controls` · version 3*

| SNES pad | Keyboard | Gamepad | Stage 1 | Stage 2 |
| --- | --- | --- | --- | --- |
| D-pad | arrows or WASD | d-pad or left stick | walk; double tap: run | walk, crouch, aim (hold R) |
| Y | Z or J | X / left face | light attack (chain three); walk into a reeling foe: grab | cast |
| B | X or K | A / bottom face | jump (Y in air = jump kick) | jump |
| A | C or L | B / right face | the auditor's special: Ward lunges forward, Mercer sweeps both sides | Emergency Injunction |
| X | V or I | Y / top face | heavy attack | swap enchantment |
| Y+X | Z/J + V/I within 3 frames | left + top together | Emergency Injunction (room clear, same cooldown) | — |
| L | Q | LB / LT | Objection parry | — |
| R | E | RB / RT | evasive step back | held: stand and aim in eight directions |
| Start | Enter | Start | pause, skip scene | pause, skip scene |

**Stage 1 combo routes** (each a `route*` dial in the brawl lab, 0 turns it off): light-light-light; light-light-heavy = knockback; light-heavy = launcher; heavy on a dazed (parried) foe = crush. Y and X pressed within `CLEAR_FRAMES` (3) of each other is the clear; slower is light then heavy.

**Page shortcuts** stay off every pad key: ` or F2 display mode, Tab dials, H boxes, G lines.

**back:** the NES double-tap step and A+B injunction become real buttons; Select is unused in play.
The NES mapping stays for `?famicom`. `src/input.mjs` answers the pad for the active profile; `src/controls.mjs` draws the list.

## 5. Art

*`kb_get snes-plan-art` · version 2*

Tim's ruling for sprites (07:26 EDT): **Spritesmith's Final Notice model paints the poses, a worker
hand-cleans them to SNES limits.** One worker on sprites at a time, in the order below, and
**Ward is a bake-off Tim judges before any other character starts** (the Mercer card is held for
his go). Backgrounds are not sprites and run beside them.

**Bible** (Ward's card writes it as `docs/SNES-ART-BIBLE.md` from what worked):

- Stage 1 characters **56-64 px tall** (the design pack's Final Fight scale, **back:** from the NES 40),
  built from 32x32 and 16x16 OAM entries; at most 10 entries a character, so three characters on a
  row stay under 32. Stage 2 characters **40 px** (Contra III), at most 6 entries.
- One sprite palette per character, 15 colours: a dark outline (not black), 3-4 ramps of 3 steps
  (skin, suit, tie/hair, accent), one highlight. Foes share a palette slot and differ by swap.
- Light from the upper left; one-pixel selective outline; no dithering on sprites, 2x2 checker
  dither allowed on backgrounds only; eyes readable in 2-3 px.
- Tim's concept art and the design pack stay private: gitignored, never committed, never in a shot
  posted outside the room.

**Art data** (the engine card implements it; art cards can start before it lands): a module exports
`{ palette: [15 rgb15], frames: { name: { w, h, pixels: ['...'], origin: [x,y] } } }`, pixels as text
rows of `0-9A-F` (`0` transparent), so a model pose cleaned in an editor is exported by a small
script into rows. `src/snes/art.mjs` cuts each frame into OAM entries, checks the limits and bakes a
Phaser texture; `artOr(name, fallback)` works exactly as on the NES.

| Module | Contents | Order |
| --- | --- | --- |
| `src/snes/art/ward.mjs` | Stage 1: idle, walk 6, punch 1-3, jump, jump kick, step, grab, throw, hit, knockdown, down; Stage 2: idle, run 6, jump, crouch, cast 5 directions, hit; HUD portrait | 1 (bake-off) |
| `src/snes/art/mercer.mjs` | same list | 2, after Tim's go |
| `src/snes/art/staff1.mjs` | Security Associate, Account Manager (palette swap + head), both stage sizes | 3 |
| `src/snes/art/staff2.mjs` | Contract Counsel, Facilities Supervisor, Records Custodian | 4 |
| `src/snes/art/vellum.mjs` | Vellum, with fang palette | 5 |
| `src/snes/art/greatseal.mjs` | Retention Director, press sprite parts, bindings, contract seal | 6 |
| `src/snes/art/spells.mjs` | casts, foe glyphs, injunction ring, pickups, props, first-aid box | 7 |
| `src/snes/art/portraits.mjs` | cinema portraits: Bellwether, Vellum, Ward, Mercer, speaker | 8 |
| `src/snes/bg/claims.mjs` | Stage 1 tiles and layers: Reception, Service Floor | parallel |
| `src/snes/bg/claims2.mjs` | Internal Review, Executive Waiting, Vellum's office | parallel, after claims (style) |
| `src/snes/bg/archive.mjs` | Stage 2 areas 1-3 | parallel |
| `src/snes/bg/disposal.mjs` | Disposal Line, Great Seal arena, wax front | parallel, after archive (style) |
| `src/snes/bg/ui.mjs` | title skyline and logo (Mode 7 zoom), select screen, HUD tiles, GAME OVER, THE END, cinema backdrops | parallel |

Parallax, per area: BG1 play layer, BG2 the far wall or skyline at half speed, BG3 the HUD; a
sub-screen layer for window glass and lamp glows by colour math.

## 6. Sound

*`kb_get snes-plan-sound` · version 2*

The NES tracker format stays (`src/audio/player.mjs` rows), widened to 8 voices and an instrument
column. `src/snes/audio/spc.mjs` renders it: BRR-style 4-bit sample loops at 32 kHz with Gaussian
interpolation, ADSR/GAIN, pitch modulation and the 8-tap echo, in WebAudio (the NES synth's
note-start lesson applies: start sources on render-block edges with gain held at 0).

| Bank (`src/snes/audio/bank.mjs`) | Samples |
| --- | --- |
| Keys | DX electric piano, warm pad (two detuned loops), bell/marimba |
| Bass | slap bass, synth bass |
| Lead | alto sax, brass stab, square lead |
| Drums | gated kick, gated snare, closed/open hat, clap, orchestra hit |
| Effects | punch, hit, whoosh, wax crack, stamp, alarm, typewriter blip, paper flutter, one voice line per boss |

Songs are ported from the NES arrangements, not rewritten: same cues, same melodies
(`docs/THEME.md`, `docs/MUSIC.md`), each file `src/snes/audio/songs/<cue>.mjs`. The sound test is
`sound.html?snes`. Effects keep their NES names, so gameplay calls do not change.

## 7. Stages, bosses and scenes — what the SNES adds

*`kb_get snes-plan-stages-bosses-and-scenes-what-the-snes-adds` · version 2*

Stage layout, foes, bosses, lines and scene order are exactly `docs/NES-PLAN.md` sections 4-8. The
SNES cards add, and only add:

- **Stage 1:** 56-64 px characters, up to 3 foes plus props (**back:** the NES cap stays; the design's
  crowds are a gap the pad cannot play well anyway); HDMA floor gradient and parallax windows;
  hit-stop and screen shake from the tuning table; the TMNT IV throw-into-camera finisher on an
  area's last foe; boss title card for Vellum; Vellum's fangs by a colour-math red flash.
- **Stage 2:** 40 px characters, 2-3 parallax layers of shelving; the wax front as a sub-screen
  layer tinting what it covers; conveyors on BG1 with animated tiles; the Great Seal's press as a
  Mode 7 layer that scales down on each stamp, its shadow by colour subtract.
- **Scenes:** full-colour backdrops with portraits on BG1/BG2, text on BG3, mosaic in and fade out;
  Scene 2's alarm spins the room in Mode 7 for a second.
- **Title, select, game over, ending:** the logo zooms in by Mode 7 over a parallax skyline;
  select portraits with a colour-math spotlight; credits over the night office with the lights
  going out floor by floor.
- **CRT:** the existing `src/crt/` modes gain an SNES look — RGB/S-video sharper than the NES
  composite, the 8:7 aspect, softer scanlines; `composite` keeps its blur and dot crawl.

## 8. Code layout (who owns which files)

*`kb_get snes-plan-code-layout` · version 2*

| Files | Owner card |
| --- | --- |
| `src/platform.mjs`, `src/snes/{screen,color,limits,art,debug}.mjs`, `src/main.mjs` profile switch | engine |
| `src/snes/layers.mjs` (BG layers, parallax, HDMA) | layers |
| `src/snes/fx.mjs` (colour math, brightness, mosaic, windows, Mode 7) | effects |
| `src/crt/*` SNES look | CRT |
| `src/input.mjs` SNES pad | pad |
| `src/snes/text.mjs`, `src/snes/hud.mjs` | text and HUD |
| `src/snes/audio/{spc,player}.mjs`, `sound.html` | synth |
| `src/snes/audio/bank.mjs` | instrument bank |
| `src/snes/audio/songs/*.mjs`, `src/snes/audio/sfx.mjs` | one music card each |
| `src/snes/art/*.mjs`, `src/snes/bg/*.mjs`, `docs/SNES-ART-BIBLE.md` | one art card each |
| `src/snes/scenes/{title,select,gameover,ending,cinema}.mjs` | front-end and cinema cards |
| `src/snes/stage1/*.mjs`, `src/snes/stage2/*.mjs` (SNES drawing of shared logic) | stage cards, in order |
| `docs/SNES-CLASSICS.md` | research |

Debug routes (`?snes&hw`, `?snes&layers`, `?snes&fx`) live in one table in `src/snes/debug.mjs`;
each card adds its own row, and a one-row clash is resolved by keeping both.

## 9. The cards

*`kb_get snes-plan-the-cards` · version 1*

Each card is at most 30 minutes, under epic 1898, and ends with something Tim can see or hear. The
waits are set on the cards.

| Wave | Card | Waits on |
| --- | --- | --- |
| 1 | 1902 engine: profile switch, screen, colour, limits, art format, `?snes&hw` | — |
| 1 | 1904 SPC700-style synth, 8-voice player, `sound.html?snes` | — |
| 1 | 1905 Ward bake-off: model poses hand-cleaned to SNES limits, first bible | — |
| 1 | 1906 research: `docs/SNES-CLASSICS.md` | — |
| 2 | 1907 pad input; 1908 layers and parallax; 1909 effects; 1910 CRT look; 1911 text and HUD | 1902 |
| 2 | 1912 instrument bank | 1904 |
| 2 | backgrounds: 1916 title and UI; 1917 Reception and Service Floor; 1918 archive 1-3 | 1902, 1908 |
| 3 | 1915 title theme on samples | 1912 |
| 3 | sprites, one at a time: 1914 Mercer (risk ask, held for Tim's go on Ward) → 1919 Associate + Manager → 1930 Counsel + Supervisor + Custodian → 1933 Vellum → 1935 Great Seal → 1936 spells → 1937 portraits and backdrops | the one before (1914 on 1905) |
| 3 | backgrounds: 1920 Internal Review + Waiting + Vellum's office; 1921 Disposal Line + arena | 1917; 1918 |
| 4 | 1922 stage 1 track; 1923 stage 2 track; 1924 boss + scene + ending | 1915 |
| 4 | 1925 jingles + effects | 1912 |
| 4 | 1926 title, select, game over | 1907, 1909, 1911 |
| 4 | 1927 cinema scenes | 1909, 1911 |
| 4 | 1928 Stage 1 on the SNES; 1929 Stage 2 on the SNES | 1907, 1908, 1911 |
| 5 | 1931 Vellum on the SNES | 1928 |
| 5 | 1932 Great Seal and exit run on the SNES | 1929, 1909 |
| 6 | 1934 whole run: flow, cues, ending, slowdown and sprite drop in play | 1926, 1927, 1931, 1932 |
| closer | 1938 plays it all, frame strip plus clips, flips the default | 1934, 1937, every background, music and CRT card, 1906 |

Art never blocks gameplay (`artOr` stand-ins) and gameplay never blocks art; songs never block
scenes (unknown cue names play nothing).
