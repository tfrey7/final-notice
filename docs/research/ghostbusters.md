# Ghostbusters, as a reference

Tim (2026-09-15, 10:33) on the title art: "a corporate tower with an old timey pyramid at the top...kinda
like ghostbusters meets corporate wave meets illuminati". At 10:34: "let's add some ghostbusters art
research, and sound research, and include some ghostbusters games, so we can use as reference".

This page studies the two films' look and sound and the Ghostbusters games, and turns them into rules for
the SNES version. Nothing copyrighted is in the repo: every picture and clip is linked, and the private
copies the judges read stay in their gitignored reference folders (see *The judges' reference sets*).
**No melody is taken from anything here, only technique.** The bar stays grounded late-1995 SNES: the
films are comedies, but the comedy came from playing the supernatural straight, and that is the part we
take.

## 1. Art: the films

### The one idea: realism first, so the impossible lands

Ivan Reitman's stated approach was that setting it "entirely on Earth would make the extraordinary
elements funnier", and that "focusing on realism from the beginning would make the Marshmallow Man more
believable by the end" ([Wikipedia, *Ghostbusters*](https://en.wikipedia.org/wiki/Ghostbusters)). The
first hour is a real New York: a library, a firehouse, a hotel corridor, a doorman, a council office. The
temple arrives only after the audience has spent an hour in rooms they recognise.

This is our descent in one sentence. `SNES-DESCENT.md` already says "nothing is ever replaced, only worn
through"; Ghostbusters is the proof that the slow version is also the scarier and the funnier one.

### Spook Central: an ordinary building with a temple on its head

- **The real building.** 55 Central Park West is a 1929-30 art-deco apartment block, "the first fully Art
  Deco structure on the street", whose brick "changes shade from deep purple to yellow-white" as it
  rises ([Wikipedia, *55 Central Park West*](https://en.wikipedia.org/wiki/55_Central_Park_West);
  [photo](https://commons.wikimedia.org/wiki/File:55_Central_Park_West_(Ghostbusters_Building)_by_David_Shankbone.jpg)).
- **What the film added.** "Eight additional floors and a large rooftop temple were added to exterior
  shots of it via matte painting" (same article). The final building "was compiled from more than a
  dozen sets, miniatures, matte shots, and shots on location"
  ([John DeCuir Production Design Studies Center](http://asburyproductiondesignstudiescenter.com/explore/ghostbusters-g74pp)).
  Production designer John DeCuir (his last film, with John DeCuir Jr. as art director) built the temple
  as "one of the largest constructed sets in film history", ringed by a 360-degree painted cyclorama of
  the night skyline ([Wikipedia, *Ghostbusters*](https://en.wikipedia.org/wiki/Ghostbusters)).
- **The temple itself.** A stepped altar under a pair of great doors, obelisk-like pylons, and the two
  Terror Dog statues on plinths either side; the whole thing reads as Sumerian ziggurat forms rendered in
  the same art-deco stone as the tower below it. Nobody on screen treats it as a different building: it
  is the top floor.

**What we take for the title tower (item 2028).** A grounded art-deco corporate tower whose setbacks
step inward as it rises, each setback a little older in style, ending in a stepped, pyramid-capped crown
that is architecture, not a logo: pylons, a doorway you could walk through, two guardian plinths. The
illuminati read comes from the silhouette (a stepped pyramid over a tower), never from a painted eye.

### Silhouettes and motifs

| Motif | In the films | Our use |
| --- | --- | --- |
| Stepped setbacks | the deco tower and the ziggurat altar share one profile | the tower crown and Boss 2's Great Seal dais use the same step count |
| Twin guardians | Terror Dog statues flanking the temple | two brass lobby statues at 0 that reappear, darker, beside the Seal at 85+ |
| Great doors | the temple's crystal-and-stone doors | the lift doors at 0, the archive vault at 50, the Seal's gate at 90 |
| Night skyline | painted 360-degree cyclorama, lit windows | parallax window band, amber windows on ink-violet, one red beacon |
| Mundane uniforms | coveralls, a doorman, a desk clerk | the auditors' suits and the night staff stay ordinary in every band |
| The portrait | Vigo, a gothic oil painting in a museum restoration room ([Wikipedia, *Ghostbusters II*](https://en.wikipedia.org/wiki/Ghostbusters_II)) | a founder's portrait in Bellwether's corridor whose eyes drift over the descent |
| The underground river | Ghostbusters II's slime river under the museum, in a disused pneumatic subway (same) | the archive's flooded lower level at 60-75, a slow HDMA water band |

Ghostbusters II's production designer was Bo Welch, who "was able to build more extravagant sets"
(same). Its best idea for us is that the threat lives in an institution (a museum) behind a painting,
which is exactly the corporation behind the Seal.

### Palette

Only the building's brick gradient is sourced (above); the other anchors are proposals from memory of the
films, unverified against frames in this run. Treat them as starting values, snapped to 15-bit:

- **Deco stone ramp:** bruise purple at the base rising to cream at the crown, `(10,6,12)` →
  `(18,14,16)` → `(27,25,21)`. The real building's brick gradient is itself the descent drawn
  vertically: read bottom to top it is our 100 → 0 in one column.
- **Night sky:** ink violet `(3,2,8)` to deep blue `(5,7,14)`, never neutral black.
- **Temple light:** a cold blue-white from the temple against a storm-lit sky (from memory, unverified). Our gothic cosmic band keeps its wax red for that storm, and the one cold
  highlight is the Seal's light.
- **Effects:** proton streams are a hot white core with an orange-red and blue wrapping; slime is a
  saturated green-pink that the films use sparingly. We use neither colour as scenery; see below.

### Effects: proton streams and slime

The streams were **hand-animated**, frame by frame, from a flashbulb at the wand's tip that gave the
animators an origin point; one second of an animated ghost could take up to three weeks; the Terror Dogs
were quarter-scale stop-motion puppets ([Wikipedia, *Ghostbusters*](https://en.wikipedia.org/wiki/Ghostbusters)).
The cinematographer László Kovács kept dark paint off the car because it would not read at night (same).

For the SNES that means:

- **Energy is a crackling line, not a beam sprite.** A 2-3 pixel white core, a 1 pixel coloured wrap
  that jitters per frame, and a bright flash at the source. Cheap on sprites, reads at any size. Mercer's
  Injunction and any Seal lightning take this shape.
- **Stop-motion reads as low frame counts held longer.** Big set-piece creatures animate on 2-4 poses
  held 6-10 frames each, not 12 smooth frames: heavier, less cartoon.
- **Keep dark objects readable at night** with a rim of the sky colour, per Kovács.
- **No slime.** Ooze is the most cartoon thing in the films and every game leaned on it; our wax is its
  grounded replacement and already exists in the descent bible.

## 2. Sound: the films

### Elmer Bernstein's score

Bernstein wrote for the Hollywood Studio Symphony (about 70 players), a small rock ensemble, a few Yamaha
DX7 additions, and the **ondes Martenot**, played by Cynthia Millar, flown from England because so few
players existed ([Wikipedia, *Ghostbusters (1984 soundtrack)*](https://en.wikipedia.org/wiki/Ghostbusters_(1984_soundtrack));
[Ghostbusters Wiki](https://ghostbusters.fandom.com/wiki/Ghostbusters_Score)). He wanted the eerie
effect from it, and called his Ghostbusters theme "antic ... cute, without being really way out"
([Wikipedia, *Ghostbusters*](https://en.wikipedia.org/wiki/Ghostbusters)). The ondes enters as the
characters descend into the library basement, a cue that a spooky encounter is coming
([SlashFilm](https://www.slashfilm.com/679624/the-ghostbusters-afterlife-score-brought-back-a-key-member-of-the-original-orchestra-for-a-certain-haunting-sound-exclusive/)).
One reviewer notes the comedy works "by its very seriousness", with lots of short cues, a lovely Dana
theme on ondes and solo cello, and big straight action music at the end
([Movie Wave](https://www.movie-wave.net/titles/ghostbusters.html)). Sample:
[Wikipedia score excerpt](https://en.wikipedia.org/wiki/File:Ghostbusters_1984_Elmer_Bernstein_Score_Sample.ogg).

**Techniques we take:**

1. **One uncanny voice over a normal ensemble.** The ondes is a single wavering sine-like line with a wide
   slow vibrato and glides, laid over an orchestra that plays completely straight. On the SNES this is one
   sample channel: a pure or lightly filtered sine loop, pitch-bend glides between notes, vibrato depth
   growing with the descent number.
2. **The eerie voice marks thresholds.** It enters when a scene goes down a level (a lift, a stairwell, a
   door), not on every spooky moment. It is our audio cue for a beat on the descent map.
3. **Serious scoring for absurd things.** No "wacky" orchestration, no bassoon jokes. The gothic cues are
   scored as real horror; the comedy is in the picture and the dialogue.
4. **A second, tender theme.** Dana's theme is the one warm melody; ours is the Ward and Mercer moment
   before Scene 3, on a solo cello sample with the eerie voice answering.

### Ray Parker Jr.'s theme

Written and recorded in about two days with Parker on almost everything: one rhythm guitar, one lead
guitar, a horn-patch synth, one bass, one drum part and a few synth overdubs, **nothing doubled**; a
Korg Poly-61 for the main synth, a Roland Jupiter-6 on the bass, a LinnDrum; the demo was 1:15 and the
full song was looped from it; a gang of high school students shouts the title
([Mix, *Classic Tracks*](https://www.mixonline.com/recording/classic-tracks/classic-tracks-ray-parker-jrs-ghostbusters-365695);
[Wikipedia, *Ghostbusters (song)*](https://en.wikipedia.org/wiki/Ghostbusters_(song))). Its placeholder in
the edit was Huey Lewis's "I Want a New Drug" for tempo, which later led to a settled lawsuit (same).

**Techniques we take, not the tune:**

1. **Sparse and undoubled fits eight channels.** One part per job (bass, chord stab, lead, drums, one
   colour) is both the Parker arrangement and a good SNES arrangement. It frees channels for the eerie
   voice and sound effects.
2. **A minor, spooky riff over bright funk drums.** The contrast is the joke. For the corporate wave cues
   the mirror is useful: glossy, bright, major-seventh chords over a bass line that sits one step too
   low or too chromatic, so the calm has a faint wrongness from beat one.
3. **The gang shout is out.** A call-and-response vocal sample is the most dated, cartoon-leaning
   element; nothing in our score shouts.

### Office normality and dread in the sound design

The films' dread lives in ordinary sounds pushed slightly wrong: the library's hush, the hum of Dana's
kitchen before the refrigerator opens, a doorbell and a phone. (From memory of the films,
unverified against a sound-design source.) Our descent already turns the vending machine's hum into the
Seal's drone at 100; this confirms it: **the ambient bed is office noise, and dread is that noise detuned
and slowed**, not a new horror pad laid on top.

## 3. The games

| Game | Look | Sound | Structure | What to take or avoid |
| --- | --- | --- | --- | --- |
| **Ghostbusters** (Sega Genesis, 1990, Compile / Sega) | big-head likeness sprites, "large and decently animated" enemies, backgrounds criticised as simple and repetitive, "lack of parallax and other effects"; Stay Puft's face peers through windows and his fists smash through walls ([Sega-16](https://www.sega-16.com/2004/06/ghostbusters/); [Hey Poor Player](https://www.heypoorplayer.com/2016/07/20/retro-review-ghostbusters-sega-genesis1990/); [Wikipedia](https://en.wikipedia.org/wiki/Ghostbusters_(1990_video_game))) | Kazuhiko Nagai on the YM2612; a different tune per case; the ice stage echoes; the theme's rendition was panned ([archive.org](https://archive.org/details/md_music_ghostbusters); Sega-16) | four buildings in any order, a castle, a final pit; mid-boss ghosts to capture before the boss; money buys weapons between cases | **Take:** the boss seen through the building before you meet him, each stage its own building type and tune, the mid-boss gate. **Avoid:** big heads, flat backgrounds, a chip cover of the licensed song. |
| **The Real Ghostbusters** (arcade, Data East, 1987) | angled overhead view, cartoon-show ghosts; players were shot by enemies they could not see ([Wikipedia](https://en.wikipedia.org/wiki/The_Real_Ghostbusters_(1987_video_game))) | standard late-80s Data East arcade | 10 timed levels, beam to pull ghosts in for points, a boss per stage; sold in Japan with the licence stripped as *Meikyū Hunter G* | **Take:** the beam that drags, a capture that feels physical. **Avoid:** an angle that hides threats; cartoon-show colour. |
| **The Real Ghostbusters** (Game Boy, 1993, Kemco / Activision) | a reskin of Kemco's *Crazy Castle* puzzle series (*Mickey Mouse IV* in Japan, *Garfield Labyrinth* in Europe) ([Wikipedia](https://en.wikipedia.org/wiki/The_Real_Ghostbusters_(1993_video_game))) | - | maze puzzle rooms | **Avoid:** a licence painted over an unrelated game; our mechanics come from our story. |
| **Ghostbusters** (NES, 1986 JP / 1988 NA, Bits Laboratory / Activision) | "most of the graphics are a dull grey colour"; a stair-climbing section up the tower that is the whole climax ([VG Museum](https://www.vgmuseum.com/reviews/nes/ghostbstrs/); [TCRF](https://tcrf.net/Ghostbusters_(NES))) | "the same Ghostbusters tune through all the game's parts" (VG Museum) | drive, buy gear, trap ghosts, then a long climb of near-identical stairwell floors (screenshots at VG Museum; floor count not verified) | **Avoid, all of it:** one song for the whole game, a climb of identical floors. Our tower climb needs Tim's "more variety than just 1 corridor". |
| **Ghostbusters II** (NES, 1990, Imagineering / Activision) | side-scrolling stages (from memory, unverified); "universally regarded as the inferior game" next to HAL's ([Wikipedia](https://en.wikipedia.org/wiki/Ghostbusters_II_(NES_video_game)); [Indie Gamer Chick](https://indiegamerchick.com/2024/03/15/new-ghostbusters-ii-nes-review-and-ghostbusters-ii-game-boy-review/)) | - | film scenes in order, uneven difficulty | **Avoid:** adapting beats as disconnected minigames. |
| **New Ghostbusters II** (NES, 1990 JP / 1991 PAL, HAL) and **Ghostbusters II** (Game Boy, 1990, HAL / Activision) | top-down, clear small sprites; the Game Boy version is not a straight port and dropped Louis; "charming", with annoying partner AI ([Wikipedia](https://en.wikipedia.org/wiki/New_Ghostbusters_II); [Nintendo Life](https://www.nintendolife.com/games/gameboy/ghostbusters_ii)) | Jun Ishikawa (NES) | one buster stuns with the beam while the partner drops the trap; clear the room, an arrow points on; a boss per stage | **Take:** two partners with split jobs, which is Ward and Mercer; one room, one task, then on. **Avoid:** an AI partner the player has to babysit. |
| **Extreme Ghostbusters** (Game Boy Color, 2001, Light and Shadow Production) | Europe-only; 20+ short city busts ([Nintendo Life](https://www.nintendolife.com/games/gbc/extreme_ghostbusters); [Ghostbusters Wiki](https://ghostbusters.fandom.com/wiki/Extreme_Ghostbusters_Video_Game)) | - | many short levels | later context only |
| **Ghostbusters: The Video Game** (2009, Terminal Reality) | realistic models of the cast ([Ghostbusters Wiki](https://ghostbusters.fandom.com/wiki/Ghostbusters:_The_Video_Game_(Realistic_Versions))); Ivo Shandor, the cult-leading architect behind Spook Central, as the villain, and returns to the hotel, library and museum (from memory, unverified) | Bernstein's 1984 score reused throughout ([TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/GhostbustersTheVideoGame)) | a story that goes into the building's architect | **Take:** the building's architect as the real villain, a man who stayed a man. It matches our Permanent Secretary and our rule that the people stay human. |

Where a row says "-", no source for that column was found in this run.

## 4. Rules for Final Notice

### Art

1. **Earn the temple.** The first stages are a real office at night and nothing more. The first
   unmistakably occult architecture appears no earlier than descent 30, and the full stepped altar only at
   the Seal.
2. **The crown is architecture.** The title tower's pyramid is a stepped deco crown with pylons, a door
   and two guardians, in the same stone as the floors below. No floating eye, no glowing triangle logo.
3. **One profile, three scales.** The crown's step count repeats in the lobby reception desk (0), the
   archive's shelving stacks (50) and the Seal's dais (90).
4. **The building's brick is the descent drawn upward.** Background stone ramps shift from purple-brown at
   depth to cream at the top of the tower; a screen's position on the ramp matches its descent number.
5. **Energy as crackle, creatures on few poses.** Beam and lightning effects are a white core with a
   jittering coloured wrap; large set-piece things animate on 2-4 held poses.
6. **The threat is seen before it is met.** Boss 1 and the Seal are glimpsed earlier through windows,
   glass or a doorway, the way Stay Puft's face passes the Genesis penthouse windows.
7. **No big heads, no slime, no cartoon ghosts.** The games' cartoon look is what we are not.

### Sound

1. **One uncanny voice.** A single ondes-style sine lead with glides and deepening vibrato, entering at
   descent thresholds, over an otherwise straight arrangement.
2. **Straight scoring.** Gothic cues are real horror writing (low strings, organ, choir pad); no comedy
   orchestration.
3. **Sparse, undoubled parts.** One instrument per job, leaving channels for the eerie voice and effects.
4. **Wrongness under the gloss.** Corporate wave cues keep their calm chords with a bass line that leans
   chromatic, so the dread starts at 0.
5. **Every stage its own tune.** Never one song for the game.
6. **Office noise is the horror bed.** Hum, fax and air handling, slowed and detuned as the number
   climbs; no generic horror drone.

## The judges' reference sets

Private copies, never committed, registered as this card asked:

- **Art judge** (`docs/refs/artjudge/manifest.json` in the main checkout, gitignored): three `good`
  references at grounded style, the real 55 Central Park West photo (`film-1984`), the Ghostbusters II
  Vigo painting (`film-1989`) and the 2009 game's Ivo Shandor render (`game-2009`); two `ref` study
  frames, the Data East arcade and the NES stairwell, labelled cartoony. Calibration afterwards still
  reports a bad reference outranking a good one, **and so does the set without them**: the rejected
  item 1972 Wards score above the approved item 1905 Wards in both runs, so that fault predates this
  card. The three new goods sit above every title and NES reject.
- **Sound judge** (`.sound-refs/final-notice/sources.json` in the fleet console): `good` clips of the
  Genesis High-Rise Building and Boss themes and Bernstein's score sample; the Genesis Castle and Deep
  Hole cues held as `candidate`, because labelled good they fell below the rejected NES and v1 SNES clips
  and broke the judge's separation (pairwise accuracy 0.967, line dropped to 50). With them held the
  judge recalibrates separated, pairwise accuracy 1.0, pass line 75.4, the same as before this card.

## Changes to make

To `docs/SNES-ART-BIBLE.md` (and `SNES-BACKGROUNDS.md` for the scenery lines):

1. Add the **effects** rule: energy as a white core with a 1 pixel jittering coloured wrap and a source
   flash; large creatures and set pieces on 2-4 held poses.
2. Add **no big heads, no slime, no cartoon-show ghosts** to the avoid list, naming the Ghostbusters games
   as the counter-example.
3. Add **rim-light dark objects with the sky colour** for night readability.

To `docs/SNES-DESCENT.md` (item 2056):

1. Add **earn the temple**: no occult architecture before 30, the full stepped altar only at the Seal.
2. Add the **stepped profile** to *Props that recur and warp*: reception desk (0), archive stacks (50),
   Seal dais (90), and the twin guardian statues (0, then 85+).
3. Add the **stone ramp**: purple-brown at depth to cream at the crown, tied to the descent number.
4. Add **glimpse before the meeting** for Boss 1 and the Seal.
5. Add the founder's portrait whose eyes drift, and the flooded archive level at 60-75.

To the music direction (`docs/MUSIC.md`, the SNES bank, and the descent's *Music across the arc*):

1. Add an **ondes-style sine lead** sample (glide and vibrato depth driven by the descent number) and a
   **solo cello** to the bank.
2. The eerie voice **enters at thresholds** (lifts, stairwells, doors) only.
3. Arrange **one part per job**, no doubling, and give **every stage its own tune**.
4. Build the horror bed from **office ambience slowed and detuned**, not a stock drone.
5. Before the next arrangement pass, a run listens to the Bernstein score and the Genesis cues named above
   and checks these traits by ear; this page read them from sources.
