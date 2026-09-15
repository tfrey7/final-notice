# How SNES music was actually composed

Tim (12:19 EDT 2026-09-15): "we need to do research on how SNES music is composed i think, our music
is still missing _something_". This page is about the craft, not the chip: how composers spent eight
voices, a few kilobytes of samples and one echo unit, and what our own tracks do differently. The chip
itself is already in `docs/MUSIC.md` and `src/snes/audio/spc.mjs`. No music was written for it and no
reference audio is in the repo.

**How it was studied.** Sources were read on the web and are linked where they are used; a claim
that no source here confirms is marked *(from memory, unverified)*. Our tracks were rendered offline
(`tools/snes-render.mjs`, first 32 s) and scored by the fleet's sound judge against the project's
reference set (Tim's "certified snes bangers" mix and the clips he rejected). No reference track was
downloaded for this page; the judge's set is the only comparison audio.

## 1. The eight voices were a budget, not a ceiling

- **Two voices were never really the music's.** Most SNES drivers played music on all eight channels
  and interrupted two of them for sound effects as needed
  ([SNESdev Wiki: Audio drivers](https://snes.nesdev.org/wiki/Audio_drivers)). Nintendo's own driver,
  N-SPC ("Kankichi-kun"), shipped music-only and each studio bolted its own effect protocol onto it
  ([SnesLab: N-SPC Engine](https://sneslab.net/wiki/N-SPC_Engine)). A tune had to survive losing its
  two lowest-priority parts mid-phrase, so those parts were the ones a player would not miss: an extra
  percussion layer, a doubling, a pad.
- **Echo was a voice you did not pay for.** The DSP's echo is enabled per channel by a bitfield
  ([nesdoug: SNES Music 2](https://nesdoug.com/2021/04/11/snes-music-2/)), so a lead sent to it gets a
  trailing ghost for free. Where the hardware echo could not be used, composers copied the melody onto
  a spare channel, a little late and quieter, and accepted that it cost a voice and made effects harder
  to fit ([NESDev forum: simulating echo](https://forums.nesdev.org/viewtopic.php?t=21192)).
- **One voice could modulate the next.** Pitch modulation (PMON) lets voice *n* bend the pitch of
  voice *n+1*, "growling, vibrato-rich, or metallic sounds without extra samples"; the noise generator
  replaces a sample with noise for wind, surf, cymbals and explosions
  ([oldmachines.io: Super NES Audio](https://oldmachines.io/supernintendo/audio/)).

## 2. A small sample set, stretched

- **Short loops.** A half-second recording sustains as long as a note is held because the BRR block
  header can jump back to a loop point, the trick that made 64 KB of sound RAM workable
  ([oldmachines.io](https://oldmachines.io/supernintendo/audio/)). Loop and end points fall on 16-sample
  BRR blocks, and homebrew composers still retune a sample so its loop lines up and crossfade the seam
  ([nesdoug](https://nesdoug.com/2021/04/11/snes-music-2/)).
- **Stored low, played high.** Samples were stored below the 32 kHz output rate and pitched up, trading
  treble for memory ([oldmachines.io](https://oldmachines.io/supernintendo/audio/)). The Gaussian
  interpolation dulls the top further; that soft top is part of the era's sound, and bright attacks
  were the exception that marked an accent *(from memory, unverified)*.
- **Memory shaped the writing, not only the sound.** Yuzo Koshiro on memory limits: "If there wasn't
  a lot of memory available, I would just try to write with sounds that didn't take up much memory"
  ([shmuplations: Koshiro 2001](https://shmuplations.com/yuzokoshiro/)). For ActRaiser he and the lead
  programmer swapped sample sets per stage, because the stock driver "could only fetch one thing from
  memory at a time" ([One Million Power](https://www.onemillionpower.com/sound-creators-that-pushed-hardware-limits-yuzo-koshiro-and-yasunori-mitsuda/)).
- **Why a small set still sounded rich:** one sample became several instruments through its envelope
  (ADSR per voice), its register, pitch modulation and the echo
  ([oldmachines.io](https://oldmachines.io/supernintendo/audio/)); a pluck and a pad can share a
  waveform.

## 3. The echo was the room

The S-DSP echo is a delay line of up to about 240 ms in 16 ms steps (EDL), fed back into itself (EFB),
with an 8-tap FIR colouring each repeat: "a gentle low-pass for a warm hall, or odd taps for a metallic
ring" ([oldmachines.io](https://oldmachines.io/supernintendo/audio/)). Practical advice from homebrew:
keep echo volume below main volume and feedback at or under $60, past which it behaves "like putting a
microphone directly in front of a speaker" ([nesdoug](https://nesdoug.com/2021/04/11/snes-music-2/)).
Because the enable is per channel, the usual mix sends leads, pads and strings to the echo and keeps
bass and kick dry so the low end stays tight *(from memory, unverified)*.

## 4. Ornament lived in the sound driver

Square's AKAO driver, which Chrono Trigger used, exposes per-note expression as sequence commands: a
**delayed vibrato** that starts only after a note has been held some ticks, with its own rate, depth and
up/down/both mode, and a **portamento** that slides the next note from the current pitch by a number of
semitones over a number of ticks, plus pan slides
([mfvitools wiki](https://github.com/emberling/mfvitools/wiki);
[SNESdev Wiki: Audio drivers](https://snes.nesdev.org/wiki/Audio_drivers)). Yasunori Mitsuda credits
sound programmer Minoru Akao with building "a lot of the new features that we used in Chrono Trigger"
([One Million Power](https://www.onemillionpower.com/sound-creators-that-pushed-hardware-limits-yuzo-koshiro-and-yasunori-mitsuda/)).
The point for us: expression was written note by note in the sequence, not set once per instrument.

## 5. Arrangement and form

- **Motifs recur and the key moves.** Michiru Yamane's *Dracula's Castle* is built from two short germs
  (a held note answered by three quick ones, and an insistent triplet) reused across the whole piece,
  with key shifts following the story and the tune lifted an octave for the climax
  ([Game Developer study](https://www.gamedeveloper.com/audio/a-study-of-michiru-yamane-s-dracula-s-castle-from-the-soundtrack-to-castlevania-symphony-of-the-night)).
  That piece is from Symphony of the Night (PlayStation), not the SNES, but it is the clearest written
  analysis of her habits.
- **Atmosphere by subtraction.** Super Metroid's Lower Brinstar is a pulsing drone, choir chants and a
  sparse flute-and-piano melody ([Wikitroid: Lower Brinstar](https://metroid.fandom.com/wiki/Lower_Brinstar));
  much of that score is "brooding, ambient" and serves the room first
  ([GameGrin](https://www.gamegrin.com/articles/how-super-metroids-music-defined-the-atmosphere/)).
  Few parts, lots of space, the echo filling it.
- **Loops hide the seam** by ending on the dominant and resuming on a phrase start rather than the
  intro, and by looping to a bar whose drums already groove *(from memory, unverified)*. Our songs
  already do this (Stage 2 loops from its turnaround to A).
- **Dance-music contrast, Streets of Rage 2** (Genesis FM, so not SNES): Koshiro and Motohiro Kawashima
  wrote it from Tokyo club music ([Red Bull Music Academy](https://daily.redbullmusicacademy.com/2014/09/yuzo-koshiro-interview/)),
  and Koshiro wanted the hits themselves to carry it: "If the sounds themselves don't psych you up,
  everything falls flat" ([shmuplations: Streets of Rage interviews](https://shmuplations.com/sormusic/)).
  Club tracks build and release by adding and removing whole layers, which is exactly the move our
  gothic cues never make.

## 6. The games and the people

| Game | Who | What the sources support |
| --- | --- | --- |
| Super Castlevania IV (1991) | Masanori Adachi, Taro Kudo (Konami Kukeiha Club) | director Ueno wanted music and effects to build the atmosphere ([Wikipedia](https://en.wikipedia.org/wiki/Super_Castlevania_IV)); no written analysis of its arranging was found |
| Castlevania: Dracula X (1995) | Konami Kukeiha Club with Michiru Yamane ([Discogs](https://www.discogs.com/master/1446601-Konami-Kukeiha-Club-Michiru-Yamane-Castlevania-Rondo-Of-Blood-Castlevania-Dracula-X)) | Yamane: motif germs, key shifts, register lift (section 5) |
| Final Fight (SNES 1990) | arcade score by a Capcom team incl. Yoko Shimomura; the SNES port arranged by Toshio Kajino ("Bull") ([Wikipedia](https://en.wikipedia.org/wiki/Final_Fight_(video_game))) | an arcade score cut down to the SNES's voices and memory; no detail found on what was cut |
| Super Metroid (1994) | Kenji Yamamoto, Minako Hamano ([Wikipedia](https://en.wikipedia.org/wiki/Kenji_Yamamoto_(composer,_born_1964))) | drones, choir, sparse lines, space (section 5) |
| Chrono Trigger (1995) | Yasunori Mitsuda, with Nobuo Uematsu and Noriko Matsueda ([Wikipedia](https://en.wikipedia.org/wiki/Chrono_Trigger)) | Mitsuda "wanted to create music that wouldn't fit into any established genre"; AKAO's per-note vibrato and portamento (section 4) |
| ActRaiser (1990) | Yuzo Koshiro | written on a PC-88 FM card then rearranged for samples; strings were easier on the SNES than on FM; per-stage sample swapping ([shmuplations](https://shmuplations.com/yuzokoshiro/), [Wikipedia](https://en.wikipedia.org/wiki/ActRaiser)) |
| Streets of Rage 2 (Genesis 1992) | Yuzo Koshiro, Motohiro Kawashima | club-music layering, punchy sampled hits (section 5) |

**On the composers named in the brief:**

- **Yoko Shimomura**'s SNES-era work is Street Fighter II, of which she wrote all but three pieces, and
  Super Mario RPG (1996); on Final Fight she wrote stage 5's pieces for the arcade, not the SNES port
  ([Wikipedia](https://en.wikipedia.org/wiki/Yoko_Shimomura)).
- **Masato Kouda has no SNES credits.** He joined Capcom in 1994 and wrote arcade scores first, such as
  Vampire Savior with its "gothic stylings with contemporary techno and jazz elements"
  ([VGMO profile](https://vgmonline.net/masatokouda/)). That mix is still a useful model for our
  gothic cues, but he is not an SNES example. (Demon's Crest, Capcom's gothic SNES game, is Toshihiko
  Horiyama's ([Capcom Database](https://capcom.fandom.com/wiki/Demon's_Crest)).)

## 7. What our music is missing

Scored against the list above: the Stage 2 chase (`stage2`, item 2053) and the two gothic cues, Disposal
Line (`disposal`) and the Great Seal (`seal`), item 2070. Judge scores are the first 32 s of each
against a pass line of 75.4:

| Track | Score | Loudness | Voices heard at once | Stereo width | Nearest era |
| --- | --- | --- | --- | --- | --- |
| Stage 2 chase | 56.6 | -19.6 dBFS | 2 | 0.22 | SNES synthesised bank (v1), the rejected one |
| Disposal Line | 63.5 | -23.8 dBFS | 3 | 0.09 | late-1995 SNES |
| Great Seal | 61.1 | -22.1 dBFS | 3 | 0.10 | late-1995 SNES |

The good references sit near -24.9 dBFS with about three voices heard at once. The gaps, most
important first:

1. **No dynamics by dropout — Stage 2 chase.** All eight voices play every bar of A, B, the bridge and
   the return; only two intro bars and a four-bar break thin out. The judge: "a boxy, repeating
   bass-and-drum loop that barely changes". *Technique:* whole layers leave and return at section
   boundaries (section 5): drums out for the second A, bass alone under the first B bars, the kit back
   for the bridge.
2. **Two voices spent on one job — Stage 2 chase.** The pad and the choir both hold the same chord in
   whole bars for the entire song, so eight voices are heard as two. *Technique:* spend a voice on
   motion instead (section 1): an echo copy of the lead a few rows late, or a counter-melody that
   answers the lead's held notes.
3. **The same rhythm every bar — Stage 2 chase.** Nearly every lead bar is one long note and two
   pickups. The judge hears "a thin, even smear of sustained tones" and wants "short melodic runs".
   *Technique:* call and response and a recurring short germ (section 5): let the brass answer with a
   quick figure in the lead's held half-bar, and give B a different rhythm from A.
4. **Expression set once per instrument, not per note — Great Seal.** Vibrato is a fixed instrument
   envelope, and there are no slides, grace notes or bends; the judge calls the lead "dead straight
   lines". *Technique:* AKAO-style per-note delayed vibrato and portamento (section 4) on the long
   brass notes. Our player takes vibrato only per instrument, so this needs a player feature first.
5. **Harmony locked in parallel — Disposal Line.** The strings play the brass lead a third below for
   the whole song. *Technique:* a counter-melody in contrary motion that enters on the answers and
   drops out under the calls (section 5).
6. **A drum grid that changes only once — Disposal Line.** Outside the half-time breakdown it is the
   same kick-snare groove and straight eighth-note hats every bar, with a fill at section ends.
   *Technique:* a different pattern for each section, not just the breakdown, and fills that vary
   (section 5, the Streets of Rage 2 contrast); rows left open also give sound effects somewhere to
   land (section 1).
7. **A bell on every downbeat — Great Seal and Disposal Line.** The toll never stops, so it stops
   meaning anything. *Technique:* atmosphere by subtraction (section 5): toll only at section heads
   and let the echo carry it.
8. **One small room for everything — Great Seal.** All three songs use the same FIR and a 96 ms
   delay, and the gothic mixes are nearly mono. The judge asks for "longer echo tails" and a wider
   field. *Technique:* choose the room per song (section 3): a longer delay and a darker low-pass FIR
   for the cathedral cues, parts panned apart.
9. **A bright haze across the top — Great Seal and Disposal Line.** The judge hears "an even grey
   hiss" through both. Our bank lifts treble before encoding (`docs/MUSIC.md`) and the hats run every
   eighth. *Technique:* keep the era's soft top and save brightness for accents (section 2).
10. **Too loud, too flat — Stage 2 chase.** About 5 dB hotter than the references with 4.5 dB of
    dynamic range. *Technique:* headroom, so dropouts and returns (gap 1) can be heard.

Never tried in any of the three: pitch modulation and the noise voice (section 1), a cheap route to a
growl under a drone or wind in a quiet section.
