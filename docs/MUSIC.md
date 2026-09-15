# Corporate wave on a Famicom

Tim's ruling (01:09 EDT 2026-09-15): the NES theme was authentic but "not corporate wave enough". The
theme now plays on the 2A03 plus Konami's VRC6 cartridge chip, the Famicom Castlevania III setup.

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
