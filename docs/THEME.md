# The Final Notice theme

One original melody, sincere and comforting, like late-80s corporate hold music played on a Famicom.
Every music cue arranges this tune; none writes a new one. The notes live in code as `MELODY` and
`CHORDS` in `src/audio/songs/title.mjs`, so an arrangement imports them rather than copying.

## Key, metre, tempo

- **F major** (F G A Bb C D E), 4/4, eighth-note rows, 8 rows a bar.
- Title tempo: 16 frames a row, a quarter note is 32 frames, about 112 BPM. 24 bars, 51 s, loops to bar 1.
- Range: Bb4 to D6 in the melody, which sits in the pulse channel's sweet spot.

## Phrase structure

| Bars | Section | Role | Cadence |
| --- | --- | --- | --- |
| 1-8 | A | the hook: a rising F-A-C arch, stated from the first note | half, on C |
| 9-16 | A' | the hook again, answered with a climb to Bb and home | full, on F |
| 17-20 | B | the bridge: starts on the top note D6 and walks down | half, on C |
| 21-24 | A'' | the hook once more, shortened to four bars | full, on F |

The hook is bars 1-2: **C5 F5 A5 G5 F5 | E5 C5**. An arrangement that keeps nothing else keeps that.

## The melody

`-` holds the note before, `.` is a rest. Eight rows to a bar.

| Bar | Chord | Melody |
| --- | --- | --- |
| 1 | F | C5 - F5 - A5 - G5 F5 |
| 2 | Am | E5 - - - C5 - . . |
| 3 | Bb | D5 - F5 - Bb5 - A5 G5 |
| 4 | C | G5 - - - - - . . |
| 5 | F | C5 - F5 - A5 - C6 - |
| 6 | Dm | A5 - - - F5 - D5 - |
| 7 | Gm | Bb4 - D5 - G5 - F5 E5 |
| 8 | C | E5 - - - - - . . |
| 9 | F | C5 - F5 - A5 - G5 F5 |
| 10 | Am | E5 - - - C5 - . . |
| 11 | Bb | D5 - F5 - Bb5 - A5 G5 |
| 12 | C | G5 - - - A5 - Bb5 - |
| 13 | Dm | A5 - - - F5 - D5 - |
| 14 | Bb | F5 - - - D5 - Bb4 - |
| 15 | C | C5 - E5 - G5 - Bb5 - |
| 16 | F | A5 - - - - - . . |
| 17 | Bb | D6 - C6 - Bb5 - A5 - |
| 18 | C | G5 - - - E5 - C5 - |
| 19 | Am, Dm | C5 - E5 - F5 - A5 - |
| 20 | Gm, C | Bb5 - A5 - G5 - E5 - |
| 21 | F | C5 - F5 - A5 - G5 F5 |
| 22 | Am | E5 - - - C5 - . . |
| 23 | Bb, C | D5 - F5 - E5 - G5 - |
| 24 | F | F5 - - - - - . . |

Bar 15's Bb5 over C makes the C7 that pulls home; it is the only note outside its chord's triad
that lands on a beat, and it is still in key.

## The title arrangement

- **Pulse 1:** the melody, 50% duty, a soft attack settling to a held volume.
- **Pulse 2:** Famichords, each chord's triad cycled every two frames at 25% duty, struck twice a
  bar (once a half bar where a bar has two chords), quiet under the lead.
- **Triangle:** root, root, fifth, root, with short rests so each note is heard. Two-chord bars
  play root then fifth for each chord.
- **Noise:** light: a soft kick on beat 1, closed hats on the off quarters, a soft snare on beat 3.
  A four-row snare fill closes bars 8, 16, 20 and 24.

## The scene arrangement

Same melody, slowed and sparse, for the story scenes: bars 1-16 only, 24 frames a row (about 75
BPM, 51 s), pulse 1 at 12.5% duty with a slow swell, a whole-bar triangle root for each chord, no
drums, and from bar 9 a faint pulse 2 echo of the melody a quarter note behind.

## SNES arrangement

The SNES cues port the NES songs, not rewrite them: `src/snes/audio/songs/title.mjs` imports the NES
title's `FORM` (sections, chords, lead lines, key shifts) and re-voices it, so the melody stays note
for note. The style every SNES music card copies:

| Voice | Title | Rule |
| --- | --- | --- |
| v1 | alto sax lead; DX piano in the intro and the bridge | the melody, one voice, never doubled; a softer instrument where the NES used a thinner tone |
| v2 | DX piano off-beat stabs on the chord's top colour tone; a sax a third below in the return | the counter-part that changes in the return |
| v3-v4 | warm pad on the third and seventh, panned hard left and right, restruck each bar | the extended chord in two guide tones; the pad's detune is the chorus |
| v5 | slap bass on the NES bass pattern | the NES bass line, re-instrumented |
| v6 | gated kick four on the floor, claps into the turns | kick and clap share a voice, as the DPCM did |
| v7 | gated snare on 2 and 4; fills pitched down the snare like toms | the snare stays dry, so the gate cuts dead |
| v8 | closed and open hats | quiet, panned right with the bank |

- **Echo on the lead, piano, pads and clap only**; bass and drums dry. The echo buffer shares sound RAM
  with the samples, so `edl` is small (4, 64 ms) and the song's samples plus `edl * 2048` bytes must fit
  64 KB (the test checks it).
- **Headroom**: master volume about 84, so the whole song peaks under 0.85.
- **A loop is checked by RMS**: render the song offline in node, and the loop bar's RMS on the second
  pass must match the first within 10%.

## Rules for the next arrangement

- Keep the key relationship: transpose the whole thing if the cue needs it, never reharmonise the hook.
- Keep bars whole: every channel's rows are a multiple of 8 and all channels end together.
- Original only: nothing quoted from existing songs.
