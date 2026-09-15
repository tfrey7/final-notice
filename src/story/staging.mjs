// How each story scene is acted, beside the words in src/story/script.mjs and never changing them.
// `acting` is a wordless page first: the play sprites on keyframes [frame, x, feet, pose] in the room.
// `beats[i]` stages the script's beat i: `music` ('cut', 'pad' or a cue name), `fx`, a `portrait`
// override and `actors`. `cuts` makes every change of picture after the opening a hard cut.
// `fromPlay` opens on the fight's last frame with no mosaic in, the acting page fading the HUD out over
// `hud` frames; a beat's `spin` follows its page with a wordless Mode 7 page after `silence` frames;
// `sound` and `backdrop` apply to every page of the beat; `mosaicOut` leaves by mosaic.
// A beat's own `cut: false` mosaics instead; `keepFx` holds the fx on every page of the beat; `endCut`
// leaves the last page on a hard cut instead of a fade.
export const STAGING = {
  assignment: {
    cuts: true,
    fadeAfter: 120,
    acting: {
      backdrop: 'bellwether-office',
      frames: 240,
      actors: [
        { who: 'bellwether', keys: [[0, 58, 104, 'back']] },
        { who: 'auditor', keys: [[0, 280, 142, 'front'], [40, 280, 142, 'front'], [170, 226, 142, 'front']] },
      ],
    },
    beats: [
      {},
      { music: 'pad' },
      { music: 'scene', fx: 'bill', portrait: null },
      { fx: 'lamp' },
      {
        portrait: null,
        actors: [
          { who: 'bellwether', keys: [[0, 128, 104, 'front'], [30, 128, 104, 'front'], [60, 104, 104, 'back'], [110, 58, 104, 'back']] },
          { who: 'auditor', keys: [[0, 226, 142, 'front'], [70, 226, 142, 'front'], [130, 290, 142, 'back']] },
        ],
      },
    ],
  },
  incident: {
    cuts: true,
    fromPlay: true,
    mosaicOut: true,
    fadeAfter: 120,
    acting: {
      backdrop: 'vellum-desk',
      frames: 240,
      music: 'cut',
      hud: 32,
      actors: [
        { who: 'vellum', keys: [[0, 128, 124, 'slump'], [196, 128, 124, 'tie'], [198, 128, 124, 'tie'], [200, 128, 124, 'front']] },
        { who: 'auditor', keys: [[0, 250, 142, 'back'], [30, 250, 142, 'back'], [170, 176, 142, 'back']] },
      ],
    },
    beats: [
      { music: 'scene' },
      { music: 'cut' },
      { sound: 'click', spin: { silence: 12 } },
      { music: 'scene', fx: 'ledger', backdrop: 'grille', portrait: null },
      { backdrop: 'break-room', portrait: 'radio', sound: 'click' },
    ],
  },
  documents: {
    cuts: true,
    fadeAfter: 60,
    endCut: true,
    acting: {
      backdrop: 'break-room',
      frames: 300,
      music: 'cut',
      sound: 'buzz',
      fx: 'table',
      actors: [{ who: 'auditor', keys: [[0, 60, 142, 'sit']] }],
    },
    beats: [
      { music: 'scene', fx: 'ledgerScroll' },
      { music: 'cut', fx: 'dim', keepFx: true },
      { music: 'pad', fx: 'table', keepFx: true, actors: [{ who: 'auditor', keys: [[0, 60, 142, 'sit']] }] },
      { music: 'scene', sound: 'phone', backdrop: 'bellwether-office', cut: false },
      {
        music: 'cut',
        sound: 'bassNote',
        fx: 'table',
        portrait: null,
        cut: false,
        actors: [{ who: 'auditor', keys: [[0, 60, 142, 'sit'], [30, 60, 142, 'sit'], [50, 60, 142, 'hold']] }],
      },
    ],
  },
};
