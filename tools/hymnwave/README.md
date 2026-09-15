# Hymnwave sketches

Direction tests, not game music: church pipe organ crossed with 80s/90s corporate wave, rendered at
44.1 kHz stereo with no SNES limits. Nothing here is loaded by the game.

| Sketch | The idea |
| --- | --- |
| `organ-over-groove` | 96 bpm, D minor. The organ leads a hymn in a cathedral; a gated-drum groove, fretless bass and DX7 stabs slide in underneath. |
| `organ-hook` | 104 bpm, Eb major into C minor. Slap bass, gated drums and a sax lead, until the organ breaks through as the hook with the choir. |
| `office-into-mass` | 70 bpm, Ab major into F minor. Vibes-and-Rhodes office muzak fades while the organ pedal, choir, timpani and a tolling bell take over. |

```bash
node tools/hymnwave/render.mjs <FluidR3_GM.sf2> [out dir] [sketch names...]
```

The out dir defaults to `tools/hymnwave/out/`, which is gitignored; renders are never committed.

- `engine.mjs` plays SoundFont samples (looped where the font loops them), then mixes through a
  Freeverb hall, a gated snare room, chorus and a soft limiter.
- `parts.mjs` builds held chords, stabs, basslines and drum patterns from a progression.
- `songs.mjs` holds the three sketches; the tunes and progressions are original.

Samples: FluidR3_GM.sf2 (MIT, Copyright (c) 2000-2002, 2008 Frank Wen), from
https://github.com/pianobooster/fluid-soundfont/releases/download/v3.1/FluidR3_GM.sf2. The reverb is
Jezar's public-domain Freeverb design.
