# The descent: corporate wave → Backrooms → gothic cosmic

*Generated from the knowledge base; edit through `kb_update`, not here.*

*`kb_get snes-descent-introduction` · version 1*

Tim, 10:28 EDT 2026-09-15: "as the game progresses, it transitions from standard corporate world
into backrooms-esque corporate world, until finally escalating to dark gothic cthulu world. you can
see the designs evolving over time as the levels progress".

This is the bible for that arc on the SNES build. It sits on top of `SNES-BACKGROUNDS.md` (materials,
lighting, depth, composition), `SNES-ART-BIBLE.md` (sprites) and `SNES-HUD-MENUS.md` (windows), and
changes only what drifts along the arc. Where it and those docs disagree about something that drifts,
this one wins; everything else they say still holds.

## Why the world decays: the plot is the descent

*`kb_get snes-descent-why-the-world-decays-the-plot-is-the-descent` · version 2 · **superseded by** `kb_get final-notice-story`*

The auditors are sent to find where forty-seven lifetimes went. Every step closer to the answer is a
step down the building and up the chain of approval: Vellum's office, the archive downstairs, the
Great Seal, and finally the ledger's line "every transfer approved at the top". The corporate surface
is the cover story. The Backrooms are what the paperwork looks like when nobody has been in a room for
decades but the years kept being billed. The gothic cosmic end is who signs: the Permanent Secretary's
seal is older than the building.

So the descent measures **how much of the cover story is left**, not "how scary the level is". Three
rules follow:

1. **Nothing is ever replaced, only worn through.** Every gothic thing was a corporate thing first:
   brass fittings become idols, cable trays become tentacled cabling, the notary seal becomes the
   eldritch seal, the water cooler stays a water cooler. A player can point at the same object on
   three screens.
2. **The people stay human.** The storyboard's editorial rule stands: no skull faces, ghouls, devil
   costumes or object monsters. The Partners grow more *preserved* (waxy, too still, too young, their
   shadows lagging) rather than more monstrous. The horror is in the architecture, the light and the
   seal, never a creature mask.
3. **Grounded, late-1995 SNES.** Chrono Trigger's Ocean Palace, Super Metroid's Wrecked Ship, Super
   Castlevania IV's library and Demon's Crest are the ceiling. Never cartoony, never a purple
   Halloween palette. Dark is achieved with value and colour math, not by painting things black.

Bellwether is never touched by the descent. His office is at 0 in every scene, including Scene 3's
phone call, which is the point: the one clean room on the line.

## 1. The beat map

*`kb_get snes-descent-the-beat-map` · version 2 · **superseded by** `kb_get final-notice-story`*

The descent runs 0 to 100. A number is the drift of that screen's palette, props and music at its
**entry**; within an area it may climb by up to 5 toward the next beat.

| Beat | Where | Descent | Band |
| --- | --- | --- | --- |
| Title and select | the memo, the personnel files | 0 | Corporate |
| Scene 1, The assignment | Bellwether's office | 0 | Corporate |
| Stage 1-1 | Reception | 0-5 | Corporate |
| Stage 1-2 | Service Floor | 8-18 | Corporate |
| Stage 1-3 | Internal Review | 20-28 | Corporate, first seams |
| Stage 1-4 | Waiting room (first-aid station) | 30 | Corporate → Backrooms edge |
| Boss 1 | Vellum's office ("This wasn't on the floor plan") | 35 | Backrooms |
| Scene 2, The incident | Vellum's desk, the RETENTION button | 38 | Backrooms |
| Stage 2-1 | Archive Access | 40-48 | Backrooms |
| Stage 2-2 | Retention Order | 50-62 | Backrooms, deep |
| Stage 2-3 | Original Copy | 65-75 | Backrooms → Gothic edge |
| Stage 2-4 | Disposal Line (the wax front) | 78-84 | Gothic cosmic |
| Boss 2 | The Great Seal | 85-95 | Gothic cosmic |
| Scene 3, Original documents | the break room | 100 | The twist (below) |
| Ending and credits | out of the building | 100 → 0 | Release |
| Game over and continue | wherever the player fell | that beat's number | — |

**The break room twist at 100.** Scene 3's break room is drawn with Stage 1's *corporate* tiles: the
same coffee cup, the same vending machine, midnight windows. It looks like 0. What is at 100 is
everything the palette cannot hide: the windows show no city lights, only the Seal's wax red at the
horizon; the vending machine's hum is the Seal's drone; the water cooler (see *Recurring props*) is
the last one, and it is perfect. The cover story put back on, over the thing that approved every
transfer. The ending's walk out of the building then drains the number back to 0 in about ten
seconds, so the credits roll in clean night glass.

## 2. The three bands

*`kb_get snes-descent-the-three-bands` · version 2*

Each band gives a palette anchor set, then props, architecture, lighting, enemies, the HUD and menu
window tint, and the font. Colours are 15-bit (every value a multiple of 8), one 15-colour palette to
a tile, as `SNES-BACKGROUNDS.md` §3 sets out. The drift between anchors is §3 below.

### 2.1 Corporate wave (0-30): night glass, marble, palms

*`kb_get snes-descent-corporate-wave-night-glass-marble-palms` · version 2*

| | |
| --- | --- |
| **Palette anchors** | midnight window `#102048`, skyline lit window `#F8D878`, salmon marble `#D89880 / #B07060 / #804848`, teal glass add `#205868`, mahogany `#603020`, palm green `#306840`, brass `#D8B050`, shadow deep blue `#181838` |
| **Props** | potted palms, a reception desk with a brass nameplate, the water cooler, Rolodex, a leather chair, framed "Employee of the Month", a lit fish tank, an IBM-beige terminal |
| **Architecture** | open plan, long sightlines, floor-to-ceiling night glass, marble slabs on a 48 px grid, a dropped ceiling with regular 24 px tiles, doors 64-72 px |
| **Lighting** | one key light: midnight windows (cool) with warm desk-lamp pools. Clean, confident, slightly glamorous. |
| **Enemies** | Staff in pressed suits and pastel shirts, crisp two-tone hair. Vellum personable, pinstripe, the fang only when lit. |
| **HUD and menu windows** | the approved Form 13-B slip: manila `#E8D8A8` / pink copy, blue carbon `#5870C0` at half, gold selection frame. |
| **Font** | the house bitmap font, clean, black ink on paper, typewriter-crisp. |

### 2.2 Backrooms (30-75): sickly fluorescent, damp carpet, endless repeated rooms

*`kb_get snes-descent-backrooms-sickly-fluorescent-damp-carpet` · version 2*

| | |
| --- | --- |
| **Palette anchors** | fluorescent yellow wall `#C8B868 / #A89850 / #787038`, damp carpet `#806838 / #604C28` with a wet dark patch `#403018`, ceiling tile `#D8D0A0`, flickering tube `#F0F0B8` ↔ `#A8A878`, shadow drifts from deep blue to olive `#282818` |
| **Props** | the same water cooler (half full, then empty), stacked banker's boxes, a single office chair facing a wall, a ringing wall phone, an EXIT sign that points both ways, a clock stuck at 12:00, the fish tank drained |
| **Architecture** | the window glass is gone: walls where windows were. Rooms repeat, the same 96 px module three times in a screen. Wrong geometry within tile rules: a doorway 8 px too short, a ceiling line that rises while the floor's HDMA seams do not, a corridor whose BG2 parallax runs the wrong way for one band. Wallpaper seams (§3.3) open. Carpet lanes dead-end into walls. |
| **Lighting** | key light becomes the ceiling tubes: a flat, shadowless add of pale yellow on every line; no warm pools. One tube per area fails (a 2-slot palette cycle with an irregular 7-13-5 frame rhythm). Darkness toward the back stops: the back wall is as lit as the front, which is the wrongness. |
| **Enemies** | same Staff sprites; palette swaps only. Shirts desaturate toward the wall yellow, skin one step greyer, suits the colour of the carpet. Retention clerks move a frame out of step with each other. |
| **HUD and menu windows** | Form 13-B photocopied: the manila goes greenish-grey `#C8C8A0`, a toner streak across the band header, the carbon copy offset 1 px further each pause, the pink copy yellowed. |
| **Font** | the same glyphs, printed as a copy: a 1-px drop of lighter ink under every stroke, the odd pixel missing. Never a new typeface. |

### 2.3 Gothic cosmic (75-100): black, bruise violet, wax red

*`kb_get snes-descent-gothic-cosmic-black-bruise-violet-wax-red` · version 2*

| | |
| --- | --- |
| **Palette anchors** | void `#080810` (the darkest BG1 colour; BG2's darkest stays lighter per §3.1), bruise violet `#302040 / #503860 / #786088`, wax red `#801818 / #B83028 / #E05838`, candle gold `#E8B048`, verdigris brass `#486850`, bone ivory for the seal light `#E0D8B8` |
| **Props** | the water cooler, its bottle full of dark water with something turning in it. Brass fixtures become idols (the nameplate, the desk lamp's arm, the coat stand's hooks now figures). Tentacled cabling: cable trays sag and branch, bundles thicken toward the Seal. Filing cabinets are ossuary drawers, still labelled. Eldritch seals pressed into the walls in wax, the Permanent Secretary's device at every scale. |
| **Architecture** | the dropped ceiling is gone: vaults, then nothing above BG2. The repeated rooms of the Backrooms become a nave. Marble returns, black now, veined in red. Ledger shelving climbs out of frame like organ pipes. Geometry is no longer "wrong", it is *intended*: symmetrical, ritual, the Seal's circle on every axis. |
| **Lighting** | key light is the wax: a stepped red add from below (the wax front), candle-gold pools where lamps were, and the Seal's ivory light as the one focal point. Darkness toward the back returns, deeper than ever: a subtract per line to the void. Lightning is replaced by the Seal's pulse (a 3-frame master-brightness change). |
| **Enemies** | Partners in their true light: waxy skin `#E0C8B8` with no shadow step, eyes one pixel of red, suits black-violet, cuffs and pins brass-idol. Still people. The Custodian and the Great Seal carry the cosmic weight: the Seal is a wax disc with a moving face of script, cabling for a mantle. |
| **HUD and menu windows** | Form 13-B as a vellum warrant: black-violet window with a wax-red header band, the gold frame now a brass idol frame, the carbon copy a red shadow, the pause stamp a wax seal. |
| **Font** | the same glyphs in bone ivory, with a 1-px wax-red shadow, and capitals on titles given a single blackletter serif pixel. Still the house font: readable at a glance (`SNES-HUD-MENUS.md` §1). |

### SNES limits, all bands

*`kb_get snes-descent-snes-limits-all-bands` · version 2*

- Mode 1, 298x224, BG1 play, BG2 far, BG3 fog and HUD, as today. Mode 7 only for the Great Seal.
- One 15-colour palette to a tile; a band's anchors fit in the eight BG palettes because the drift
  swaps **colours inside slots**, never tile-to-palette assignments. Keep the slot order the same in
  every band (shadow, three wall steps, three floor steps, prop ramp, accent, glow) so drift is a CGRAM
  write, not new tiles.
- The 384-unique-tiles-an-area test holds. Warped prop variants (§3.2) are counted against it.
- Sprites: 15 colours each, recolours by palette only for the Staff; redesigns only for Vellum's second
  phase, the Custodian and the Seal.

## 3. How it drifts: gradually, never a cut

### 3.1 HDMA palette drift

*`kb_get snes-descent-hdma-palette-drift` · version 2*

Every area module names its descent `d` (0-100). The palette for a slot is a lerp between the two band
anchors either side of `d`, snapped to 5 bits a channel. Inside an area the drift is **spatial**, not
timed: an HDMA table rewrites 2-4 slots per band of scanlines, so the top of the screen (the ceiling,
the far wall) is a few points further along than the floor. A room reads as going wrong from the top
down, and walking right raises `d` by up to 5 across the area. Budget: at most 4 slots, 6 bands a
frame, which is well under the HDMA channels the stage already leaves free.

Two moments are timed instead: Vellum pressing RETENTION (35 → 38 over one second, the fluorescent
tubes stuttering on) and the Seal's defeat (95 → 100 over the cut to the break room).

### 3.2 Props that recur and warp

*`kb_get snes-descent-props-that-recur-and-warp` · version 2*

One prop set follows the player the whole way; each has five drawn states, never more.

| Prop | Corporate | Seam | Backrooms | Deep | Gothic |
| --- | --- | --- | --- | --- | --- |
| **Water cooler** (every area, once) | full, bubbling | a cup on the floor | half full, yellow water | empty, the tap dripping upward (a 3-frame palette cycle) | full of dark water, something turning |
| **Potted palm** | glossy | one brown frond | plastic, dusty | a bare stick in a pot | a brass idol's plinth with the pot on it |
| **Wall clock** | correct | a minute slow | 12:00 | no hands | the Seal's device where the face was |
| **Employee of the Month** | a smiling clerk | the same face every month | the face a little younger each month | the face scratched out | Vellum, dated 1887 ("He isn't.") |
| **Cable tray** | hidden behind the dropped ceiling | a panel missing | exposed, sagging | branching | tentacled cabling into the Seal |

The same prop never appears twice in one screen width (`SNES-BACKGROUNDS.md` §3.4), so a player
meets each state about once an area and can count the decay.

### 3.3 Wallpaper seams

*`kb_get snes-descent-wallpaper-seams` · version 2*

The corporate wall is a papered surface over whatever is behind it. From 20, tile seams on the
wall start to show: a 1-px darker line on a 48 px rhythm. From 30 a seam lifts (a 2-row shadow and
a curl of paper) and shows the next band's wall through the gap: fluorescent yellow under marble.
From 70 the same seams show violet under yellow, and from 80 the paper is in strips over black marble.
This is a tile-variant job, not colour math: three seam tiles per band boundary, placed on the prop
rhythm. It is the most readable single cue in the arc, and it costs about 12 tiles an area.

### 3.4 Variety: every area is its own place

*`kb_get snes-descent-variety-every-area-is-its-own-place` · version 2*

Tim, on the concept frames: "i like the overall idea but the game will need more variety than just 1
corridor". The corridor frames hold the layout still only to show the drift; the game never does.
The drift is a **layer over distinct places**. Each area keeps its own architecture, set piece and
silhouette, and the band only changes how that place has gone wrong. Even the Backrooms' "endless
repeated rooms" is a motif rationed to one stretch an area, never the whole area.

| Area | Descent | Its own place | Set piece | How its band shows |
| --- | --- | --- | --- | --- |
| Reception | 0-5 | a two-storey lobby atrium, marble stair, brass elevator bank | the reception desk under a skyline window wall | pristine; palms glossy |
| Service Floor | 8-18 | cubicle farm under low ceiling, desk lamps | a mail cart run down the aisle | one lamp too many; a seam line appears on the far wall |
| Internal Review | 20-28 | glass-walled meeting rooms off a narrow hall | a boardroom with a blinds-striped projector screen | blinds cast bars that do not match the windows; paper seams lift |
| Waiting room | 30 | a small carpeted lounge, magazines, first-aid station | the first-aid cabinet, fully stocked | the only room with no window; tubes buzz |
| Vellum's office | 35 | a mahogany executive suite that "wasn't on the floor plan" | the desk and the RETENTION button | the suite's panelling is too deep for the building; fluorescent light floods in on RETENTION |
| Archive Access | 40-48 | a service stairwell and a freight lift down | the lift ride (parallax floors passing) | floors pass that should not exist, each one a repeat |
| Retention Order | 50-62 | rolling compactor stacks, aisle after aisle | the stacks closing on the player | the endless-rooms stretch lives here: the same aisle three times, one aisle leaning |
| Original Copy | 65-75 | a vault reading room, green lamps, the ledger's lectern | the ledger glowing on its lectern | the vaulted ceiling shows through the dropped tiles; brass lamps turn idol |
| Disposal Line | 78-84 | shredders and a conveyor to an incinerator, the wax front advancing | the wax front | cable trays become cabling; the incinerator mouth becomes the Seal's device |
| Great Seal | 85-95 | a circular sealing chamber, organ-pipe shelving | the Seal itself, Mode 7 | the full gothic nave |
| Break room | 100 | small, ordinary, one window | the ledger beside a coffee cup | the twist (§1) |

Rule for art cards: a background card shows its area beside the one before and after it; if two
adjacent areas could swap without anyone noticing, one of them needs a new set piece.

### 3.5 What does not drift

*`kb_get snes-descent-what-does-not-drift` · version 2*

The fighters' band (§3.4 of the backgrounds doc) keeps its two middle ramp steps at every `d`; the
player's sprites never recolour; Bellwether's office and his phone call are always at 0.

## 4. Music across the arc

*`kb_get snes-descent-music-across-the-arc` · version 4*

The 09:23 "Split by moment" ruling (as briefed to item 2027) holds: **story moments are corporate
wave** (title, scenes, ending: Rhodes, pad, fretless bass, sax) and **action is the gothic Castlevania
drive** (stages, bosses: brass lead, driving bass, strings answering). Tim's later verdicts also hold:
nothing plucky or twangy, slower rather than faster, music someone would listen to after the game.
**Every cue is its own song** (Tim, 14:40 EDT 09-15): its own melody, harmony and groove, consistent
with the rest through the band's instruments and mood, never a rework of the title theme. The title
theme belongs to the title and the story scenes; anywhere else it is at most a one-bar nod.

**The organ arc** (Tim, 16:06 EDT 09-15: "the deeper you get in the game, the more pipe organ there
is"): **the higher you climb the tower, the more pipe organ.** The bank's recorded stops are `organ`
(full church organ), `reed` (reed organ, for tunes) and `pedal` (the deep bass). Stage 1 gets a faint
hint only: the organ quietly in the pad or under one held chord, the corporate groove on top. Each
floor up hands it more: chords, then counter-lines and the pedal under the bass, then the tune. At the
Great Seal the organ leads. Keep the upper register tasteful: no shrill mixture on top (Tim dislikes
shrill brass), the tune in the middle octaves.

The descent does not break that split; it moves the **balance inside each cue** and assigns cues to
bands:

| Band | Descent | Cues | What the arrangement does |
| --- | --- | --- | --- |
| Corporate | 0-30 | title, Scene 1, Stage 1 | Stage 1's drive keeps a corporate top line: Rhodes-and-sax colour over the gothic bass. Smooth, major-leaning, reverb-wet. Organ: a faint hint, quiet in the pad. |
| Backrooms | 30-75 | Vellum boss, Scene 2, Stage 2 areas 1-3, hold music | The smoothness drains: the pad detunes a few cents per area, the sax drops out, the Rhodes is replaced by the choir holding one chord too long. A fluorescent hum (a 60 Hz-ish square at very low volume) under the Backrooms stage cue. The drive stays, thinner. Organ: holds the chords and answers the lead, the pedal doubling the bass on section heads. Hold music (pause) is its own short on-hold tune on the pad, slowed, not the title theme. |
| Gothic cosmic | 75-100 | Disposal Line, the Great Seal (boss), game over past 75 | The full Castlevania drive: C minor, brass with vibrato, tubular bell tolls on the downbeat. Organ: carries the harmony over the pedal on the Disposal Line and leads outright at the Great Seal. No corporate instrument left except one quoted bar of the title motif, in minor, on the bell: a nod, the rest of each song its own. |
| The twist | 100 | Scene 3 | Corporate wave returns, sincere (per the storyboard: "an unresolved version of the corporate melody"), with the Seal's drone held under it at the edge of hearing. |
| Release | 100 → 0 | ending, credits | The drone stops on the walk out; the ending cue is clean corporate wave. |

The sample bank already has every instrument named here (`MUSIC.md`, *The SNES bank*); the drift is
done per song, in its arrangement, not by a runtime crossfade. A stage song may carry an "A" and a
"deeper B" arrangement of its own material and switch on an area boundary.

## 5. Concept frames

*`kb_get snes-descent-concept-frames` · version 2*

Three frames of the **same office corridor** (a Service Floor stretch with the water cooler, a palm,
the clock and Employee of the Month) at descent 10, 55 and 90, at native 298x224, are in
`docs/shots/item-2056/`: `descent-10.png`, `descent-55.png`, `descent-90.png`, and `descent-sheet.png`
side by side. They are drawn from one tile layout with only palette slots and the five prop states
changing, which is the point: the arc is a CGRAM and prop-state job on top of existing layouts.
They are direction sketches, drawn locally by a small palette-and-prop renderer rather than
spritesmith, whose verbs make characters, turnarounds and tilesets but not a whole scene.

## 6. The rework

*`kb_get snes-descent-the-rework` · version 2*

Filed as cards of at most 30 minutes under epic 1898. Item 2059 comes first; every art card waits on
it. Cards already running (2027, 2053) are not held; each new card reads this doc first.

| Card | Work |
| --- | --- |
| 2074 | one concept frame per area at its descent (§3.4), for Tim's verdict on variety |
| 2059 | the descent number per beat and the HDMA palette drift |
| 2060 | Stage 1 backgrounds with the first seams |
| 2061 | Backrooms look for Vellum's office, Archive Access and Retention Order |
| 2062 | gothic cosmic Original Copy, Disposal Line and the Great Seal arena |
| 2063 | recurring props in five states |
| 2064 | wallpaper seam tiles |
| 2065 | Staff and Partner recolours by band |
| 2066 | Vellum, the Custodian and the Seal by band |
| 2067 | HUD, pause form and font tint by band |
| 2068 | the break room twist and the ending drain |
| 2069 | music: the Backrooms drain in Stage 2 and the hold music |
| 2070 | music: gothic band cues and the Scene 3 drone |
