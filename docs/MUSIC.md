# Corporate wave on a Famicom

Tim's ruling (01:09 EDT 2026-09-15): the NES theme was authentic but "not corporate wave enough". The
theme now plays on the 2A03 plus Konami's VRC6 cartridge chip, the Famicom Castlevania III setup.

## The rule: a shared motif, used lightly; every track its own identity

Tim (01:38 EDT 2026-09-15): the music sounded great but "super repetitive"; keep the shared motif but
go easy on it, and make every track a banger that stands out in its own way. So:

- **The title's hook is a nod, not a backbone.** A stage quotes its contour once, a few notes in the
  intro, in the stage's own key. The melody is the stage's own.
- **Every track has its own tempo, key, groove and lead voice**, and a real form of at least 90 s
  before it loops: intro, A, B, a breakdown, and a return that changes something (key, fills, a
  counter-line).
- **Late NES, 1990-94**: DPCM sampled drums, a fat VRC6 bass or brass, Kirby-style polish.

| Track | Tempo, key | Groove | Lead | Form (bars) |
| --- | --- | --- | --- | --- |
| Stage 1, funk brawl | 112 BPM, D dorian | sixteenth funk: saw slap bass, clav chops, DPCM kick and gated snare, a clap breakdown | 2A03 pulse, 25%, sliding, with an echo; a singing 50% pulse and a harmony in B | intro 4, A 8, B 8, A' 8, breakdown 8, A' up a tone 8, turnaround 4: 102 s |
| Stage 2, escape chase | 180 BPM, C minor | driving triangle octaves, detuned VRC6 sixteenth arpeggios, broken-four DPCM drums, a half-time breakdown | VRC6 saw brass, with pulse offbeat stabs and a harmony in B | intro 4, A 16, B 16, breakdown 8, A up a tone 16, B up a tone 8, tag 4: 96 s |

| Title, corporate wave anthem | 128 BPM, Eb major | four-on-the-floor DPCM kick, gated noise snare, off-beat pumping 2A03 chords, Sunsoft octave saw bass, a triangle thump | VRC6 pulse, 25%, glassy, with a detuned echo; a 50% singing tone in B and the bridge; a harmony in the return | intro 4, A 8, A' 8, B 8, bridge 8, return up a tone 8, tag 4: 90 s. The hook opens the intro, A and the return |
| Boss, the fight | 150 BPM, E minor with a phrygian F | relentless sixteenth saw bass, VRC6 tremolo that swells through the build, DPCM kick-snare with a closing roll | 2A03 pulse, 12.5%, screaming, sliding, fast vibrato | intro 4, riff 8, build 8, phase change (half time, E-F phrygian) 8, riff up a minor third 8, tag 4: 64 s, 58 s loop. One low hook nod in the intro |
| Ending, the arc home | 90 BPM, D major | lazy DPCM backbeat, VRC6 pads opening into shimmering eighths in the choruses, fretless saw bass | 2A03 pulse, 50% flute with a late vibrato, brightening to 25% in the choruses; a harmony from the key change | intro 4, verse 8, chorus 8, bridge 4, chorus up a tone 8, outro 4: 96 s, no loop. The outro sings the hook once, slowly, then lands on a held tonic |

The first versions stay on the sound test as stage1 (v1), stage2 (v1), boss (v1) and ending (v1); the
title keeps both earlier arrangements, title (v1) and title (v2).

## DPCM drums

The 2A03's fifth channel plays 1-bit delta samples. `src/audio/apu.mjs` synthesises the kit (a long
diving corporate-wave kick with a click, a gated snare, a clap) and pushes each through the delta
encoder at the top rate, so the slope limit roughens the noise the way a real sample does. In a song
the `dpcm` channel's token is the playback rate 0-F (F as recorded, lower is lower and longer, for
tom-like fills) and the instrument names the sample. A sample is cut when its note ends, so hold drum
notes with `-` rather than `.`.

## Effects and jingles: late NES, not early NES

Tim (01:39 EDT 2026-09-15) on the first effects set: "authentic nes as fuck, especially early nes,
but i want to target late NES era, even into the 90s, and it's all gotta have a distinct corporate
wave kick". The target is 1990-94 Famicom polish (Batman: Return of the Joker, Gimmick!, Kirby's
Adventure, Mega Man 6, Crisis Force) on the same chips: 2A03 with DPCM, plus the VRC6.

| Early NES (v1) | Late NES with the corporate kick (now) |
| --- | --- |
| one channel an effect | two to five layers at once: a DPCM thump under a noise crack, a pulse zap with a VRC6 echo |
| straight-line sweeps | curved pitch envelopes that snap and settle (Kirby's jump) |
| noise-only hits | sampled DPCM hit, kick-snare and orchestra stab (Sunsoft and Natsume weight) |
| square-wave fanfares | VRC6 saw brass stingers and a stab for the Injunction |
| plain pickup beeps | "transaction approved": a two-tone chime with an octave flick on the strike, echoed |
| a sagging life-lost tune | "call dropped": three falling line tones, then every voice slides an octave away |
| none | office textures: a fax handshake warble, a dial-up connect on Continue, a desk-phone ring for the alarm, a busy signal closing Game Over, a gated snare on the stamp |

Effects stay under a second and keep off pulse 1, so the lead survives. A layer may take the saw
or a VRC6 pulse briefly; the song picks the channel up again when the layer ends. The first set
stays on the sound test as "(v1)": effects as `<name>-v1`, jingles as `<name>-v1.mjs`.

Not done: true Sunsoft bass (a looped DPCM bass sample retuned per note). Sixteen DPCM rates are too
coarse for a bass line, so the jingles keep the triangle bass and put the weight in the samples.

## What makes it corporate wave

Corporate wave grew out of vaporwave in the late 2010s. Vaporwave slows and smears 80s muzak, smooth
jazz and infomercial music into irony; corporate wave keeps the same source sounds but plays them
straight and polished: the glass atrium, the boardroom, the hold queue as something aspirational.
What the ear picks out:

- **Glossy extended chords.** Major sevenths, ninths and elevens moving by ii-V-I, the harmony of
  smooth jazz and on-hold music. Triads alone sound like a video game, not a lobby.
- **Warm, wide pads** under everything: detuned polysynths (the Juno/DX7 chorus), slow attacks,
  held for whole bars.
- **Synth brass stabs** at phrase ends, and a bright lead that sings rather than chirps.
- **Fretless bass**: slides into notes, a little late vibrato, lots of space.
- **Gated drums**: a big snare that cuts off dead, a soft kick, quiet hats. Slow and lazy, 85-95 BPM.
- **Polish over grit**: no noise bursts or harsh duty, nothing distorted, soft note onsets.

Sources: [Corporatewave (Grokipedia)](https://grokipedia.com/page/Corporatewave),
[Vaporwave (Aesthetics Wiki)](https://aesthetics.fandom.com/wiki/Vaporwave),
[Mallsoft (Wikipedia)](https://en.wikipedia.org/wiki/Mallsoft). Specific tracks from the subreddit
were not listened to by this run; the traits above are from the written descriptions plus the
smooth-jazz and muzak sources they name.

## How each trait maps onto the chips

| Trait | Channel | How |
| --- | --- | --- |
| Extended chord bed | VRC6 pulse 1 and 2 | hold the chord's 3rd and 7th (the guide tones), voiced nearest the last chord so they glide; 12.5% and 25% duty for a soft, reedy tone; slow vibrato at two different rates beats like a chorus |
| Warm pad, synth brass | VRC6 sawtooth | the 9th or 13th of the chord with a slow swell; a short loud envelope for the brass hits closing each phrase |
| Singing lead | 2A03 pulse 1 | the theme melody, 25% duty, delayed vibrato |
| Chorus on the lead | 2A03 pulse 2 | the melody a sixteenth late, quieter, detuned about 10 cents: the stereo-chorus smear in mono |
| Fretless bass | 2A03 triangle | glides from the last note over a few frames, late vibrato, syncopated with rests |
| Gated drums | 2A03 noise | a low soft kick; a snare that holds full level then drops to zero in one frame; short-mode hats |
| Slow and lazy | tempo | 18 frames an eighth note, about 100 BPM felt as a half-time groove |

The scene version keeps the thin 12.5% lead and no drums, and lays the VRC6 chord bed and a saw pad
under it.

## The SNES bank: real recorded samples

Tim (08:05-08:19 EDT 2026-09-15) on the synthesised SNES bank: "still sounds too nes like", "sounds
straight like a built-in windows 95 .wav". Real 1993-95 soundtracks (Chrono Trigger, Final Fantasy VI,
Donkey Kong Country, Super Metroid) were sample CDs squeezed into 64 KB, so the bank is now the same:
one recorded sample an instrument, cut by `tools/snes-bank.mjs` from a SoundFont.

- **Resampled so the loop fits.** The loop is a whole number of pitch periods and a whole number of
  16-sample BRR blocks at once: the tool picks the storage rate that makes both true (12-22 kHz, as the
  games did; the S-DSP plays everything out at 32 kHz), crossfades the loop's end into the audio just
  before it, then BRR-encodes. Drums and the orchestra hit are one-shots with a faded tail.
- **A little treble lift** before encoding, since the S-DSP's Gaussian interpolation dulls the top.
- **43.6 KB for sixteen instruments**, inside the 64 KB of sound RAM.
- The synthesised bank stays on the sound test as "(v1)": the instruments, the bank walk `bank (v1)`,
  and the first arrangements `title (v1)` and `stage1 (v1)`. The jingles and effects moved to the new
  bank in place.

Rebuild with `node tools/snes-bank.mjs <path to FluidR3_GM.sf2>` (the SoundFont is not in the repo;
it is at https://github.com/pianobooster/fluid-soundfont/releases/download/v3.1/FluidR3_GM.sf2).

| Instrument | Key | Source preset / sample | Stored at |
| --- | --- | --- | --- |
| Rhodes electric piano | `epiano` | Rhodes EP / Rhodes C5(L) | 15959 Hz |
| warm pad | `pad` | Warm Pad / Alien Strings(L) | 11989 Hz |
| string section | `strings` | Strings / Strings C#5L | 13991 Hz |
| choir | `choir` | Ahh Choir / Ahh Choir C5(L) | 14014 Hz |
| tubular bell | `bell` | Tubular Bells / Tubular Bells C7(L) | 21896 Hz |
| slap bass | `slap` | Slap Bass / Slap Bass D3 | 16027 Hz |
| synth bass | `synbass` | Synth Bass 1 / saw-110(L) | 12027 Hz |
| alto sax | `sax` | Alto Sax / Alto G5(L) | 15954 Hz |
| brass section | `brass` | Brass Section / Brass Section C5 | 15939 Hz |
| square lead | `sqlead` | Square Lead / Square Wave A3 | 16246 Hz |
| punch kick | `gkick` | Power kit / Power Bass Drum 2(L) | 16000 Hz |
| punch snare | `gsnare` | Power kit / Power Snare 1(L) | 16000 Hz |
| closed hat | `chat` | Standard kit / Hi-Hat Closed(L) | 22000 Hz |
| open hat | `ohat` | Standard kit / Hi-Hat Half-Open(L) | 16000 Hz |
| clap | `clap` | Standard kit / Clap(L) | 16000 Hz |
| orchestra hit | `orch` | Orchestra Hit / Orch Hit G#6(L) | 16000 Hz |

**Licence, every sample:** FluidR3_GM, MIT licence, Copyright (c) 2000-2002, 2008 Frank Wen
(the licence text is the `COPYING` file at https://github.com/pianobooster/fluid-soundfont). The
generated `src/snes/audio/recorded-brr.mjs` carries the notice in its header.

## Lessons

- **A recorded sample's loop must be a whole number of periods AND a whole number of BRR blocks.**
  Pick the loop's period count first, round its length to 16 samples, then choose the storage rate
  that makes those equal (rate = length x f0 / periods) and resample to it; the root pitch follows as
  f0 x 32000 / rate. A crossfade into the pre-loop audio then hides the timbre seam.

- **Build a long song from a form table, not long strings.** One entry a bar (part, chord, lead,
  key shift) and a function per channel keeps 70 bars of eight channels short to write and easy to
  vary per section; a key change is a shift on the entry, applied to the chord and the lead alike.
- **An echo must not cross a key change.** Rest the first rows of every bar in the delayed copy, or
  the last notes of one key sound in the next.

- **Swing needs its own row grid.** A song has one tempo, so swung eighths come from the grid: 24
  rows a bar (6 a beat) lets the on-beat eighth take 4 rows and the off-beat 2, and every bar is
  still a multiple of 8. Stage 1 runs this at 5 frames a row, 120 BPM.
- **Ninth chords stay in key if you pick them per root.** In F major, F and Bb take maj9, C takes a
  dominant 9, D and G take minor 9, and A only minor 7 (its ninth, B, is out of key). Cycle the
  five tones a frame each on a short pulse 2 envelope and it reads as one lush stab.
- **A soft echo is pulse 2 playing the lead 3 rows late** at volume 5 and falling, detuned 0.12 of
  a semitone for a chorus shimmer. Let the chord stabs take pulse 2 on their rows; a stab's
  envelope ends at 0, so the echo's holds after it stay silent instead of smearing.
- **A layered effect silences a channel's previous owner at its own start, not the effect's.** Two
  DPCM layers in one effect (a stab, then a kick-snare 28 frames later) otherwise cut the first
  sample dead the moment the effect fires.
- **An echo on a VRC6 pulse is the cheapest late-era gloss.** The same frames 3-6 frames later, 5-7
  volume steps down, on a channel the stage songs only use for pads; it reads as the delay effect
  Kirby and Mega Man 6 fake with two pulses.
- **Leave rows empty on the noise channel.** A punch effect takes the noise channel for 9 frames;
  a groove with a third of its rows open lets hits land without the beat falling apart.
- **The offline render spikes when a note starts between WebAudio's 128-sample blocks.** Samples
  reach 17 against a normal 0.4 peak, in the shared synth, for any song. To judge a song's own
  levels and loop seam, render at a sample rate where one row is a whole number of blocks, since notes
  start on rows (16-frame rows: 48000 Hz; 5- or 7-frame rows: 38400 Hz) and compare the RMS of the loop's first bar on the
  first and second passes.
