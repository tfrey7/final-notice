# What made the SNES classics the classics

Tim, 07:30 EDT 2026-09-15: *"Final Notice work: let's try for an SNES version now, and all that
entails"*.

A working study for epic 1898 (`docs/SNES-PLAN.md`), the sibling of `docs/NES-CLASSICS.md`. Six
games, the parts of each that Final Notice can use, and a "Final Notice takes" list per game that
confirms or corrects the plan's section 3. Nothing here copies a game's art, music or text: we take
the rules, not the content.

Claims marked *(verified)* come from the linked source. *(search summary)* means the source refused
a direct fetch and the claim was read from its search result. *(from memory, unverified)* means no
source confirmed it during this research: a starting point to tune, not a fact.

## The hardware every one of them fought

**Picture (S-PPU)**

- **128 sprites, 32 on a scanline, 34 tiles' worth on a scanline.** Past 32 the highest OAM index is
  discarded; past 34 "slivers" the lower-indexed ones go first. Discarded, not flickered: the
  hardware does no rotation, so any flicker a game shows is its own software choice
  *(verified: [SNESdev sprites][sd-sprites])*.
- **Sprite sizes come in pairs per screen:** 8x8, 16x16, 32x32, 64x64 and two odd 16x32/32x64
  pairs; 16x16 with 32x32 is one of the legal pairs *(verified: [SNESdev sprites][sd-sprites],
  [PPU registers][sd-ppu])*.
- **Each sprite picks one of 8 palettes from the upper half of CGRAM, 16 colours with colour 0
  transparent** *(verified: [SNESdev sprites][sd-sprites])*. CGRAM holds 256 colours as 15-bit
  BGR, 5 bits a channel *(verified: [PPU registers][sd-ppu])*.
- **Mode 1** gives BG1 and BG2 at 4 bits a pixel and BG3 at 2 bits (4 colours); **Mode 7** is one
  8-bit, 256-colour layer through an affine matrix *(verified: [PPU registers][sd-ppu])*. Mode 7
  transforms a background, never sprites *(verified: [Wikipedia, Turtles in Time][tit-wp])*.
- **Master brightness 0-15, mosaic 1x1 to 16x16, two windows** *(verified: [PPU registers][sd-ppu])*.
- **Colour math** adds or subtracts the sub screen from the main screen, optionally halved; one
  operation at a time, which is why "add and halve" is the common SNES transparency, and it can
  stand in for night or fog without spending a layer *(verified: [SNESdev colour math][sd-cm],
  [Super Famicom wiki][sfc-trans])*.

**Sound (S-SMP: SPC700 + S-DSP)**

- **8 voices of BRR samples at 32 kHz** (32,000-32,160 Hz by console), **4-point Gaussian
  interpolation**, **64 KiB of RAM** for driver, song data, samples and echo buffer together
  *(verified: [SNESdev S-DSP][sd-dsp])*.
- **BRR is 9 bytes per 16 samples:** one header byte (shift, filter, loop, end) then 16 4-bit
  samples. Against 16-bit PCM that is 32:9 (about 3.6:1) *(verified: [SNESdev BRR][sd-brr]; ratio
  derived)*.
- **Echo is an 8-tap FIR** (FIR0-FIR7, signed 8-bit) on a delay of EDL x 16 ms, up to 240 ms, and
  the buffer costs **EDL x 2,048 bytes of the same 64 KiB** (up to 30 KB at the longest delay)
  *(verified: [S-DSP registers][sd-dspreg])*.
- **One noise generator shared by any voice that asks for it; pitch modulation from the previous
  voice's output; ADSR or GAIN envelopes per voice** *(verified: [S-DSP registers][sd-dspreg])*.

Every classic below is a clever answer to those two lists, and the sound list is the harder one:
David Wise described DKC's whole score as "trying to squeeze as much sonic content from the 64k"
*(verified: [VGMO interview][wise-vgmo])*.

## Beat-'em-ups

### Final Fight (Capcom; arcade 1989, SNES 1991)

Years from [Wikipedia][ff-wp] (arcade) and [superfamicom.org][ff-sfc] (SNES, search summary); the
Japanese Super Famicom release in December 1990 is *(from memory, unverified)*.


- **The port cut the crowd and kept the size.** The SNES shows **two or three foes at once**
  against the arcade's nine or ten, and makes up for it with **more stopping points and re-laid
  enemy placement** *(search summary: [Capcom Database][ff-capcom], [Nintendo wiki][ff-nwiki])*.
- **The cost:** no two-player co-op, no Guy, no Industrial Area, most scene transitions cut; reviews
  still call the streets "oddly empty" and the game short *(search summary: [Capcom
  Database][ff-capcom], [RAM Retro][ff-ram])*.
- **Big, readable sprites:** Cody and Haggar take "a substantial portion of the screen"
  *(search summary: [superfamicom.org][ff-sfc])*. The plan's "Haggar near 100 px" was not
  confirmed *(from memory, unverified)*.
- **Hitstop is the feel.** Landing a hit pauses the attacker's animation as well as stunning the
  foe, more so when one swing hits several; it is the base of every later Capcom brawler
  *(verified: [MoeGamer][ff-moe])*.
- **Every foe type has a distinct silhouette and a name**, and Haggar's throws do far more damage
  than Cody's: the grab is the heavy hitter's reward *(verified: [MoeGamer][ff-moe])*.
- **Deep belt floors under a perspective gradient** were not confirmed for the SNES port
  *(from memory, unverified)*.

**Final Notice takes**

- **Confirmed:** 2-3 foes at once with more, smaller waves (the port's own answer to the limit).
- **Confirmed:** hit-stop in the tuning table, applied to Ward as well as the foe, longer when one
  punch hits two.
- **Added:** a silhouette and a name per foe type; the grab-and-throw is where the big damage is.
- **Unverified, keep as a choice not a quote:** 56-64 px characters and the HDMA floor gradient
  are our decisions; do not cite Final Fight for the gradient.

### Sunset Riders (Konami; arcade 1991, SNES 1993)

- **Each stage opens on a wanted poster** of the outlaw who waits at its end, with the reward and
  "Wanted dead or alive" *(verified: [Wikipedia][sr-wp], [Konami wiki][sr-kwiki] search summary)*.
- **Bosses talk out loud.** The arcade voices its boss lines; the SNES keeps the voice acting and
  **adds subtitles**. The **text bubbles** instead of voice are the **Genesis** port
  *(verified: [Wikipedia][sr-wp])*. The SNES keeps "almost all" the voice samples
  *(search summary: [Retro Game Age][sr-rga])*.
- **The most damage to a boss scores a bonus**, so co-op players race for the kill
  *(verified: [Wikipedia][sr-wp])*.
- **The SNES port was censored:** saloon women dressed more conservatively, Native American foes
  replaced by outlaws *(verified: [Wikipedia][sr-wp])*.
- **"Cartoon clarity"** as a stated quality was not sourced *(from memory, unverified)*.

**Final Notice takes**

- **Confirmed:** a boss title card before each boss area, the name and a price on it (for us a
  department and a filed-memo look instead of a bounty).
- **Corrected:** the plan's "speech-bubble taunts" are the Genesis version. The SNES way is a
  **sampled voice line with a subtitle**; our one voice line per boss gets its text on BG3 under it.
- **Added:** the poster is shown at the start of the area, not when the boss appears, so the
  player walks the stage knowing whom they are after.

### TMNT IV: Turtles in Time (Konami, SNES 1992)

- **Throwing a Foot soldier at the screen is on a button on the SNES**, where in the arcade it
  happened at random; the Technodrome's Shredder, SNES-only, can only be hurt that way
  *(verified: [Game Rant][tit-gr], [Nintendo wiki][tit-nwiki] search summary)*.
- **That throw is not Mode 7.** Mode 7 cannot scale sprites, and no scaling is shown: it is drawn
  frames. Mode 7 is used for the **Neon Night-Riders** stage, turned into an over-the-shoulder,
  into-the-screen ride *(verified: [Wikipedia][tit-wp])*.
- **A tighter game than its arcade:** tighter controls and hitboxes, two players instead of four,
  Time Trial and Versus modes added, new bosses (Slash, Rat King, Bebop and Rocksteady, Super
  Shredder) *(verified: [Game Rant][tit-gr])*.
- **Music:** the arcade score (Mutsuhiko Izumi) arranged for the SNES by Kazuhiko Uehara and Harumi
  Ueko; the attract tune became the cartoon theme; some voice samples cut *(verified:
  [Wikipedia][tit-wp])*. "Sampled drums" as a stated feature was not sourced
  *(from memory, unverified)*.
- **Variety came from eras**, stage by stage (present-day New York, prehistory, pirate ships, the
  future), not from palette swaps *(verified: [Wikipedia][tit-wp])*. Colour-coded Foot soldiers are
  confirmed for the NES TMNT II (`docs/NES-CLASSICS.md`), not checked here for IV
  *(from memory, unverified)*.

**Final Notice takes**

- **Confirmed:** the throw-into-the-camera, on a button, as the finisher on an area's last foe.
- **Corrected:** draw it as 3-4 pre-made growing frames of the foe (32x32 up to a 64x64 entry),
  not a Mode 7 or Phaser scale: the hardware could not scale sprites.
- **Added:** if we want Mode 7 in play, the honest use is a background (a floor or a corridor),
  as Neon Night-Riders did.
- **Keep, re-sourced:** palette-swapped foes are right, but cite River City Ransom and TMNT II, not IV.

## Action and platforming

### Super Castlevania IV (Konami, 1991)

- **Mode 7 as set pieces:** in Stage 4 Simon hangs from a whip hook while the whole room rotates
  around him with spiked walls and Medusa heads *(search summary: [TV Tropes][cv4-tvt],
  [JVGS][cv4-jvgs])*. MobyGames lists "rotating rooms and pseudo-3D objects in some
  locations", so more than one *(search summary: [MobyGames][cv4-moby])*.
- **The swinging chandeliers (Stage 6)** are platforms the player jumps between; nothing found says
  they are Mode 7 *(verified: [JVGS][cv4-jvgs] search summary; Mode 7 unverified)*.
- **The whip in eight directions**, held out and dangled by keeping the button down, and swung from
  rings over pits: a verb the NES games never had *(verified: [Wikipedia][cv4-wp])*.
- **Atmosphere was the praise:** Masanori Adachi and Taro Kudo's score; the director was proud of how
  sound and music built mood; *Entertainment Weekly* wrote of "dark, earthy colors; ominous, almost
  subliminal sound effects" *(verified: [Wikipedia][cv4-wp])*. "Sampled orchestra" as a description
  was not sourced *(from memory, unverified)*.
- **Parallax** is named alongside Mode 7 among its hardware effects *(search summary:
  [MobyGames][cv4-moby])*.

**Final Notice takes**

- **Confirmed:** Mode 7 held back for a few moments of spectacle; the Scene 2 alarm spinning the
  room is exactly Stage 4's trick. The three the plan names stay.
- **Corrected:** the plan says "once or twice"; Castlevania IV used it in several places. The rule
  we take is *rare and tied to a moment*, not a count.
- **Added:** the player keeps control during the spin (Simon still swings); our spin must not take
  the pad away for more than a second.
- **Added:** mood is sound effects as much as music: quiet, low office sounds under Stage 2.

### Donkey Kong Country (Rare, 1994)

- **Pre-rendered on Silicon Graphics workstations** (Rare's "Advanced Computer Modelling"): models in
  PowerAnimator, animated, rendered frame by frame, then compressed into SNES sprites
  *(verified: [Wikipedia][dkc-wp])*.
- **The palette was the fight:** renders came out in millions of colours and each sprite had to
  land in a 16-colour palette; Rare wrote its own compression the CPU could unpack while playing
  *(search summary: [Medium][dkc-medium], [GameGrin][dkc-gamegrin])*. Cutting backgrounds into tiles
  was "the bane of the project" *(verified: [Wikipedia][dkc-wp])*.
- **Parallax scrolling** was singled out by reviewers *(verified: [Wikipedia][dkc-wp])*. The number
  of layers per level was not found *(from memory, unverified)*.
- **Music by David Wise, Eveline Novakovic (Fischer) and Robin Beanland.** Wise used short, often
  single-cycle waveforms sampled through filter settings from a Korg Wavestation and Roland U-110;
  cutting the ends off to save memory left "desirable artefacts" of distortion and harmonics
  *(verified: [VGMO interview][wise-vgmo], [Wikipedia][dkc-wp])*.
- **Aquatic Ambience** began as "eight waveforms played in sequence" on the Wavestation and took five
  weeks; it is praised as getting more texture from the S-SMP than anyone *(verified:
  [Wikipedia][aqua-wp])*.
- **Environmental sounds in the score:** Wise wrote ambient sounds that are themselves rhythmic,
  "nothing was random" *(search summary: [OverClocked ReMix interview][wise-ocr])*; Cave Dweller
  Concert pairs echo with dripping water *(search summary: [Old School Gamer][dkc-osg])*.

**Final Notice takes**

- **Confirmed:** model-painted poses cleaned by hand into one 15-colour palette (plus transparent)
  per character: DKC's exact route, on a smaller scale.
- **Confirmed, not counted:** 2-3 parallax layers per area is our choice; DKC is cited for parallax,
  not for a number.
- **Corrected:** "pads soaked in echo" undersells it. The DKC lesson is **tiny single-cycle
  samples, shaped by filter and envelope, with echo**, so the bank spends bytes on variety, not on
  long loops.
- **Added:** office ambience written into the Stage 2 track on the beat (a printer, a lift, a
  stamp), not as random effects.
- **Added:** the echo buffer comes out of the same 64 KiB: a 240 ms echo costs 30 KB, half the
  sample memory; keep Stage 2's delay short or budget for it.

## Music

### Chrono Trigger (Square, 1995)

- **One theme carries the score.** Yasunori Mitsuda "tried to use leitmotifs of the Chrono Trigger
  main theme to create a sense of consistency", as films do *(verified: [Wikipedia][ct-wp])*; he
  reshapes the melody, quotes fragments or builds new material around it *(search summary:
  [Greatest Game Music][ct-ggm])*.
- **Big for its time:** 64 tracks, 2 h 40 min of music, three discs on release; Nobuo Uematsu wrote
  ten tracks when Mitsuda fell ill, Noriko Matsueda one *(verified: [Wikipedia][ct-wp])*.
- **Mitsuda was a sound programmer before he composed**; Minoru Akao is credited as sound
  programmer *(verified: [Wikipedia][ct-wp]; search summary: [VGMPF][ct-vgmpf])*.
- **Style:** jazz, rock and Celtic influences *(search summary: [Greatest Game Music][ct-ggm])*.
- **"Small instrument set used expressively"** and **"melody first"** were not confirmed
  *(from memory, unverified)*.

**Final Notice takes**

- **Not taken** (Tim, 14:40 EDT 2026-09-15: "each track stands alone"): the leitmotif method made
  our tracks sound alike. Every cue is its own song; the soundtrack holds together through one
  instrument set, era and mood (`docs/MUSIC.md`, *The rule*).
- **Kept:** the main theme (`docs/THEME.md`) plays whole on the title and in story scenes, and
  anywhere else at most as a brief nod.

### Donkey Kong Country, for music

See DKC above: the score's lesson for us is sample economy (short waves, filters, clipped loops),
environmental rhythm, and echo spent where it pays, all inside 64 KiB.

## The lessons

| # | Lesson | From |
| --- | --- | --- |
| S1 | **Spend the sprite budget on size, not crowds.** 2-3 big foes, more stopping points, placement redone for the smaller count. | Final Fight |
| S2 | **Hit-stop on both sides.** The attacker pauses too; longer when one hit lands on several. | Final Fight |
| S3 | **Introduce the boss before the stage.** A poster with a name and a price; the boss speaks a sampled line with a subtitle. | Sunset Riders |
| S4 | **Put the showpiece on a button.** The throw-at-the-screen was random in the arcade and a button on the SNES. Draw its frames. | Turtles in Time |
| S5 | **Mode 7 is a background, used for a moment.** Rotating rooms, an into-the-screen ride; the player keeps control. | Castlevania IV, Turtles in Time |
| S6 | **Mood is sound effects too.** Low, near-subliminal effects carried Castlevania IV's dread. | Castlevania IV |
| S7 | **Clean a render into one palette.** Millions of colours down to 16 per sprite; tiles for backgrounds. | Donkey Kong Country |
| S8 | **Small samples, many sounds.** Single-cycle waves, filtered, clipped; echo budgeted from the same 64 KiB. | Donkey Kong Country |
| S9 | **Ambience keeps time.** Environmental sounds written on the beat. | Donkey Kong Country |
| S10 | **One sound, many songs.** Every track its own melody; the main theme on the title and story scenes, a nod at most elsewhere. (Chrono Trigger's leitmotifs, not taken: Tim 09-15.) | Chrono Trigger |

## Checklist against `docs/SNES-PLAN.md`

| Plan section | Check | Lessons | Cards |
| --- | --- | --- | --- |
| §2 limits | 32 entries / 34 tiles a line, dropped not flickered; 16x16+32x32 pair | — | 1902 |
| §2 sound | BRR 9 bytes per 16 samples; echo buffer EDL x 2,048 bytes of the 64 KiB | S8 | 1904, 1912 |
| §3 Final Fight | 2-3 foes, extra stopping points, hit-stop on attacker and foe | S1, S2 | 1928 |
| §3 Sunset Riders | Boss card at the area start; voice line with a subtitle, not a bubble | S3 | 1931, 1925 |
| §3 TMNT IV | Throw finisher on a button, drawn in growing frames, no scaling | S4 | 1928, 1919 |
| §3 Castlevania IV | Mode 7 only for the three named moments; the pad stays live | S5 | 1909, 1927, 1932, 1926 |
| §3 DKC | One 15-colour palette per character from the model; short-loop bank; short echo | S7, S8, S9 | 1905, 1912, 1923 |
| §3 Chrono Trigger | Every cue its own song; the main theme only on the title and story scenes | S10 | 1915, 1922-1925, 2193 |
| §6 sound | Quiet office effects under Stage 2 | S6, S9 | 1923, 1925 |

## Sources

Every source is linked where it is cited above; the link targets follow in the raw file.

[sd-sprites]: https://snes.nesdev.org/wiki/Sprites
[sd-ppu]: https://snes.nesdev.org/wiki/PPU_registers
[sd-cm]: https://snes.nesdev.org/wiki/Color_math
[sfc-trans]: https://wiki.superfamicom.org/transparency
[sd-dsp]: https://snes.nesdev.org/wiki/S-DSP
[sd-brr]: https://snes.nesdev.org/wiki/BRR_samples
[sd-dspreg]: https://snes.nesdev.org/wiki/S-DSP_registers
[ff-wp]: https://en.wikipedia.org/wiki/Final_Fight_(video_game)
[ff-capcom]: https://capcom.fandom.com/wiki/Final_Fight
[ff-nwiki]: https://nintendo.fandom.com/wiki/Final_Fight_(video_game)
[ff-ram]: https://retroarcadememories.wordpress.com/snes/final-fight/
[ff-sfc]: https://superfamicom.org/info/final-fight
[ff-moe]: https://moegamer.net/2018/09/27/capcom-essentials-final-fight/
[sr-wp]: https://en.wikipedia.org/wiki/Sunset_Riders
[sr-kwiki]: https://konami.fandom.com/wiki/Sunset_Riders
[sr-rga]: https://www.retrogameage.com/snes/sunset-riders/
[tit-wp]: https://en.wikipedia.org/wiki/Teenage_Mutant_Ninja_Turtles:_Turtles_in_Time
[tit-gr]: https://gamerant.com/tmnt-turtles-time-differences-snes-arcade-version/
[tit-nwiki]: https://nintendo.fandom.com/wiki/Teenage_Mutant_Ninja_Turtles_IV:_Turtles_in_Time
[cv4-wp]: https://en.wikipedia.org/wiki/Super_Castlevania_IV
[cv4-tvt]: https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/SuperCastlevaniaIV
[cv4-jvgs]: https://www.jvgs.net/blog/2018/10/31/castlevania-iv/
[cv4-moby]: https://www.mobygames.com/game/6619/super-castlevania-iv/
[dkc-wp]: https://en.wikipedia.org/wiki/Donkey_Kong_Country
[dkc-medium]: https://medium.com/@newplayerready/donkey-kong-country-how-pre-rendered-graphics-saved-the-snes-late-in-its-life-new-player-ready-90a07cb2b76f
[dkc-gamegrin]: https://www.gamegrin.com/articles/why-donkey-kong-country-was-a-technical-marvel/
[dkc-osg]: https://www.oldschoolgamermagazine.com/soundtrack-review-donkey-kong-country-part-i-snes-1994/
[aqua-wp]: https://en.wikipedia.org/wiki/Aquatic_Ambience
[wise-vgmo]: https://vgmonline.net/davidwiseinterview/
[wise-ocr]: https://ocremix.org/info/Composer_Interview:_David_Wise
[ct-wp]: https://en.wikipedia.org/wiki/Music_of_Chrono_Trigger
[ct-ggm]: https://www.greatestgamemusic.com/soundtracks/chrono-trigger-soundtrack/
[ct-vgmpf]: https://www.vgmpf.com/Wiki/index.php/Chrono_Trigger_(SNES)

Some sources refused a direct fetch (the Konami wiki, Retro Game Age, the Castlevania wiki, the
Original Sound Version Mitsuda interview, The Cutting Room Floor); their claims above are marked
*(search summary)* and match other sources where one was found. No figure for Haggar's height in
pixels, DKC's layer count, or Chrono Trigger's instrument count was found.
