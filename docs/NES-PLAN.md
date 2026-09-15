# Final Notice on the NES — the whole game, and the cards that build it

Tim, 00:09 EDT 2026-09-15: *"if you can implement Final Notice as an NES game, where you fill in any
gaps necessary, even if you gotta burn all my credits here, that's cool."*

This plan replaces the SNES-era plan (`docs/PLAN.md`) and its look. Every card under epic **1785**
builds one piece of what follows. Where the design pack is silent or asks for something an NES could
not do, this plan fills the gap and says so (**gap:**).

## 1. What "NES game" means here

A browser game, still Phaser 4.2.1 at the same link, held to real NES limits. Nothing cheats past
them, and a shared module (`src/nes/`) checks them in tests.

| Limit | Rule in this game |
| --- | --- |
| Screen | 256x240 logical pixels; the top and bottom 8 rows are overscan and stay empty, so play is 256x224. Scaled by a whole number, crisp, centred on black. |
| Palette | The NES master palette only (the 2C02's 64 entries, 54 distinct colours), named by hex index `0x0F`, `0x16`... never a free RGB. |
| Background | 8x8 tiles; each 16x16 attribute area uses one of 4 background palettes of 3 colours plus the one shared backdrop colour. |
| Sprites | 8x8 hardware sprites, each 3 colours plus transparent from one of 4 sprite palettes. At most 64 on screen and **8 on one scanline**; beyond 8 the lowest-priority ones are dropped, and the drop order rotates every frame so they flicker, as on the hardware. |
| Scrolling | Whole-screen horizontal scroll; the HUD is a fixed strip (the split-screen status bar every NES brawler used). No parallax layers (**gap:** the design's layered backgrounds become one scrolling layer). |
| Sound | 2A03 channels synthesised in WebAudio: pulse 1 and pulse 2 (duty 12.5/25/50/75%), triangle (4-bit stepped, no volume), noise (15-bit LFSR, long and short mode). No DPCM. A sound effect steals a channel from the music and gives it back. |
| Text | An 8x8 fixed-width font; dialogue boxes 28 characters wide, 3 lines to a page. |

Out of scope: a real cartridge ROM. It is a possible later epic (the same art data and song data could
feed a ca65 build), not part of this one.

## 2. The game in one paragraph

Title → choose Ellis Ward or Frank Mercer → Scene 1, the assignment → **Stage 1, Claims &
Adjustments**, a belt-scrolling brawler in five areas ending with Deputy Director Vellum → Scene 2,
the incident → **Stage 2, Records Retention**, a single-plane ranged-magic escape in five areas ending
with the Great Seal → Scene 3, original documents → ending and credits. A clean run takes about
15 minutes (**gap:** the design's 20-25 shrinks to NES length).

## 3. Controls

The game is played on an NES pad. Keyboard and any gamepad map onto it (`src/input.mjs`).

| NES pad | Keyboard | Gamepad | Stage 1 | Stage 2 |
| --- | --- | --- | --- | --- |
| D-pad | arrows or WASD | d-pad or left stick | walk along and across the floor | walk, crouch (down), aim (hold) |
| B | Z or J | X / left face | punch (chain three), grab when touching a reeling foe | cast the current enchantment in the held direction |
| A | X or K | A / bottom face | jump (B in the air = jump kick) | jump |
| A+B together | | | Emergency Injunction (needs a full meter) | Emergency Injunction |
| Select | Shift | Back / Select | | swap between the two carried enchantments |
| Start | Enter | Start | pause, skip a scene | pause, skip a scene |

Evasive step: double-tap left or right (**gap:** the NES pad has no spare button). Stage 2 aim:
standing still, the d-pad aims in eight directions; walking, the cast goes forward or diagonally up
(Contra's rule). Down on the ground crouches and casts low.

## 4. Rules shared by both stages

- **Health:** 8 pips in the HUD. A normal hit costs 1, a boss attack 2. Short flashing invincibility
  after a hit.
- **Lives and continues** (**gap:** the brief asks for an NES life economy, the pack for unlimited
  retries; the NES wins, kindly): 3 lives, 3 continues. A lost life restarts at the last checkpoint
  with full health; a checkpoint sits at the start of every area and before each boss. Game over
  offers CONTINUE (restart the area, 3 lives) while continues remain, then back to the title.
- **Emergency Injunction:** a 4-segment meter in the HUD filled by landing hits; full meter + A+B
  gives a wax-seal ring flash that knocks back ordinary foes and clears their projectiles. It does not
  hurt bosses. A checkpoint restores at least one segment.
- **Health relief:** a first-aid box (+4 pips) once per area.
- **HUD strip** (top 24 rows): portrait tile of the chosen auditor, health pips, lives `x3`, meter;
  stage 2 adds the two carried enchantment icons. Boss health appears opposite while a boss fights.
- **No guns, no blades, no gore**, for anyone, anywhere. Foes knocked out sit down dazed and blink
  away.

## 5. The auditors

Solo only: choose Ward or Mercer; only the chosen auditor appears, in play and in the scenes, with
their own lines (**gap:** online co-op is dropped; an NES has no join codes. A later epic could add
local 2-player).

| | Ellis Ward | Frank Mercer |
| --- | --- | --- |
| Look (3 colours + outline shared) | tall and thin, charcoal suit, burgundy tie, dark hair | shorter and broad, blue suit, gold tie, sandy hair |
| Stage 1 | longer reach, 3-hit combo ends in a straight; throw is a clean hip toss | shorter reach, faster combo ends in a shoulder check; throw knocks other foes over |
| Stage 2 twist (Tim's ruling of 2026-09-13) | Seal of Notice pierces one foe | Seal of Notice is slower but bursts on contact, hitting a small area |

Both are equal overall. Numbers live in `src/stage1/moves.mjs` and `src/stage2/casting.mjs`.

## 6. Stage 1 — Claims & Adjustments (belt-scrolling brawler)

Scale: NES brawler size, like Double Dragon: auditors and foes about **40 px tall, 24 px wide** (three
8x8 sprites across, so two characters on one row stay inside the 8-a-scanline limit and a third
flickers). At most 3 foes on screen at once (**gap:** the pack's Final Fight 56-64 px scale cannot fit
NES sprite limits). The floor band is 48 px deep.

Moves: walk in 8 directions, 3-hit combo, jump, jump kick, evasive step, grab a reeling foe then B to
knee or a direction+B to throw (a thrown foe knocks down any foe it hits), pick up and throw props
(office chair, briefcase, brass queue post: one hit then gone).

| Area | Screens | Foes and teaching | Scenery (one scrolling layer) |
| --- | --- | --- | --- |
| 1 Reception | 2 | a lock, a "PUNCH" prompt, one Security Associate; a second after a "STEP" prompt; a "THROW" prompt. GO arrow. | salmon stone floor, reception desk, cleaning cart, midnight windows |
| 2 Service Floor | 3 | two waves of Associates, then an Account Manager who darts to your flank | burgundy carpet lanes, cubicles, seafoam panels, desk lamps |
| 3 Internal Review | 2 | Contract Counsel (red-tape bind, mash to break free) and the Facilities Supervisor (guards; throw a foe into him to break guard) | brass doors, glass meeting rooms |
| 4 Executive Waiting | 1 | one short wave; first-aid box; checkpoint | burgundy chairs, skyline window, receptionist (not a foe) |
| 5 Vellum's office | 1 (locked) | **Boss: Deputy Director Vellum** | his desk, bookcase, lamp |

Foes (all human, Partners' staff): **Security Associate** (slow wind-up punch, 3 hits to knock down),
**Account Manager** (quick, circles to your back, low health), **Contract Counsel** (keeps distance,
telegraphs a red-tape bind), **Facilities Supervisor** (guard, heavy swing, 2x health).

**Vellum** (16 pips): a telegraphed forward rush (he flashes), a sweeping seal strike, and a red-tape
bind with a mash-to-break. Guards between attacks; a bait or a thrown subordinate breaks the guard.
Twice he summons one Associate. Below half he shows his fangs (palette swap), attacks faster. Beaten,
he slumps in his chair and Scene 2 plays.

## 7. Stage 2 — Records Retention (ranged-magic escape)

Scale: Contra-sized sprites, as Tim ruled for this stage: auditors **32 px tall, 16 px wide**, foes the
same. One movement plane, broad platforms, short jumps. Falling into a pit costs 2 pips and puts you
back on the last safe ledge.

Enchantments: you start with **Seal of Notice** (always carried). Floating ledger pickups give one of
**Carbon Copy** (three papers in a spread), **Red Tape** (a short ribbon that stops a foe for 2 s) or
**Margin of Error** (a lobbed page that bursts into an ink sigil, hits a group, breaks wax locks
too). You carry two; Select swaps; a new pickup replaces the one not in hand. Basic casting never runs
out; at most 3 of your casts on screen.

| Area | Screens | What happens | Scenery |
| --- | --- | --- | --- |
| 1 Archive Access | 2 | safe landing with "CAST" and "AIM" prompts; a squad of 3 Associates casting slow seal glyphs | shelving, lit reading lamps |
| 2 Retention Order | 3 | the red wax front advances from the left (flashing warning edge; touching it costs a life); a wax lock door to break with a cast while moving | fire doors closing, falling shelving |
| 3 Original Copy | 1 (locked) | mid-boss **Records Custodian** (8 pips): directs two foes, then lunges; beaten, the ledger lifts from its stand into your hands | ledger stand, filing wall |
| 4 Disposal Line | 3 | conveyor belts (they carry you), disposal seals to break, safe pockets between two pushes of the wax front | shredders, conveyors |
| 5 The Great Seal | 1 (locked) | **Boss: the Great Seal**, then a short enemy-free run to the exit | brass press, bulkhead holding the wax back |

**The Great Seal** (the Retention Director at the controls of a brass certification press): marked
stamp impacts (shadow shows where), a low red-tape sweep (jump it), three slow seal projectiles. Two
wax bindings on the press take casts; when both break, the Director's contract seal opens and takes
damage (12 pips). Each break changes his pattern; nothing removes the floor.

## 8. Scenes, title, game over and ending

Scenes are NES cinema screens in the Ninja Gaiden style: a picture in the top two thirds (a backdrop
plus a large portrait made of background tiles) and a 3-line text box beneath, typed a letter at a
time with a blip; A or B advances, Start skips the scene (**gap:** the pack's digitised actors become
tile portraits). Lines are condensed from the storyboard and kept to 28 characters a line; the
chosen auditor's variant is used.

| Scene | When | Pictures | Lines (Ward / Mercer variant where they differ) |
| --- | --- | --- | --- |
| 1 The assignment | after select | Bellwether's office; Bellwether; the auditor | B: "They billed one customer for forty-seven lifetimes." / W: "He died on Tuesday." M: "Forty-seven?" / B: "I read it. That's why you're here. Get the original ledger." / B: "If they lean on you, they answer to me." / B: "And call before you make the evening news." |
| 2 The incident | after Vellum | Vellum at his desk; the auditor; the RETENTION button; the ledger glow | V: "The original records were destroyed in the incident." / W: "What incident?" M: "Which incident?" / V: "This one." (alarm) / W: "The original is downstairs." M: "Then I'm going downstairs." / Bellwether on the radio: "Get yourself out. With the ledger if you can." |
| 3 Original documents | after the Great Seal | break room; ledger page YEARS -> ACCOUNT ZERO with the Permanent Secretary's seal; wall speaker; Bellwether on the phone | W: "Every transfer was approved." M: "Signed off at the top." / Speaker: "Your inspection is suspended. Surrender the original documents." / W: "An unusually prompt response." M: "That didn't take long." / B: "You did your job. Now let me do mine. Bring me the ledger." / W: "The scope has expanded." M: "We're going to need a bigger file." |

Gameplay remarks: one line in a small box at three quiet moments (entering Reception: "They kept the
original fittings." / "Nice place. Shame about the management."; a first-aid box: "Fully stocked." /
"Good. Somebody did their job."; entering Vellum's office: "This wasn't on the floor plan." /
"Somebody found the budget.").

- **Title:** FINAL NOTICE logo in tiles over a night skyline, PUSH START blinking, the title theme;
  idle 20 s shows the attract loop (a short demo of Stage 1).
- **Select:** two portraits side by side, name and one line each, left/right to choose, A to confirm.
- **Game over:** GAME OVER, CONTINUE / END with the continues left, the game-over jingle.
- **Ending:** after Scene 3, EVIDENCE stamped on a file, a credits scroll over the night office with
  the title theme's unresolved variant, then THE END and back to the title.
- **Pause:** PAUSE in the middle, music silenced, a pause blip.

## 9. Music and sound

One original CorporateWave melody, arranged per cue for the four 2A03 channels (pulse 1 lead, pulse 2
harmony or echo, triangle bass, noise drums). Songs are data (`src/audio/songs/*.mjs`) in a small
tracker format the synth plays; sound effects are data too (`src/audio/sfx.mjs`).

| Cue | Name | Feel |
| --- | --- | --- |
| Title and select | `title` | sincere, comforting hold-music melody, mid tempo, loops |
| Scene 1 and 3 | `scene` | the melody slowed, pulse 12.5% duty, sparse |
| Stage 1 | `stage1` | confident midtempo groove, firm noise drums, loops |
| Stage 2 | `stage2` | the same melody faster, urgent triangle bass, a detuned pulse phrase |
| Bosses | `boss` | tense ostinato, loops |
| Ending and credits | `ending` | the title melody with one unresolved last phrase |
| Jingles (no loop) | `stageStart`, `stageClear`, `lifeLost`, `gameOver`, `continue`, `pickup` | 1-4 s each |

Sound effects, by name: `punch`, `hit`, `knockdown`, `jump`, `land`, `grab`, `throw`, `step`,
`injunction`, `cast`, `carbonCopy`, `redTape`, `margin`, `waxBreak`, `pickup`, `heal`, `blip` (text),
`menu`, `pause`, `alarm`, `stamp`, `conveyor`. Calling an unknown name does nothing, so gameplay can
call a name before its sound exists.

## 10. Art list

Every art card follows `docs/NES-ART-BIBLE.md`. The Stage 1 idle, walk, punch and hurt of Ward,
Mercer and the Security Associate are already drawn to it in `src/art/cast.mjs` (names
`ward.walk`, `mercer.punch`, `associate.hurt`...); gameplay takes them with `artOr(scene, 'cast')`.
All art is hand-authored as data in code: text grids of `0-3` per 8x8 tile, a palette of NES indices,
and frame tables of tile placements (`src/nes/art.mjs` bakes them to Phaser textures and the tests
check every limit). Spritesmith may be tried for a sheet if its output passes Tim's eye; no card waits
on it. Tim's design pack art stays private and is never committed.

| Module | Contents |
| --- | --- |
| `src/art/ward.mjs`, `src/art/mercer.mjs` | Stage 1 size: idle, walk (4), punch1-3, jump, jumpKick, step, grab, throw, hit, knockdown, down; Stage 2 size: idle, run (3), jump, crouch, cast (fwd, up, diagonal up, diagonal down, down), hit; portrait tile for HUD |
| `src/art/staff1.mjs` | Security Associate and Account Manager, both sizes where used: walk, windup, punch, reel, knockdown, down; Stage 2 Associate cast |
| `src/art/staff2.mjs` | Contract Counsel (tape cast, bound), Facilities Supervisor (guard, swing), Records Custodian (Stage 2 size: point, lunge, down) |
| `src/art/vellum.mjs` | Vellum: idle, rush, sweep, tape, guard, hit, fangs palette, slumped |
| `src/art/spells.mjs` | Seal of Notice, Carbon Copy papers, Red Tape ribbon, Margin sigil, foe glyphs, injunction ring, pickups, first-aid box, props (chair, briefcase, queue post) |
| `src/art/bg-claims.mjs` | Stage 1 tileset and nametables for Reception, Service Floor, Internal Review, Executive Waiting, Vellum's office |
| `src/art/bg-archive.mjs` | Stage 2 tileset and nametables for the five archive areas, wax front, conveyor frames, wax lock, pit edges |
| `src/art/greatseal.mjs` | the press (background tiles + sprite parts), bindings, contract seal, stamp, Retention Director |
| `src/art/scenes.mjs` | cinema backdrops (Bellwether's office, Vellum's desk, archive button, break room, ledger page) and portraits (Bellwether, Vellum, Ward, Mercer, speaker) |
| `src/art/ui.mjs` | title logo tiles, select portraits frame, HUD strip tiles (pips, meter, lives, enchantment icons), GAME OVER, THE END |

Gameplay code asks for art by these names through `artOr(name, fallback)`, which draws a flat
3-colour stand-in until the art module lands, so no gameplay card waits on art.

## 11. Code layout (who owns which files)

| Files | Owner card |
| --- | --- |
| `src/nes/screen.mjs`, `src/nes/palette.mjs`, `src/nes/limits.mjs`, `src/nes/art.mjs`, `src/main.mjs` screen setup | engine |
| `src/audio/apu.mjs`, `src/audio/player.mjs`, `sound.html` | synth |
| `src/text/font.mjs`, `src/story/script.mjs`, `dialogue.html` | script and font |
| `src/input.mjs`, `src/flow.mjs`, `src/main.mjs` scene list | flow |
| `src/scenes/title.mjs`, `src/scenes/select.mjs`, `src/scenes/gameover.mjs`, `src/scenes/ending.mjs` | title / ending cards |
| `src/scenes/cinema.mjs` | cinema player |
| `src/stage1/*` | stage 1 cards, one at a time in order |
| `src/stage2/*` | stage 2 cards, in order |
| `src/hud.mjs` | stage 1 core (stage 2 core adds its icons after) |
| `src/audio/songs/*.mjs`, `src/audio/sfx.mjs` | music and sound cards (one song file each, so they run side by side) |
| `src/art/*.mjs` | one art card each |

The old SNES files (`src/lobby.mjs`, `src/sprites.mjs`, `src/palette.mjs`, `src/font.mjs`,
`assets/sprites/*`, `tools/*-sprite.mjs`, `sprites.html`) are deleted by the card that replaces them:
flow removes the lobby from the scene list, stage 1 core deletes `lobby.mjs` (its movement rules in
`src/ward.mjs` move to `src/stage1/`), and the closer removes whatever is left unused.

## 12. The cards

Each card is at most 30 minutes and ends with something a player sees on the live page. All sit under
epic 1785, and every card after wave 1 also waits on this plan (1786) landing.

| Wave | Card | Waits on |
| --- | --- | --- |
| 1 | 1799 engine: screen, palette, sprite limits, art format, `?nes`, `?art=` | — |
| 1 | 1800 2A03 synth, tracker player, sound test page | — |
| 1 | 1801 8x8 font, story script, dialogue page | — |
| 2 | 1803 pad input and scene flow with placeholders | 1799, 1800, 1801 |
| 2 | art: 1804 Ward, 1843 Mercer, 1806 Associate + Manager, 1807 Counsel + Supervisor + Custodian, 1808 Vellum, 1810 spells and props, 1811 Reception + Service Floor, 1813 Internal Review + Waiting + Vellum's office, 1815 archive areas 1-3, 1816 Disposal Line + arena + wax front, 1817 Great Seal, 1818 portraits, 1819 backdrops + logo + HUD | 1799 |
| 2 | 1820 title theme and `docs/THEME.md` | 1800 |
| 2b | 1821 stage 1 track, 1822 stage 2 track, 1823 boss + ending, 1824 jingles + effects | 1820 |
| 3 | 1825 title + select | 1801, 1803 |
| 3 | 1826 cinema player | 1801, 1803 |
| 3 | 1827 Stage 1 core | 1803 |
| 3 | 1828 Stage 2 core | 1803 |
| 4 | 1830 Stage 1 foes | 1827 |
| 4 | 1831 Stage 2 enchantments | 1828 |
| 4 | 1832 Stage 2 areas 1-2 and the wax front | 1828 |
| 5 | 1836 Vellum | 1830 |
| 5 | 1837 Stage 2 areas 3-4 | 1831, 1832 |
| 5 | 1838 the Great Seal and exit run | 1831, 1832 |
| 5 | 1839 Emergency Injunction | 1830, 1831 |
| 6 | 1840 Stage 1 areas | 1830, 1836 |
| 7 | 1841 whole run: game over, continues, ending, credits | 1825, 1826, 1837, 1838, 1839, 1840 |
| closer | 1842 plays the whole game on the live page, posts a frame strip | 1841, every art and music card |

Art and music never wait on gameplay, and gameplay never waits on art: `artOr` and the no-op sound
names let each land alone. 1805 (Mercer's first art card) was merged into 1804 by intake by mistake and
refiled as 1843.

## 13. What happened to the SNES-era cards

| Card | Fate |
| --- | --- |
| 1456 Ward's sprite replaces the stand-in box | dropped: SNES-scale sprite; Ward is redrawn at NES size in 1804 |
| 1457 First Security Associate fight | folded into 1830, Stage 1 foes (its rules at branch item-1457 are a reference; the card rewrites them for NES scale) |
| 1458 Reception room drawn | dropped: SNES layered room; Reception is redrawn in 1811 |
| 1459 Character select | folded into 1825, title + select |
| 1462 Security Associate's sprite on the fight | dropped: SNES sprite; redrawn in 1806 |
| 1463 Mercer's sprite sheet | dropped: SNES sheet; Mercer is drawn in 1843 |
| 1464 Mercer playable | folded into 1827, Stage 1 core (both auditors playable) |
| 1465 Evasive step and grab-and-throw | folded into 1827, Stage 1 core |
| 1466 Reception beat playable | folded into 1840, Stage 1 areas |
| 1469 Sprite sheets drop in from anywhere | dropped: NES art is tile data in code, not PNG sheets; `artOr` (1799) is the drop-in point |

No branch was deleted; the SNES branches stay for reference.
